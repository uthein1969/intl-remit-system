import React, { useState, useMemo } from 'react';
import {
  Database,
  Download,
  Upload,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  Globe,
  Building2,
  User,
  Key,
  History,
  ShieldCheck,
  ShieldAlert,
  Coins,
  SlidersHorizontal,
  Search,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  Layers,
  FileCode,
  ArrowRight
} from 'lucide-react';
import { useRemittance, TableKey } from '../../lib/store';

export interface TableBackupRestoreSectionProps {
  onNotify?: (notification: { type: 'success' | 'error'; message: string }) => void;
}

export interface TableItemConfig {
  key: TableKey;
  nameMm: string;
  nameEn: string;
  descMm: string;
  descEn: string;
  category: 'core' | 'master' | 'compliance' | 'system';
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  getCount: (db: any) => number;
  unitMm: string;
  unitEn: string;
}

export const ALL_TABLE_CONFIGS: TableItemConfig[] = [
  {
    key: 'transactions',
    nameMm: 'ငွေလွှဲမှတ်တမ်းများ (Transactions)',
    nameEn: 'Remittance Transactions',
    descMm: 'ပြည်တွင်း/ပြည်ပ ငွေလွှဲစာရင်းများ၊ ထုတ်ယူမှုများ၊ ဘောက်ချာများနှင့် အခြေအနေမှတ်တမ်းများ',
    descEn: 'Inward & outward remittance records, voucher details, and processing statuses',
    category: 'core',
    icon: RefreshCw,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    getCount: (db) => Array.isArray(db.transactions) ? db.transactions.length : 0,
    unitMm: 'ခု',
    unitEn: 'records'
  },
  {
    key: 'customers',
    nameMm: 'သုံးစွဲသူနှင့် KYC မှတ်တမ်းများ (Customers)',
    nameEn: 'Customer Profiles & KYC',
    descMm: 'ငွေလွှဲသူ/လက်ခံသူ အချက်အလက်များ၊ မှတ်ပုံတင်၊ နိုင်ငံကူးလက်မှတ်နှင့် လိပ်စာများ',
    descEn: 'Verified sender & receiver KYC profiles, NRC/passport records, and contact details',
    category: 'core',
    icon: Users,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    getCount: (db) => Array.isArray(db.customers) ? db.customers.length : 0,
    unitMm: 'ဦး',
    unitEn: 'profiles'
  },
  {
    key: 'exchangeRates',
    nameMm: 'ငွေလဲလှယ်နှုန်းထားများ (Exchange Rates)',
    nameEn: 'Exchange Rates',
    descMm: 'ဗဟိုဘဏ်သတ်မှတ်နှုန်း၊ အဝယ်/အရောင်းနှုန်း၊ လွှဲပို့နှုန်းနှင့် Spread သတ်မှတ်ချက်များ',
    descEn: 'Central Bank reference, buy/sell rates, remittance transfer rates, and spread margins',
    category: 'master',
    icon: Globe,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    getCount: (db) => Array.isArray(db.exchangeRates) ? db.exchangeRates.length : 0,
    unitMm: 'ခု',
    unitEn: 'rates'
  },
  {
    key: 'branches',
    nameMm: 'ဘဏ်ခွဲနှင့် ကိုယ်စားလှယ်များ (Branches)',
    nameEn: 'Branches & Agent Offices',
    descMm: 'ရုံးချုပ်၊ ပြည်တွင်းဘဏ်ခွဲများနှင့် ပြည်ပကိုယ်စားလှယ်ရုံးများ (BKK, SG, MY)',
    descEn: 'Head office, domestic branch network, and cross-border agent offices',
    category: 'master',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    getCount: (db) => Array.isArray(db.branches) ? db.branches.length : 0,
    unitMm: 'ခု',
    unitEn: 'branches'
  },
  {
    key: 'users',
    nameMm: 'စနစ်အသုံးပြုသူများ (Users & Roles)',
    nameEn: 'System Users & Roles',
    descMm: 'Maker, Checker, Auditor, Branch Manager နှင့် Admin အသုံးပြုသူအကောင့်များ',
    descEn: 'Operational accounts, Maker/Checker role assignments, and branch access',
    category: 'system',
    icon: User,
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    getCount: (db) => Array.isArray(db.users) ? db.users.length : 0,
    unitMm: 'ယောက်',
    unitEn: 'users'
  },
  {
    key: 'auditLogs',
    nameMm: 'လုပ်ဆောင်ချက်မှတ်တမ်းများ (Audit Trail)',
    nameEn: 'Audit Trail & Activity Logs',
    descMm: 'စနစ်အသုံးပြုသူများ၏ ငွေလွှဲပြင်ဆင်မှု၊ အတည်ပြုမှုနှင့် စနစ်ပြောင်းလဲမှုမှတ်တမ်းများ',
    descEn: 'Immutable compliance trail, user action audit events, and security logs',
    category: 'compliance',
    icon: History,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    getCount: (db) => Array.isArray(db.auditLogs) ? db.auditLogs.length : 0,
    unitMm: 'ခု',
    unitEn: 'logs'
  },
  {
    key: 'mtoComplianceLimits',
    nameMm: 'ငွေလွှဲသတ်မှတ်ချက်များ (MTO Limits)',
    nameEn: 'MTO & Compliance Limits',
    descMm: 'ဗဟိုဘဏ် သတ်မှတ်ချက်အရ နိုင်ငံအလိုက် တစ်ကြိမ်/တစ်ရက်/တစ်လ လွှဲပို့နိုင်သည့် ကန့်သတ်ချက်များ',
    descEn: 'Central Bank regulated per-transaction, daily, and monthly remittance caps by corridor',
    category: 'compliance',
    icon: ShieldCheck,
    color: 'text-teal-400',
    bgColor: 'bg-teal-500/10',
    borderColor: 'border-teal-500/20',
    getCount: (db) => Array.isArray(db.mtoComplianceLimits) ? db.mtoComplianceLimits.length : 0,
    unitMm: 'ခု',
    unitEn: 'limits'
  },
  {
    key: 'blacklist',
    nameMm: 'စိစစ်ဆိုင်းငံ့စာရင်း (AML Blacklist)',
    nameEn: 'AML & Sanctions Blacklist',
    descMm: 'AML/CFT နာမည်ပျက်စာရင်း၊ စောင့်ကြည့်စာရင်းနှင့် သတိပေးချက်များ',
    descEn: 'Anti-Money Laundering watchlists, sanctioned individuals, and PEP screening list',
    category: 'compliance',
    icon: ShieldAlert,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    getCount: (db) => Array.isArray(db.blacklist) ? db.blacklist.length : 0,
    unitMm: 'ခု',
    unitEn: 'entries'
  },
  {
    key: 'currencies',
    nameMm: 'အသုံးပြုသော ငွေကြေးများ (Currencies)',
    nameEn: 'Supported Currencies',
    descMm: 'စနစ်အတွင်း အသုံးပြုနိုင်သော MMK, THB, SGD, USD, MYR စသည့် ငွေကြေးများ',
    descEn: 'Configured transaction currencies with ISO codes and decimal formatting',
    category: 'master',
    icon: Coins,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    getCount: (db) => Array.isArray(db.currencies) ? db.currencies.length : 0,
    unitMm: 'ခု',
    unitEn: 'currencies'
  },
  {
    key: 'countries',
    nameMm: 'ဝန်ဆောင်မှုပေးသော နိုင်ငံများ (Countries)',
    nameEn: 'Operating Countries',
    descMm: 'မြန်မာ၊ ထိုင်း၊ စင်ကာပူ၊ မလေးရှား စသည့် ငွေလွှဲဝန်ဆောင်မှု ပေးအပ်သည့် နိုင်ငံများ',
    descEn: 'Corridor countries authorized for inward and outward remittance operations',
    category: 'master',
    icon: Globe,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    getCount: (db) => Array.isArray(db.countries) ? db.countries.length : 0,
    unitMm: 'ခု',
    unitEn: 'countries'
  },
  {
    key: 'purposes',
    nameMm: 'ငွေလွှဲရသည့် အကြောင်းအရာများ (Purposes)',
    nameEn: 'Remittance Purposes',
    descMm: 'မိသားစုထောက်ပံ့ငွေ၊ လုပ်ခလစာ၊ ဆေးကုသစရိတ်၊ ပညာသင်စရိတ် စသည့် အကြောင်းအရာများ',
    descEn: 'CBM authorized remittance transaction purpose classifications',
    category: 'master',
    icon: FileText,
    color: 'text-lime-400',
    bgColor: 'bg-lime-500/10',
    borderColor: 'border-lime-500/20',
    getCount: (db) => Array.isArray(db.purposes) ? db.purposes.length : 0,
    unitMm: 'ခု',
    unitEn: 'purposes'
  },
  {
    key: 'operatorProfile',
    nameMm: 'ကုမ္ပဏီအချက်အလက် (Company Profile)',
    nameEn: 'Company & Operator Profile',
    descMm: 'ငွေလွှဲလုပ်ငန်း လိုင်စင်ရ ကုမ္ပဏီအမည်၊ လိပ်စာ၊ လိုင်စင်အမှတ်နှင့် ဆက်သွယ်ရန် အချက်အလက်များ',
    descEn: 'Licensed remittance company legal registration, CBM operator license, and contact details',
    category: 'system',
    icon: SlidersHorizontal,
    color: 'text-fuchsia-400',
    bgColor: 'bg-fuchsia-500/10',
    borderColor: 'border-fuchsia-500/20',
    getCount: (db) => db.operatorProfile ? 1 : 0,
    unitMm: 'ခု',
    unitEn: 'config'
  },
  {
    key: 'roleMenuPermissions',
    nameMm: 'အခန်းကဏ္ဍ လုပ်ပိုင်ခွင့်များ (Role Permissions)',
    nameEn: 'Role Menu Permissions',
    descMm: 'အခန်းကဏ္ဍတစ်ခုချင်းစီအလိုက် ဝင်ရောက်ကြည့်ရှုခွင့် ရရှိသော စနစ်မီနူးများနှင့် လုပ်ပိုင်ခွင့်များ',
    descEn: 'Granular menu access rules and feature permissions configured for each role',
    category: 'system',
    icon: Key,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    getCount: (db) => db.roleMenuPermissions ? Object.keys(db.roleMenuPermissions).length : 0,
    unitMm: 'ခု',
    unitEn: 'roles'
  }
];

