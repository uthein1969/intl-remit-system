import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Printer, 
  Search, 
  DownloadCloud, 
  Coins, 
  ShieldCheck,
  UserCheck,
  Edit3,
  Building2,
  RefreshCw,
  Eye,
  X,
  FileText,
  FileCheck,
  Receipt,
  Download,
  Maximize2,
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { EditInwardModal } from './EditInwardModal';
import { DocumentLightboxModal } from '../Common/DocumentLightboxModal';
import { 
  createSampleMyanmarNrcSvg,
  createSampleMyanmarPassportSvg,
  createSampleDepositReceiptSvg
} from '../../lib/sampleDocuments';
import { formatToDDMMYYYY } from '../../lib/dateUtils';

export interface InwardApproveViewProps {
  initialTxId?: string | null;
  onClearInitialTxId?: () => void;
}

export const InwardApproveView: React.FC<InwardApproveViewProps> = ({
  initialTxId,
  onClearInitialTxId
}) => {
  const { 
    db, 
    currentUser,
    language, 
    t, 
    approveTransaction, 
    payoutInwardTransaction, 
    rejectTransaction,
    isSyncingTurso,
    syncTursoBidirectional,
    activeBranchId,
    activeCountryCode
  } = useRemittance();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Login Form Scope: The country and branch selected/assigned at logon
  const userLoginCountry = activeCountryCode || currentUser?.countryCode || 'MM';
  const userLoginBranch = activeBranchId || currentUser?.branchId || 'BR-001';

  const [filterStatus, setFilterStatus] = useState('PENDING_APPROVAL');
  // Country Admin defaults to 'ALL' (can view all), while regular operators (Checker/Maker) are restricted to their login scope
  const [selectedCountry, setSelectedCountry] = useState<string>(() => (isAdmin ? 'ALL' : userLoginCountry));
  const [selectedBranch, setSelectedBranch] = useState<string>(() => (isAdmin ? 'ALL' : userLoginBranch));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<RemittanceTransaction | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherTx, setVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState<RemittanceTransaction | null>(null);
  const [lightboxDoc, setLightboxDoc] = useState<{
    isOpen: boolean;
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  } | null>(null);

  // Sync filter when user context changes
  useEffect(() => {
    if (!isAdmin) {
      setSelectedCountry(userLoginCountry);
      setSelectedBranch(userLoginBranch);
    }
  }, [isAdmin, userLoginCountry, userLoginBranch]);

  const openLightbox = (doc: {
    title: string;
    url?: string;
    name?: string;
    type?: string;
    size?: string;
    idNumber?: string;
    sender?: string;
  }) => {
    setLightboxDoc({
      isOpen: true,
      ...doc
    });
  };

  useEffect(() => {
    if (initialTxId) {
      const tx = db.transactions.find(t => t.id === initialTxId && t.type === 'INWARD');
      if (tx) {
        if (isAdmin) {
          setSelectedBranch('ALL');
          setSelectedCountry('ALL');
        }
        setFilterStatus(tx.status || 'PENDING_APPROVAL');
        setSearchQuery(tx.transactionNo);
        setSelectedTx(tx);
        setShowReviewModal(true);
        if (onClearInitialTxId) {
          onClearInitialTxId();
        }
      }
    }
  }, [initialTxId, db.transactions, onClearInitialTxId, isAdmin]);

  const handleOpenEdit = (tx: RemittanceTransaction) => {
    if (!isAdmin) return;
    setEditingTx(tx);
    setShowEditModal(true);
  };

  const inwardTxs = db.transactions.filter(t => t.type === 'INWARD');

  // Location filter applied first so status tab counts match the selected country/branch
  // Non-Admin: strictly show only data belonging to their login country & branch
  // Country Admin: can see all data ('ALL') or filter by specific country & branch
  const locationFilteredTxs = inwardTxs.filter(tx => {
    const txPayoutBranchId = tx.payoutBranchId || tx.branchId || tx.sendingBranchId;
    const branch = db.branches.find(b => b.id === txPayoutBranchId);
    const txCountry = branch?.countryCode || tx.receiverCountryCode || (tx as any).to_country;

    if (!isAdmin) {
      // Non-Admin Checker/Maker: strictly match logged in country & branch for inward payout
      const matchBranch = tx.payoutBranchId ? tx.payoutBranchId === userLoginBranch : (tx.branchId === userLoginBranch || tx.sendingBranchId === userLoginBranch);
      const matchCountry = txCountry === userLoginCountry || 
        tx.receiverCountryCode === userLoginCountry || 
        (tx as any).to_country === userLoginCountry;
      return matchBranch && matchCountry;
    }

    // Country Admin Role: Can view all or filter
    if (selectedCountry !== 'ALL') {
      const match = txCountry === selectedCountry || 
        tx.senderCountryCode === selectedCountry || 
        tx.receiverCountryCode === selectedCountry ||
        (tx as any).to_country === selectedCountry;
      if (!match) return false;
    }

    // Branch Filter
    if (selectedBranch !== 'ALL' && txPayoutBranchId !== selectedBranch && tx.branchId !== selectedBranch) {
      return false;
    }
    return true;
  });

  const pendingCount = locationFilteredTxs.filter(t => t.status === 'PENDING_APPROVAL').length;
  const paidOutCount = locationFilteredTxs.filter(t => t.status === 'PAID_OUT').length;
  const allCount = locationFilteredTxs.length;

  const filteredTxs = locationFilteredTxs.filter(tx => {
    if (filterStatus !== 'ALL' && tx.status !== filterStatus) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        tx.transactionNo.toLowerCase().includes(q) ||
        tx.mtcn.toLowerCase().includes(q) ||
        tx.receiverName.toLowerCase().includes(q) ||
        tx.receiverNrc.toLowerCase().includes(q) ||
        tx.senderName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleAuthorizePayout = async (tx: RemittanceTransaction) => {
    const success = await payoutInwardTransaction(tx.id, 'Counter cash payout verified with original Myanmar NRC');
    if (success) {
      confetti({ particleCount: 70, spread: 60 });
      setVoucherTx(tx);
      setShowVoucherModal(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {t.inwardApproveTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'my' 
              ? 'ငွေထုတ်ယူသူ၏ မှတ်ပုံတင် စိစစ်ပြီး ငွေသားထုတ်ပေးရန် ခွင့်ပြုခြင်း' 
              : 'Checker verification & cash payout authorization'}
          </p>
        </div>

        {/* Filter status tabs & Cloud Sync */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
            <button
              onClick={() => setFilterStatus('PENDING_APPROVAL')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'PENDING_APPROVAL' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {language === 'my' ? 'ထုတ်ပေးရန် စောင့်ဆိုင်းဆဲ' : 'Pending Payout'} ({pendingCount})
            </button>
            <button
              onClick={() => setFilterStatus('PAID_OUT')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'PAID_OUT' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {language === 'my' ? 'ငွေထုတ်ယူပြီး' : 'Disbursed / Paid'} ({paidOutCount})
            </button>
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all text-black font-bold cursor-pointer ${
                filterStatus === 'ALL' ? 'bg-[#A2D9CE] border border-slate-700 shadow-xs' : 'hover:bg-[#C1ECE3]'
              }`}
            >
              {t.all} ({allCount})
            </button>
          </div>

          {/* Turso Cloud Live Sync Button */}
          <button
            onClick={() => syncTursoBidirectional()}
            disabled={isSyncingTurso}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-semibold shadow-xs"
            title={language === 'my' ? 'Turso Cloud မှ စာရင်းအသစ်များ ရယူရန် / Refresh လုပ်ရန် နှိပ်ပါ' : 'Fetch latest transactions from Turso Cloud'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTurso ? 'animate-spin text-teal-400' : 'text-teal-400'}`} />
            <span>{isSyncingTurso ? (language === 'my' ? 'Sync လုပ်နေသည်...' : 'Syncing...') : (language === 'my' ? 'Cloud Sync' : 'Sync Cloud')}</span>
          </button>
        </div>
      </div>

      {/* Search & Location Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'my' ? 'MTCN သို့မဟုတ် လက်ခံသူ မှတ်ပုံတင်ဖြင့် ရှာရန်...' : 'Search by MTCN or Beneficiary NRC...'}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Country Admin Role Controls vs Regular User Scoped View */}
          {isAdmin ? (
            <>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="font-semibold text-[11px]">
                  {language === 'my' ? '👑 Country Admin (အကုန်ကြည့်ရှုခွင့်ရှိ)' : '👑 Country Admin (Full Access)'}
                </span>
              </div>

              {/* Country Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'my' ? 'နိုင်ငံ:' : 'Country:'}
                </span>
                <select
                  value={selectedCountry}
                  onChange={(e) => {
                    const c = e.target.value;
                    setSelectedCountry(c);
                    if (c !== 'ALL') {
                      const b = db.branches.find(br => br.countryCode === c);
                      if (b) setSelectedBranch(b.id);
                      else setSelectedBranch('ALL');
                    } else {
                      setSelectedBranch('ALL');
                    }
                  }}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">🌐 {language === 'my' ? 'နိုင်ငံအားလုံး' : 'All Countries'}</option>
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code} className="bg-slate-900 text-white">
                      {c.flagEmoji} {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Branch Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2 py-1">
                <Building2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'my' ? 'ဘဏ်ခွဲ:' : 'Branch:'}
                </span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  <option value="ALL" className="bg-slate-900 text-white">{language === 'my' ? 'ဘဏ်ခွဲအားလုံး' : 'All Branches'}</option>
                  {db.branches
                    .filter(b => selectedCountry === 'ALL' || b.countryCode === selectedCountry)
                    .map(b => (
                      <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                        {b.code} - {b.nameEn}
                      </option>
                    ))}
                </select>
              </div>
            </>
          ) : (
            /* Regular Operator (Checker/Maker): Locked to Login Country and Branch */
            <div className="flex items-center space-x-2 bg-teal-950/60 border border-teal-500/40 rounded-lg px-2.5 py-1 text-xs">
              <Lock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">{language === 'my' ? 'လော့ဂ်အင်ဘဏ်ခွဲ:' : 'Login Branch:'}</span>
              <span className="text-white font-semibold flex items-center gap-1.5">
                <span>{db.countries.find(c => c.code === userLoginCountry)?.flagEmoji || '🌐'}</span>
                <span>{db.branches.find(b => b.id === userLoginBranch)?.nameEn || userLoginBranch} ({db.branches.find(b => b.id === userLoginBranch)?.code || userLoginBranch})</span>
              </span>
              <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded px-1.5 py-0.5 font-medium">
                {language === 'my' ? 'Login Scope သီးသန့်' : 'Login Scope Only'}
              </span>
            </div>
          )}

          {((isAdmin && (selectedCountry !== 'ALL' || selectedBranch !== 'ALL')) || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                if (isAdmin) {
                  setSelectedCountry('ALL');
                  setSelectedBranch('ALL');
                }
                setSearchQuery('');
              }}
              className="text-[11px] text-teal-400 hover:text-teal-300 underline font-medium px-1 cursor-pointer"
            >
              {language === 'my' ? 'အားလုံးပြမည် (Reset)' : 'Reset All'}
            </button>
          )}
        </div>

        <div className="text-xs text-slate-400 self-end md:self-center font-mono shrink-0">
          <span className="text-teal-400 font-bold">{filteredTxs.length}</span> {language === 'my' ? 'ခု ရှာတွေ့သည်' : 'records found'}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">{t.mtcnCode} / Tx No</th>
                <th className="px-4 py-3">{language === 'my' ? 'ငွေထုတ်ယူသူ (Beneficiary)' : 'Beneficiary'}</th>
                <th className="px-4 py-3">{language === 'my' ? 'လွှဲပို့သူ (Sender)' : 'Origin Sender'}</th>
                <th className="px-4 py-3">{language === 'my' ? 'ထုတ်ပေးငွေ (Payout MMK)' : 'Payout Amount'}</th>
                <th className="px-4 py-3">{t.payoutMethod}</th>
                <th className="px-4 py-3">{t.status}</th>
                <th className="px-4 py-3 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-500">
                    {t.noData}
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-amber-400 text-sm">{tx.mtcn}</div>
                      <div className="font-mono text-slate-400 text-[11px]">{tx.transactionNo}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{formatToDDMMYYYY(tx.createdDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-200">{tx.receiverName}</div>
                      <div className="font-mono text-[11px] text-slate-400">{tx.receiverNrc}</div>
                      <div className="text-[10px] text-slate-500">{tx.receiverPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-200 font-medium">{tx.senderName}</div>
                      {tx.scope === 'DOMESTIC' ? (
                        <div className="flex items-center space-x-1 text-[10px] text-sky-400 font-mono mt-0.5">
                          <Building2 className="w-3 h-3 text-sky-400 shrink-0" />
                          <span>From: {db.branches.find(b => b.id === tx.sendingBranchId)?.nameEn || tx.sendingBranchId || 'Yangon HQ'}</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400">From: {tx.senderCountryCode}</div>
                      )}
                      {tx.linkedTransactionNo && (
                        <div className="text-[9px] text-emerald-400 font-mono mt-0.5">
                          Outward: {tx.linkedTransactionNo}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-base text-emerald-400">
                        {Number(tx.receiveAmount || 0).toLocaleString()} MMK
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ({Number(tx.sendAmount || 0).toLocaleString()} {tx.sourceCurrency} @ {Number(tx.exchangeRate || 0).toLocaleString()})
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 text-[10px]">
                          {tx.payoutMethod === 'CASH_PICKUP' ? 'Cash Pickup' : 'Bank Deposit'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-[10px] text-teal-400 font-mono mt-1">
                        <Building2 className="w-3 h-3 text-teal-400 shrink-0" />
                        <span>{db.branches.find(b => b.id === tx.payoutBranchId)?.code || tx.payoutBranchId || 'BR-001'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        tx.status === 'PAID_OUT' || tx.status === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 animate-pulse'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(tx)}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 font-semibold text-xs transition-all flex items-center space-x-1 hover:scale-[1.02]"
                            title={language === 'my' ? 'အချက်အလက် ပြင်ဆင်ရန်' : 'Edit Inward Record'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>{t.edit}</span>
                          </button>
                        )}

                        {tx.status === 'PENDING_APPROVAL' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTx(tx);
                              setShowReviewModal(true);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5 hover:scale-[1.02] cursor-pointer"
                            title={language === 'my' ? 'စိစစ်၍ ငွေထုတ်ပေးရန် အတည်ပြုမည်' : 'Review & Approve Payout'}
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>{language === 'my' ? 'Review & Approve' : 'Review & Approve'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setVoucherTx(tx);
                              setShowVoucherModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                            title={t.printVoucher}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inward Review & Payout Verification Modal */}
      {showReviewModal && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{language === 'my' ? 'ပြည်တွင်းငွေလွှဲ စိစစ်အတည်ပြုခြင်း' : 'Inward Remittance Review'}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-teal-950 border border-teal-800 text-teal-300">
                      {selectedTx.transactionNo}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    MTCN: <span className="font-mono font-bold text-teal-300">{selectedTx.mtcn}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar scroll-smooth">
              {/* Beneficiary & Sender Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'ငွေထုတ်ယူသူ (လက်ခံသူ)' : 'Beneficiary / Receiver'}</span>
                  </div>
                  <div className="text-sm font-bold text-white">{selectedTx.receiverName}</div>
                  {selectedTx.receiverNameMm && (
                    <div className="text-xs text-slate-300 font-myanmar">{selectedTx.receiverNameMm}</div>
                  )}
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">NRC:</span> <span className="font-mono font-semibold text-white">{selectedTx.receiverNrc}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Phone:</span> <span className="font-mono">{selectedTx.receiverPhone}</span>
                  </div>
                  {selectedTx.receiverAddress && (
                    <div className="text-xs text-slate-400 truncate">
                      <span>Address:</span> {selectedTx.receiverAddress}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-sky-400 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" />
                      {language === 'my' ? 'ငွေလွှဲပို့သူ (Sender)' : 'Remitter / Sender'}
                    </span>
                    {selectedTx.scope === 'DOMESTIC' && (
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold">
                        Domestic
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{selectedTx.senderName}</div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">
                      {selectedTx.scope === 'DOMESTIC' ? (language === 'my' ? 'လွှဲပို့သည့် ဘဏ်ခွဲ:' : 'Sending Branch:') : 'Origin Country:'}
                    </span>{' '}
                    <span className="font-semibold text-white">
                      {selectedTx.scope === 'DOMESTIC' 
                        ? (db.branches.find(b => b.id === selectedTx.sendingBranchId)?.nameEn || selectedTx.sendingBranchId || 'Yangon HQ')
                        : selectedTx.senderCountryCode}
                    </span>
                  </div>
                  {selectedTx.linkedTransactionNo && (
                    <div className="text-xs text-emerald-400 font-mono">
                      <span className="text-slate-400">Outward No:</span> <span className="font-bold">{selectedTx.linkedTransactionNo}</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Purpose:</span> <span>{selectedTx.purposeName || 'Local Remittance'}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    <span>Date:</span> <span className="font-mono">{selectedTx.createdDate ? new Date(selectedTx.createdDate).toLocaleString() : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Financial Details Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/40 to-slate-900 border border-teal-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider">
                    {language === 'my' ? 'ထုတ်ပေးရမည့် ငွေပမာဏ' : 'Net Payout Amount'}
                  </div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                    {Number(selectedTx.receiveAmount || 0).toLocaleString()} MMK
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    {Number(selectedTx.sendAmount || 0).toLocaleString()} {selectedTx.sourceCurrency} @ {Number(selectedTx.exchangeRate || 0).toLocaleString()}
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    selectedTx.status === 'PAID_OUT' || selectedTx.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  }`}>
                    {selectedTx.status}
                  </span>
                  <div className="text-[11px] text-slate-400 mt-1 font-mono">
                    Method: {selectedTx.payoutMethod === 'CASH_PICKUP' ? 'Counter Cash Pickup' : 'Bank Deposit'}
                  </div>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'my' ? 'Checker စစ်ဆေးရမည့် အချက်များ:' : 'Checker Verification Checklist:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'မူရင်းမှတ်ပုံတင် တိုက်ဆိုင်စစ်ဆေးပြီး' : 'Original Myanmar NRC matched'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'MTCN လျှို့ဝှက်ကုဒ် မှန်ကန်မှု စစ်ဆေးပြီး' : 'MTCN secret code verified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'Blacklist / AML စာရင်း စစ်ဆေးပြီး' : 'Sanction & Blacklist cleared'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{language === 'my' ? 'ငွေသားပမာဏ မှန်ကန်မှု စစ်ဆေးပြီး' : 'MMK cash denomination ready'}</span>
                  </div>
                </div>
              </div>

              {/* KYC Document Attachments - Text Data Only + Preview Button */}
              {/* KYC Document Attachments - Rows by Words Table without Picture Frames */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-teal-400" />
                    <span>{language === 'my' ? 'ပူးတွဲစိစစ်ချက် စာရွက်စာတမ်းများ (KYC Documents)' : 'KYC & Verification Documents'}</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {language === 'my' ? 'စာရွက်စာတမ်း မူရင်းပုံ ကြည့်ရှုရန် Preview ကို နှိပ်ပါ' : 'Click Preview to inspect original document images'}
                  </span>
                </div>

                {/* Table: Only Show by Words by Rows */}
                <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/80">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/90 text-slate-400 font-semibold text-[11px]">
                        <th className="py-2.5 px-3">{language === 'my' ? 'စာရွက်စာတမ်း အမျိုးအစား' : 'Document Type'}</th>
                        <th className="py-2.5 px-3">{language === 'my' ? 'အချက်အလက် / နံပါတ်' : 'Reference / ID'}</th>
                        <th className="py-2.5 px-3">{language === 'my' ? 'ဖိုင်အမည် & ဆိုဒ်' : 'Attached File'}</th>
                        <th className="py-2.5 px-3 text-center">{language === 'my' ? 'အခြေအနေ' : 'Status'}</th>
                        <th className="py-2.5 px-3 text-right">{language === 'my' ? 'လုပ်ဆောင်ချက်' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-[11px]">
                      {/* Row 1: Beneficiary NRC */}
                      <tr className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 rounded-md bg-teal-500/20 text-teal-400 shrink-0">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-200">
                              {language === 'my' ? 'ငွေထုတ်ယူသူ မှတ်ပုံတင်' : 'Beneficiary NRC'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-teal-300 font-medium">
                          {selectedTx.receiverNrc || 'Verified'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-mono">Receiver_NRC.svg</span>{' '}
                          <span className="text-[10px] text-teal-400 font-bold ml-1">18 KB</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-teal-400" />
                            <span>{language === 'my' ? 'စစ်ဆေးပြီး' : 'Verified'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေထုတ်ယူသူ၏ မှတ်ပုံတင် (Beneficiary NRC)' : "Beneficiary's NRC Card",
                              url: selectedTx.senderNrcAttachment || selectedTx.senderNrcFrontAttachment || createSampleMyanmarNrcSvg(selectedTx.receiverNrc, selectedTx.receiverNameMm || selectedTx.receiverName, selectedTx.receiverName, '15/08/1990', 'U BA THAUNG'),
                              name: 'Receiver_NRC.svg',
                              type: 'image/svg+xml',
                              size: '18 KB',
                              idNumber: selectedTx.receiverNrc,
                              sender: selectedTx.receiverName
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                            title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 2: Remitter Passport / ID */}
                      <tr className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 rounded-md bg-sky-500/20 text-sky-400 shrink-0">
                              <FileCheck className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-200">
                              {language === 'my' ? 'လွှဲပို့သူ အထောက်အထား' : 'Remitter ID/Passport'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-sky-300 font-medium">
                          {selectedTx.senderPassport || selectedTx.senderNrc || 'Sender Verified'}
                          <span className="text-[10px] text-slate-400 font-sans ml-1">({selectedTx.senderCountryCode || 'TH'})</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-mono">{selectedTx.senderPassportAttachmentName || 'Sender_ID.svg'}</span>{' '}
                          <span className="text-[10px] text-sky-400 font-bold ml-1">24 KB</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-sky-400" />
                            <span>{language === 'my' ? 'ကိုက်ညီမှုရှိ' : 'Matched'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ငွေလွှဲပို့သူ၏ နိုင်ငံကူးလက်မှတ် (Remitter Passport)' : "Remitter's Passport Document",
                              url: selectedTx.senderPassportAttachment || selectedTx.senderPassbookAttachment || createSampleMyanmarPassportSvg(selectedTx.senderPassport || 'MB-819203', selectedTx.senderName, '02/03/1985', 'M'),
                              name: selectedTx.senderPassportAttachmentName || 'Sender_Passport.svg',
                              type: 'image/svg+xml',
                              size: '24 KB',
                              idNumber: selectedTx.senderPassport || selectedTx.senderNrc,
                              sender: selectedTx.senderName
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                            title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>

                      {/* Row 3: Remittance Advice / Voucher Proof */}
                      <tr className="hover:bg-slate-900/50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-2">
                            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
                              <Receipt className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-200">
                              {language === 'my' ? 'ငွေလွှဲအထောက်အထား' : 'Remittance Advice Proof'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-300 font-medium">
                          {selectedTx.mtcn}
                          <span className="text-[10px] text-slate-400 font-sans ml-1">({Number(selectedTx.receiveAmount || 0).toLocaleString()} MMK)</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <span className="font-mono">Inward_Advice.svg</span>{' '}
                          <span className="text-[10px] text-amber-400 font-bold ml-1">21 KB</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>{language === 'my' ? 'အဆင်သင့်' : 'Ready'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => openLightbox({
                              title: language === 'my' ? 'ပြည်တွင်းငွေထုတ်ယူခွင့် အထောက်အထား (Inward Advice)' : "Remittance Advice & Voucher Proof",
                              url: selectedTx.proofDocumentUrl || createSampleDepositReceiptSvg(
                                selectedTx.senderName,
                                selectedTx.senderNrc || selectedTx.senderPassport || 'N/A',
                                `${Number(selectedTx.sendAmount || 0).toLocaleString()} ${selectedTx.sourceCurrency || 'THB'}`,
                                'International Agent Partner',
                                selectedTx.createdDate ? new Date(selectedTx.createdDate).toLocaleDateString() : 'Today'
                              ),
                              name: 'Inward_Advice.svg',
                              type: 'image/svg+xml',
                              size: '21 KB',
                              idNumber: selectedTx.mtcn,
                              sender: selectedTx.senderName
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-[11px] transition-all cursor-pointer shadow-xs"
                            title={language === 'my' ? 'မူရင်းပုံ ကြည့်ရှုမည်' : 'Preview Picture'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewModal(false);
                    handleOpenEdit(selectedTx);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-semibold text-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'အချက်အလက် ပြင်ဆင်ရန်' : 'Review & Edit'}</span>
                </button>
              )}

              <div className={`flex items-center space-x-2.5 ${!isAdmin ? 'ml-auto' : ''}`}>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'ပိတ်မည်' : 'Close'}
                </button>

                {selectedTx.status === 'PENDING_APPROVAL' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const txToPayout = selectedTx;
                      setShowReviewModal(false);
                      await handleAuthorizePayout(txToPayout);
                    }}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold text-xs shadow-lg transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{language === 'my' ? 'ငွေထုတ်ပေးမည် (Authorize Payout)' : 'Authorize Payout & Issue Voucher'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inward Modal */}
      <EditInwardModal
        isOpen={showEditModal}
        transaction={editingTx}
        onClose={() => {
          setShowEditModal(false);
          setEditingTx(null);
        }}
      />

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={showVoucherModal}
        transaction={voucherTx}
        onClose={() => setShowVoucherModal(false)}
      />

      {/* Document Lightbox Modal for Previewing Original Pictures */}
      {lightboxDoc && (
        <DocumentLightboxModal
          isOpen={lightboxDoc.isOpen}
          onClose={() => setLightboxDoc(null)}
          title={lightboxDoc.title}
          documentUrl={lightboxDoc.url}
          documentName={lightboxDoc.name}
          documentType={lightboxDoc.type}
          documentSize={lightboxDoc.size}
          nrcOrPassportNumber={lightboxDoc.idNumber}
          senderName={lightboxDoc.sender}
          language={language}
        />
      )}
    </div>
  );
};
