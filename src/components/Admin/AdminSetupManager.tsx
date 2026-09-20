import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Building, 
  Coins, 
  Globe2, 
  TrendingUp, 
  ShieldAlert, 
  FileCheck2, 
  UserCheck2,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  DollarSign,
  Tag,
  AlertTriangle,
  Info,
  History,
  Edit3,
  CheckSquare
} from 'lucide-react';
import { useRemittance, getNextCleanId } from '../../lib/store';
import { SetupSubTab } from '../Sidebar';
import { CompanyProfileModal } from '../CompanyProfileModal';
import { CompanyProfileSettingForm } from './CompanyProfileSettingForm';
import { RoleMenuPermissionManager } from './RoleMenuPermissionManager';
import { DefaultStatusAdminManager } from './DefaultStatusAdminManager';
import { 
  Branch, 
  User, 
  Company, 
  Currency, 
  Country, 
  ExchangeRate, 
  BlacklistEntry, 
  RemittancePurpose, 
  Customer 
} from '../../types';

interface AdminSetupProps {
  currentSubTab: SetupSubTab;
  onSelectSubTab: (tab: SetupSubTab) => void;
  onNavigateAudit?: (module?: string) => void;
}

export const AdminSetupManager: React.FC<AdminSetupProps> = ({ currentSubTab, onSelectSubTab, onNavigateAudit }) => {
  const { 
    db, 
    language, 
    t, 
    saveBranch, deleteBranch,
    saveUser, deleteUser,
    saveCompany, deleteCompany,
    saveCurrency, deleteCurrency,
    saveCountry, deleteCountry,
    saveExchangeRate, deleteExchangeRate,
    saveBlacklist, deleteBlacklist,
    savePurpose, deletePurpose,
    saveCustomer, deleteCustomer,
    currentUser,
    operatorProfile
  } = useRemittance();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [modalType, setModalType] = useState<SetupSubTab | null>(null);
  const [isNew, setIsNew] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showCompanyProfileModal, setShowCompanyProfileModal] = useState(false);

  // Security Check: "Admin Setup ကို Admin Role ကဘဲလုပ်ခွင့်ရှိပါမယ်"
  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="bg-white border border-rose-200 rounded-xl p-8 text-center max-w-lg mx-auto my-12 shadow-xs space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900">
          {language === 'my' ? 'ခွင့်ပြုချက် မရှိပါ (Access Denied)' : 'Access Denied'}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          {language === 'my' 
            ? 'Admin Setup ကို Admin Role ကသာ လုပ်ဆောင်ခွင့်ရှိပါသည်။ သင်၏ လက်ရှိ Role သည် '
            : 'Admin Setup is strictly restricted to Admin role only. Your current role is '}
          <span className="font-bold text-rose-700 px-1.5 py-0.5 bg-rose-50 rounded border border-rose-200">
            {currentUser.role}
          </span>
          {language === 'my' ? ' ဖြစ်နေသဖြင့် ဤအပိုင်းကို ဝင်ရောက်ပြင်ဆင်ခွင့် မပြုပါ။' : '.'}
        </p>
        <div className="pt-2">
          <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono">
            Security Enforcement: CBM RemitPro Role-Based Access Control
          </span>
        </div>
      </div>
    );
  }

  // Setup tabs list
  const navTabs: { id: SetupSubTab; labelEn: string; labelMm: string; icon: any; count: number }[] = [
    { id: 'operator_profile', labelEn: '1. Software Company (Orange Box)', labelMm: '၁။ ဆော့ဖ်ဝဲလ်ကုမ္ပဏီ (လိမ္မော်ရောင်အကွက်)', icon: Building2, count: 1 },
    { id: 'branch', labelEn: '2. Branches', labelMm: '၂။ ဘဏ်ခွဲများ', icon: Building2, count: db.branches.length },
    { id: 'user', labelEn: '3. System Users', labelMm: '၃။ အသုံးပြုသူများ', icon: Users, count: db.users.length },
    { id: 'company', labelEn: '4. Partner Companies', labelMm: '၄။ မိတ်ဖက်ကုမ္ပဏီများ', icon: Building, count: db.companies.length },
    { id: 'currency', labelEn: '5. Currencies', labelMm: '၅။ ငွေကြေးအမျိုးအစား', icon: Coins, count: db.currencies.length },
    { id: 'country', labelEn: '6. Countries', labelMm: '၆။ နိုင်ငံများ', icon: Globe2, count: db.countries.length },
    { id: 'exchange_rate', labelEn: '7. Exchange Rates', labelMm: '၇။ ငွေလဲလှယ်နှုန်းများ', icon: TrendingUp, count: db.exchangeRates.length },
    { id: 'blacklist', labelEn: '8. Blacklist (NRC & Passport)', labelMm: '၈။ နာမည်ပျက်စာရင်း (NRC & Passport)', icon: ShieldAlert, count: db.blacklist.length },
    { id: 'purpose', labelEn: '9. Purpose of Remit', labelMm: '၉။ လွှဲပို့ရည်ရွယ်ချက်များ', icon: FileCheck2, count: db.purposes.length },
    { id: 'customer', labelEn: '10. Customers Master', labelMm: '၁၀။ ဖောက်သည်များ', icon: UserCheck2, count: db.customers.length },
    { id: 'menu_permission', labelEn: '11. App Menu by Role', labelMm: '၁၁။ မီနူး ခွင့်ပြုချက်များ (Show App Menu)', icon: ShieldCheck, count: 4 },
    { id: 'default_status', labelEn: '12. Default Status (Country Rule)', labelMm: '၁၂။ မူရင်းအခြေအနေ သတ်မှတ်ချက် (Default Status)', icon: CheckSquare, count: 1 },
  ];

  const handleOpenAdd = (type: SetupSubTab, presetData?: Partial<RemittancePurpose>) => {
    setIsNew(true);
    setModalType(type);
    
    if (type === 'branch') {
      const nextId = getNextCleanId('BR', db.branches, 3);
      setEditingItem({
        id: nextId,
        code: nextId,
        nameEn: '',
        nameMm: '',
        countryCode: 'MM',
        city: 'Yangon',
        phone: '01-',
        address: '',
        managerName: currentUser.fullName,
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });
    } else if (type === 'user') {
      const nextId = getNextCleanId('USR', db.users, 3);
      setEditingItem({
        id: nextId,
        username: '',
        fullName: '',
        email: '',
        password: 'password123',
        role: 'MAKER',
        branchId: db.branches[0]?.id || 'BR-001',
        phone: '09-',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });
    } else if (type === 'company') {
      const nextId = getNextCleanId('CMP', db.companies, 3);
      setEditingItem({
        id: nextId,
        code: nextId,
        nameEn: '',
        nameMm: '',
        countryCode: 'SG',
        type: 'FINTECH',
        swiftCode: '',
        licenseNo: '',
        phone: '',
        email: '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString()
      });
    } else if (type === 'currency') {
      setEditingItem({
        id: getNextCleanId('CUR', db.currencies, 3),
        code: '',
        nameEn: '',
        nameMm: '',
        symbol: '$',
        isBaseCurrency: false,
        decimals: 2,
        status: 'ACTIVE'
      });
    } else if (type === 'country') {
      setEditingItem({
        id: getNextCleanId('CTY', db.countries, 3),
        code: '',
        nameEn: '',
        nameMm: '',
        dialCode: '+',
        flagEmoji: '🌐',
        currencyCode: 'USD',
        isDomestic: false,
        status: 'ACTIVE'
      });
    } else if (type === 'exchange_rate') {
      setEditingItem({
        id: getNextCleanId('EXR', db.exchangeRates, 3),
        fromCurrency: 'USD',
        toCurrency: 'MMK',
        buyRate: 4500,
        sellRate: 4620,
        transferRate: 4580,
        effectiveDate: new Date().toISOString().split('T')[0],
        effectiveTime: '09:00 AM',
        updatedBy: currentUser.fullName,
        note: 'Central Bank & Market Reference Rate'
      });
    } else if (type === 'blacklist') {
      setEditingItem({
        id: getNextCleanId('BLK', db.blacklist, 3),
        fullNameEn: '',
        fullNameMm: '',
        nrcNumber: '',
        passbookNumber: '',
        passportNumber: '',
        reason: 'Illegal Hundi / AML Suspicious Activity',
        note: '',
        riskLevel: 'HIGH',
        addedBy: currentUser.fullName,
        active: true,
        createdAt: new Date().toISOString()
      });
    } else if (type === 'purpose') {
      const nextId = getNextCleanId('PUR', db.purposes, 3);
      setEditingItem({
        id: nextId,
        code: presetData?.code || nextId,
        nameEn: presetData?.nameEn || '',
        nameMm: presetData?.nameMm || '',
        category: presetData?.category || 'PERSONAL',
        requiresDocProof: presetData?.requiresDocProof ?? false,
        maxDailyLimitMMK: presetData?.maxDailyLimitMMK || 10000000,
        ...presetData
      });
    } else if (type === 'customer') {
      const nextId = getNextCleanId('CUST', db.customers, 3);
      const numSuffix = nextId.replace('CUST-', '');
      setEditingItem({
        id: nextId,
        customerCode: `CUS-2026-${numSuffix}`,
        fullNameEn: '',
        fullNameMm: '',
        nrcNumber: '',
        passbookNumber: '',
        passportNumber: '',
        phone: '09-',
        address: '',
        customerType: 'BOTH',
        riskRating: 'LOW',
        totalTransactions: 0,
        totalVolumeMMK: 0,
        createdAt: new Date().toISOString()
      });
    }
  };

  const handleOpenEdit = (type: SetupSubTab, item: any) => {
    setIsNew(false);
    setEditingItem({ ...item });
    setModalType(type);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (modalType === 'branch') {
      saveBranch(editingItem);
    } else if (modalType === 'user') {
      saveUser(editingItem);
    } else if (modalType === 'company') {
      saveCompany(editingItem);
    } else if (modalType === 'currency') {
      saveCurrency(editingItem);
    } else if (modalType === 'country') {
      saveCountry(editingItem);
    } else if (modalType === 'exchange_rate') {
      saveExchangeRate(editingItem);
    } else if (modalType === 'blacklist') {
      saveBlacklist(editingItem);
    } else if (modalType === 'purpose') {
      savePurpose(editingItem);
    } else if (modalType === 'customer') {
      saveCustomer(editingItem);
    }

    setModalType(null);
    setEditingItem(null);
  };

  const handleDelete = (type: SetupSubTab, id: string) => {
    if (type === 'branch') deleteBranch(id);
    else if (type === 'user') deleteUser(id);
    else if (type === 'company') deleteCompany(id);
    else if (type === 'currency') deleteCurrency(id);
    else if (type === 'country') deleteCountry(id);
    else if (type === 'exchange_rate') deleteExchangeRate(id);
    else if (type === 'blacklist') deleteBlacklist(id);
    else if (type === 'purpose') deletePurpose(id);
    else if (type === 'customer') deleteCustomer(id);

    setDeleteConfirmId(null);
  };

  // Filter lists based on search
  const q = searchQuery.toLowerCase().trim();

  const filteredBranches = db.branches.filter(b => 
    !q || b.code.toLowerCase().includes(q) || b.nameEn.toLowerCase().includes(q) || b.nameMm.toLowerCase().includes(q) || b.city.toLowerCase().includes(q)
  );

  const filteredUsers = db.users.filter(u => 
    !q || u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  );

  const filteredCompanies = db.companies.filter(c => 
    !q || c.code.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.nameMm.toLowerCase().includes(q)
  );

  const filteredCurrencies = db.currencies.filter(c => 
    !q || c.code.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.nameMm.toLowerCase().includes(q)
  );

  const filteredCountries = db.countries.filter(c => 
    !q || c.code.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.nameMm.toLowerCase().includes(q)
  );

  const filteredExchangeRates = db.exchangeRates.filter(r => 
    !q || r.fromCurrency.toLowerCase().includes(q) || r.toCurrency.toLowerCase().includes(q) || (r.note && r.note.toLowerCase().includes(q))
  );

  const filteredBlacklist = db.blacklist.filter(b => 
    !q || b.fullNameEn.toLowerCase().includes(q) || b.fullNameMm.toLowerCase().includes(q) || b.nrcNumber.toLowerCase().includes(q) || (b.passportNumber && b.passportNumber.toLowerCase().includes(q)) || (b.passbookNumber && b.passbookNumber.toLowerCase().includes(q)) || (b.note && b.note.toLowerCase().includes(q))
  );

  const filteredPurposes = db.purposes.filter(p => 
    !q || p.code.toLowerCase().includes(q) || p.nameEn.toLowerCase().includes(q) || p.nameMm.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  const filteredCustomers = db.customers.filter(c => 
    !q || c.customerCode.toLowerCase().includes(q) || c.fullNameEn.toLowerCase().includes(q) || c.fullNameMm.toLowerCase().includes(q) || c.nrcNumber.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q)
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm border border-blue-200">
              ⚙️
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {t.adminSetupTitle}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t.adminSetupSubtitle} • {language === 'my' ? 'ဘဏ်ခွဲ၊ အသုံးပြုသူ၊ ငွေကြေး၊ နိုင်ငံ၊ ငွေလဲနှုန်း၊ နာမည်ပျက်စာရင်း၊ ငွေလွှဲရည်ရွယ်ချက် များကို စီမံခန့်ခွဲခြင်း' : 'Manage master data, compliance watchlists, exchange rates, and remittance purposes with full audit logging.'}
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectSubTab('operator_profile')}
            className={`flex items-center justify-center space-x-1.5 px-3 py-2 rounded-lg border font-semibold text-xs transition-all cursor-pointer ${
              currentSubTab === 'operator_profile'
                ? 'bg-orange-600 text-white border-orange-600 shadow-sm'
                : 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-300 shadow-2xs'
            }`}
          >
            <Building2 className="w-4 h-4 text-inherit" />
            <span>{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက်' : 'Company Info'}</span>
          </button>
          {currentSubTab !== 'operator_profile' && currentSubTab !== 'menu_permission' && currentSubTab !== 'default_status' && (
            <button
              onClick={() => handleOpenAdd(currentSubTab)}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addNew}</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Orange Rectangular Box: Operating Remittance Company (လိမ္မော်ရောင်လေးဒေါင့်အကွက်) - shown when not in operator_profile, menu_permission, or default_status */}
      {currentSubTab !== 'operator_profile' && currentSubTab !== 'menu_permission' && currentSubTab !== 'default_status' && (
        <div className="border-2 border-orange-500 bg-orange-50/60 rounded-xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-orange-200/80 pb-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-lg bg-orange-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-orange-600 text-white px-2 py-0.5 rounded">
                    {language === 'my' ? 'Remittance Software အသုံးပြုသည့် ကုမ္ပဏီ (Orange Box)' : 'Operating Remittance Company'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-orange-950 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded">
                    {operatorProfile.licenseNo}
                  </span>
                </div>
                <h3 className="text-base font-black text-orange-950 mt-0.5">
                  {language === 'my' ? `${operatorProfile.companyNameMm} (${operatorProfile.companyNameEn})` : operatorProfile.companyNameEn}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectSubTab('operator_profile')}
              className="self-start sm:self-center flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold text-xs transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-orange-600" />
              <span>{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန် (Form)' : 'Edit Company Info (Form)'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2.5 text-xs text-slate-800">
            <div className="flex items-start space-x-2">
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-orange-950">{language === 'my' ? 'ရုံးချုပ် လိပ်စာ' : 'Head Office Address'}: </strong>
                <span className="text-slate-700">{language === 'my' ? operatorProfile.addressMm : operatorProfile.addressEn}</span>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Phone className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-orange-950">{language === 'my' ? 'ဆက်သွယ်ရန် ဖုန်းနံပါတ်' : 'Contact Phone'}: </strong>
                <span className="font-mono font-bold text-slate-900">{operatorProfile.phone}</span>
                {operatorProfile.hotline && (
                  <span className="text-slate-600 ml-1.5">
                    (Hotline: <strong className="font-mono text-orange-700">{operatorProfile.hotline}</strong>)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub Tab Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                onSelectSubTab(tab.id);
                setSearchQuery('');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </div>
              <div className="mt-2.5">
                <span className={`text-xs font-bold block truncate ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                  {language === 'my' ? tab.labelMm : tab.labelEn}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Content Area: Company Profile Setting Form OR Role Menu Permissions OR Default Status Manager OR Master Data Table */}
      {currentSubTab === 'operator_profile' ? (
        <CompanyProfileSettingForm />
      ) : currentSubTab === 'menu_permission' ? (
        <RoleMenuPermissionManager />
      ) : currentSubTab === 'default_status' ? (
        <DefaultStatusAdminManager />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          {/* Search Bar & Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              {language === 'my' 
                ? navTabs.find(t => t.id === currentSubTab)?.labelMm 
                : navTabs.find(t => t.id === currentSubTab)?.labelEn}
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              ({
                currentSubTab === 'branch' ? filteredBranches.length :
                currentSubTab === 'user' ? filteredUsers.length :
                currentSubTab === 'company' ? filteredCompanies.length :
                currentSubTab === 'currency' ? filteredCurrencies.length :
                currentSubTab === 'country' ? filteredCountries.length :
                currentSubTab === 'exchange_rate' ? filteredExchangeRates.length :
                currentSubTab === 'blacklist' ? filteredBlacklist.length :
                currentSubTab === 'purpose' ? filteredPurposes.length :
                filteredCustomers.length
              } {language === 'my' ? 'ခု' : 'records'})
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'my' ? 'ရှာဖွေရန်...' : 'Search...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <button
              onClick={() => handleOpenAdd(currentSubTab)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addNew}</span>
            </button>
          </div>
        </div>

        {/* 8. PURPOSE OF REMIT (Specialized Section with Quick Presets) */}
        {currentSubTab === 'purpose' && (
          <div className="space-y-4">
            {/* Quick Presets Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2 text-slate-700 font-semibold">
                <Tag className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{language === 'my' ? 'လျင်မြန်စွာ ရွေးချယ်ထည့်သွင်းရန် (Quick Presets):' : 'Quick Presets (Click to Add):'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenAdd('purpose', {
                    code: 'PUR-FAM',
                    nameEn: 'Family Allowance',
                    nameMm: 'မိသားစု စားဝတ်နေရေး ထောက်ပံ့ငွေ',
                    category: 'PERSONAL',
                    maxDailyLimitMMK: 10000000,
                    requiresDocProof: false
                  })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  + Family Allowance
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('purpose', {
                    code: 'PUR-SAL',
                    nameEn: 'Salary',
                    nameMm: 'လစဉ် လစာငွေ (Monthly Salary)',
                    category: 'SALARY',
                    maxDailyLimitMMK: 20000000,
                    requiresDocProof: false
                  })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  + Salary
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('purpose', {
                    code: 'PUR-MIDSAL',
                    nameEn: 'Mid Salary',
                    nameMm: 'လလယ် လစာကြိုထုတ်ငွေ (Mid Salary Advance)',
                    category: 'SALARY',
                    maxDailyLimitMMK: 10000000,
                    requiresDocProof: false
                  })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-teal-50 text-teal-700 border border-teal-200 font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  + Mid Salary
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('purpose', {
                    code: 'PUR-MED',
                    nameEn: 'Medical Treatment',
                    nameMm: 'ဆေးဝါးကုသစရိတ် နှင့် ဆေးရုံတက်ခွင့်ငွေ',
                    category: 'MEDICAL',
                    maxDailyLimitMMK: 50000000,
                    requiresDocProof: true
                  })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  + Medical
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('purpose', {
                    code: 'PUR-EDU',
                    nameEn: 'Overseas Education',
                    nameMm: 'ပြည်ပ ပညာသင်စရိတ် နှင့် ကျောင်းလခ',
                    category: 'EDUCATION',
                    maxDailyLimitMMK: 30000000,
                    requiresDocProof: true
                  })}
                  className="px-2.5 py-1 rounded bg-white hover:bg-purple-50 text-purple-700 border border-purple-200 font-semibold text-[11px] transition-colors shadow-2xs"
                >
                  + Education
                </button>
              </div>
            </div>

            {/* Purposes Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">{t.code}</th>
                    <th className="px-4 py-3">{t.purposeNameEn} / {t.purposeNameMm}</th>
                    <th className="px-4 py-3">{t.category}</th>
                    <th className="px-4 py-3">{t.maxDailyLimit}</th>
                    <th className="px-4 py-3">{t.requiresDocProof}</th>
                    <th className="px-4 py-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredPurposes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    filteredPurposes.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">
                          {p.code}
                        </td>
                        <td className="px-4 py-3">
                          <strong className="text-slate-900 block font-semibold text-xs">{p.nameEn}</strong>
                          <span className="text-[11px] text-slate-500">{p.nameMm}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.category === 'SALARY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            p.category === 'PERSONAL' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            p.category === 'MEDICAL' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                            p.category === 'EDUCATION' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            p.category === 'BUSINESS' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">
                          {p.maxDailyLimitMMK ? `${p.maxDailyLimitMMK.toLocaleString()} MMK` : 'Unlimited'}
                        </td>
                        <td className="px-4 py-3">
                          {p.requiresDocProof ? (
                            <span className="inline-flex items-center text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Required
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium text-[11px]">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                          <button 
                            onClick={() => handleOpenEdit('purpose', p)} 
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={t.edit}
                          >
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmId(p.id)} 
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title={t.delete}
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 1. BRANCH MODULE */}
        {currentSubTab === 'branch' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.branchCode}</th>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3">{language === 'my' ? 'နိုင်ငံ' : 'Country'}</th>
                  <th className="px-4 py-3">{t.city}</th>
                  <th className="px-4 py-3">{t.phone}</th>
                  <th className="px-4 py-3">{t.address}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBranches.map(b => {
                  const country = db.countries.find(c => c.code === (b.countryCode || 'MM'));
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600">
                        {b.code || b.branchCode || (b as any).branch_code || b.id}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{b.nameEn} ({b.nameMm})</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium">
                          <span>{country?.flagEmoji || '🇲🇲'}</span>
                          <span>{country ? (language === 'my' ? country.nameMm : country.nameEn) : 'Myanmar'}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.city}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{b.phone}</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{b.address}</td>
                      <td className="px-4 py-3 text-right space-x-1.5">
                        <button onClick={() => handleOpenEdit('branch', b)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                        <button onClick={() => setDeleteConfirmId(b.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. USER MODULE */}
        {currentSubTab === 'user' && (
          <div className="space-y-3">
            {/* Audit Trail Shortcut Banner */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-white border border-purple-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">
                    {language === 'my' ? 'User ထည့်သွင်း/ပြင်ဆင်မှု မှတ်တမ်း (User Audit Trail)' : 'User Security & Activity Audit Trail'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'my' 
                      ? 'User အသစ်သွင်းခြင်း၊ အချက်အလက်ပြင်ဆင်ခြင်းနှင့် ဖျက်သိမ်းခြင်းများအားလုံးကို Audit Trail တွင် အလိုအလျောက် မှတ်တမ်းတင်ထားပါသည်' 
                      : 'All user creations, edits, and deletions are immutably logged with timestamp, operator, and details.'}
                  </p>
                </div>
              </div>

              {onNavigateAudit && (
                <button
                  type="button"
                  onClick={() => onNavigateAudit('USER')}
                  className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shrink-0 shadow-xs"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>{language === 'my' ? 'User မှတ်တမ်းများ သွားရောက်ကြည့်ရှုမည်' : 'View User Audit Trail'}</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">{t.username}</th>
                    <th className="px-4 py-3">{t.fullName}</th>
                    <th className="px-4 py-3">{t.role}</th>
                    <th className="px-4 py-3">{t.country}</th>
                    <th className="px-4 py-3">{t.branch}</th>
                    <th className="px-4 py-3">{t.phone}</th>
                    <th className="px-4 py-3">{language === 'my' ? 'မူရင်းအခြေအနေ (Default Status)' : 'Default Status'}</th>
                    <th className="px-4 py-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredUsers.map(u => {
                    const branch = db.branches.find(b => b.id === u.branchId);
                    const userCountryCode = u.countryCode || branch?.countryCode || 'MM';
                    const country = db.countries.find(c => c.code === userCountryCode);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono font-bold text-blue-600">@{u.username}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{u.fullName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                            u.role === 'CHECKER' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-[11px]">
                            <span>{country?.flagEmoji || '🌐'}</span>
                            <span>{country?.nameEn || userCountryCode}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-medium">
                          {branch?.nameEn || u.branchId}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">{u.phone}</td>
                        <td className="px-4 py-3">
                          {u.defaultStatusEnabled !== false ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              userCountryCode === 'MM'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-sky-100 text-sky-800 border border-sky-200'
                            }`}>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{userCountryCode === 'MM' ? 'Domestic & NRC' : 'International & Passport'}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-medium">
                              Manual
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1.5">
                          <button onClick={() => handleOpenEdit('user', u)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                          <button onClick={() => setDeleteConfirmId(u.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. PARTNER COMPANY MODULE */}
        {currentSubTab === 'company' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.code}</th>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3">{t.type}</th>
                  <th className="px-4 py-3">{t.country}</th>
                  <th className="px-4 py-3">{t.swiftCode}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCompanies.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{c.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.nameEn} ({c.nameMm})</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">{c.type}</span></td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.countryCode}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.swiftCode || '-'}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('company', c)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. CURRENCY MODULE */}
        {currentSubTab === 'currency' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.code}</th>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3">{t.symbol}</th>
                  <th className="px-4 py-3">{t.baseCurrency}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCurrencies.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{c.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.nameEn} ({c.nameMm})</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{c.symbol}</td>
                    <td className="px-4 py-3">{c.isBaseCurrency ? <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">BASE CURRENCY</span> : '-'}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('currency', c)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. COUNTRY MODULE */}
        {currentSubTab === 'country' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.code}</th>
                  <th className="px-4 py-3">{t.name}</th>
                  <th className="px-4 py-3">{t.dialCode}</th>
                  <th className="px-4 py-3">{t.currency}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCountries.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-blue-600 flex items-center space-x-1.5">
                      <span>{c.flagEmoji}</span>
                      <span>{c.code}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{c.nameEn} ({c.nameMm})</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.dialCode}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.currencyCode}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('country', c)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. EXCHANGE RATE MODULE */}
        {currentSubTab === 'exchange_rate' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.currencyPair}</th>
                  <th className="px-4 py-3 text-blue-600 font-bold">{t.transferRate} (MMK)</th>
                  <th className="px-4 py-3">{t.buyRate}</th>
                  <th className="px-4 py-3">{t.sellRate}</th>
                  <th className="px-4 py-3">{t.effectiveDate}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExchangeRates.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.fromCurrency} / {r.toCurrency}</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-blue-600 text-sm">{Number(r.transferRate || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{Number(r.buyRate || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{Number(r.sellRate || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">{r.effectiveDate}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('exchange_rate', r)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(r.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. BLACKLIST MODULE */}
        {currentSubTab === 'blacklist' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.fullName}</th>
                  <th className="px-4 py-3">{t.myanmarNrc}</th>
                  <th className="px-4 py-3">{t.passbookNumber}</th>
                  <th className="px-4 py-3">{t.riskLevel}</th>
                  <th className="px-4 py-3">{t.noteTextBox}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredBlacklist.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-semibold">{b.fullNameEn}</strong>
                      <span className="text-[11px] text-slate-500">{b.fullNameMm}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">{b.nrcNumber}</td>
                    <td className="px-4 py-3 font-mono text-amber-600 font-semibold">{b.passportNumber || b.passbookNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        b.riskLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.riskLevel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate italic">
                      "{b.note}"
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('blacklist', b)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(b.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. CUSTOMER MASTER */}
        {currentSubTab === 'customer' && (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="px-4 py-3">{t.fullName}</th>
                  <th className="px-4 py-3">{t.myanmarNrc}</th>
                  <th className="px-4 py-3">{t.passbookNumber}</th>
                  <th className="px-4 py-3">{t.phone}</th>
                  <th className="px-4 py-3">{t.address}</th>
                  <th className="px-4 py-3 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <strong className="text-slate-900 block font-semibold">{c.fullNameEn}</strong>
                      <span className="text-[11px] text-slate-500">{c.fullNameMm}</span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-600">{c.nrcNumber}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.passportNumber || c.passbookNumber || '-'}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{c.phone}</td>
                    <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{c.address}</td>
                    <td className="px-4 py-3 text-right space-x-1.5">
                      <button onClick={() => handleOpenEdit('customer', c)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-3.5 h-3.5 inline" /></button>
                      <button onClick={() => setDeleteConfirmId(c.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"><Trash2 className="w-3.5 h-3.5 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {language === 'my' ? 'ဖျက်သိမ်းရန် သေချာပါသလား?' : 'Confirm Deletion'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'my' ? 'ဤအချက်အလက်ကို ပြန်လည်ရယူနိုင်မည် မဟုတ်ပါ။' : 'This action cannot be undone.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(currentSubTab, deleteConfirmId)}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-sm transition-colors"
              >
                {t.delete}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Add/Edit Modal */}
      {modalType && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                  {isNew ? '+' : '✎'}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {isNew ? t.addNew : t.edit} - {navTabs.find(t => t.id === modalType)?.labelEn}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setModalType(null);
                  setEditingItem(null);
                }} 
                className="text-slate-400 hover:text-slate-700 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              {/* PURPOSE OF REMIT MODAL FIELDS */}
              {modalType === 'purpose' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {t.purposeCode} *
                      </label>
                      <input
                        type="text"
                        required
                        value={editingItem.code || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. PUR-FAM, PUR-SAL, PUR-MIDSAL"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {t.category} *
                      </label>
                      <select
                        value={editingItem.category || 'PERSONAL'}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="PERSONAL">PERSONAL (မိသားစု/ကိုယ်ရေးကိုယ်တာ)</option>
                        <option value="SALARY">SALARY (လစာငွေ / Mid Salary)</option>
                        <option value="MEDICAL">MEDICAL (ဆေးဝါးကုသစရိတ်)</option>
                        <option value="EDUCATION">EDUCATION (ပညာသင်စရိတ်)</option>
                        <option value="BUSINESS">BUSINESS (စီးပွားရေး/ကုန်သွယ်)</option>
                        <option value="OTHER">OTHER (အခြား/လှူဒါန်းငွေ)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {t.purposeNameEn} (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameEn || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                      placeholder="e.g. Family Allowance, Monthly Salary, Mid Salary"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {t.purposeNameMm} (မြန်မာ) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameMm || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameMm: e.target.value })}
                      placeholder="ဥပမာ - မိသားစု စားဝတ်နေရေး ထောက်ပံ့ငွေ၊ လစဉ် လစာငွေ၊ လလယ် လစာငွေ"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {t.maxDailyLimit} (MMK)
                    </label>
                    <input
                      type="number"
                      value={editingItem.maxDailyLimitMMK || 10000000}
                      onChange={(e) => setEditingItem({ ...editingItem, maxDailyLimitMMK: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingItem.requiresDocProof || false}
                        onChange={(e) => setEditingItem({ ...editingItem, requiresDocProof: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        {t.requiresDocProof} (ငွေလွှဲပြေစာ / အထောက်အထား လိုအပ်ပါသည်)
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1 pl-6.5">
                      {language === 'my' ? 'ဗဟိုဘဏ် စည်းမျဉ်းအရ ပမာဏများသော လွှဲပြောင်းမှုများအတွက် အထောက်အထား တောင်းခံမည်' : 'Prompt operator to attach invoices or salary slips before approval.'}
                    </p>
                  </div>
                </>
              )}

              {/* BRANCH MODAL */}
              {modalType === 'branch' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Branch Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.code || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">
                        {language === 'my' ? 'နိုင်ငံ (Country) *' : 'Country *'}
                      </label>
                      <select
                        value={editingItem.countryCode || 'MM'}
                        onChange={(e) => setEditingItem({ ...editingItem, countryCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      >
                        {db.countries.map(c => (
                          <option key={c.id} value={c.code}>
                            {c.flagEmoji} {language === 'my' ? c.nameMm : c.nameEn} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">City / Township *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.city || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, city: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Phone *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.phone || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Branch Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameEn || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Branch Name (Myanmar) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameMm || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameMm: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Manager Name</label>
                      <input
                        type="text"
                        value={editingItem.managerName || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, managerName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Status</label>
                      <select
                        value={editingItem.status || 'ACTIVE'}
                        onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Address</label>
                    <input
                      type="text"
                      value={editingItem.address || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </>
              )}

              {/* USER MODAL */}
              {modalType === 'user' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Username *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.username || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, username: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Role *</label>
                      <select
                        value={editingItem.role || 'MAKER'}
                        onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="MAKER">MAKER (Operator / စာရင်းသွင်းသူ)</option>
                        <option value="CHECKER">CHECKER (Approver / အတည်ပြုသူ)</option>
                        <option value="ADMIN">ADMIN (System Administrator)</option>
                        <option value="AUDITOR">AUDITOR (Compliance Inspector)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.fullName || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, fullName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{t.country} *</label>
                      <select
                        value={editingItem.countryCode || (db.branches.find(b => b.id === editingItem.branchId)?.countryCode) || 'MM'}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          const matchingBranch = db.branches.find(b => b.countryCode === newCountry);
                          setEditingItem({
                            ...editingItem,
                            countryCode: newCountry,
                            branchId: matchingBranch ? matchingBranch.id : editingItem.branchId
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      >
                        {db.countries.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.flagEmoji} {c.nameEn} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{t.branch} *</label>
                      <select
                        value={editingItem.branchId || db.branches[0]?.id}
                        onChange={(e) => {
                          const bId = e.target.value;
                          const selectedBranch = db.branches.find(b => b.id === bId);
                          setEditingItem({ 
                            ...editingItem, 
                            branchId: bId,
                            countryCode: selectedBranch?.countryCode || editingItem.countryCode || 'MM'
                          });
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      >
                        {db.branches.map(b => (
                          <option key={b.id} value={b.id}>
                            [{b.countryCode}] {b.nameEn} ({b.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Phone</label>
                    <input
                      type="text"
                      value={editingItem.phone || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        value={editingItem.email || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                        placeholder="user@cbmremit.gov.mm"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Login Password *</label>
                      <input
                        type="text"
                        value={editingItem.password || 'password123'}
                        onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>

                  {/* Default Status Checkbox for User Admin Role */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        id="user-default-status-checkbox"
                        checked={editingItem.defaultStatusEnabled !== false}
                        onChange={(e) => setEditingItem({ ...editingItem, defaultStatusEnabled: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <label htmlFor="user-default-status-checkbox" className="text-xs cursor-pointer select-none">
                        <span className="font-bold text-slate-800 block">
                          {language === 'my' 
                            ? 'Default Status Check Box: အလိုအလျောက် မူရင်းသတ်မှတ်ချက်ကို အသုံးပြုမည်' 
                            : 'Default Status Check Box: Enable Country-Based Remittance Defaults'}
                        </span>
                        <span className="text-[11px] text-slate-500 block mt-0.5">
                          {language === 'my'
                            ? (editingItem.countryCode === 'MM' 
                                ? '🇲🇲 မြန်မာနိုင်ငံ Login ဖြစ်သဖြင့် Remittance Scope = Domestic နှင့် ID Type = NRC ကို မူရင်းအဖြစ် သတ်မှတ်မည်' 
                                : `🌐 နိုင်ငံခြား (${editingItem.countryCode || 'Other'}) Login ဖြစ်သဖြင့် Remittance Scope = International နှင့် ID Type = Passport ကို မူရင်းအဖြစ် သတ်မှတ်မည်`)
                            : (editingItem.countryCode === 'MM'
                                ? 'Myanmar Login: Defaults to Domestic Remittance and NRC Card'
                                : `Foreign Login (${editingItem.countryCode || 'Other'}): Defaults to International Remittance and Passport`)}
                        </span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200 text-[11px]">
                      <span className="font-semibold text-slate-600">Current Default Status:</span>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        (editingItem.countryCode || 'MM') === 'MM'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-sky-100 text-sky-800 border border-sky-300'
                      }`}>
                        {(editingItem.countryCode || 'MM') === 'MM'
                          ? 'Domestic Remittance + NRC Card (Default)'
                          : 'International Remittance + Passport (Default)'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* COMPANY MODAL */}
              {modalType === 'company' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Company Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.code || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Type *</label>
                      <select
                        value={editingItem.type || 'FINTECH'}
                        onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      >
                        <option value="BANK">BANK (Commercial Bank)</option>
                        <option value="AGENT">AGENT (Exchange / Remit Agent)</option>
                        <option value="FINTECH">FINTECH (Mobile Wallet)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameEn || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Company Name (Myanmar) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameMm || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameMm: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Country Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.countryCode || 'MM'}
                        onChange={(e) => setEditingItem({ ...editingItem, countryCode: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">SWIFT / Routing Code</label>
                      <input
                        type="text"
                        value={editingItem.swiftCode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, swiftCode: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CURRENCY MODAL */}
              {modalType === 'currency' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Currency Code (ISO) *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.code || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                        placeholder="USD, SGD, THB"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Symbol *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.symbol || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, symbol: e.target.value })}
                        placeholder="$, ฿, S$"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Currency Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameEn || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Currency Name (Myanmar) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameMm || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameMm: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </>
              )}

              {/* COUNTRY MODAL */}
              {modalType === 'country' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">ISO Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.code || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, code: e.target.value.toUpperCase() })}
                        placeholder="SG, TH, MY"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Dial Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.dialCode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, dialCode: e.target.value })}
                        placeholder="+65, +66"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Flag Emoji</label>
                      <input
                        type="text"
                        value={editingItem.flagEmoji || '🌐'}
                        onChange={(e) => setEditingItem({ ...editingItem, flagEmoji: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-center text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Country Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameEn || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameEn: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Country Name (Myanmar) *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.nameMm || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, nameMm: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Default Currency Code *</label>
                    <input
                      type="text"
                      required
                      value={editingItem.currencyCode || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, currencyCode: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>
                </>
              )}

              {/* EXCHANGE RATE MODAL */}
              {modalType === 'exchange_rate' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">From Currency</label>
                      <select
                        value={editingItem.fromCurrency || 'USD'}
                        onChange={(e) => setEditingItem({ ...editingItem, fromCurrency: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        {db.currencies.map(c => <option key={c.id} value={c.code}>{c.code} ({c.nameEn})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">To Currency</label>
                      <input
                        type="text"
                        disabled
                        value="MMK"
                        className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-slate-500 font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-blue-700 font-bold mb-1">Remittance Transfer Rate (MMK) *</label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={editingItem.transferRate || 0}
                      onChange={(e) => setEditingItem({ ...editingItem, transferRate: Number(e.target.value) })}
                      className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-extrabold text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Bank Buy Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={editingItem.buyRate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, buyRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Bank Sell Rate</label>
                      <input
                        type="number"
                        step="any"
                        value={editingItem.sellRate || 0}
                        onChange={(e) => setEditingItem({ ...editingItem, sellRate: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Note / Reference</label>
                    <input
                      type="text"
                      value={editingItem.note || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                      placeholder="e.g. Special worker remittance corridor rate"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                    />
                  </div>
                </>
              )}

              {/* BLACKLIST MODAL */}
              {modalType === 'blacklist' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Target Name (English) *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fullNameEn || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, fullNameEn: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Target Name (Myanmar)</label>
                      <input
                        type="text"
                        value={editingItem.fullNameMm || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, fullNameMm: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-rose-700 font-bold mb-1">{t.myanmarNrc} *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.nrcNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, nrcNumber: e.target.value })}
                        placeholder="12/LAMATA(N)049182"
                        className="w-full bg-rose-50/50 border border-rose-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{t.passbookNumber}</label>
                      <input
                        type="text"
                        value={editingItem.passportNumber || editingItem.passbookNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, passportNumber: e.target.value, passbookNumber: e.target.value })}
                        placeholder="MB-102948 or Passport No"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Risk Level *</label>
                      <select
                        value={editingItem.riskLevel || 'HIGH'}
                        onChange={(e) => setEditingItem({ ...editingItem, riskLevel: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="CRITICAL">CRITICAL (အရေးပေါ် ပိတ်ပင်)</option>
                        <option value="HIGH">HIGH (အဆင့်မြင့် စောင့်ကြည့်)</option>
                        <option value="MEDIUM">MEDIUM (အလယ်အလတ်)</option>
                        <option value="LOW">LOW (သာမန်)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Passport No</label>
                      <input
                        type="text"
                        value={editingItem.passportNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, passportNumber: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      {t.noteTextBox} (Blacklist Reason & Investigation Remarks) *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={editingItem.note || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, note: e.target.value })}
                      placeholder="e.g. Suspected illegal hundi Hawala ring Mae Sot-Yangon, CBM Order 45/2024"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* CUSTOMER MODAL */}
              {modalType === 'customer' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Customer Code *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.customerCode || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, customerCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Customer Type *</label>
                      <select
                        value={editingItem.customerType || 'BOTH'}
                        onChange={(e) => setEditingItem({ ...editingItem, customerType: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                      >
                        <option value="BOTH">Both Sender & Receiver</option>
                        <option value="SENDER">Sender Only</option>
                        <option value="RECEIVER">Receiver Only</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Full Name (English) *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fullNameEn || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, fullNameEn: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Full Name (Myanmar) *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.fullNameMm || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, fullNameMm: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-blue-700 font-bold mb-1">{t.myanmarNrc} *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.nrcNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, nrcNumber: e.target.value })}
                        placeholder="12/BAHANA(N)184920"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">{t.passbookNumber}</label>
                      <input
                        type="text"
                        value={editingItem.passportNumber || editingItem.passbookNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, passportNumber: e.target.value, passbookNumber: e.target.value })}
                        placeholder="MB-102948 or Passport No"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={editingItem.phone || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, phone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Address</label>
                      <input
                        type="text"
                        value={editingItem.address || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, address: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null);
                    setEditingItem(null);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Operating Company Profile Modal */}
      <CompanyProfileModal
        isOpen={showCompanyProfileModal}
        onClose={() => setShowCompanyProfileModal(false)}
      />
    </div>
  );
};
