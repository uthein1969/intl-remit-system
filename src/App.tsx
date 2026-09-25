/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import { RemittanceProvider, useRemittance } from './lib/store';
import { ThemeProvider } from './lib/theme';
import { clearIndexedDb } from './lib/indexedDbStorage';
import { LoginView } from './components/Auth/LoginView';
import { Header } from './components/Header';
import { Sidebar, NavigationTab, SetupSubTab } from './components/Sidebar';
import { DashboardView } from './components/Dashboard/DashboardView';
import { OutwardEntryView } from './components/Outward/OutwardEntryView';
import { OutwardApproveView } from './components/Outward/OutwardApproveView';
import { InwardEntryView } from './components/Inward/InwardEntryView';
import { InwardApproveView } from './components/Inward/InwardApproveView';
import { OutwardReportView } from './components/Reports/OutwardReportView';
import { TotalOutwardReportView } from './components/Reports/TotalOutwardReportView';
import { InwardReportView } from './components/Reports/InwardReportView';
import { TotalInwardReportView } from './components/Reports/TotalInwardReportView';
import { AdminSetupManager } from './components/Admin/AdminSetupManager';
import { BackupRestoreView } from './components/Backup/BackupRestoreView';
import { useAutoTursoSync } from './hooks/useAutoTursoSync';

