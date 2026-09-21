import React from 'react';
import { 
  Building2, 
  Database, 
  Download, 
  UserCheck, 
  ArrowLeftRight,
  Menu,
  ShieldCheck,
  LogOut,
  MapPin,
  Phone,
  Edit3,
  RefreshCw
} from 'lucide-react';
import { useRemittance } from '../lib/store';
import { CompanyProfileModal } from './CompanyProfileModal';

interface HeaderProps {
  onOpenBackup: () => void;
  onOpenTurso?: () => void;
  onToggleMobileMenu?: () => void;
  onNavigateCompanySetting?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  onOpenBackup, 
  onOpenTurso, 
  onToggleMobileMenu,
  onNavigateCompanySetting 
}) => {
  const { 
    db, 
    language, 
    setLanguage, 
    currentUser, 
    switchUser, 
    logout, 
    t, 
    operatorProfile,
    isTursoConnected,
    isSyncingTurso,
    syncTursoBidirectional,
    lastTursoSyncTime,
    activeBranchId,
    activeCountryCode,
    setActiveBranchId,
    setActiveCountryCode
  } = useRemittance();
  const [showCompanyModal, setShowCompanyModal] = React.useState(false);
  const [showBranchSwitcher, setShowBranchSwitcher] = React.useState(false);

  const pendingCount = db.transactions.filter(t => t.status === 'PENDING_APPROVAL').length;
  const effectiveCountryCode = activeCountryCode || currentUser.countryCode || 'MM';
  const currentBranch = db.branches.find(b => b.id === (activeBranchId || currentUser.branchId)) 
    || db.branches.find(b => b.countryCode === effectiveCountryCode)
    || db.branches[0];
  const currentCountry = db.countries.find(c => c.code === (currentBranch?.countryCode || effectiveCountryCode || 'MM'));

  return (
    <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs">
      {/* Left: Mobile Menu + Title + Breadcrumbs / Language */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 rounded-md hover:bg-slate-100 text-slate-600 focus:outline-none"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲစနစ်' : 'Remittance Management System'}
              </h1>
              <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                v2.4 Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block leading-none mt-0.5">
              {language === 'my' ? 'မြန်မာနိုင်ငံတော်ဗဟိုဘဏ် စည်းမျဉ်းကိုက် ငွေလွှဲနှင့် စာရင်းရှင်းလင်းမှု' : 'CBM-Compliant Money Transfer & Cross-Border Settlement'}
            </p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
              language === 'en' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('my')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
              language === 'my' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            မြန်မာ
          </button>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Official Operating Remittance Company Orange Box (လိမ္မော်ရောင်လေးဒေါင့်အကွက်) */}
        <button
          type="button"
          onClick={() => onNavigateCompanySetting ? onNavigateCompanySetting() : setShowCompanyModal(true)}
          className="hidden xl:flex items-center space-x-2 px-2.5 py-1 rounded-lg border-2 border-orange-500 bg-orange-50 hover:bg-orange-100/90 text-orange-950 transition-colors cursor-pointer shadow-2xs text-left group shrink-0"
          title={language === 'my' ? 'ဆော့ဖ်ဝဲလ် အသုံးပြုသည့် ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန် (Settings ထဲရှိ Form သို့ သွားမည်)' : 'Remittance Operating Company (Go to Settings Form)'}
        >
          <div className="w-6 h-6 rounded bg-orange-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
            <Building2 className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[11px] text-orange-950 truncate max-w-[200px]">
                {language === 'my' ? operatorProfile.companyNameMm : operatorProfile.companyNameEn}
              </span>
              <span className="text-[9px] font-bold text-orange-700 bg-orange-200/80 border border-orange-300 px-1 rounded shrink-0">
                {language === 'my' ? 'လိမ္မော်ရောင်ကွက်' : 'Licensed'}
              </span>
            </div>
            <div className="text-[10px] text-slate-600 flex items-center gap-1.5 truncate max-w-[280px]">
              <span className="truncate">📍 {language === 'my' ? operatorProfile.addressMm : operatorProfile.addressEn}</span>
              <span className="shrink-0 font-mono font-bold text-orange-900">📞 {operatorProfile.phone}</span>
            </div>
          </div>
        </button>

        {/* Compact Company Profile Button for smaller screens */}
        <button
          type="button"
          onClick={() => onNavigateCompanySetting ? onNavigateCompanySetting() : setShowCompanyModal(true)}
          className="xl:hidden flex items-center space-x-1 px-2 py-1 rounded-md border-2 border-orange-500 bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          title={language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် (Settings ထဲရှိ Form သို့ သွားမည်)' : 'Company Profile (Go to Settings Form)'}
        >
          <Building2 className="w-3.5 h-3.5 text-orange-600" />
          <span className="text-[11px]">{language === 'my' ? 'ကုမ္ပဏီ' : 'Company'}</span>
        </button>

        {/* Turso Cloud Status Pill with Interactive Sync */}
        <div className="hidden md:flex items-center space-x-1 bg-emerald-50 border border-emerald-200 rounded-md p-0.5">
          <button
            onClick={onOpenTurso || onOpenBackup}
            className="flex items-center space-x-1.5 px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100/70 rounded transition-colors"
            title={language === 'my' 
              ? `Turso Cloud Database (ချိတ်ဆက်ထားသည်)${lastTursoSyncTime ? ` - နောက်ဆုံး Sync: ${lastTursoSyncTime}` : ''}` 
              : `Turso Cloud Database (Connected & Active)${lastTursoSyncTime ? ` - Last synced: ${lastTursoSyncTime}` : ''}`}
          >
            <div className={`w-2 h-2 rounded-full ${isTursoConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>{language === 'my' ? 'Turso Cloud' : 'Turso Cloud'}</span>
          </button>
          
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await syncTursoBidirectional();
            }}
            disabled={isSyncingTurso}
            className="p-1 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded transition-all"
            title={language === 'my' ? 'Turso Cloud မှ စာရင်းအသစ်များ ရယူရန် / Sync လုပ်ရန် နှိပ်ပါ' : 'Click to fetch latest transactions & sync with Turso Cloud'}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingTurso ? 'animate-spin text-emerald-600' : 'text-emerald-600 hover:rotate-180 transition-transform duration-300'}`} />
          </button>
        </div>

        {/* Country & Branch Context Badge with Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBranchSwitcher(!showBranchSwitcher)}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs text-slate-700 transition-colors cursor-pointer"
            title={language === 'my' ? 'လက်ရှိ ရွေးချယ်ထားသော နိုင်ငံနှင့် ဘဏ်ခွဲ ပြောင်းရန် နှိပ်ပါ' : 'Click to change active Country and Branch context'}
          >
            <span className="text-sm leading-none">{currentCountry?.flagEmoji || '🌐'}</span>
            <span className="font-bold text-[11px] text-slate-900">{currentCountry?.code || 'MM'}</span>
            <span className="text-slate-300 font-mono">/</span>
            <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-[11px] text-blue-900 truncate max-w-[140px]">
              {language === 'my' ? currentBranch?.nameMm : currentBranch?.nameEn}
            </span>
          </button>

          {/* Quick Context Switcher Dropdown */}
          {showBranchSwitcher && (
            <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-3 space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-800">
                  {language === 'my' ? 'လုပ်ငန်းခွင် နိုင်ငံနှင့် ဘဏ်ခွဲ ရွေးချယ်မှု' : 'Operating Branch & Country'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowBranchSwitcher(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {language === 'my' ? 'နိုင်ငံ (Country)' : 'Country'}
                </label>
                <select
                  value={activeCountryCode || currentCountry?.code || 'MM'}
                  onChange={(e) => {
                    const newCountry = e.target.value;
                    setActiveCountryCode(newCountry);
                    // Find first branch belonging to this country
                    const matchedBranch = db.branches.find(b => b.countryCode === newCountry);
                    if (matchedBranch) {
                      setActiveBranchId(matchedBranch.id);
                    }
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {db.countries.map(c => (
                    <option key={c.id} value={c.code}>
                      {c.flagEmoji} {c.nameEn} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  {language === 'my' ? 'ဘဏ်ခွဲ (Branch)' : 'Branch'}
                </label>
                <select
                  value={activeBranchId || currentBranch?.id || 'BR-001'}
                  onChange={(e) => {
                    const bId = e.target.value;
                    setActiveBranchId(bId);
                    const b = db.branches.find(br => br.id === bId);
                    if (b?.countryCode) {
                      setActiveCountryCode(b.countryCode);
                    }
                    setShowBranchSwitcher(false);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  {db.branches
                    .filter(b => !activeCountryCode || b.countryCode === activeCountryCode)
                    .map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} - {b.nameEn} ({b.city})
                      </option>
                    ))}
                </select>
              </div>

              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg leading-relaxed">
                {language === 'my' 
                  ? '💡 နိုင်ငံနှင့် ဘဏ်ခွဲ ပြောင်းလဲလိုက်ပါက Inward၊ Outward နှင့် Reports များတွင် သက်ဆိုင်ရာ အချက်အလက်များ အလိုအလျောက် သီးသန့် ပြသပေးပါမည်။' 
                  : '💡 Switching country/branch filters all Inward, Outward, and Reports to this active location context.'}
              </div>
            </div>
          )}
        </div>

        {/* Role & Operator Switcher */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          <div className="text-left">
            <div className="text-[9px] text-slate-500 uppercase font-mono font-bold leading-none">
              {currentUser.role}
            </div>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1"
              aria-label="Switch current active user"
            >
              {db.users.map((u) => (
                <option key={u.id} value={u.id} className="bg-white text-slate-900">
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Turso Cloud 5-Min Auto-Sync Status & Trigger */}
        <button
          onClick={() => syncTursoBidirectional()}
          disabled={isSyncingTurso}
          className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border text-xs font-semibold transition-colors cursor-pointer active:scale-95 ${
            isSyncingTurso
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : isTursoConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
          }`}
          title={language === 'my' ? 'Turso Cloud 5-Min Auto Sync (နှိပ်၍ ချက်ချင်း Sync လုပ်နိုင်သည်)' : 'Turso Cloud 5-Min Auto Sync (Click to sync now)'}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingTurso ? 'animate-spin text-blue-600' : 'text-emerald-600'}`} />
          <span className="font-mono text-[11px]">
            {isSyncingTurso 
              ? (language === 'my' ? 'Syncing...' : 'Syncing...') 
              : lastTursoSyncTime 
              ? `Turso: ${lastTursoSyncTime}` 
              : '5-Min Sync'}
          </span>
        </button>

        {/* Quick Backup Action */}
        <button
          onClick={onOpenBackup}
          className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
          title={t.backup}
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Logout Action */}
        <button
          type="button"
          disabled={isSyncingTurso}
          onClick={() => logout()}
          className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          title={language === 'my' ? 'စနစ်မှ ထွက်မည် (Logout - Cloud သို့ အချက်အလက်များ သိမ်းဆည်းပေးမည်)' : 'Sign out (Syncs all transactions to Turso Cloud)'}
        >
          {isSyncingTurso ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-600" />
          ) : (
            <LogOut className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {isSyncingTurso 
              ? (language === 'my' ? 'Syncing...' : 'Syncing...') 
              : (language === 'my' ? 'ထွက်မည် (Logout)' : 'Logout')}
          </span>
        </button>
      </div>

      {/* Edit Operating Company Profile Modal */}
      <CompanyProfileModal
        isOpen={showCompanyModal}
        onClose={() => setShowCompanyModal(false)}
      />
    </header>
  );
};
