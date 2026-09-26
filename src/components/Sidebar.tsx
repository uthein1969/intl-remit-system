import React from 'react';
import { 
  LayoutDashboard, 
  Send, 
  CheckSquare, 
  DownloadCloud, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText, 
  BarChart3,
  Settings, 
  History, 
  Database, 
  HardDriveDownload,
  Building2,
  Users,
  Briefcase,
  Coins,
  Globe,
  TrendingUp,
  ShieldAlert,
  ShieldCheck,
  Target,
  UserCheck2,
  ChevronDown,
  ChevronRight,
  LogOut,
  Sliders
} from 'lucide-react';
import { useRemittance } from '../lib/store';

export type NavigationTab = 
  | 'dashboard'
  | 'outward_entry'
  | 'outward_approve'
  | 'inward_entry'
  | 'inward_approve'
  | 'outward_report'
  | 'total_outward_report'
  | 'inward_report'
  | 'total_inward_report'
  | 'admin_setup'
  | 'audit_log'
  | 'backup_restore'
  | 'turso_sync';

export type SetupSubTab = 
  | 'operator_profile'
  | 'branch'
  | 'user'
  | 'company'
  | 'currency'
  | 'country'
  | 'exchange_rate'
  | 'blacklist'
  | 'purpose'
  | 'customer'
  | 'menu_permission'
  | 'default_status'
  | 'mto_limit';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  activeSetupSubTab: SetupSubTab;
  setActiveSetupSubTab: (subTab: SetupSubTab) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeSetupSubTab,
  setActiveSetupSubTab,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { db, language, currentUser, logout, t, isMenuAllowedForRole } = useRemittance();
  const [setupExpanded, setSetupExpanded] = React.useState(true);

  const pendingOutward = db.transactions.filter(
    tx => tx.type === 'OUTWARD' && tx.status === 'PENDING_APPROVAL'
  ).length;

  const pendingInward = db.transactions.filter(
    tx => tx.type === 'INWARD' && tx.status === 'PENDING_APPROVAL'
  ).length;

  const totalPending = pendingOutward + pendingInward;
  const activeBlacklistCount = db.blacklist.filter(b => b.active).length;

  const handleNavClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  const handleSetupSubClick = (subTab: SetupSubTab) => {
    setActiveTab('admin_setup');
    setActiveSetupSubTab(subTab);
    setIsMobileOpen(false);
  };

  // Check if a navigation menu item is allowed for the active user's role
  const isAllowed = (tab: NavigationTab): boolean => {
    // "Admin Setup ကို Admin Role ကဘဲလုပ်ခွင့်ရှိပါမယ်"
    if (tab === 'admin_setup') {
      return currentUser.role === 'ADMIN';
    }
    return isMenuAllowedForRole ? isMenuAllowedForRole(currentUser.role, tab) : true;
  };

  const hasCoreMenus = isAllowed('dashboard') || isAllowed('outward_entry') || isAllowed('outward_approve') || isAllowed('inward_entry') || isAllowed('inward_approve');
  const hasAdminMenu = currentUser.role === 'ADMIN' && isAllowed('admin_setup');
  const hasReportMenus = isAllowed('outward_report') || isAllowed('total_outward_report') || isAllowed('inward_report') || isAllowed('total_inward_report') || isAllowed('audit_log') || isAllowed('backup_restore') || isAllowed('turso_sync');

  const setupItems: { id: SetupSubTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { 
      id: 'operator_profile', 
      label: language === 'my' ? '၁။ ဆော့ဖ်ဝဲလ်ကုမ္ပဏီ (လိမ္မော်ရောင်အကွက်)' : '1. Company Profile (Orange Box)', 
      icon: Building2 
    },
    { id: 'branch', label: language === 'my' ? '၂။ ဘဏ်ခွဲများ' : '2. Branches', icon: Building2 },
    { id: 'user', label: language === 'my' ? '၃။ အသုံးပြုသူများ' : '3. Users', icon: Users },
    { id: 'company', label: language === 'my' ? '၄။ မိတ်ဖက်ကုမ္ပဏီများ' : '4. Partner Companies', icon: Briefcase },
    { id: 'currency', label: language === 'my' ? '၅။ ငွေကြေးအမျိုးအစား' : '5. Currencies', icon: Coins },
    { id: 'country', label: language === 'my' ? '၆။ နိုင်ငံများ' : '6. Countries', icon: Globe },
    { id: 'exchange_rate', label: language === 'my' ? '၇။ ငွေလဲနှုန်းများ' : '7. Exchange Rates', icon: TrendingUp },
    { id: 'blacklist', label: language === 'my' ? '၈။ နာမည်ပျက်စာရင်း' : '8. Blacklist', icon: ShieldAlert, badge: activeBlacklistCount },
    { id: 'purpose', label: language === 'my' ? '၉။ လွှဲပို့ရည်ရွယ်ချက်' : '9. Purposes', icon: Target },
    { id: 'customer', label: language === 'my' ? '၁၀။ ဖောက်သည်များ' : '10. Customers', icon: UserCheck2 },
    { 
      id: 'menu_permission', 
      label: language === 'my' ? '၁၁။ မီနူး ခွင့်ပြုချက်များ' : '11. Role Menu Permissions', 
      icon: ShieldCheck 
    },
    { 
      id: 'default_status', 
      label: language === 'my' ? '၁၂။ မူရင်း အခြေအနေ (Default Status)' : '12. Default Status Settings', 
      icon: CheckSquare 
    },
    { 
      id: 'mto_limit', 
      label: language === 'my' ? '၁၃။ MTO & Inward ကန့်သတ်ချက်များ' : '13. MTO & Inward Limits', 
      icon: Sliders 
    },
  ];

  const getNavBtnClasses = (isActive: boolean) =>
    `w-full flex items-center space-x-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-colors border-l-[3px] cursor-pointer ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-500 font-bold shadow-xs'
        : 'border-transparent text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

  const getSubItemClasses = (isActive: boolean) =>
    `w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer ${
      isActive
        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/70 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`fixed lg:sticky top-0 lg:top-14 z-50 lg:z-30 w-60 h-screen lg:h-[calc(100vh-3.5rem)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out shrink-0 select-none shadow-xs ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand Header */}
        <div className="h-14 px-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-slate-900 dark:text-slate-100 font-bold tracking-tight text-sm flex items-center">
            <span>REMIT</span>
            <span className="text-blue-600 dark:text-blue-400">PRO</span>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono px-1.5 py-0.5 rounded ml-1.5 font-bold">
              v2.4
            </span>
          </div>
          {isMobileOpen && (
            <button
              type="button"
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Scrollable Navigation with min-h-0 so footer stays pinned */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-2 py-3 space-y-0.5">
          {/* Section: Core Workflows */}
          {hasCoreMenus && (
            <>
              <div className="px-3 pt-1 pb-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                {language === 'my' ? 'အဓိက လုပ်ငန်း' : 'Core'}
              </div>

              {/* 1. Dashboard */}
              {isAllowed('dashboard') && (
                <button
                  onClick={() => handleNavClick('dashboard')}
                  className={getNavBtnClasses(activeTab === 'dashboard')}
                >
                  <LayoutDashboard className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navDashboard}</span>
                </button>
              )}

              {/* 2. Outward Entry */}
              {isAllowed('outward_entry') && (
                <button
                  onClick={() => handleNavClick('outward_entry')}
                  className={getNavBtnClasses(activeTab === 'outward_entry')}
                >
                  <Send className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navOutwardEntry}</span>
                </button>
              )}

              {/* 3. Outward Approve */}
              {isAllowed('outward_approve') && (
                <button
                  onClick={() => handleNavClick('outward_approve')}
                  className={`${getNavBtnClasses(activeTab === 'outward_approve')} justify-between`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <CheckSquare className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.navOutwardApprove}</span>
                  </div>
                  {pendingOutward > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingOutward}
                    </span>
                  )}
                </button>
              )}

              {/* 4. Inward Entry */}
              {isAllowed('inward_entry') && (
                <button
                  onClick={() => handleNavClick('inward_entry')}
                  className={getNavBtnClasses(activeTab === 'inward_entry')}
                >
                  <DownloadCloud className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navInwardEntry}</span>
                </button>
              )}

              {/* 5. Inward Approve */}
              {isAllowed('inward_approve') && (
                <button
                  onClick={() => handleNavClick('inward_approve')}
                  className={`${getNavBtnClasses(activeTab === 'inward_approve')} justify-between`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.navInwardApprove}</span>
                  </div>
                  {pendingInward > 0 && (
                    <span className="bg-teal-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {pendingInward}
                    </span>
                  )}
                </button>
              )}
            </>
          )}

          {/* Section: Administration & Setups (Strictly ADMIN Role Only) */}
          {hasAdminMenu && (
            <>
              <div className="px-3 pt-4 pb-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>{language === 'my' ? 'ပြင်ဆင်မှုများ (Admin)' : 'Administration'}</span>
                <button
                  onClick={() => setSetupExpanded(!setupExpanded)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {setupExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </div>

              {/* Admin Setup Master Link */}
              <button
                onClick={() => handleNavClick('admin_setup')}
                className={getNavBtnClasses(activeTab === 'admin_setup')}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span className="truncate">{t.navAdminSetup}</span>
              </button>

              {/* 11 Setup Submodules */}
              {setupExpanded && (
                <div className="pl-3.5 space-y-0.5 border-l border-slate-200 dark:border-slate-800 ml-3.5 my-1">
                  {setupItems.map((item) => {
                    const isCurrent = activeTab === 'admin_setup' && activeSetupSubTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSetupSubClick(item.id)}
                        className={getSubItemClasses(isCurrent)}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge !== undefined && item.badge > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Section: Reports & Audit */}
          {hasReportMenus && (
            <>
              <div className="px-3 pt-4 pb-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                {language === 'my' ? 'အစီရင်ခံစာ & မှတ်တမ်း' : 'Reports & Security'}
              </div>

              {isAllowed('outward_report') && (
                <button
                  onClick={() => handleNavClick('outward_report')}
                  className={getNavBtnClasses(activeTab === 'outward_report')}
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navOutwardReport}</span>
                </button>
              )}

              {isAllowed('total_outward_report') && (
                <button
                  onClick={() => handleNavClick('total_outward_report')}
                  className={getNavBtnClasses(activeTab === 'total_outward_report')}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navTotalOutwardReport}</span>
                </button>
              )}

              {isAllowed('inward_report') && (
                <button
                  onClick={() => handleNavClick('inward_report')}
                  className={getNavBtnClasses(activeTab === 'inward_report')}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navInwardReport}</span>
                </button>
              )}

              {isAllowed('total_inward_report') && (
                <button
                  onClick={() => handleNavClick('total_inward_report')}
                  className={getNavBtnClasses(activeTab === 'total_inward_report')}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navTotalInwardReport}</span>
                </button>
              )}

              {isAllowed('audit_log') && (
                <button
                  onClick={() => handleNavClick('audit_log')}
                  className={getNavBtnClasses(activeTab === 'audit_log')}
                >
                  <History className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navAuditLog}</span>
                </button>
              )}

              {isAllowed('backup_restore') && (
                <button
                  onClick={() => handleNavClick('backup_restore')}
                  className={getNavBtnClasses(activeTab === 'backup_restore')}
                >
                  <HardDriveDownload className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t.navBackupRestore}</span>
                </button>
              )}

              {isAllowed('turso_sync') && (
                <button
                  onClick={() => handleNavClick('turso_sync')}
                  className={`${getNavBtnClasses(activeTab === 'turso_sync')} justify-between`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Database className="w-4 h-4 shrink-0" />
                    <span className="truncate">{t.navTurso || 'Turso Cloud DB'}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    LibSQL
                  </span>
                </button>
              )}
            </>
          )}
        </nav>

        {/* Active Operator & Logout in Sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentUser.role}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {currentUser.fullName}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate">
                @{currentUser.username}
              </div>
            </div>

            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
              title={language === 'my' ? 'စနစ်မှ ထွက်မည် (Logout)' : 'Sign out'}
            >
              <LogOut className="w-3.5 h-3.5 text-white" />
              <span className="text-[11px]">{language === 'my' ? 'ထွက်မည်' : 'Logout'}</span>
            </button>
          </div>
        </div>

        {/* Footer info in sidebar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5 shrink-0 bg-slate-100/70 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Supabase Connected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="truncate">Auto-Sync • 100% CBM Compliant</span>
          </div>
        </div>
      </aside>
    </>
  );
};
