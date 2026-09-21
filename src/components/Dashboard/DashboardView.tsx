import React, { useState } from 'react';
import { 
  TrendingUp, 
  Send, 
  DownloadCloud, 
  CheckSquare, 
  ShieldAlert, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Coins, 
  Building2, 
  Eye, 
  Printer, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  ChevronRight,
  MapPin,
  Phone,
  Edit3
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { RemittanceTransaction } from '../../types';
import { VoucherModal } from '../VoucherModal';
import { CompanyProfileModal } from '../CompanyProfileModal';
import { NavigationTab, SetupSubTab } from '../Sidebar';

interface DashboardViewProps {
  onNavigate: (tab: NavigationTab, setupTab?: SetupSubTab, targetTxId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { db, language, t, currentUser, operatorProfile } = useRemittance();
  const [selectedVoucherTx, setSelectedVoucherTx] = useState<RemittanceTransaction | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Safe number formatter
  const formatAmount = (val: any): string => {
    if (val === undefined || val === null || val === '') return '0';
    const num = Number(val);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // Safe date time formatter
  const formatTime = (dateVal: any): string => {
    if (!dateVal) return '';
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Calculations
  const outwardTxs = (db?.transactions || []).filter(t => t?.type === 'OUTWARD');
  const inwardTxs = (db?.transactions || []).filter(t => t?.type === 'INWARD');
  
  const totalOutwardMMK = outwardTxs.reduce((sum, tx) => {
    const amt = Number(
      tx.targetCurrency === 'MMK'
        ? tx.receiveAmount
        : tx.sourceCurrency === 'MMK'
        ? tx.sendAmount
        : Number(tx.receiveAmount || (Number(tx.sendAmount || 0) * Number(tx.exchangeRate || 1)) || 0)
    );
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const totalInwardMMK = inwardTxs.reduce((sum, tx) => {
    const amt = Number(tx.targetCurrency === 'MMK' ? tx.receiveAmount : tx.sendAmount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const pendingTxs = (db?.transactions || []).filter(t => t?.status === 'PENDING_APPROVAL');
  const activeBlacklistCount = (db?.blacklist || []).filter(b => b?.active).length;

  const handleOpenApproval = (tx: RemittanceTransaction) => {
    if (tx.type === 'OUTWARD') {
      onNavigate('outward_approve', undefined, tx.id);
    } else {
      onNavigate('inward_approve', undefined, tx.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              {language === 'my' ? 'စနစ် ကောင်းမွန်စွာ လည်ပတ်နေပါသည်' : 'System Operational'}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-[11px] text-slate-500">
              {new Date().toLocaleDateString(language === 'my' ? 'my-MM' : 'en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1">
            {language === 'my' ? 'ငွေလွှဲလုပ်ငန်း ပင်မ စီမံခန့်ခွဲမှု (Dashboard)' : 'Remittance Control Terminal'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'my' 
              ? 'ပြည်တွင်းနှင့် ပြည်ပ ငွေလွှဲစီးဆင်းမှု၊ စစ်ဆေးအတည်ပြုရန် ကျန်ရှိမှုများ နှင့် နာမည်ပျက်စာရင်း စောင့်ကြည့်မှုများ' 
              : 'Real-time overview of outward & inward transfer flows, maker-checker queues, and AML watchlist.'}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('outward_entry')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ငွေလွှဲပို့မည်' : 'New Outward'}</span>
          </button>
          <button
            onClick={() => onNavigate('inward_entry')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <DownloadCloud className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'ငွေလွှဲထုတ်မည်' : 'New Inward Claim'}</span>
          </button>
          <button
            onClick={() => onNavigate('admin_setup', 'blacklist')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{language === 'my' ? 'Blacklist စစ်ဆေး' : 'Blacklist'}</span>
          </button>
        </div>
      </div>

      {/* Official Orange Rectangular Box: Remittance Software Operating Company (လိမ္မော်ရောင်လေးဒေါင့်အကွက်) */}
      <div className="border-2 border-orange-500 bg-orange-50/60 rounded-xl p-4 shadow-xs relative">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-orange-200/80 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded">
                  {language === 'my' ? 'Remittance Software အသုံးပြုသည့် ကုမ္ပဏီ (Orange Box)' : 'REMITTANCE OPERATING INSTITUTION'}
                </span>
                {operatorProfile.licenseNo && (
                  <span className="text-[10px] font-mono font-bold text-orange-950 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                    {operatorProfile.licenseNo}
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-orange-950 mt-0.5 tracking-tight leading-snug">
                {language === 'my' 
                  ? `${operatorProfile.companyNameMm} (${operatorProfile.companyNameEn})`
                  : operatorProfile.companyNameEn}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('admin_setup', 'operator_profile')}
            className="self-start md:self-center flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <Edit3 className="w-3.5 h-3.5 text-orange-600" />
            <span>{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန် (Setting)' : 'Edit Company Info (Setting)'}</span>
          </button>
        </div>

        {/* Address & Phone details inside the Orange Rectangular Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 text-xs text-slate-800">
          <div className="flex items-start space-x-2.5">
            <div className="p-1 rounded bg-orange-100 text-orange-700 mt-0.5 shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div className="leading-snug">
              <span className="font-bold text-orange-950 block">{language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office Address'}:</span>
              <span className="text-slate-700 font-medium">
                {language === 'my' ? operatorProfile.addressMm : operatorProfile.addressEn}
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="p-1 rounded bg-orange-100 text-orange-700 mt-0.5 shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <div className="leading-snug">
              <span className="font-bold text-orange-950 block">{language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone / Hotline'}:</span>
              <span className="font-mono font-bold text-slate-900">{operatorProfile.phone}</span>
              {operatorProfile.hotline && (
                <span className="text-slate-600 ml-2">
                  (Hotline: <strong className="font-mono text-orange-700">{operatorProfile.hotline}</strong>)
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Outward Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.todayOutward}
            </span>
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatAmount(totalOutwardMMK)}
            </span>
            <span className="text-xs text-blue-600 ml-1 font-bold">MMK</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{outwardTxs.length} {language === 'my' ? 'ကြိမ် လွှဲပို့ပြီး' : 'transactions'}</span>
            <button 
              onClick={() => onNavigate('outward_report')}
              className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Inward Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.todayInward}
            </span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
              {formatAmount(totalInwardMMK)}
            </span>
            <span className="text-xs text-emerald-600 ml-1 font-bold">MMK</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{inwardTxs.length} {language === 'my' ? 'ကြိမ် ထုတ်ယူပြီး' : 'payouts'}</span>
            <button 
              onClick={() => onNavigate('inward_report')}
              className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.pendingApprovals}
            </span>
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-amber-600 font-mono tracking-tight">
              {pendingTxs.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'my' ? 'ခု စိစစ်ရန်' : 'awaiting checker'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-amber-700 font-medium">{language === 'my' ? 'Maker တင်ပြချက်' : 'Requires action'}</span>
            <button 
              onClick={() => onNavigate('outward_approve')}
              className="text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-0.5"
            >
              <span>{language === 'my' ? 'စစ်ဆေးမည်' : 'Review'}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Blacklist Screening Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t.activeBlacklist}
            </span>
            <div className="w-7 h-7 rounded-md bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-rose-600 font-mono tracking-tight">
              {activeBlacklistCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {language === 'my' ? 'ဦး ပိတ်ပင်ထား' : 'flagged subjects'}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="text-rose-700 font-medium">NRC & Passport</span>
            <button 
              onClick={() => onNavigate('admin_setup', 'blacklist')}
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-0.5"
            >
              <span>{t.viewAll}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Live Exchange Rates Ticker Board */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {t.exchangeRateBoard} (MMK)
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin_setup', 'exchange_rate')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>{language === 'my' ? 'ငွေလဲနှုန်း ပြင်ဆင်မည်' : 'Adjust Rates'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-3">
          {db.exchangeRates.slice(0, 6).map((rate) => {
            const country = db.countries.find(c => c.currencyCode === rate.fromCurrency);
            return (
              <div 
                key={rate.id}
                className="bg-slate-50 border border-slate-200 rounded-md p-2.5 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm">{country?.flagEmoji || '💱'}</span>
                    <span className="font-bold text-xs text-slate-800">{rate.fromCurrency}/MMK</span>
                  </div>
                </div>
                <div className="mt-1.5 space-y-0.5 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] text-slate-500">{language === 'my' ? 'ငွေလွှဲ:' : 'Remit:'}</span>
                    <strong className="text-blue-600 font-mono font-bold text-xs">
                      {formatAmount(rate.transferRate)}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{language === 'my' ? 'ဝယ်/ရောင်း:' : 'B/S:'}</span>
                    <span className="font-mono">{formatAmount(rate.buyRate)}/{formatAmount(rate.sellRate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Branch Network Operations Status */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              {language === 'my' ? 'ဘဏ်ခွဲများ ကွန်ရက်နှင့် လည်ပတ်မှုအခြေအနေ (Branch Network Operations)' : 'Branch Network Operations'} ({db.branches.length})
            </h3>
          </div>
          <button
            onClick={() => onNavigate('admin_setup', 'branch')}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
          >
            <span>{language === 'my' ? 'ဘဏ်ခွဲများ စီမံခန့်ခွဲရန်' : 'Manage Branches'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-3">
          {db.branches.map((b) => {
            const branchTxCount = db.transactions.filter(
              t => t.sendingBranchId === b.id || t.payoutBranchId === b.id
            ).length;
            return (
              <div 
                key={b.id}
                className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {b.code}
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1" title={b.nameEn}>
                    {language === 'my' && b.nameMm ? b.nameMm : b.nameEn}
                  </h4>
                  <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5" title={b.address}>
                    {b.city}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">{language === 'my' ? 'ငွေလွှဲအရေအတွက်' : 'Transactions'}:</span>
                  <span className="font-mono font-bold text-slate-800">{branchTxCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2-Column: Urgent Pending Approval Queue & Recent Completed Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 7 cols: Urgent Approval Queue */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {t.urgentQueue} ({pendingTxs.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('outward_approve')}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                >
                  {language === 'my' ? 'Outward အတည်ပြုရန်' : 'Outward Queue'}
                </button>
                <span className="text-slate-300">•</span>
                <button
                  onClick={() => onNavigate('inward_approve')}
                  className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700"
                >
                  {language === 'my' ? 'Inward အတည်ပြုရန်' : 'Inward Queue'}
                </button>
              </div>
            </div>

            {pendingTxs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
                <p className="font-medium text-slate-600">{t.noPendingTransactions}</p>
                <span className="text-[11px] text-slate-400">All pending transfers have been processed</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTxs.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 px-2 rounded-lg transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${
                          tx.type === 'OUTWARD' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {tx.type}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-900">{tx.transactionNo}</span>
                        <span className="text-[11px] text-slate-500 font-mono">MTCN: {tx.mtcn}</span>
                      </div>
                      <div className="text-xs text-slate-800 mt-1 font-semibold truncate">
                        <strong>{tx.senderName}</strong> <span className="text-slate-400 font-normal">➔</span> <strong>{tx.receiverName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>{tx.purposeName}</span>
                        <span>•</span>
                        <span className="inline-flex items-center space-x-1 text-slate-700 font-medium">
                          <Building2 className="w-3 h-3 text-sky-500 shrink-0" />
                          <span>{db.branches.find(b => b.id === (tx.sendingBranchId || tx.payoutBranchId))?.nameEn || 'Yangon HQ'}</span>
                        </span>
                        <span>•</span>
                        <span>Maker: <strong className="text-slate-700">{tx.creatorName}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                      <div className="text-right shrink-0 min-w-[110px]">
                        <div className="text-xs font-bold font-mono text-blue-600 whitespace-nowrap">
                          {formatAmount(tx.sendAmount)} {tx.sourceCurrency}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                          ➔ {formatAmount(tx.receiveAmount)} {tx.targetCurrency}
                        </div>
                      </div>

                      {/* Review & Approve button - Navigates to relevant approval view without direct auto-approval */}
                      <button
                        type="button"
                        onClick={() => handleOpenApproval(tx)}
                        className="w-[180px] h-9 shrink-0 inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs whitespace-nowrap px-3 text-center cursor-pointer hover:scale-[1.01]"
                        title={language === 'my' 
                          ? (tx.type === 'OUTWARD' ? 'Outward အတည်ပြုရန် စာမျက်နှာတွင် အသေးစိတ် စစ်ဆေးမည်' : 'Inward အတည်ပြုရန် စာမျက်နှာတွင် အသေးစိတ် စစ်ဆေးမည်')
                          : (tx.type === 'OUTWARD' ? 'Review & Approve in Outward Queue' : 'Review & Authorize in Inward Queue')}
                      >
                        {t.approve}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 5 cols: Recent Transactions Feed + Blacklist Alert Mini-Card */}
        <div className="lg:col-span-5 space-y-4">
          {/* Recent Completed */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                {t.recentTransactions}
              </h3>
              <button
                onClick={() => onNavigate('outward_report')}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
              >
                {t.viewAll}
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {db.transactions.slice(0, 4).map((tx) => (
                <div key={tx.id} className="py-2 flex items-center justify-between hover:bg-slate-50 px-1 rounded transition-colors">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-xs font-bold text-slate-800">{tx.transactionNo}</span>
                      <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                        tx.status === 'APPROVED' || tx.status === 'PAID_OUT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : tx.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-600 mt-0.5">
                      <span className="truncate max-w-[150px]">{tx.senderName} ➔ {tx.receiverName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-sky-600 font-mono font-semibold text-[10px]">
                        {db.branches.find(b => b.id === (tx.sendingBranchId || tx.payoutBranchId))?.code || 'BR-001'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-slate-900">
                        {formatAmount(tx.receiveAmount)} {tx.targetCurrency}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {formatTime(tx.createdDate)}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedVoucherTx(tx)}
                      className="p-1.5 rounded-lg hover:bg-orange-50 text-slate-500 hover:text-orange-600 border border-slate-200 hover:border-orange-300 transition-colors cursor-pointer"
                      title={t.printVoucher}
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blacklist Monitor card */}
          <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-rose-200/80">
              <div className="flex items-center space-x-1.5 text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  AML Blacklist Monitor
                </h3>
              </div>
              <button
                onClick={() => onNavigate('admin_setup', 'blacklist')}
                className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
              >
                Manage
              </button>
            </div>

            <div className="mt-2 space-y-1.5">
              {db.blacklist.slice(0, 2).map((item) => (
                <div key={item.id} className="bg-white border border-rose-200 rounded p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-[11px]">{item.fullNameEn || (item as any).nameEn} ({item.fullNameMm || (item as any).nameMm})</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded">
                      {item.riskLevel}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                    NRC: {item.nrcNumber || 'N/A'} • Passport: {item.passportNumber || item.passbookNumber || 'N/A'}
                  </div>
                  <p className="text-[10px] text-rose-900 mt-0.5 line-clamp-1 italic">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Voucher Modal */}
      <VoucherModal
        isOpen={!!selectedVoucherTx}
        transaction={selectedVoucherTx}
        onClose={() => setSelectedVoucherTx(null)}
      />

      {/* Edit Operating Company Profile Modal */}
      <CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />
    </div>
  );
};
