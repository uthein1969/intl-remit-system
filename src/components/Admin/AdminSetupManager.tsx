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
  CheckSquare,
  Save,
  Check,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown
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
    saveExchangeRate, 
    saveExchangeRatesBatch,
    deleteExchangeRate,
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
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  // Exchange Rate Inline Edit & Batch Update states
  const [inlineEditingRateId, setInlineEditingRateId] = useState<string | null>(null);
  const [inlineRateDraft, setInlineRateDraft] = useState<{
    buyRate: number | string;
    sellRate: number | string;
    transferRate: number | string;
    note?: string;
  }>({ buyRate: 0, sellRate: 0, transferRate: 0, note: '' });
  
  const [isBatchEditRates, setIsBatchEditRates] = useState(false);
  const [batchRateDrafts, setBatchRateDrafts] = useState<Record<string, {
    buyRate: number | string;
    sellRate: number | string;
    transferRate: number | string;
  }>>({});
  const [rateSuccessMessage, setRateSuccessMessage] = useState<string | null>(null);
  const [showPresetConfirmModal, setShowPresetConfirmModal] = useState(false);

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

  // Setup tabs list with beauty colors & accents
  const navTabs: { 
    id: SetupSubTab; 
    labelEn: string; 
    labelMm: string; 
    icon: any; 
    count: number;
    beautyGradient: string;
    activeGradient: string;
  }[] = [
    { 
      id: 'operator_profile', 
      labelEn: '1. Software Company (Orange Box)', 
      labelMm: '၁။ ဆော့ဖ်ဝဲလ်ကုမ္ပဏီ (လိမ္မော်ရောင်အကွက်)', 
      icon: Building2, 
      count: 1,
      beautyGradient: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 border-orange-400/40',
      activeGradient: 'bg-gradient-to-r from-orange-600 via-amber-600 to-amber-700 border-2 border-amber-200 ring-2 ring-orange-400/50 shadow-lg shadow-orange-600/30'
    },
    { 
      id: 'branch', 
      labelEn: '2. Branches', 
      labelMm: '၂။ ဘဏ်ခွဲများ', 
      icon: Building2, 
      count: db.branches.length,
      beautyGradient: 'bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 border-emerald-400/40',
      activeGradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 border-2 border-emerald-200 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-600/30'
    },
    { 
      id: 'user', 
      labelEn: '3. System Users', 
      labelMm: '၃။ အသုံးပြုသူများ', 
      icon: Users, 
      count: db.users.length,
      beautyGradient: 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 border-blue-400/40',
      activeGradient: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 border-2 border-blue-200 ring-2 ring-blue-400/50 shadow-lg shadow-blue-600/30'
    },
    { 
      id: 'company', 
      labelEn: '4. Partner Companies', 
      labelMm: '၄။ မိတ်ဖက်ကုမ္ပဏီများ', 
      icon: Building, 
      count: db.companies.length,
      beautyGradient: 'bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-500 hover:to-fuchsia-600 border-purple-400/40',
      activeGradient: 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-700 border-2 border-purple-200 ring-2 ring-purple-400/50 shadow-lg shadow-purple-600/30'
    },
    { 
      id: 'currency', 
      labelEn: '5. Currencies', 
      labelMm: '၅။ ငွေကြေးအမျိုးအစား', 
      icon: Coins, 
      count: db.currencies.length,
      beautyGradient: 'bg-gradient-to-r from-amber-700 to-yellow-600 hover:from-amber-600 hover:to-yellow-500 border-yellow-400/40',
      activeGradient: 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 border-2 border-yellow-200 ring-2 ring-yellow-400/50 shadow-lg shadow-amber-600/30'
    },
    { 
      id: 'country', 
      labelEn: '6. Countries', 
      labelMm: '၆။ နိုင်ငံများ', 
      icon: Globe2, 
      count: db.countries.length,
      beautyGradient: 'bg-gradient-to-r from-cyan-600 to-sky-700 hover:from-cyan-500 hover:to-sky-600 border-cyan-400/40',
      activeGradient: 'bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 border-2 border-cyan-200 ring-2 ring-cyan-400/50 shadow-lg shadow-cyan-600/30'
    },
    { 
      id: 'exchange_rate', 
      labelEn: '7. Exchange Rates', 
      labelMm: '၇။ ငွေလဲလှယ်နှုန်းများ', 
      icon: TrendingUp, 
      count: db.exchangeRates.length,
      beautyGradient: 'bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-500 hover:to-pink-600 border-rose-400/40',
      activeGradient: 'bg-gradient-to-r from-rose-600 via-pink-600 to-red-700 border-2 border-rose-200 ring-2 ring-rose-400/50 shadow-lg shadow-rose-600/30'
    },
    { 
      id: 'blacklist', 
      labelEn: '8. Blacklist (NRC & Passport)', 
      labelMm: '၈။ နာမည်ပျက်စာရင်း (NRC & Passport)', 
      icon: ShieldAlert, 
      count: db.blacklist.length,
      beautyGradient: 'bg-gradient-to-r from-red-600 to-rose-800 hover:from-red-500 hover:to-rose-700 border-red-400/40',
      activeGradient: 'bg-gradient-to-r from-red-600 via-rose-700 to-red-900 border-2 border-red-200 ring-2 ring-red-400/50 shadow-lg shadow-red-600/30'
    },
    { 
      id: 'purpose', 
      labelEn: '9. Purpose of Remit', 
      labelMm: '၉။ လွှဲပို့ရည်ရွယ်ချက်များ', 
      icon: FileCheck2, 
      count: db.purposes.length,
      beautyGradient: 'bg-gradient-to-r from-teal-600 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 border-teal-400/40',
      activeGradient: 'bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-800 border-2 border-teal-200 ring-2 ring-teal-400/50 shadow-lg shadow-teal-600/30'
    },
    { 
      id: 'customer', 
      labelEn: '10. Customers Master', 
      labelMm: '၁၀။ ဖောက်သည်များ', 
      icon: UserCheck2, 
      count: db.customers.length,
      beautyGradient: 'bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 border-indigo-400/40',
      activeGradient: 'bg-gradient-to-r from-indigo-600 via-violet-600 to-blue-800 border-2 border-indigo-200 ring-2 ring-indigo-400/50 shadow-lg shadow-indigo-600/30'
    },
    { 
      id: 'menu_permission', 
      labelEn: '11. App Menu by Role', 
      labelMm: '၁၁။ မီနူး ခွင့်ပြုချက်များ (Show App Menu)', 
      icon: ShieldCheck, 
      count: 4,
      beautyGradient: 'bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-500 hover:to-purple-600 border-violet-400/40',
      activeGradient: 'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-800 border-2 border-violet-200 ring-2 ring-violet-400/50 shadow-lg shadow-violet-600/30'
    },
    { 
      id: 'default_status', 
      labelEn: '12. Default Status (Country Rule)', 
      labelMm: '၁၂။ မူရင်းအခြေအနေ သတ်မှတ်ချက် (Default Status)', 
      icon: CheckSquare, 
      count: 1,
      beautyGradient: 'bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 border-emerald-400/40',
      activeGradient: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-green-800 border-2 border-emerald-200 ring-2 ring-emerald-400/50 shadow-lg shadow-emerald-600/30'
    },
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
      setSaveNotice(language === 'my' ? `ဘဏ်ခွဲ "${editingItem.code || editingItem.nameEn}" ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။` : `Branch "${editingItem.code || editingItem.nameEn}" saved successfully.`);
    } else if (modalType === 'user') {
      saveUser(editingItem);
      setSaveNotice(language === 'my' ? `အသုံးပြုသူ "${editingItem.username}" (Role: ${editingItem.role}) ကို Turso Cloud & Local Database ထဲသို့ အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။` : `User "${editingItem.username}" (Role: ${editingItem.role}) saved to Database.`);
    } else if (modalType === 'company') {
      saveCompany(editingItem);
      setSaveNotice(language === 'my' ? `ကုမ္ပဏီ အချက်အလက်ကို သိမ်းဆည်းပြီးပါပြီ။` : `Company saved.`);
    } else if (modalType === 'currency') {
      saveCurrency(editingItem);
    } else if (modalType === 'country') {
      saveCountry(editingItem);
    } else if (modalType === 'exchange_rate') {
      const today = new Date().toISOString().split('T')[0];
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const rateToSave: ExchangeRate = {
        ...editingItem,
        buyRate: Number(editingItem.buyRate) || 0,
        sellRate: Number(editingItem.sellRate) || 0,
        transferRate: Number(editingItem.transferRate) || Number(editingItem.sellRate) || 0,
        effectiveDate: editingItem.effectiveDate || today,
        effectiveTime: editingItem.effectiveTime || nowTime,
        updatedBy: currentUser.fullName
      };
      saveExchangeRate(rateToSave);
      setSaveNotice(language === 'my' ? `ငွေလဲလှယ်နှုန်း ${rateToSave.fromCurrency}/${rateToSave.toCurrency} ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ။` : `Exchange rate ${rateToSave.fromCurrency}/${rateToSave.toCurrency} saved successfully.`);
    } else if (modalType === 'blacklist') {
      saveBlacklist(editingItem);
    } else if (modalType === 'purpose') {
      savePurpose(editingItem);
    } else if (modalType === 'customer') {
      saveCustomer(editingItem);
    }

    setTimeout(() => setSaveNotice(null), 5000);

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

  // --- Exchange Rate Update Handlers ---
  const handleStartInlineEdit = (rate: ExchangeRate) => {
    setInlineEditingRateId(rate.id);
    setInlineRateDraft({
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
      transferRate: rate.transferRate,
      note: rate.note || ''
    });
  };

  const handleSaveInlineRate = (rate: ExchangeRate) => {
    const buy = Number(inlineRateDraft.buyRate) > 0 ? Number(inlineRateDraft.buyRate) : rate.buyRate;
    const sell = Number(inlineRateDraft.sellRate) > 0 ? Number(inlineRateDraft.sellRate) : rate.sellRate;
    const transfer = Number(inlineRateDraft.transferRate) > 0 ? Number(inlineRateDraft.transferRate) : rate.transferRate;

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updated: ExchangeRate = {
      ...rate,
      buyRate: buy,
      sellRate: sell,
      transferRate: transfer,
      effectiveDate: today,
      effectiveTime: nowTime,
      updatedBy: currentUser.fullName,
      note: inlineRateDraft.note !== undefined ? inlineRateDraft.note : rate.note
    };

    saveExchangeRate(updated);
    setInlineEditingRateId(null);
    setRateSuccessMessage(
      language === 'my'
        ? `${rate.fromCurrency}/${rate.toCurrency} - Buy Rate: ${buy.toLocaleString()} MMK, Sell Rate: ${sell.toLocaleString()} MMK သို့ အောင်မြင်စွာ ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ။`
        : `${rate.fromCurrency}/${rate.toCurrency} - Buy Rate: ${buy.toLocaleString()} MMK, Sell Rate: ${sell.toLocaleString()} MMK updated successfully.`
    );
    setTimeout(() => setRateSuccessMessage(null), 4000);
  };

  const handleToggleBatchEdit = () => {
    if (isBatchEditRates) {
      setIsBatchEditRates(false);
      setBatchRateDrafts({});
    } else {
      const drafts: Record<string, { buyRate: number | string; sellRate: number | string; transferRate: number | string }> = {};
      db.exchangeRates.forEach(r => {
        drafts[r.id] = {
          buyRate: r.buyRate ?? 0,
          sellRate: r.sellRate ?? 0,
          transferRate: r.transferRate ?? r.sellRate ?? 0
        };
      });
      setBatchRateDrafts(drafts);
      setIsBatchEditRates(true);
      setInlineEditingRateId(null);
    }
  };

  const handleSaveBatchRates = () => {
    let updatedCount = 0;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updatedRates: ExchangeRate[] = [];

    const parseRate = (val: any, fallback: number) => {
      if (val === undefined || val === null || val === '') return fallback;
      const clean = typeof val === 'string' ? val.replace(/,/g, '').trim() : val;
      const num = Number(clean);
      return !isNaN(num) && num > 0 ? num : fallback;
    };

    db.exchangeRates.forEach(r => {
      const draft = batchRateDrafts[r.id];
      if (draft) {
        const b = parseRate(draft.buyRate, r.buyRate);
        const s = parseRate(draft.sellRate, r.sellRate);
        const t = parseRate(draft.transferRate, r.transferRate || r.sellRate);

        if (b !== r.buyRate || s !== r.sellRate || t !== r.transferRate) {
          updatedRates.push({
            ...r,
            buyRate: b,
            sellRate: s,
            transferRate: t,
            effectiveDate: today,
            effectiveTime: nowTime,
            updatedBy: currentUser.fullName
          });
          updatedCount++;
        }
      }
    });

    if (updatedRates.length > 0) {
      saveExchangeRatesBatch(updatedRates);
    }

    setIsBatchEditRates(false);
    setBatchRateDrafts({});
    setRateSuccessMessage(
      language === 'my'
        ? `ငွေလဲလှယ်နှုန်း စုစုပေါင်း ${updatedCount} ခု၏ Buy Rate နှင့် Sell Rate များကို အောင်မြင်စွာ ပြင်ဆင်သိမ်းဆည်းပြီးပါပြီ။`
        : `Successfully updated Buy Rate & Sell Rate for ${updatedCount} currency pairs.`
    );
    setTimeout(() => setRateSuccessMessage(null), 4500);
  };

  const handleApplyLatestMarketRates = () => {
    const marketRates: Record<string, { buyRate: number; sellRate: number; transferRate: number; note: string }> = {
      USD: { buyRate: 4500, sellRate: 4620, transferRate: 4580, note: 'Central Bank & Market Reference Rate' },
      THB: { buyRate: 132.50, sellRate: 136.00, transferRate: 134.50, note: 'Thailand Worker Remittance Corridor' },
      SGD: { buyRate: 3450, sellRate: 3530, transferRate: 3495, note: 'Singapore Corridor Banking Rate' },
      MYR: { buyRate: 1040, sellRate: 1075, transferRate: 1060, note: 'Malaysia Labor Corridor Official Rate' },
      EUR: { buyRate: 4880, sellRate: 4990, transferRate: 4940, note: 'Eurozone International Transfer Rate' },
      JPY: { buyRate: 29.80, sellRate: 31.20, transferRate: 30.50, note: 'TITP Japanese Trainees & Interns Rate' },
      CNY: { buyRate: 620, sellRate: 645, transferRate: 635, note: 'Muse Border Trade Settlement Rate' },
      AED: { buyRate: 1220, sellRate: 1260, transferRate: 1245, note: 'Middle East Dubai Corridor Rate' }
    };

    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let count = 0;
    const updatedRates: ExchangeRate[] = [];

    Object.entries(marketRates).forEach(([cur, rateObj]) => {
      const existing = db.exchangeRates.find(r => r.fromCurrency === cur && r.toCurrency === 'MMK');
      if (existing) {
        updatedRates.push({
          ...existing,
          buyRate: rateObj.buyRate,
          sellRate: rateObj.sellRate,
          transferRate: rateObj.transferRate,
          effectiveDate: today,
          effectiveTime: nowTime,
          updatedBy: currentUser.fullName,
          note: rateObj.note
        });
        count++;
      } else {
        const nextId = getNextCleanId('EXR', db.exchangeRates, 3);
        updatedRates.push({
          id: nextId,
          fromCurrency: cur,
          toCurrency: 'MMK',
          buyRate: rateObj.buyRate,
          sellRate: rateObj.sellRate,
          transferRate: rateObj.transferRate,
          effectiveDate: today,
          effectiveTime: nowTime,
          updatedBy: currentUser.fullName,
          note: rateObj.note
        });
        count++;
      }
    });

    if (updatedRates.length > 0) {
      saveExchangeRatesBatch(updatedRates);
    }

    setShowPresetConfirmModal(false);
    setRateSuccessMessage(
      language === 'my'
        ? `အဓိက ငွေကြေး ${count} ခု၏ Buy Rate နှင့် Sell Rate များကို နောက်ဆုံးပေါက်ဈေးနှုန်းထားများအတိုင်း အလိုအလျောက် ပြင်ဆင်ပြီးပါပြီ။`
        : `Updated Buy Rate and Sell Rate for ${count} currency pairs with latest market reference rates.`
    );
    setTimeout(() => setRateSuccessMessage(null), 5000);
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
      {saveNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-xs">
          <div className="flex items-center space-x-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">✓</span>
            <span>{saveNotice}</span>
          </div>
          <button type="button" onClick={() => setSaveNotice(null)} className="text-emerald-700 hover:text-emerald-950 font-bold px-2 py-0.5 cursor-pointer">✕</button>
        </div>
      )}

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
            className={`flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95 ${
              currentSubTab === 'operator_profile'
                ? 'bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white border-amber-300 ring-2 ring-orange-400/50 shadow-md'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-orange-400/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-white" />
            <span className="text-white font-bold">{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက်' : 'Company Info'}</span>
          </button>
          {currentSubTab !== 'operator_profile' && currentSubTab !== 'menu_permission' && currentSubTab !== 'default_status' && (
            <button
              onClick={() => handleOpenAdd(currentSubTab)}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 border border-blue-400/40 transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span className="text-white font-bold">{t.addNew}</span>
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
              className="self-start sm:self-center flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white border border-orange-300 font-bold text-xs transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-bold">{language === 'my' ? 'ကုမ္ပဏီ အချက်အလက် ပြင်ဆင်ရန် (Form)' : 'Edit Company Info (Form)'}</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
              className={`p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between cursor-pointer group ${
                isActive
                  ? `${tab.activeGradient} text-white shadow-md scale-[1.02]`
                  : `${tab.beautyGradient} text-white shadow-xs hover:shadow-md hover:scale-[1.01]`
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4 text-white drop-shadow-xs" />
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs shadow-2xs">
                  {tab.count}
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-xs font-bold block truncate text-white drop-shadow-xs">
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
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 border border-blue-400/40 transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="text-white font-bold">{t.addNew}</span>
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
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-blue-400/40 font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
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
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/40 font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
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
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-700 hover:from-teal-500 hover:to-cyan-600 text-white border border-teal-400/40 font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
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
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white border border-rose-400/40 font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
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
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500 text-white border border-purple-400/40 font-bold text-[11px] transition-all shadow-xs cursor-pointer active:scale-95"
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
                        {b.code || (b as any).branchCode || (b as any).branch_code || b.id}
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
          <div className="space-y-3">
            {/* Rates Control Toolbar & Feedback */}
            {rateSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 text-xs font-semibold flex items-center justify-between shadow-xs animate-fadeIn">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{rateSuccessMessage}</span>
                </div>
                <button onClick={() => setRateSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">
                    {language === 'my' ? 'ငွေလဲလှယ်နှုန်း ဈေးကွက်ပေါက်ဈေး ထိန်းချုပ်ခန်း' : 'Exchange Rate Market Board & Rate Controls'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {language === 'my' 
                      ? 'Buy Rate (ဝယ်ယူဈေး) နှင့် Sell Rate (ရောင်းချဈေး) များကို ဇယားထဲတွင် တိုက်ရိုက် ပြင်ဆင်နိုင်ပါသည်။' 
                      : 'Update Buy Rate and Sell Rate directly in the table cells or use Batch Edit mode.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {isBatchEditRates ? (
                  <>
                    <button
                      onClick={handleSaveBatchRates}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 border border-emerald-400/40"
                    >
                      <Save className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{language === 'my' ? 'နှုန်းထားအားလုံး သိမ်းဆည်းမည်' : 'Save All Rates'}</span>
                    </button>
                    <button
                      onClick={handleToggleBatchEdit}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs transition-all cursor-pointer active:scale-95 border border-slate-500/40"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{language === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleToggleBatchEdit}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white border border-blue-400/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                      title="Directly edit Buy Rate and Sell Rate across all rows simultaneously"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{language === 'my' ? '⚡ အားလုံး အမြန်ပြင်ဆင်ရန်' : '⚡ Quick Edit All'}</span>
                    </button>

                    <button
                      onClick={() => setShowPresetConfirmModal(true)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border border-amber-400/40 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
                      title="Auto-fill with latest Myanmar market reference rates for USD, THB, SGD, MYR, etc."
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-bold">{language === 'my' ? '🔄 နောက်ဆုံးပေါက်ဈေး သတ်မှတ်မည်' : '🔄 Apply Market Rates'}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Exchange Rates Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-xs">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="px-4 py-3">{t.currencyPair}</th>
                    <th className="px-4 py-3 text-blue-700 font-bold">{t.transferRate} (MMK)</th>
                    <th className="px-4 py-3 text-emerald-800 font-bold">
                      {language === 'my' ? 'ဝယ်ယူဈေး (Buy Rate)' : 'Buy Rate'}
                    </th>
                    <th className="px-4 py-3 text-amber-900 font-bold">
                      {language === 'my' ? 'ရောင်းချဈေး (Sell Rate)' : 'Sell Rate'}
                    </th>
                    <th className="px-4 py-3 text-slate-600 font-bold">
                      {language === 'my' ? 'ကွာဟချက် (Spread/Margin)' : 'Spread / Margin'}
                    </th>
                    <th className="px-4 py-3">{t.effectiveDate}</th>
                    <th className="px-4 py-3 text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredExchangeRates.map(r => {
                    const flag = db.countries.find(c => c.currencyCode === r.fromCurrency)?.flagEmoji || '💱';
                    const isRowEditing = inlineEditingRateId === r.id;
                    const isBatch = isBatchEditRates;
                    const batchDraft = batchRateDrafts[r.id] || { buyRate: r.buyRate, sellRate: r.sellRate, transferRate: r.transferRate };

                    const currentBuy = isBatch 
                      ? (Number(batchDraft.buyRate) || 0) 
                      : isRowEditing 
                        ? (Number(inlineRateDraft.buyRate) || 0) 
                        : (Number(r.buyRate) || 0);

                    const currentSell = isBatch 
                      ? (Number(batchDraft.sellRate) || 0) 
                      : isRowEditing 
                        ? (Number(inlineRateDraft.sellRate) || 0) 
                        : (Number(r.sellRate) || 0);

                    const spread = currentSell - currentBuy;
                    const spreadPct = currentBuy > 0 ? ((spread / currentBuy) * 100).toFixed(2) : '0';

                    return (
                      <tr 
                        key={r.id} 
                        className={`transition-colors ${
                          isRowEditing 
                            ? 'bg-blue-50/40 ring-1 ring-blue-300' 
                            : isBatch 
                              ? 'hover:bg-amber-50/20' 
                              : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Currency Pair */}
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-base">{flag}</span>
                            <span className="text-slate-900">{r.fromCurrency}</span>
                            <span className="text-slate-400 font-normal">/</span>
                            <span className="text-slate-600">{r.toCurrency}</span>
                          </div>
                        </td>

                        {/* Remittance / Transfer Rate (MMK) */}
                        <td className="px-4 py-3">
                          {isBatch ? (
                            <input
                              type="number"
                              step="any"
                              value={batchDraft.transferRate}
                              onChange={(e) => {
                                const val = e.target.value;
                                setBatchRateDrafts(prev => {
                                  const existing = prev[r.id] || { buyRate: r.buyRate ?? 0, sellRate: r.sellRate ?? 0, transferRate: r.transferRate ?? r.sellRate ?? 0 };
                                  return {
                                    ...prev,
                                    [r.id]: { ...existing, transferRate: val }
                                  };
                                });
                              }}
                              className="w-24 px-2 py-1 bg-white border border-blue-300 rounded font-mono font-bold text-blue-700 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            />
                          ) : isRowEditing ? (
                            <input
                              type="number"
                              step="any"
                              value={inlineRateDraft.transferRate}
                              onChange={(e) => setInlineRateDraft({ ...inlineRateDraft, transferRate: e.target.value })}
                              className="w-24 px-2 py-1 bg-white border border-blue-400 rounded font-mono font-bold text-blue-700 text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            />
                          ) : (
                            <span className="font-mono font-extrabold text-blue-600 text-sm">
                              {Number(r.transferRate || 0).toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Buy Rate */}
                        <td className="px-4 py-3">
                          {isBatch ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={batchDraft.buyRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchRateDrafts(prev => {
                                    const existing = prev[r.id] || { buyRate: r.buyRate ?? 0, sellRate: r.sellRate ?? 0, transferRate: r.transferRate ?? r.sellRate ?? 0 };
                                    return {
                                      ...prev,
                                      [r.id]: { ...existing, buyRate: val }
                                    };
                                  });
                                }}
                                className="w-28 px-2 py-1 bg-white border-2 border-emerald-400 rounded font-mono font-bold text-emerald-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          ) : isRowEditing ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="any"
                                autoFocus
                                value={inlineRateDraft.buyRate}
                                onChange={(e) => setInlineRateDraft({ ...inlineRateDraft, buyRate: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineRate(r);
                                  if (e.key === 'Escape') setInlineEditingRateId(null);
                                }}
                                className="w-28 px-2 py-1 bg-white border-2 border-emerald-500 rounded font-mono font-bold text-emerald-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartInlineEdit(r)}
                              className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors text-left"
                              title={language === 'my' ? 'Buy Rate ပြင်ဆင်ရန် နှိပ်ပါ' : 'Click to edit Buy Rate'}
                            >
                              <span className="font-mono font-bold text-emerald-800">
                                {Number(r.buyRate || 0).toLocaleString()}
                              </span>
                              <Edit2 className="w-3 h-3 text-emerald-500 opacity-60 group-hover:opacity-100" />
                            </button>
                          )}
                        </td>

                        {/* Sell Rate */}
                        <td className="px-4 py-3">
                          {isBatch ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={batchDraft.sellRate}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBatchRateDrafts(prev => {
                                    const existing = prev[r.id] || { buyRate: r.buyRate ?? 0, sellRate: r.sellRate ?? 0, transferRate: r.transferRate ?? r.sellRate ?? 0 };
                                    return {
                                      ...prev,
                                      [r.id]: { ...existing, sellRate: val }
                                    };
                                  });
                                }}
                                className="w-28 px-2 py-1 bg-white border-2 border-amber-400 rounded font-mono font-bold text-amber-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            </div>
                          ) : isRowEditing ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                step="any"
                                value={inlineRateDraft.sellRate}
                                onChange={(e) => setInlineRateDraft({ ...inlineRateDraft, sellRate: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveInlineRate(r);
                                  if (e.key === 'Escape') setInlineEditingRateId(null);
                                }}
                                className="w-28 px-2 py-1 bg-white border-2 border-amber-500 rounded font-mono font-bold text-amber-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartInlineEdit(r)}
                              className="group flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors text-left"
                              title={language === 'my' ? 'Sell Rate ပြင်ဆင်ရန် နှိပ်ပါ' : 'Click to edit Sell Rate'}
                            >
                              <span className="font-mono font-bold text-amber-900">
                                {Number(r.sellRate || 0).toLocaleString()}
                              </span>
                              <Edit2 className="w-3 h-3 text-amber-500 opacity-60 group-hover:opacity-100" />
                            </button>
                          )}
                        </td>

                        {/* Live Spread / Margin Calculation */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className={`font-mono font-bold text-xs ${spread >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                              {spread >= 0 ? `+${spread.toLocaleString()}` : spread.toLocaleString()} MMK
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({spreadPct}%)
                            </span>
                          </div>
                        </td>

                        {/* Effective Date & Last Updated */}
                        <td className="px-4 py-3 text-slate-500 text-[11px]">
                          <div>{r.effectiveDate || '-'}</div>
                          {r.effectiveTime && (
                            <div className="text-[10px] text-slate-400 font-mono">{r.effectiveTime}</div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          {isRowEditing ? (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleSaveInlineRate(r)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold flex items-center space-x-1 shadow-xs transition-colors"
                                title={language === 'my' ? 'သိမ်းဆည်းမည်' : 'Save'}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{language === 'my' ? 'သိမ်းမည်' : 'Save'}</span>
                              </button>
                              <button
                                onClick={() => setInlineEditingRateId(null)}
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                                title={language === 'my' ? 'ပယ်ဖျက်' : 'Cancel'}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : isBatch ? (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Editing
                            </span>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleStartInlineEdit(r)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                title={language === 'my' ? 'Buy Rate / Sell Rate အမြန်ပြင်မည်' : 'Quick edit rates'}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit('exchange_rate', r)}
                                className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded"
                                title={language === 'my' ? 'အသေးစိတ် ပြင်မည်' : 'Full edit modal'}
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                title={language === 'my' ? 'ဖျက်မည်' : 'Delete'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(currentSubTab, deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
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
                      value={editingItem.transferRate !== undefined ? editingItem.transferRate : ''}
                      onChange={(e) => setEditingItem({ ...editingItem, transferRate: e.target.value })}
                      className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-extrabold text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-emerald-800 font-bold mb-1 flex items-center justify-between text-xs">
                        <span>{language === 'my' ? 'ဝယ်ယူဈေး (Buy Rate)' : 'Buy Rate'} *</span>
                        <span className="text-[10px] text-emerald-600 font-mono">MMK</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editingItem.buyRate !== undefined ? editingItem.buyRate : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, buyRate: e.target.value })}
                        className="w-full bg-emerald-50/40 border border-emerald-300 focus:border-emerald-500 rounded-lg px-3 py-2 text-emerald-900 font-mono font-bold text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-amber-900 font-bold mb-1 flex items-center justify-between text-xs">
                        <span>{language === 'my' ? 'ရောင်းချဈေး (Sell Rate)' : 'Sell Rate'} *</span>
                        <span className="text-[10px] text-amber-600 font-mono">MMK</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        value={editingItem.sellRate !== undefined ? editingItem.sellRate : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, sellRate: e.target.value })}
                        className="w-full bg-amber-50/40 border border-amber-300 focus:border-amber-500 rounded-lg px-3 py-2 text-amber-950 font-mono font-bold text-sm"
                      />
                    </div>
                  </div>

                  {/* Spread preview in modal */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">
                      {language === 'my' ? 'ရောင်း/ဝယ် ကွာဟချက် (Spread / Margin):' : 'Spread / Profit Margin:'}
                    </span>
                    <span className="font-mono font-bold text-slate-900">
                      {Number(editingItem.sellRate || 0) >= Number(editingItem.buyRate || 0) ? '+' : ''}
                      {(Number(editingItem.sellRate || 0) - Number(editingItem.buyRate || 0)).toLocaleString()} MMK
                      {Number(editingItem.buyRate || 0) > 0 && (
                        <span className="text-slate-400 font-normal ml-1">
                          ({(((Number(editingItem.sellRate || 0) - Number(editingItem.buyRate || 0)) / Number(editingItem.buyRate || 0)) * 100).toFixed(2)}%)
                        </span>
                      )}
                    </span>
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
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer active:scale-95"
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

      {/* Apply Market Reference Rates Confirmation Modal */}
      {showPresetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'my' ? 'နောက်ဆုံး ပေါက်ဈေးများ သတ်မှတ်မည်' : 'Apply Latest Market Reference Rates'}
                </h3>
                <p className="text-xs text-slate-500">
                  {language === 'my' 
                    ? 'အောက်ပါ အဓိကငွေကြေးများ၏ Buy Rate, Sell Rate နှင့် Transfer Rate များကို နောက်ဆုံးပေါက်ဈေးဖြင့် ပြင်ဆင်ပါမည်။' 
                    : 'The Buy Rate, Sell Rate, and Transfer Rate for major currencies will be updated to standard reference rates:'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2 text-xs font-mono">
              <div className="grid grid-cols-4 font-bold text-[11px] text-slate-500 border-b border-slate-200 pb-1">
                <span>Pair</span>
                <span className="text-emerald-700">Buy</span>
                <span className="text-amber-700">Sell</span>
                <span className="text-blue-700">Remit</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇺🇸 USD/MMK</span>
                <span>4,500</span>
                <span>4,620</span>
                <span className="font-bold text-blue-600">4,580</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇹🇭 THB/MMK</span>
                <span>132.50</span>
                <span>136.00</span>
                <span className="font-bold text-blue-600">134.50</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇸🇬 SGD/MMK</span>
                <span>3,450</span>
                <span>3,530</span>
                <span className="font-bold text-blue-600">3,495</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇲🇾 MYR/MMK</span>
                <span>1,040</span>
                <span>1,075</span>
                <span className="font-bold text-blue-600">1,060</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇪🇺 EUR/MMK</span>
                <span>4,880</span>
                <span>4,990</span>
                <span className="font-bold text-blue-600">4,940</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇯🇵 JPY/MMK</span>
                <span>29.80</span>
                <span>31.20</span>
                <span className="font-bold text-blue-600">30.50</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇨🇳 CNY/MMK</span>
                <span>620.00</span>
                <span>645.00</span>
                <span className="font-bold text-blue-600">635.00</span>
              </div>
              <div className="grid grid-cols-4 text-slate-800">
                <span className="font-bold">🇦🇪 AED/MMK</span>
                <span>1,220</span>
                <span>1,260</span>
                <span className="font-bold text-blue-600">1,245</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              {language === 'my' 
                ? '* သတ်မှတ်ပြီးနောက် ဇယားထဲတွင် မိမိစိတ်ကြိုက် Buy/Sell Rate များကို အချိန်မရွေး ဆက်လက်ပြင်ဆင်နိုင်ပါသည်။' 
                : '* You can continue to edit Buy Rate and Sell Rate individually at any time.'}
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowPresetConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleApplyLatestMarketRates}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 text-white" />
                <span className="text-white font-bold">{language === 'my' ? 'သတ်မှတ်မည် (Confirm & Apply)' : 'Confirm & Apply Rates'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
