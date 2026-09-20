import React, { useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Check, 
  RotateCcw, 
  Save, 
  Lock, 
  Info, 
  LayoutDashboard, 
  Send, 
  CheckSquare, 
  DownloadCloud, 
  CheckCircle2, 
  Settings, 
  FileSpreadsheet, 
  FileText, 
  History, 
  HardDriveDownload, 
  Database,
  Users,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { UserRole, NavigationTab, DEFAULT_ROLE_MENU_PERMISSIONS } from '../../types';

interface MenuDefinition {
  id: NavigationTab;
  labelMm: string;
  labelEn: string;
  category: 'core' | 'admin' | 'report';
  icon: React.ElementType;
  adminOnly?: boolean;
  descriptionMm: string;
  descriptionEn: string;
}

export const RoleMenuPermissionManager: React.FC = () => {
  const { 
    language, 
    currentUser, 
    roleMenuPermissions, 
    toggleRoleMenuPermission, 
    updateRoleMenuPermissions, 
    resetRoleMenuPermissions,
    db,
    switchUser
  } = useRemittance();

  const [selectedRole, setSelectedRole] = useState<UserRole>('MAKER');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const menuList: MenuDefinition[] = [
    {
      id: 'dashboard',
      labelMm: 'ပင်မ မျက်နှာပြင် (Dashboard)',
      labelEn: 'Dashboard Overview',
      category: 'core',
      icon: LayoutDashboard,
      descriptionMm: 'ငွေလွှဲလုပ်ငန်း ပင်မ စီမံခန့်ခွဲမှု စာရင်းဇယားနှင့် နေ့စဉ်အချက်အလက်များ',
      descriptionEn: 'Main dashboard overview with real-time transfer stats and operational alerts',
    },
    {
      id: 'outward_entry',
      labelMm: 'ငွေလွှဲပို့ခြင်း (Outward Entry)',
      labelEn: 'Outward Remittance Entry',
      category: 'core',
      icon: Send,
      descriptionMm: 'ပြည်တွင်း/ပြည်ပ ငွေလွှဲပို့မှု အသစ်ထည့်သွင်းခြင်း (Maker Role အဓိကလုပ်ငန်း)',
      descriptionEn: 'Create outward remittance transactions (Primary Maker function)',
    },
    {
      id: 'outward_approve',
      labelMm: 'ငွေလွှဲပို့မှု အတည်ပြုရန် (Outward Approval)',
      labelEn: 'Outward Remittance Approval',
      category: 'core',
      icon: CheckSquare,
      descriptionMm: 'ပေးပို့ထားသော ငွေလွှဲများကို စစ်ဆေးအတည်ပြုခြင်း (Checker Role အဓိကလုပ်ငန်း)',
      descriptionEn: 'Review, verify and approve outward transfers (Primary Checker function)',
    },
    {
      id: 'inward_entry',
      labelMm: 'ငွေလွှဲထုတ်ယူခြင်း (Inward Entry)',
      labelEn: 'Inward Remittance Claim Entry',
      category: 'core',
      icon: DownloadCloud,
      descriptionMm: 'ငွေလွှဲလက်ခံထုတ်ယူမှု အချက်အလက်များ တောင်းခံစာရင်းသွင်းခြင်း (Maker Role)',
      descriptionEn: 'Process inward remittance claims (Maker function)',
    },
    {
      id: 'inward_approve',
      labelMm: 'ငွေလွှဲထုတ်မှု အတည်ပြုရန် (Inward Approval)',
      labelEn: 'Inward Remittance Approval',
      category: 'core',
      icon: CheckCircle2,
      descriptionMm: 'ငွေလွှဲထုတ်ယူမှုများကို စစ်ဆေးအတည်ပြု၍ ငွေထုတ်ပေးခြင်း (Checker Role)',
      descriptionEn: 'Verify and authorize inward payout claims (Checker function)',
    },
    {
      id: 'admin_setup',
      labelMm: 'စနစ် အုပ်ချုပ်မှု ပြင်ဆင်ချက်များ (Admin Setup)',
      labelEn: 'Admin Setup & Master Data',
      category: 'admin',
      icon: Settings,
      adminOnly: true,
      descriptionMm: 'ဘဏ်ခွဲ၊ အသုံးပြုသူ၊ နိုင်ငံ၊ ငွေကြေး၊ Blacklist စီမံခန့်ခွဲခြင်း (Admin Role သာ လုပ်ခွင့်ရှိသည်)',
      descriptionEn: 'System master data, branches, users, and compliance watchlist (Strictly Admin Only)',
    },
    {
      id: 'outward_report',
      labelMm: 'ငွေလွှဲပို့မှု အစီရင်ခံစာ (Outward Report)',
      labelEn: 'Outward Remittance Report',
      category: 'report',
      icon: FileSpreadsheet,
      descriptionMm: 'ငွေလွှဲပို့မှု မှတ်တမ်းအသေးစိတ် အစီရင်ခံစာနှင့် စာရင်းဇယား',
      descriptionEn: 'Outward remittance analytics, transaction statements, and exports',
    },
    {
      id: 'total_outward_report',
      labelMm: 'စုစုပေါင်း ငွေလွှဲပို့မှု အစီရင်ခံစာ (Total Outward Report)',
      labelEn: 'Total Outward Report',
      category: 'report',
      icon: BarChart3,
      descriptionMm: 'နေ့စွဲအလိုက် အစဉ်လိုက် ငွေလွှဲပို့မှု စုစုပေါင်း အစီရင်ခံစာ (နေ့အလိုက် ပေါင်းလဒ်၊ အသေးစိတ် နှင့် Excel/Print Export)',
      descriptionEn: 'Daily grouped cumulative outward remittance report with chronological ordering and exports',
    },
    {
      id: 'inward_report',
      labelMm: 'ငွေလွှဲထုတ်မှု အစီရင်ခံစာ (Inward Report)',
      labelEn: 'Inward Remittance Report',
      category: 'report',
      icon: FileText,
      descriptionMm: 'ငွေလွှဲထုတ်ယူမှု မှတ်တမ်းအသေးစိတ် အစီရင်ခံစာနှင့် စာရင်းဇယား',
      descriptionEn: 'Inward remittance analytics, payout statements, and exports',
    },
    {
      id: 'total_inward_report',
      labelMm: 'စုစုပေါင်း ငွေလွှဲထုတ်မှု အစီရင်ခံစာ (Total Inward Report)',
      labelEn: 'Total Inward Report',
      category: 'report',
      icon: BarChart3,
      descriptionMm: 'နေ့စွဲအလိုက် အစဉ်လိုက် ငွေလွှဲထုတ်ယူမှု စုစုပေါင်း အစီရင်ခံစာ (နေ့အလိုက် ပေါင်းလဒ်၊ အသေးစိတ် နှင့် Excel/Print Export)',
      descriptionEn: 'Daily grouped cumulative inward remittance report with chronological ordering and exports',
    },
    {
      id: 'audit_log',
      labelMm: 'လုပ်ဆောင်မှု စစ်ဆေးမှတ်တမ်း (Audit Log)',
      labelEn: 'System Audit Trail',
      category: 'report',
      icon: History,
      descriptionMm: 'အသုံးပြုသူများ၏ လုပ်ဆောင်ချက် မှတ်တမ်းများနှင့် လုံခြုံရေး ခြေရာခံမှု',
      descriptionEn: 'Comprehensive tamper-evident activity and security audit trail',
    },
    {
      id: 'backup_restore',
      labelMm: 'ဒေတာ အရန်သိမ်း/ပြန်တင်ခြင်း (Backup & Restore)',
      labelEn: 'Database Backup & Restore',
      category: 'report',
      icon: HardDriveDownload,
      descriptionMm: 'စနစ်တစ်ခုလုံး၏ ဒေတာများကို JSON ဖြင့် အရန်သိမ်းဆည်းခြင်းနှင့် ပြန်တင်ခြင်း',
      descriptionEn: 'Full database snapshot JSON export and disaster recovery restore',
    },
    {
      id: 'turso_sync',
      labelMm: 'Turso Cloud DB စင့်ခ်လုပ်ခြင်း (Turso Sync)',
      labelEn: 'Turso Cloud LibSQL Sync',
      category: 'report',
      icon: Database,
      descriptionMm: 'Turso LibSQL Cloud ဒေတာဘေ့စ်နှင့် တိုက်ရိုက်ဒေတာ ချိတ်ဆက်စင့်ခ်လုပ်ခြင်း',
      descriptionEn: 'Cloud database synchronization and distributed replica status',
    },
  ];

  const rolesConfig: {
    role: UserRole;
    titleMm: string;
    titleEn: string;
    badgeMm: string;
    badgeEn: string;
    descriptionMm: string;
    descriptionEn: string;
    themeBorder: string;
    themeBg: string;
    badgeColor: string;
  }[] = [
    {
      role: 'MAKER',
      titleMm: 'Maker Role (ငွေလွှဲစာရင်းသွင်းသူ)',
      titleEn: 'Maker Role (Remittance Operator)',
      badgeMm: 'Outward/Inward Entry သာ',
      badgeEn: 'Entry Operations Only',
      descriptionMm: 'Maker Role သည် Outward Entry နှင့် Inward Entry သာ ဆောင်ရွက်ခွင့်ရှိပြီး၊ အတည်ပြုခြင်းနှင့် Admin Setup ပြင်ဆင်ခွင့်များကို ကန့်သတ်ထားပါသည်။',
      descriptionEn: 'Makers are restricted to Outward Entry and Inward Entry only. No approval or system admin authority.',
      themeBorder: 'border-sky-300',
      themeBg: 'bg-sky-50/50',
      badgeColor: 'bg-sky-100 text-sky-800 border-sky-300',
    },
    {
      role: 'CHECKER',
      titleMm: 'Checker Role (ငွေလွှဲစစ်ဆေးအတည်ပြုသူ)',
      titleEn: 'Checker Role (Verification & Approver)',
      badgeMm: 'Outward/Inward Approval သာ',
      badgeEn: 'Approval Operations Only',
      descriptionMm: 'Checker Role သည် Outward Approval နှင့် Inward Approval သာ ဆောင်ရွက်ခွင့်ရှိပြီး၊ ငွေလွှဲအသစ်ထည့်သွင်းခြင်းနှင့် Admin Setup လုပ်ဆောင်ခွင့်များကို ကန့်သတ်ထားပါသည်။',
      descriptionEn: 'Checkers are restricted to Outward Approval and Inward Approval only. Cannot create entries or modify admin setup.',
      themeBorder: 'border-amber-300',
      themeBg: 'bg-amber-50/50',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      role: 'ADMIN',
      titleMm: 'Admin Role (စနစ်အုပ်ချုပ်သူ)',
      titleEn: 'Admin Role (System Administrator)',
      badgeMm: 'Admin Setup & Full Access',
      badgeEn: 'Full Administration',
      descriptionMm: 'Admin Setup ပြင်ဆင်ခွင့်များကို Admin Role ကသာ သီးသန့် လုပ်ဆောင်ခွင့်ရှိပြီး၊ စနစ်တစ်ခုလုံး၏ Master Data များကို စီမံခန့်ခွဲနိုင်ပါသည်။',
      descriptionEn: 'Admin Setup is strictly reserved for Admin Role. Full access across configurations, master data, and oversight.',
      themeBorder: 'border-purple-300',
      themeBg: 'bg-purple-50/50',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
    {
      role: 'AUDITOR',
      titleMm: 'Auditor Role (စစ်ဆေးရေးမှူး)',
      titleEn: 'Auditor Role (Compliance Inspector)',
      badgeMm: 'Reports & Audit Log သာ',
      badgeEn: 'Read-only Oversight',
      descriptionMm: 'အစီရင်ခံစာများနှင့် လုပ်ဆောင်မှုမှတ်တမ်း (Audit Log) များကို စစ်ဆေးကြည့်ရှုခွင့်ရှိပြီး ဒေတာပြင်ဆင်ခွင့် မရှိပါ။',
      descriptionEn: 'Read-only compliance oversight for audit trails and remittance statistical reports.',
      themeBorder: 'border-emerald-300',
      themeBg: 'bg-emerald-50/50',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  ];

  const currentRoleMenus = roleMenuPermissions[selectedRole] || DEFAULT_ROLE_MENU_PERMISSIONS[selectedRole] || [];

  const handleToggle = (menuId: NavigationTab) => {
    // If admin_setup and role is not ADMIN, disallow
    if (menuId === 'admin_setup' && selectedRole !== 'ADMIN') {
      return;
    }
    toggleRoleMenuPermission(selectedRole, menuId);
    showFeedback(language === 'my' ? 'မီနူး ခွင့်ပြုချက် ပြင်ဆင်ပြီးပါပြီ' : 'Permission updated');
  };

  const handleQuickPreset = (type: 'default' | 'all' | 'entry_only' | 'approve_only') => {
    if (type === 'default') {
      resetRoleMenuPermissions();
      showFeedback(language === 'my' ? 'မူလသတ်မှတ်ချက်များသို့ ပြန်လည်ထားရှိပြီးပါပြီ (Maker: Entry, Checker: Approval)' : 'Reset all roles to default policy');
      return;
    }

    if (selectedRole === 'ADMIN') {
      updateRoleMenuPermissions('ADMIN', menuList.map(m => m.id));
      showFeedback(language === 'my' ? 'Admin အတွက် မီနူးအားလုံး ဖွင့်ထားပါသည်' : 'All menus enabled for Admin');
      return;
    }

    if (type === 'entry_only') {
      updateRoleMenuPermissions(selectedRole, ['dashboard', 'outward_entry', 'inward_entry']);
      showFeedback(language === 'my' ? `${selectedRole} အတွက် Entry မီနူးများသာ သတ်မှတ်လိုက်ပါပြီ` : `Set ${selectedRole} to Entry operations`);
      return;
    }

    if (type === 'approve_only') {
      updateRoleMenuPermissions(selectedRole, ['dashboard', 'outward_approve', 'inward_approve']);
      showFeedback(language === 'my' ? `${selectedRole} အတွက် Approval မီနူးများသာ သတ်မှတ်လိုက်ပါပြီ` : `Set ${selectedRole} to Approval operations`);
      return;
    }

    if (type === 'all') {
      // All except admin_setup for non-admins
      const allMenus = menuList.map(m => m.id).filter(m => m !== 'admin_setup');
      updateRoleMenuPermissions(selectedRole, allMenus);
      showFeedback(language === 'my' ? `${selectedRole} အတွက် မီနူးများဖွင့်ပေးလိုက်ပါပြီ (Admin Setup မပါ)` : `Enabled available menus for ${selectedRole}`);
    }
  };

  const showFeedback = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => {
      setSaveSuccessMessage(null);
    }, 3500);
  };

  // Find sample users for testing roles
  const makerUser = db.users.find(u => u.role === 'MAKER');
  const checkerUser = db.users.find(u => u.role === 'CHECKER');
  const adminUser = db.users.find(u => u.role === 'ADMIN');

  return (
    <div className="space-y-5">
      {/* Top Banner & Context */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              {language === 'my' 
                ? '၁၁။ အသုံးပြုသူအခန်းကဏ္ဍအလိုက် မီနူးခွင့်ပြုချက်များ (Show App Menu by User Role)' 
                : '11. Role-Based App Menu Permissions (Show App Menu)'}
            </h3>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            {language === 'my'
              ? 'Admin Setup ကို Admin Role သာ လုပ်ဆောင်ခွင့်ရှိပြီး၊ Maker Role သည် Outward Entry/Inward Entry သာ လုပ်ဆောင်နိုင်ရန် နှင့် Checker Role သည် Outward Approval/Inward Approval သာ လုပ်ဆောင်နိုင်ရန် Checkbox များဖြင့် သတ်မှတ်နိုင်ပါသည်။'
              : 'Admin Setup is strictly restricted to Admin Role only. Configure whether each menu is visible for Maker (Entry only), Checker (Approval only), Auditor, and Admin.'}
          </p>
        </div>

        {/* Quick Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleQuickPreset('default')}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-300 transition-colors shadow-2xs"
            title={language === 'my' ? 'Maker/Checker မူလသတ်မှတ်ချက်သို့ ပြန်ထားမည်' : 'Reset to Standard Default Policy'}
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
            <span>{language === 'my' ? 'မူလသတ်မှတ်ချက်သို့ ပြန်ထားမည်' : 'Reset Default Policy'}</span>
          </button>

          <button
            type="button"
            onClick={() => showFeedback(language === 'my' ? 'မီနူးခွင့်ပြုချက်အားလုံး အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ' : 'All permissions saved successfully')}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{language === 'my' ? 'သိမ်းဆည်းထားပြီး (Saved)' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono bg-emerald-100 px-2 py-0.5 rounded">
            Live Synced
          </span>
        </div>
      )}

      {/* 4 Role Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {rolesConfig.map((item) => {
          const isSelected = selectedRole === item.role;
          const allowedCount = (roleMenuPermissions[item.role] || DEFAULT_ROLE_MENU_PERMISSIONS[item.role] || []).length;
          const usersInRole = db.users.filter(u => u.role === item.role).length;

          return (
            <div
              key={item.role}
              onClick={() => setSelectedRole(item.role)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                    {item.role}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {usersInRole} {language === 'my' ? 'ဦး' : 'users'}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900">
                  {language === 'my' ? item.titleMm : item.titleEn}
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {language === 'my' ? item.descriptionMm : item.descriptionEn}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">{language === 'my' ? 'ခွင့်ပြု မီနူး အရေအတွက်' : 'Allowed Menus'}:</span>
                <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {allowedCount} / {menuList.length}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role Selector & Fast Presets Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700">
            {language === 'my' ? 'ရွေးချယ်ထားသော Role:' : 'Configuring Role:'}
          </span>
          <div className="flex items-center space-x-1">
            {(['MAKER', 'CHECKER', 'ADMIN', 'AUDITOR'] as UserRole[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setSelectedRole(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedRole === role
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Presets for active selected role */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-500 font-medium">
            {language === 'my' ? 'အမြန် သတ်မှတ်ရန်:' : 'Quick Presets:'}
          </span>
          {selectedRole === 'MAKER' && (
            <button
              type="button"
              onClick={() => handleQuickPreset('entry_only')}
              className="px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 text-[11px] font-bold transition-colors border border-sky-300"
            >
              {language === 'my' ? 'Outward + Inward Entry သာ' : 'Entry Only (Standard Maker)'}
            </button>
          )}
          {selectedRole === 'CHECKER' && (
            <button
              type="button"
              onClick={() => handleQuickPreset('approve_only')}
              className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition-colors border border-amber-300"
            >
              {language === 'my' ? 'Outward + Inward Approval သာ' : 'Approval Only (Standard Checker)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => handleQuickPreset('all')}
            className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors border border-slate-200"
          >
            {language === 'my' ? 'အားလုံးဖွင့်မည်' : 'Check All'}
          </button>
        </div>
      </div>

      {/* Menu Checkbox Grid by Category */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {language === 'my' ? `${selectedRole} အတွက် မီနူးပြသမှု Checkbox များ` : `Menu Checkboxes for ${selectedRole}`}
            </h4>
            <span className="text-xs text-slate-500 font-medium">
              ({currentRoleMenus.length} / {menuList.length} {language === 'my' ? 'ခု ဖွင့်ထားသည်' : 'active'})
            </span>
          </div>

          <span className="text-[11px] text-slate-500">
            {language === 'my' ? 'အမှန်ခြစ် (☑) ထားသော မီနူးများသည် Sidebar တွင် ပေါ်မည်ဖြစ်သည်' : 'Checked menus will display in Sidebar navigation'}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {menuList.map((menu) => {
            const isChecked = currentRoleMenus.includes(menu.id);
            const Icon = menu.icon;
            const isAdminSetupMenu = menu.id === 'admin_setup';
            const isLockedAdminOnly = isAdminSetupMenu && selectedRole !== 'ADMIN';
            const isLockedForAdmin = isAdminSetupMenu && selectedRole === 'ADMIN';

            return (
              <div
                key={menu.id}
                onClick={() => {
                  if (!isLockedAdminOnly && !isLockedForAdmin) {
                    handleToggle(menu.id);
                  }
                }}
                className={`p-4 transition-colors flex items-start sm:items-center justify-between gap-3 ${
                  isLockedAdminOnly
                    ? 'bg-slate-50/60 opacity-60 cursor-not-allowed'
                    : isLockedForAdmin
                    ? 'bg-purple-50/20 cursor-default'
                    : 'hover:bg-blue-50/30 cursor-pointer'
                }`}
              >
                <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                  {/* Styled Checkbox */}
                  <div className="pt-0.5 sm:pt-0">
                    <input
                      type="checkbox"
                      id={`chk-${selectedRole}-${menu.id}`}
                      checked={isChecked}
                      disabled={isLockedAdminOnly || isLockedForAdmin}
                      onChange={() => handleToggle(menu.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Icon Box */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isChecked ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>

                  {/* Menu Title and Description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <label 
                        htmlFor={`chk-${selectedRole}-${menu.id}`}
                        className={`text-xs font-bold cursor-pointer ${
                          isChecked ? 'text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {language === 'my' ? menu.labelMm : menu.labelEn}
                      </label>

                      {isAdminSetupMenu && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center space-x-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>{language === 'my' ? 'Admin Role သာ လုပ်ခွင့်ရှိပါသည်' : 'Admin Role Only'}</span>
                        </span>
                      )}

                      {menu.id === 'outward_entry' && selectedRole === 'MAKER' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                          {language === 'my' ? 'Maker အဓိက' : 'Maker Primary'}
                        </span>
                      )}

                      {menu.id === 'inward_entry' && selectedRole === 'MAKER' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 border border-sky-200">
                          {language === 'my' ? 'Maker အဓိက' : 'Maker Primary'}
                        </span>
                      )}

                      {menu.id === 'outward_approve' && selectedRole === 'CHECKER' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {language === 'my' ? 'Checker အဓိက' : 'Checker Primary'}
                        </span>
                      )}

                      {menu.id === 'inward_approve' && selectedRole === 'CHECKER' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          {language === 'my' ? 'Checker အဓိက' : 'Checker Primary'}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                      {language === 'my' ? menu.descriptionMm : menu.descriptionEn}
                    </p>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0 flex items-center space-x-2">
                  {isLockedAdminOnly ? (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 flex items-center space-x-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{language === 'my' ? 'ပိတ်ထားပါသည် (Admin သာ)' : 'Locked (Admin Only)'}</span>
                    </span>
                  ) : isChecked ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                      <Check className="w-3 h-3" />
                      <span>{language === 'my' ? 'ပြသမည် (Show)' : 'Show in Menu'}</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      {language === 'my' ? 'ဖျောက်ထားမည် (Hide)' : 'Hidden'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Testing Quick Switcher Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-blue-950">
              {language === 'my' 
                ? 'မတူညီသော Role များဖြင့် မီနူးပြသမှုကို စမ်းသပ်ကြည့်ရှုရန် (Live Role Testing)' 
                : 'Instant Live Role Preview & Verification'}
            </h5>
            <p className="text-[11px] text-blue-800/80">
              {language === 'my'
                ? 'အောက်ပါ ခလုတ်များကို နှိပ်၍ Maker, Checker, Admin အကောင့်များသို့ ချက်ချင်း ပြောင်းလဲစမ်းသပ်နိုင်ပါသည်'
                : 'Switch active user context to verify how the sidebar dynamically adapts per role permissions.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {makerUser && (
            <button
              type="button"
              onClick={() => {
                switchUser(makerUser.id);
                showFeedback(language === 'my' ? `Maker (${makerUser.fullName}) သို့ ပြောင်းလဲလိုက်ပါပြီ` : `Switched to Maker (${makerUser.fullName})`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                currentUser.role === 'MAKER'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white hover:bg-sky-50 text-sky-800 border-sky-300 shadow-2xs'
              }`}
            >
              {language === 'my' ? 'Maker ဖြင့် စမ်းမည်' : 'Test as Maker'}
            </button>
          )}

          {checkerUser && (
            <button
              type="button"
              onClick={() => {
                switchUser(checkerUser.id);
                showFeedback(language === 'my' ? `Checker (${checkerUser.fullName}) သို့ ပြောင်းလဲလိုက်ပါပြီ` : `Switched to Checker (${checkerUser.fullName})`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                currentUser.role === 'CHECKER'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white hover:bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
              }`}
            >
              {language === 'my' ? 'Checker ဖြင့် စမ်းမည်' : 'Test as Checker'}
            </button>
          )}

          {adminUser && (
            <button
              type="button"
              onClick={() => {
                switchUser(adminUser.id);
                showFeedback(language === 'my' ? `Admin (${adminUser.fullName}) သို့ ပြောင်းလဲလိုက်ပါပြီ` : `Switched to Admin (${adminUser.fullName})`);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                currentUser.role === 'ADMIN'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-white hover:bg-purple-50 text-purple-800 border-purple-300 shadow-2xs'
              }`}
            >
              {language === 'my' ? 'Admin သို့ ပြန်ပြောင်းမည်' : 'Back to Admin'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