const MainLayout: React.FC = () => {
  const { currentUser, isMenuAllowedForRole, activeCountryCode, language } = useRemittance();
  const [activeTab, setActiveTab] = useState<NavigationTab>(() => {
    if (currentUser?.role === 'MAKER') return 'outward_entry';
    if (currentUser?.role === 'CHECKER') return 'outward_approve';
    return 'dashboard';
  });
  const [setupSubTab, setSetupSubTab] = useState<SetupSubTab>('branch');
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('ALL');
  const [targetApprovalTxId, setTargetApprovalTxId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check whether current activeTab is permitted for currentUser.role
  const isTabPermitted = (tab: NavigationTab): boolean => {
    if (tab === 'admin_setup') {
      return currentUser?.role === 'ADMIN';
    }
    return isMenuAllowedForRole ? isMenuAllowedForRole(currentUser.role, tab) : true;
  };

  // Auto-redirect if role changes or activeTab becomes unauthorized
  useEffect(() => {
    if (!isTabPermitted(activeTab)) {
      if (currentUser?.role === 'MAKER') {
        setActiveTab('outward_entry');
      } else if (currentUser?.role === 'CHECKER') {
        setActiveTab('outward_approve');
      } else if (isTabPermitted('dashboard')) {
        setActiveTab('dashboard');
      } else {
        const order: NavigationTab[] = [
          'outward_entry', 'outward_approve', 'inward_entry', 'inward_approve',
          'outward_report', 'total_outward_report', 'inward_report', 'total_inward_report', 'audit_log', 'dashboard'
        ];
        const fallback = order.find(t => isTabPermitted(t));
        if (fallback) setActiveTab(fallback);
      }
    }
  }, [currentUser?.role, activeTab, isMenuAllowedForRole, activeCountryCode]);

  const handleNavigate = (tab: NavigationTab, subTab?: SetupSubTab, targetTxId?: string) => {
    setActiveTab(tab);
    if (subTab) {
      setSetupSubTab(subTab);
    }
    setTargetApprovalTxId(targetTxId || null);
  };

  const handleNavigateAudit = (module: string = 'ALL') => {
    setAuditModuleFilter(module);
    setActiveTab('audit_log');
  };

  return (
    <div className="h-screen bg-slate-100 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white overflow-hidden transition-colors">
      {/* Header */}
      <Header 
        onOpenBackup={() => handleNavigate('backup_restore')}
        onOpenTurso={() => handleNavigate('turso_sync')}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onNavigateCompanySetting={() => handleNavigate('admin_setup', 'operator_profile')}
      />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          activeSetupSubTab={setupSubTab}
          setActiveSetupSubTab={setSetupSubTab}
          isMobileOpen={isMobileMenuOpen}
          setIsMobileOpen={setIsMobileMenuOpen}
        />

        {/* Content Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6 min-w-0 bg-slate-50 dark:bg-[#0B0F19] transition-colors">
          <div className="max-w-7xl mx-auto space-y-4">
            {!isTabPermitted(activeTab) ? (
              <div className="bg-white border border-rose-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 shadow-xs space-y-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {language === 'my' ? 'ခွင့်ပြုချက် မရှိပါ (Access Restricted)' : 'Access Restricted'}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {language === 'my'
                    ? `သင်၏ လက်ရှိ Role (${currentUser.role}) အတွက် ဤမီနူးအား လုပ်ဆောင်ခွင့် ကန့်သတ်ထားပါသည်။`
                    : `Your current role (${currentUser.role}) does not have permission to access this module.`}
                </p>
                <button
                  onClick={() => {
                    if (currentUser.role === 'MAKER') setActiveTab('outward_entry');
                    else if (currentUser.role === 'CHECKER') setActiveTab('outward_approve');
                    else setActiveTab('dashboard');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'ခွင့်ပြုထားသော စာမျက်နှာသို့ သွားမည်' : 'Go to Allowed Work Area'}
                </button>
              </div>
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView onNavigate={handleNavigate} />
                )}
                {activeTab === 'outward_entry' && (
                  <OutwardEntryView />
                )}
                {activeTab === 'outward_approve' && (
                  <OutwardApproveView 
                    initialTxId={targetApprovalTxId}
                    onClearInitialTxId={() => setTargetApprovalTxId(null)}
                  />
                )}
                {activeTab === 'inward_entry' && (
                  <InwardEntryView />
                )}
                {activeTab === 'inward_approve' && (
                  <InwardApproveView 
                    initialTxId={targetApprovalTxId}
                    onClearInitialTxId={() => setTargetApprovalTxId(null)}
                  />
                )}
                {activeTab === 'outward_report' && (
                  <OutwardReportView />
                )}
                {activeTab === 'total_outward_report' && (
                  <TotalOutwardReportView />
                )}
                {activeTab === 'inward_report' && (
                  <InwardReportView />
                )}
                {activeTab === 'total_inward_report' && (
                  <TotalInwardReportView />
                )}
                {activeTab === 'admin_setup' && (
                  <AdminSetupManager
                    currentSubTab={setupSubTab}
                    onSelectSubTab={setSetupSubTab}
                    onNavigateAudit={handleNavigateAudit}
                  />
                )}
                {activeTab === 'audit_log' && (
                  <BackupRestoreView 
                    initialTab="audit" 
                    initialModuleFilter={auditModuleFilter} 
                  />
                )}
                {activeTab === 'backup_restore' && (
                  <BackupRestoreView initialTab="backup" />
                )}
                {activeTab === 'turso_sync' && (
                  <BackupRestoreView initialTab="turso" />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('UI Render Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('REMITTANCE_APP_DB_V1');
      sessionStorage.clear();
      clearIndexedDb().catch(() => {});
    } catch {}
    window.location.reload();
  };

  handleResetToLogin = () => {
    try {
      sessionStorage.setItem('REMITTANCE_EXPLICIT_LOGOUT', 'true');
      sessionStorage.removeItem('REMITTANCE_AUTH_SESSION');
      localStorage.removeItem('REMITTANCE_AUTH_SESSION');
    } catch {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center mb-4 border border-amber-500/30">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">စနစ်အချက်အလက် ဖွင့်ရာတွင် အခက်အခဲရှိနေပါသည်</h2>
          <p className="text-sm text-slate-400 max-w-md mb-6">
            Local browser cache ကြောင့် UI ခေတ္တမပေါ်ပါက အောက်ပါခလုတ်ကိုနှိပ်၍ ပြန်လည်စတင်နိုင်ပါသည်။
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              ပြန်လည် Refresh လုပ်မည်
            </button>
            <button
              onClick={this.handleResetToLogin}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Login Form သို့ သွားမည်
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              Cache ရှင်းပြီး Reset ပြုလုပ်မည်
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const RootApp: React.FC = () => {
  const { isAuthenticated } = useRemittance();

  // RemittanceProvider အတွင်းတွင် Auto Turso Sync ကို Run ပေးခြင်း
  useAutoTursoSync();

  // If user is explicitly not authenticated, display the Login View
  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <MainLayout />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RemittanceProvider>
          <RootApp />
        </RemittanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}