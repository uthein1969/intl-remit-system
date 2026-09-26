import React, { useState, useMemo } from 'react';
import { 
  Sliders, 
  ShieldCheck, 
  Globe2, 
  DollarSign, 
  Calendar, 
  Plus, 
  RotateCcw, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Check, 
  X, 
  ArrowRight,
  Calculator,
  Info,
  UploadCloud,
  DownloadCloud
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { MtoComplianceLimit } from '../../types';
import { pushDataToTurso, pullDataFromTurso } from '../../lib/tursoClient';

export const MtoComplianceLimitManager: React.FC = () => {
  const { 
    language, 
    mtoComplianceLimits, 
    saveMtoComplianceLimit, 
    deleteMtoComplianceLimit, 
    resetMtoComplianceLimitsToDefault, 
    db, 
    setDb,
    currentUser,
    getCorridorExchangeRate
  } = useRemittance();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingLimit, setEditingLimit] = useState<MtoComplianceLimit | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPushingTurso, setIsPushingTurso] = useState(false);
  const [isPullingTurso, setIsPullingTurso] = useState(false);

  // Live Simulator state
  const [simCountryCode, setSimCountryCode] = useState('TH');
  const [simSendAmount, setSimSendAmount] = useState<number>(50000);
  const [simUsdRate, setSimUsdRate] = useState<number>(4580);
  const [simExistingMonthlyUsd, setSimExistingMonthlyUsd] = useState<number>(6500);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  const filteredLimits = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return mtoComplianceLimits;
    return mtoComplianceLimits.filter(l => 
      l.countryName.toLowerCase().includes(q) ||
      l.countryCode.toLowerCase().includes(q) ||
      l.currency.toLowerCase().includes(q) ||
      (l.mtoPartnerName && l.mtoPartnerName.toLowerCase().includes(q)) ||
      (l.regulatoryRef && l.regulatoryRef.toLowerCase().includes(q))
    );
  }, [mtoComplianceLimits, searchQuery]);

  const handleOpenAdd = () => {
    setIsNew(true);
    setEditingLimit({
      id: `MTO-LIM-${Date.now().toString().slice(-4)}`,
      countryCode: 'TH',
      countryName: 'Thailand (ထိုင်းနိုင်ငံ)',
      flagEmoji: '🇹🇭',
      currency: 'THB',
      mtoPartnerName: 'Licensed MTO Partner',
      mtoMaxLimitPerTx: 100000,
      mtoMaxLimitPerMonth: 500000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'CBM Foreign Exchange Management Directive & MTO Limit',
      description: '',
      active: true,
      createdAt: new Date().toISOString(),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (limit: MtoComplianceLimit) => {
    setIsNew(false);
    setEditingLimit({ ...limit });
    setShowModal(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLimit) return;
    await saveMtoComplianceLimit(editingLimit);
    setShowModal(false);
    setEditingLimit(null);
    showToast(language === 'my' ? 'ကန့်သတ်ချက်များ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ' : 'MTO Compliance Limit saved successfully!');
  };

  const handleDeleteConfirm = async (id: string) => {
    await deleteMtoComplianceLimit(id);
    setDeleteConfirmId(null);
    showToast(language === 'my' ? 'ကန့်သတ်ချက်ကို ပယ်ဖျက်ပြီးပါပြီ' : 'Limit deleted successfully');
  };

  const handleRestoreDefaults = async () => {
    if (window.confirm(language === 'my' 
      ? 'ဗဟိုဘဏ်နှင့် MTO မူလသတ်မှတ်စံနှုန်းများ (Default Standards) အတိုင်း အားလုံးပြန်ထားမည်မှာ သေချာပါသလား?' 
      : 'Reset all MTO & Inward Domestic USD limits to official Central Bank & MTO bilateral default standards?')) {
      await resetMtoComplianceLimitsToDefault();
      showToast(language === 'my' ? 'မူလစံသတ်မှတ်ချက်များသို့ ပြန်လည်ပြောင်းလဲပြီးပါပြီ' : 'Reset to default standards successfully!');
    }
  };

  const handleToggleActive = async (limit: MtoComplianceLimit) => {
    await saveMtoComplianceLimit({
      ...limit,
      active: !limit.active
    });
    showToast(limit.active 
      ? (language === 'my' ? `[${limit.countryCode}] ကို ပိတ်ထားလိုက်ပါပြီ` : `Disabled ${limit.countryCode}`)
      : (language === 'my' ? `[${limit.countryCode}] ကို ဖွင့်ထားလိုက်ပါပြီ` : `Activated ${limit.countryCode}`)
    );
  };

  const handlePushTurso = async () => {
    setIsPushingTurso(true);
    try {
      const res = await pushDataToTurso({
        mtoComplianceLimits: mtoComplianceLimits
      });
      if (res.success) {
        showToast(language === 'my'
          ? `Turso Cloud DB သို့ MTO Limits (${mtoComplianceLimits.length} စင်္ကြံ) ပို့ဆောင်ပြီးပါပြီ!`
          : `Pushed ${mtoComplianceLimits.length} MTO corridors to Turso Cloud DB!`);
      } else {
        alert(res.error || 'Failed to push to Turso');
      }
    } catch (e: any) {
      alert(e?.message || 'Error pushing to Turso');
    } finally {
      setIsPushingTurso(false);
    }
  };

  const handlePullTurso = async () => {
    setIsPullingTurso(true);
    try {
      const res = await pullDataFromTurso();
      if (res.success && res.data?.mtoComplianceLimits && res.data.mtoComplianceLimits.length > 0) {
        setDb(prev => ({
          ...prev,
          mtoComplianceLimits: res.data!.mtoComplianceLimits!
        }));
        showToast(language === 'my'
          ? `Turso Cloud DB မှ MTO Limits (${res.data.mtoComplianceLimits.length} စင်္ကြံ) ဆွဲယူပြီးပါပြီ!`
          : `Pulled ${res.data.mtoComplianceLimits.length} MTO corridors from Turso Cloud DB!`);
      } else {
        showToast(language === 'my' ? 'Turso Cloud တွင် MTO Limits အသစ် မရှိသေးပါ' : 'No new MTO limits found in Turso');
      }
    } catch (e: any) {
      alert(e?.message || 'Error pulling from Turso');
    } finally {
      setIsPullingTurso(false);
    }
  };

  // Live Simulator calculation
  const simActiveLimit = mtoComplianceLimits.find(l => l.countryCode === simCountryCode) || mtoComplianceLimits[0];
  const simExRate = simActiveLimit ? (getCorridorExchangeRate(simActiveLimit.currency, 'MMK') || (simActiveLimit.currency === 'THB' ? 134.5 : 1)) : 1;
  const simMmk = simSendAmount * simExRate;
  const simUsd = simUsdRate > 0 ? Number((simMmk / simUsdRate).toFixed(2)) : 0;
  const simTotalMonthlyUsd = simExistingMonthlyUsd + simUsd;

  const simIsMtoExceeded = simSendAmount > (simActiveLimit?.mtoMaxLimitPerTx || 0);
  const simIsUsdTxExceeded = simUsd > (simActiveLimit?.inwardMaxUsdPerTx || 0);
  const simIsUsdMonthlyExceeded = simTotalMonthlyUsd > (simActiveLimit?.inwardMaxUsdPerMonth || 0);
  const simIsAllUnderLimit = !simIsMtoExceeded && !simIsUsdTxExceeded && !simIsUsdMonthlyExceeded;

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-xs shadow-xl animate-in fade-in slide-in-from-top-2 border border-emerald-400/40">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-6 rounded-2xl border border-indigo-900/50 shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-xs uppercase tracking-wider mb-1.5">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Admin Setup &bull; Compliance & Regulations</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-500/30">
                Rule 13
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>{language === 'my' 
                ? 'MTO နှင့် မြန်မာနိုင်ငံတွင်း (Inward) ငွေလွှဲပမာဏ ကန့်သတ်ချက်များ စီမံခန့်ခွဲခြင်း' 
                : 'MTO & Myanmar Domestic Inward Remittance Limits Manager'}</span>
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
              {language === 'my'
                ? 'နိုင်ငံတကာမှ မြန်မာနိုင်ငံသို့ ငွေလွှဲပို့ရာတွင် သက်ဆိုင်ရာ နိုင်ငံအလိုက် MTO မိတ်ဖက်များ၏ ငွေကြေးကန့်သတ်ချက်နှင့် မြန်မာနိုင်ငံတော်ဗဟိုဘဏ် (CBM) မှ သတ်မှတ်ထားသော တစ်ကြိမ်လျှင် ဒေါ်လာပမာဏ ($ USD per tx) နှင့် တစ်လတာ စုစုပေါင်း ဒေါ်လာပမာဏ ($ USD per month) ကန့်သတ်ချက်များကို စီမံခန့်ခွဲခြင်း ဖြစ်ပါသည်။'
                : 'Configure corridor limits for sender country currencies (e.g. THB, SGD, MYR) set by MTOs, along with Central Bank of Myanmar (CBM) regulated Inward Domestic USD caps per single transaction and cumulative monthly quota.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              id="btn-mto-turso-push"
              disabled={isPushingTurso}
              onClick={handlePushTurso}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 border border-emerald-400/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Push MTO & Myanmar Inward Limits to Turso Cloud DB"
            >
              <UploadCloud className={`w-3.5 h-3.5 text-white ${isPushingTurso ? 'animate-bounce' : ''}`} />
              <span className="text-white font-bold">
                {isPushingTurso
                  ? (language === 'my' ? 'Turso သို့ ပို့နေသည်...' : 'Pushing...')
                  : (language === 'my' ? 'Turso သို့ Push' : 'Push to Turso')}
              </span>
            </button>

            <button
              type="button"
              id="btn-mto-turso-pull"
              disabled={isPullingTurso}
              onClick={handlePullTurso}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 border border-sky-400/40 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Pull MTO & Myanmar Inward Limits from Turso Cloud DB"
            >
              <DownloadCloud className={`w-3.5 h-3.5 text-white ${isPullingTurso ? 'animate-bounce' : ''}`} />
              <span className="text-white font-bold">
                {isPullingTurso
                  ? (language === 'my' ? 'Turso မှ ရယူနေသည်...' : 'Pulling...')
                  : (language === 'my' ? 'Turso မှ Pull' : 'Pull from Turso')}
              </span>
            </button>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white text-xs font-bold border border-slate-600 shadow-sm transition-all cursor-pointer active:scale-95"
              title="Reset to Central Bank default limits"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-bold">{language === 'my' ? 'CBM စံနှုန်းများအတိုင်း ပြန်ထားမည်' : 'Restore CBM Standards'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold shadow-md shadow-blue-500/25 border border-blue-400/40 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="text-white font-bold">{language === 'my' ? '+ ကန့်သတ်ချက် အသစ်ထည့်မည်' : '+ Add Corridor Limit'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
              {language === 'my' ? 'Inward ဒေါ်လာကန့်သတ်ချက် (တစ်ကြိမ်)' : 'Inward USD / Single Tx'}
            </span>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              $5,000.00 USD
            </div>
            <span className="text-[10px] text-sky-400 font-medium">
              {language === 'my' ? 'ဗဟိုဘဏ် CBM စံသတ်မှတ်ချက်' : 'CBM Standard Limit'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
              {language === 'my' ? 'Inward ဒေါ်လာကန့်သတ်ချက် (တစ်လတာ)' : 'Inward USD / Monthly Cap'}
            </span>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              $25,000.00 USD
            </div>
            <span className="text-[10px] text-indigo-400 font-medium">
              {language === 'my' ? 'လစဉ် စုစုပေါင်း အများဆုံးခွင့်ပြုငွေ' : 'Cumulative Monthly Ceiling'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Globe2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
              {language === 'my' ? 'သတ်မှတ်ထားသော စင်္ကြံများ' : 'Active MTO Corridors'}
            </span>
            <div className="text-lg font-black text-white font-mono mt-0.5">
              {mtoComplianceLimits.filter(l => l.active).length} / {mtoComplianceLimits.length}
            </div>
            <span className="text-[10px] text-amber-400 font-medium">
              TH, SG, MY, JP, KR, AE, INTL
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center space-x-3.5 shadow-xs">
          <div className="p-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
              {language === 'my' ? 'Outward Entry တွင် စစ်ဆေးမှု' : 'Outward Entry Check'}
            </span>
            <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>LIVE ENFORCEMENT</span>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">
              {language === 'my' ? 'စည်းကမ်းကျော်လွန်မှု အလိုအလျောက်တားဆီး' : 'Real-time Ceiling Validation'}
            </span>
          </div>
        </div>
      </div>

      {/* Corridor Table & Limits List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'my' ? 'နိုင်ငံ၊ ငွေကြေး သို့မဟုတ် MTO ဖြင့် ရှာဖွေရန်...' : 'Filter by country, currency or partner...'}
                className="pl-9 pr-3.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64 sm:w-80"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400">
            {language === 'my' ? `စုစုပေါင်း: ${filteredLimits.length} ခု တွေ့ရှိပါသည်` : `Showing ${filteredLimits.length} corridors`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="py-3 px-4">{language === 'my' ? 'နိုင်ငံ / စင်္ကြံ' : 'Sender Country'}</th>
                <th className="py-3 px-4">{language === 'my' ? 'ငွေကြေး & MTO မိတ်ဖက်' : 'Currency & MTO Partner'}</th>
                <th className="py-3 px-4 text-right">{language === 'my' ? 'MTO ကန့်သတ်ငွေ (တစ်ကြိမ်)' : 'Sender MTO Limit (Per Tx)'}</th>
                <th className="py-3 px-4 text-right">{language === 'my' ? 'Inward ဒေါ်လာကန့်သတ်ငွေ (တစ်ကြိမ်)' : 'Inward USD Limit (Per Tx)'}</th>
                <th className="py-3 px-4 text-right">{language === 'my' ? 'Inward ဒေါ်လာကန့်သတ်ငွေ (တစ်လ)' : 'Inward USD Limit (Per Month)'}</th>
                <th className="py-3 px-4 text-center">{language === 'my' ? 'အခြေအနေ' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{language === 'my' ? 'လုပ်ဆောင်ချက်' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredLimits.map((limit) => {
                return (
                  <tr key={limit.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-xl leading-none">{limit.flagEmoji || '🌐'}</span>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm flex items-center space-x-1.5">
                            <span>{limit.countryName}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {limit.countryCode}
                            </span>
                          </div>
                          {limit.regulatoryRef && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1 max-w-xs" title={limit.regulatoryRef}>
                              {limit.regulatoryRef}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold font-mono text-[11px] border border-amber-500/30">
                          {limit.currency}
                        </span>
                        <div className="text-xs text-slate-300 font-medium">
                          {limit.mtoPartnerName || 'Standard Partner'}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-xs sm:text-sm font-black text-amber-300">
                        {limit.mtoMaxLimitPerTx.toLocaleString()} {limit.currency}
                      </div>
                      {limit.mtoMaxLimitPerMonth && (
                        <div className="text-[10px] text-slate-400">
                          Mo: {limit.mtoMaxLimitPerMonth.toLocaleString()} {limit.currency}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-xs sm:text-sm font-black text-sky-400">
                        ${limit.inwardMaxUsdPerTx.toLocaleString()} USD
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Per Single Transaction
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono">
                      <div className="text-xs sm:text-sm font-black text-indigo-300">
                        ${limit.inwardMaxUsdPerMonth.toLocaleString()} USD
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Per Calendar Month
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(limit)}
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                          limit.active
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${limit.active ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        <span>{limit.active ? (language === 'my' ? 'ဖွင့်ထား' : 'Active') : (language === 'my' ? 'ပိတ်ထား' : 'Disabled')}</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(limit)}
                          className="p-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 transition-all cursor-pointer"
                          title="Edit Limit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {limit.countryCode !== 'DEFAULT' && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(limit.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-all cursor-pointer"
                            title="Delete Corridor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Compliance Sandbox / Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                {language === 'my' ? 'ကန့်သတ်ချက်များ လက်တွေ့ စမ်းသပ်တွက်ချက်မှု (Compliance Simulator)' : 'Live Compliance Calculator & Limit Sandbox'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'my' ? 'Outward Entry တွင် ငွေလွှဲပမာဏ ရိုက်ထည့်သည့်အခါ စနစ်မှ စစ်ဆေးမည့် အခြေအနေကို စမ်းသပ်ကြည့်ရှုနိုင်ပါသည်' : 'Simulate how Outward Entry validates sender MTO currency and CBM Inward USD ceilings in real-time'}
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
            simIsAllUnderLimit 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          }`}>
            {simIsAllUnderLimit ? '✓ UNDER ALL LIMITS (PASS)' : '⚠️ LIMIT EXCEEDED (BLOCK)'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-semibold">Sender Country</label>
            <select
              value={simCountryCode}
              onChange={(e) => {
                setSimCountryCode(e.target.value);
                const match = mtoComplianceLimits.find(l => l.countryCode === e.target.value);
                if (match) {
                  if (match.currency === 'THB') setSimSendAmount(50000);
                  else if (match.currency === 'SGD') setSimSendAmount(3000);
                  else if (match.currency === 'MYR') setSimSendAmount(8000);
                  else setSimSendAmount(2000);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold"
            >
              {mtoComplianceLimits.map(l => (
                <option key={l.id} value={l.countryCode}>
                  {l.flagEmoji} {l.countryName} ({l.currency})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
              Send Amount ({simActiveLimit?.currency})
            </label>
            <input
              type="number"
              value={simSendAmount}
              onChange={(e) => setSimSendAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-300"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
              Market USD Rate (1 USD in MMK)
            </label>
            <input
              type="number"
              value={simUsdRate}
              onChange={(e) => setSimUsdRate(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-sky-300"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
              Prior Monthly Used ($ USD)
            </label>
            <input
              type="number"
              value={simExistingMonthlyUsd}
              onChange={(e) => setSimExistingMonthlyUsd(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-300"
            />
          </div>
        </div>

        {/* Simulator Verification Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
          {/* Card 1: Sender MTO Limit */}
          <div className={`p-4 rounded-xl border ${
            simIsMtoExceeded 
              ? 'bg-rose-950/30 border-rose-700/60' 
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-semibold">1. Sender MTO Limit</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                simIsMtoExceeded ? 'bg-rose-600 text-white' : 'bg-emerald-600/30 text-emerald-300'
              }`}>
                {simIsMtoExceeded ? 'EXCEEDED' : 'PASS'}
              </span>
            </div>
            <div className="text-base font-black text-amber-400 font-mono">
              {simSendAmount.toLocaleString()} / {(simActiveLimit?.mtoMaxLimitPerTx || 0).toLocaleString()} {simActiveLimit?.currency}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simIsMtoExceeded 
                ? `Exceeds sender MTO limit by ${(simSendAmount - (simActiveLimit?.mtoMaxLimitPerTx || 0)).toLocaleString()} ${simActiveLimit?.currency}!` 
                : `Available under limit: ${((simActiveLimit?.mtoMaxLimitPerTx || 0) - simSendAmount).toLocaleString()} ${simActiveLimit?.currency} remaining`}
            </p>
          </div>

          {/* Card 2: Inward Domestic USD Limit (Per Tx) */}
          <div className={`p-4 rounded-xl border ${
            simIsUsdTxExceeded 
              ? 'bg-rose-950/30 border-rose-700/60' 
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-semibold">2. Inward USD / Single Tx</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                simIsUsdTxExceeded ? 'bg-rose-600 text-white' : 'bg-emerald-600/30 text-emerald-300'
              }`}>
                {simIsUsdTxExceeded ? 'EXCEEDED' : 'PASS'}
              </span>
            </div>
            <div className="text-base font-black text-sky-400 font-mono">
              ${simUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${(simActiveLimit?.inwardMaxUsdPerTx || 0).toLocaleString()} USD
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simIsUsdTxExceeded 
                ? `Exceeds single tx USD limit by $${(simUsd - (simActiveLimit?.inwardMaxUsdPerTx || 0)).toFixed(2)} USD!` 
                : `Available single tx capacity: $${((simActiveLimit?.inwardMaxUsdPerTx || 0) - simUsd).toFixed(2)} USD remaining`}
            </p>
          </div>

          {/* Card 3: Inward Domestic USD Limit (Per Month) */}
          <div className={`p-4 rounded-xl border ${
            simIsUsdMonthlyExceeded 
              ? 'bg-rose-950/30 border-rose-700/60' 
              : 'bg-slate-950/60 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400 font-semibold">3. Inward USD / Month</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                simIsUsdMonthlyExceeded ? 'bg-rose-600 text-white' : 'bg-emerald-600/30 text-emerald-300'
              }`}>
                {simIsUsdMonthlyExceeded ? 'EXCEEDED' : 'PASS'}
              </span>
            </div>
            <div className="text-base font-black text-indigo-400 font-mono">
              ${simTotalMonthlyUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${(simActiveLimit?.inwardMaxUsdPerMonth || 0).toLocaleString()} USD
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {simIsUsdMonthlyExceeded 
                ? `Exceeds monthly limit by $${(simTotalMonthlyUsd - (simActiveLimit?.inwardMaxUsdPerMonth || 0)).toFixed(2)} USD!` 
                : `Available monthly quota remaining: $${((simActiveLimit?.inwardMaxUsdPerMonth || 0) - simTotalMonthlyUsd).toFixed(2)} USD`}
            </p>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && editingLimit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 text-xs text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  <Sliders className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">
                  {isNew ? (language === 'my' ? 'ကန့်သတ်ချက် အသစ်ထည့်သွင်းခြင်း' : 'Add New Corridor Limit') : (language === 'my' ? 'ကန့်သတ်ချက် ပြင်ဆင်ခြင်း' : 'Edit Corridor Limit')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Country Code & Name</label>
                  <input
                    type="text"
                    required
                    value={editingLimit.countryName}
                    onChange={(e) => setEditingLimit({ ...editingLimit, countryName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium"
                    placeholder="e.g. Thailand (ထိုင်းနိုင်ငံ)"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Code & Flag</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      required
                      value={editingLimit.countryCode}
                      onChange={(e) => setEditingLimit({ ...editingLimit, countryCode: e.target.value.toUpperCase() })}
                      className="w-20 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase font-bold text-center"
                      placeholder="TH"
                    />
                    <input
                      type="text"
                      value={editingLimit.flagEmoji || ''}
                      onChange={(e) => setEditingLimit({ ...editingLimit, flagEmoji: e.target.value })}
                      className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white text-center text-base"
                      placeholder="🇹🇭"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">Sender Currency</label>
                  <input
                    type="text"
                    required
                    value={editingLimit.currency}
                    onChange={(e) => setEditingLimit({ ...editingLimit, currency: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold"
                    placeholder="THB"
                  />
                </div>
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">MTO Partner Name</label>
                  <input
                    type="text"
                    value={editingLimit.mtoPartnerName || ''}
                    onChange={(e) => setEditingLimit({ ...editingLimit, mtoPartnerName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    placeholder="e.g. TrueMoney / DeeMoney"
                  />
                </div>
              </div>

              {/* Limits Section */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="font-bold text-amber-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>1. Sender Country MTO Currency Limits</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      MTO Max Limit Per Tx ({editingLimit.currency})
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingLimit.mtoMaxLimitPerTx}
                      onChange={(e) => setEditingLimit({ ...editingLimit, mtoMaxLimitPerTx: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      MTO Monthly Limit ({editingLimit.currency})
                    </label>
                    <input
                      type="number"
                      value={editingLimit.mtoMaxLimitPerMonth || 0}
                      onChange={(e) => setEditingLimit({ ...editingLimit, mtoMaxLimitPerMonth: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <h4 className="font-bold text-sky-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span>2. Inward Country "Domestic" Myanmar Regulated USD Limits</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Inward Max USD / Single Tx ($ USD)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingLimit.inwardMaxUsdPerTx}
                      onChange={(e) => setEditingLimit({ ...editingLimit, inwardMaxUsdPerTx: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-sky-600/70 rounded-xl px-3 py-2 text-sky-400 font-mono font-bold text-sm"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: $5,000 USD</span>
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Inward Max USD / Calendar Month ($ USD)
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={editingLimit.inwardMaxUsdPerMonth}
                      onChange={(e) => setEditingLimit({ ...editingLimit, inwardMaxUsdPerMonth: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-indigo-600/70 rounded-xl px-3 py-2 text-indigo-400 font-mono font-bold text-sm"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Standard: $25,000 USD</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Regulatory Reference</label>
                <input
                  type="text"
                  value={editingLimit.regulatoryRef || ''}
                  onChange={(e) => setEditingLimit({ ...editingLimit, regulatoryRef: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Central Bank of Myanmar (CBM) Cross-Border Bilateral Ceiling"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  value={editingLimit.description || ''}
                  onChange={(e) => setEditingLimit({ ...editingLimit, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white resize-none"
                  placeholder="Additional compliance guidelines..."
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="limitActive"
                  checked={editingLimit.active}
                  onChange={(e) => setEditingLimit({ ...editingLimit, active: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 bg-slate-950 border-slate-700 focus:ring-blue-500"
                />
                <label htmlFor="limitActive" className="text-slate-200 font-bold select-none cursor-pointer">
                  {language === 'my' ? 'ဤကန့်သတ်ချက်ကို စနစ်တွင် အသက်ဝင်စေမည် (Active)' : 'Enable this Corridor Limit in Outward Entry validation'}
                </label>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95 border border-blue-400/40"
                >
                  {language === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Limit Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl text-xs text-white">
            <div className="flex items-center space-x-2 text-rose-400 font-bold mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span>{language === 'my' ? 'ဖျက်ရန် အတည်ပြုပါ' : 'Confirm Deletion'}</span>
            </div>
            <p className="text-slate-300 mb-4 leading-relaxed">
              {language === 'my' 
                ? 'ဤစင်္ကြံ၏ MTO နှင့် Inward USD ကန့်သတ်ချက်များကို ဖျက်ပစ်ရန် သေချာပါသလား?' 
                : 'Are you sure you want to delete this corridor limit?'}
            </p>
            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold text-xs shadow-xs cursor-pointer active:scale-95"
              >
                {language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deleteConfirmId)}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 cursor-pointer active:scale-95"
              >
                {language === 'my' ? 'ဖျက်မည်' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