export const TableBackupRestoreSection: React.FC<TableBackupRestoreSectionProps> = ({
  onNotify
}) => {
  const {
    db,
    language,
    exportTableJson,
    exportSelectedTablesJson,
    restoreTableFromJson
  } = useRemittance();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'core' | 'master' | 'compliance' | 'system'>('all');
  const [isSectionOpen, setIsSectionOpen] = useState(true);

  // Multi-Selection State for Selective Backup
  const [selectedTables, setSelectedTables] = useState<Set<TableKey>>(new Set());

  // Individual Table Action State (for instant copy feedback)
  const [copiedTableKey, setCopiedTableKey] = useState<TableKey | null>(null);

  // Single Table Restore Modal State
  const [restoreModalTable, setRestoreModalTable] = useState<TableItemConfig | null>(null);
  const [restoreJsonInput, setRestoreJsonInput] = useState('');
  const [restoreMode, setRestoreMode] = useState<'merge' | 'replace'>('merge');
  const [isRestoring, setIsRestoring] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [parseValidation, setParseValidation] = useState<{
    isValid: boolean;
    detectedCount: number;
    message: string;
  } | null>(null);

  // Filtered list of tables based on search and category
  const filteredTables = useMemo(() => {
    return ALL_TABLE_CONFIGS.filter(tbl => {
      const matchCategory = selectedCategory === 'all' || tbl.category === selectedCategory;
      if (!matchCategory) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        tbl.key.toLowerCase().includes(q) ||
        tbl.nameMm.toLowerCase().includes(q) ||
        tbl.nameEn.toLowerCase().includes(q) ||
        tbl.descMm.toLowerCase().includes(q) ||
        tbl.descEn.toLowerCase().includes(q)
      );
    });
  }, [searchTerm, selectedCategory]);

  // Handle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedTables.size === filteredTables.length && filteredTables.length > 0) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables.map(t => t.key)));
    }
  };

  const handleToggleTable = (tableKey: TableKey) => {
    setSelectedTables(prev => {
      const next = new Set(prev);
      if (next.has(tableKey)) {
        next.delete(tableKey);
      } else {
        next.add(tableKey);
      }
      return next;
    });
  };

  // 1-Click Export single table JSON
  const handleExportSingleTable = (table: TableItemConfig) => {
    try {
      const jsonStr = exportTableJson(table.key);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Table_${table.key}_Backup_${timestamp}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      const count = table.getCount(db);
      onNotify?.({
        type: 'success',
        message: language === 'my'
          ? `ဇယား "${table.nameMm}" (${count} ခု) အား အရန်သိမ်းဆည်းမှု (${filename}) အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`
          : `Table "${table.nameEn}" (${count} records) exported successfully as ${filename}.`
      });
    } catch (err: any) {
      onNotify?.({
        type: 'error',
        message: err?.message || 'Failed to export table JSON'
      });
    }
  };

  // Copy single table JSON to clipboard
  const handleCopySingleTable = (table: TableItemConfig) => {
    try {
      const jsonStr = exportTableJson(table.key);
      navigator.clipboard.writeText(jsonStr);
      setCopiedTableKey(table.key);
      setTimeout(() => setCopiedTableKey(null), 2000);
      onNotify?.({
        type: 'success',
        message: language === 'my'
          ? `ဇယား "${table.nameMm}" ၏ JSON အချက်အလက်များကို Clipboard သို့ Copy ကူးယူပြီးပါပြီ။`
          : `Copied JSON backup for table "${table.nameEn}" to clipboard.`
      });
    } catch {
      onNotify?.({
        type: 'error',
        message: 'Failed to copy to clipboard'
      });
    }
  };

  // Export Selected Tables as a bundle
  const handleExportSelectedTables = () => {
    if (selectedTables.size === 0) return;
    try {
      const tableKeys = Array.from(selectedTables);
      const jsonStr = exportSelectedTablesJson(tableKeys);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `Selective_Tables_Backup_${tableKeys.length}_Tables_${timestamp}.json`;

      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, filename);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      onNotify?.({
        type: 'success',
        message: language === 'my'
          ? `ရွေးချယ်ထားသော ဇယား (${tableKeys.length}) ခုအား အရန်ဖိုင် (${filename}) အဖြစ် အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`
          : `Successfully exported ${tableKeys.length} selected tables to ${filename}.`
      });
    } catch (err: any) {
      onNotify?.({
        type: 'error',
        message: err?.message || 'Failed to export selected tables'
      });
    }
  };

  // Open Restore Modal for a specific table
  const handleOpenRestoreModal = (table: TableItemConfig) => {
    setRestoreModalTable(table);
    setRestoreJsonInput('');
    setUploadedFileName('');
    setRestoreMode('merge');
    setParseValidation(null);
  };

  // Validate JSON text input whenever it changes
  const validateIncomingJson = (jsonString: string, tableKey: TableKey) => {
    if (!jsonString.trim()) {
      setParseValidation(null);
      return;
    }
    try {
      const parsed = JSON.parse(jsonString);
      let incomingData: any = null;

      if (parsed.table && parsed.data !== undefined) {
        incomingData = parsed.data;
      } else if (parsed.data && parsed.data[tableKey] !== undefined) {
        incomingData = parsed.data[tableKey];
      } else if (parsed[tableKey] !== undefined) {
        incomingData = parsed[tableKey];
      } else if (Array.isArray(parsed)) {
        incomingData = parsed;
      } else if (typeof parsed === 'object') {
        if (tableKey === 'operatorProfile' || tableKey === 'roleMenuPermissions') {
          incomingData = parsed.data || parsed;
        }
      }

      if (incomingData === null || incomingData === undefined) {
        setParseValidation({
          isValid: false,
          detectedCount: 0,
          message: language === 'my' 
            ? `ပေးထားသော JSON ထဲတွင် "${tableKey}" အတွက် မှန်ကန်သော အချက်အလက် ရှာမတွေ့ပါ။` 
            : `Could not detect matching records for table "${tableKey}".`
        });
        return;
      }

      const count = Array.isArray(incomingData) 
        ? incomingData.length 
        : (typeof incomingData === 'object' ? Object.keys(incomingData).length : 1);

      setParseValidation({
        isValid: true,
        detectedCount: count,
        message: language === 'my'
          ? `မှန်ကန်သော JSON ဖိုင်ဖြစ်ပါသည် (မှတ်တမ်း ${count} ခု ရှာဖွေတွေ့ရှိပါသည်)။`
          : `Valid JSON: ${count} records ready to import.`
      });
    } catch {
      setParseValidation({
        isValid: false,
        detectedCount: 0,
        message: language === 'my' ? 'JSON ကုဒ် format မမှန်ကန်ပါ။ စစ်ဆေးပေးပါ။' : 'Invalid JSON format syntax.'
      });
    }
  };

  const handleJsonInputChange = (val: string) => {
    setRestoreJsonInput(val);
    if (restoreModalTable) {
      validateIncomingJson(val, restoreModalTable.key);
    }
  };

  // Handle File Upload in Restore Modal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRestoreJsonInput(content);
        if (restoreModalTable) {
          validateIncomingJson(content, restoreModalTable.key);
        }
      }
    };
    reader.readAsText(file);
  };

  // Execute Table Restore
  const handleExecuteTableRestore = async () => {
    if (!restoreModalTable || !restoreJsonInput.trim()) return;
    setIsRestoring(true);
    try {
      const res = await restoreTableFromJson(restoreModalTable.key, restoreJsonInput, restoreMode);
      if (res.success) {
        onNotify?.({
          type: 'success',
          message: language === 'my'
            ? `ဇယား "${restoreModalTable.nameMm}" (${res.count} ခု) အား ${restoreMode === 'replace' ? 'အစားထိုး၍' : 'ပေါင်းစပ်၍'} အောင်မြင်စွာ ပြန်လည်ထည့်သွင်းပြီးပါပြီ။`
            : `Successfully restored table "${restoreModalTable.nameEn}" (${res.count} records, mode: ${restoreMode}).`
        });
        setRestoreModalTable(null);
      } else {
        onNotify?.({
          type: 'error',
          message: res.message || 'Failed to restore table.'
        });
      }
    } catch (err: any) {
      onNotify?.({
        type: 'error',
        message: err?.message || 'Restore execution failed.'
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header with Expand/Collapse */}
      <div 
        onClick={() => setIsSectionOpen(!isSectionOpen)}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 cursor-pointer select-none group"
      >
        <div className="flex items-start space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors tracking-wide flex items-center gap-2">
                <span>{language === 'my' ? 'ဇယားတစ်ခုချင်းစီအလိုက် အရန်သိမ်းခြင်းနှင့် ပြန်လည်ထည့်သွင်းခြင်း' : 'Table-by-Table Backup & Restore'}</span>
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                {ALL_TABLE_CONFIGS.length} Tables
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-3xl">
              {language === 'my'
                ? 'ဇယားတစ်ခုချင်းစီအလိုက် (Transactions, Customers, Exchange Rates, Branches, Users စသည်) သီးသန့် အရန်ဖိုင် ဒေါင်းလုဒ်ဆွဲခြင်း၊ Copy ကူးခြင်း သို့မဟုတ် ဖိုင်မှတစ်ဆင့် ဇယားတစ်ခုတည်းကို သီးသန့် ပြန်လည်ထည့်သွင်းခြင်း (Single Table Backup & Restore) ပြုလုပ်နိုင်ပါသည်။'
                : 'Backup and restore individual tables independently (Customers, Transactions, Exchange Rates, Branches, etc.) with Merge or Replace options.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsSectionOpen(!isSectionOpen);
            }}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isSectionOpen ? (language === 'my' ? 'ခေါက်သိမ်းမည်' : 'Collapse') : (language === 'my' ? 'ဖွင့်ကြည့်မည်' : 'Expand')}
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isSectionOpen ? 'rotate-180 text-emerald-400' : ''}`} />
          </button>
        </div>
      </div>

      {isSectionOpen && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Controls Bar: Search + Category Pills + Selective Export Action */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'my' ? 'ဇယားအမည် ရှာဖွေပါ (ဥပမာ: Customers, Transactions, Rates)...' : 'Filter tables by name or keyword...'}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {(['all', 'core', 'master', 'compliance', 'system'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white font-bold shadow-xs border border-blue-500'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {cat === 'all' && (language === 'my' ? 'အားလုံး (All)' : 'All')}
                  {cat === 'core' && (language === 'my' ? 'အဓိကဒေတာ (Core)' : 'Core')}
                  {cat === 'master' && (language === 'my' ? 'မာစတာဒေတာ (Master)' : 'Master')}
                  {cat === 'compliance' && (language === 'my' ? 'စည်းမျဉ်း (Compliance)' : 'Compliance')}
                  {cat === 'system' && (language === 'my' ? 'စနစ် (System)' : 'System')}
                </button>
              ))}
            </div>

            {/* Selective Export Button */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                title={selectedTables.size === filteredTables.length ? 'Deselect All' : 'Select All'}
              >
                {selectedTables.size === filteredTables.length && filteredTables.length > 0 ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {selectedTables.size === filteredTables.length && filteredTables.length > 0
                    ? (language === 'my' ? 'အားလုံး ရွေးထားသည်' : 'Deselect')
                    : (language === 'my' ? 'အားလုံး ရွေးမည်' : 'Select All')}
                </span>
              </button>

              <button
                type="button"
                disabled={selectedTables.size === 0}
                onClick={handleExportSelectedTables}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {language === 'my'
                    ? `ရွေးထားသော ဇယားများ (${selectedTables.size}) Export`
                    : `Export Selected (${selectedTables.size})`}
                </span>
              </button>
            </div>
          </div>

          {/* Table Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
            {filteredTables.map((table) => {
              const Icon = table.icon;
              const count = table.getCount(db);
              const isSelected = selectedTables.has(table.key);
              const isCopied = copiedTableKey === table.key;

              return (
                <div
                  key={table.key}
                  className={`bg-slate-950/80 rounded-xl border p-4 transition-all flex flex-col justify-between space-y-3.5 relative ${
                    isSelected ? 'border-emerald-500/50 ring-1 ring-emerald-500/30' : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-start space-x-2.5 min-w-0">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggleTable(table.key)}
                          className="mt-0.5 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                          title="Select for batch export"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>

                        {/* Icon */}
                        <div className={`w-8 h-8 rounded-lg ${table.bgColor} ${table.borderColor} border flex items-center justify-center shrink-0`}>
                          <Icon className={`w-4 h-4 ${table.color}`} />
                        </div>

                        {/* Table Label */}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white tracking-tight truncate flex items-center gap-1.5" title={table.nameEn}>
                            <span>{language === 'my' ? table.nameMm : table.nameEn}</span>
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 block truncate">
                            {table.key}
                          </span>
                        </div>
                      </div>

                      {/* Record Count Badge */}
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold shrink-0 ${
                        count > 0 
                          ? `${table.bgColor} ${table.color} ${table.borderColor} border`
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}>
                        {count} {language === 'my' ? table.unitMm : table.unitEn}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                      {language === 'my' ? table.descMm : table.descEn}
                    </p>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="pt-2 border-t border-slate-900/80 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5">
                      {/* 1-Click Export JSON */}
                      <button
                        type="button"
                        id={`btn-export-table-${table.key}`}
                        onClick={() => handleExportSingleTable(table)}
                        className="py-1.5 px-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                        title={language === 'my' ? 'ဇယား JSON ဒေါင်းလုဒ်ဆွဲမည်' : 'Download Table JSON'}
                      >
                        <Download className="w-3 h-3" />
                        <span>Export</span>
                      </button>

                      {/* Copy JSON */}
                      <button
                        type="button"
                        id={`btn-copy-table-${table.key}`}
                        onClick={() => handleCopySingleTable(table)}
                        className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                        title={isCopied ? 'Copied!' : (language === 'my' ? 'JSON Copy ကူးမည်' : 'Copy JSON')}
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3 text-sky-400" />
                        )}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {/* Restore Button */}
                    <button
                      type="button"
                      id={`btn-restore-table-${table.key}`}
                      onClick={() => handleOpenRestoreModal(table)}
                      className="py-1.5 px-2.5 rounded-lg bg-sky-950/80 hover:bg-sky-900 border border-sky-500/30 text-sky-300 text-[11px] font-bold flex items-center space-x-1 transition-all cursor-pointer"
                      title={language === 'my' ? 'ဖိုင်မှ ပြန်လည်ထည့်သွင်းမည် (Restore)' : 'Restore Table JSON'}
                    >
                      <Upload className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTables.length === 0 && (
            <div className="text-center py-10 bg-slate-950/50 rounded-xl border border-slate-800">
              <Search className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">
                {language === 'my' ? 'ရှာဖွေမှုနှင့် ကိုက်ညီသော ဇယား မရှိပါ။' : 'No tables matching your search.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* SINGLE TABLE RESTORE MODAL */}
      {restoreModalTable && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-xl ${restoreModalTable.bgColor} ${restoreModalTable.borderColor} border flex items-center justify-center`}>
                  <restoreModalTable.icon className={`w-5 h-5 ${restoreModalTable.color}`} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{language === 'my' ? 'ဇယား ပြန်လည်ထည့်သွင်းခြင်း (Table Restore)' : 'Restore Table From JSON'}</span>
                  </h3>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs font-semibold text-emerald-400">
                      {language === 'my' ? restoreModalTable.nameMm : restoreModalTable.nameEn}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({restoreModalTable.key})
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setRestoreModalTable(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current State Info */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">
                {language === 'my' ? 'လက်ရှိ ဇယားထဲရှိ မှတ်တမ်း အရေအတွက်:' : 'Current records in table:'}
              </span>
              <strong className="text-white font-mono font-bold">
                {restoreModalTable.getCount(db)} {language === 'my' ? restoreModalTable.unitMm : restoreModalTable.unitEn}
              </strong>
            </div>

            {/* File Upload Option */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">
                {language === 'my' ? '1. JSON ဖိုင် ရွေးချယ်ပါ (.json)' : '1. Upload Table JSON File (.json)'}
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer"
              />
              {uploadedFileName && (
                <p className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Loaded file: {uploadedFileName}</span>
                </p>
              )}
            </div>

            {/* Raw JSON Input Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>{language === 'my' ? '2. သို့မဟုတ် JSON ကုဒ်များကို paste ချပါ:' : '2. Or paste JSON content directly:'}</span>
                {parseValidation && (
                  <span className={`text-[11px] font-medium flex items-center gap-1 ${
                    parseValidation.isValid ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {parseValidation.isValid ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                    <span>{parseValidation.message}</span>
                  </span>
                )}
              </label>
              <textarea
                rows={4}
                value={restoreJsonInput}
                onChange={(e) => handleJsonInputChange(e.target.value)}
                placeholder={`{ "table": "${restoreModalTable.key}", "data": [ ... ] }`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Restore Mode Radio: Merge vs Replace */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold text-slate-300 block">
                {language === 'my' ? '3. ပြန်လည်ထည့်သွင်းမည့် ပုံစံ (Restore Mode):' : '3. Restore Mode:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {/* Mode: Merge */}
                <label 
                  onClick={() => setRestoreMode('merge')}
                  className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    restoreMode === 'merge' 
                      ? 'bg-sky-950/50 border-sky-500 text-white ring-1 ring-sky-500/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <input 
                      type="radio" 
                      name="restoreMode" 
                      checked={restoreMode === 'merge'} 
                      onChange={() => setRestoreMode('merge')}
                      className="text-sky-500" 
                    />
                    <span className="text-sky-300">
                      {language === 'my' ? 'Merge & Update (ပေါင်းစပ်မည်)' : 'Merge & Update (Safe)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal pl-5">
                    {language === 'my'
                      ? 'လက်ရှိဒေတာများကို မဖျက်ဘဲ အသစ်များကို ပေါင်းထည့်မည်။ တူညီသော ID ရှိပါက update လုပ်ပါမည်။'
                      : 'Adds new records and updates existing matching records while preserving others.'}
                  </p>
                </label>

                {/* Mode: Replace */}
                <label 
                  onClick={() => setRestoreMode('replace')}
                  className={`p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition-all ${
                    restoreMode === 'replace' 
                      ? 'bg-rose-950/50 border-rose-500 text-white ring-1 ring-rose-500/50' 
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-bold mb-1">
                    <input 
                      type="radio" 
                      name="restoreMode" 
                      checked={restoreMode === 'replace'} 
                      onChange={() => setRestoreMode('replace')}
                      className="text-rose-500" 
                    />
                    <span className="text-rose-300">
                      {language === 'my' ? 'Replace / Overwrite (အစားထိုးမည်)' : 'Replace / Overwrite'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal pl-5">
                    {language === 'my'
                      ? 'ဤဇယားတစ်ခုတည်းရှိ လက်ရှိဒေတာအားလုံးကို ဖျက်၍ အရန်ဖိုင်ပါ အချက်အလက်များဖြင့် အစားထိုးပါမည်။'
                      : 'Overwrites this specific table completely with imported records.'}
                  </p>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreModalTable(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                {language === 'my' ? 'မလုပ်တော့ပါ (Cancel)' : 'Cancel'}
              </button>

              <button
                type="button"
                id="btn-confirm-execute-restore"
                disabled={!restoreJsonInput.trim() || isRestoring || parseValidation?.isValid === false}
                onClick={handleExecuteTableRestore}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{language === 'my' ? 'ထည့်သွင်းနေပါသည်...' : 'Restoring...'}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {language === 'my'
                        ? `ဇယား "${restoreModalTable.nameMm}" အား Restore ပြုလုပ်မည်`
                        : `Apply Restore to ${restoreModalTable.nameEn}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
