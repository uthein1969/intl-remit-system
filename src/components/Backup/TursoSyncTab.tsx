import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Copy,
  ExternalLink,
  Server,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ShieldAlert,
  Trash2,
  History,
  RotateCcw,
  AlertTriangle,
  Users,
  Sliders,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import {
  fetchTursoStatus,
  testTursoConnection,
  pushDataToTurso,
  pullDataFromTurso,
  fetchTursoSchema,
  TursoStatusResponse
} from '../../lib/tursoClient';
import { tursoWebCleanLongIds } from '../../lib/tursoWebClient';

export type PushTableKey = 
  | 'transactions'
  | 'exchangeRates'
  | 'customers'
  | 'branches'
  | 'users'
  | 'companies'
  | 'currencies'
  | 'countries'
  | 'blacklist'
  | 'purposes'
  | 'auditLogs'
  | 'operatorProfile'
  | 'mtoComplianceLimits';

interface PushTableItem {
  key: PushTableKey;
  labelEn: string;
  labelMm: string;
  getCount: (db: any) => number | string;
  unitEn: string;
  unitMm: string;
  icon: React.ElementType;
  color: string;
}

export const PUSH_TABLE_CONFIGS: PushTableItem[] = [
  {
    key: 'transactions',
    labelEn: 'Transactions',
    labelMm: 'ငွေလွှဲမှတ်တမ်း',
    getCount: (db) => db.transactions?.length || 0,
    unitEn: 'records',
    unitMm: 'ခု',
    icon: RefreshCw,
    color: 'text-emerald-400'
  },
  {
    key: 'exchangeRates',
    labelEn: 'Exchange Rates',
    labelMm: 'ငွေလဲနှုန်း',
    getCount: (db) => db.exchangeRates?.length || 0,
    unitEn: 'rates',
    unitMm: 'ခု',
    icon: RefreshCw,
    color: 'text-amber-400'
  },
  {
    key: 'customers',
    labelEn: 'Customer Profiles',
    labelMm: 'ဖောက်သည်မှတ်တမ်း',
    getCount: (db) => db.customers?.length || 0,
    unitEn: 'profiles',
    unitMm: 'ယောက်',
    icon: Users,
    color: 'text-sky-400'
  },
  {
    key: 'branches',
    labelEn: 'Branches',
    labelMm: 'ဘဏ်ခွဲများ',
    getCount: (db) => db.branches?.length || 0,
    unitEn: 'branches',
    unitMm: 'ခု',
    icon: Server,
    color: 'text-indigo-400'
  },
  {
    key: 'users',
    labelEn: 'System Users',
    labelMm: 'ဝန်ထမ်းအကောင့်များ',
    getCount: (db) => db.users?.length || 0,
    unitEn: 'users',
    unitMm: 'ဦး',
    icon: Users,
    color: 'text-purple-400'
  },
  {
    key: 'companies',
    labelEn: 'Partner Companies',
    labelMm: 'မိတ်ဖက်ကုမ္ပဏီများ',
    getCount: (db) => db.companies?.length || 0,
    unitEn: 'companies',
    unitMm: 'ခု',
    icon: Layers,
    color: 'text-teal-400'
  },
  {
    key: 'currencies',
    labelEn: 'Currencies',
    labelMm: 'ငွေကြေးအမျိုးအစားများ',
    getCount: (db) => db.currencies?.length || 0,
    unitEn: 'currencies',
    unitMm: 'မျိုး',
    icon: Database,
    color: 'text-yellow-400'
  },
  {
    key: 'countries',
    labelEn: 'Countries',
    labelMm: 'နိုင်ငံများ',
    getCount: (db) => db.countries?.length || 0,
    unitEn: 'countries',
    unitMm: 'နိုင်ငံ',
    icon: HardDrive,
    color: 'text-blue-400'
  },
  {
    key: 'blacklist',
    labelEn: 'Blacklist Entries',
    labelMm: 'နာမည်ပျက်စာရင်း',
    getCount: (db) => db.blacklist?.length || 0,
    unitEn: 'entries',
    unitMm: 'ဦး',
    icon: AlertTriangle,
    color: 'text-rose-400'
  },
  {
    key: 'purposes',
    labelEn: 'Purposes',
    labelMm: 'လွှဲပို့ရည်ရွယ်ချက်များ',
    getCount: (db) => db.purposes?.length || 0,
    unitEn: 'purposes',
    unitMm: 'ခု',
    icon: Layers,
    color: 'text-cyan-400'
  },
  {
    key: 'auditLogs',
    labelEn: 'Audit Logs',
    labelMm: 'စနစ်မှတ်တမ်းများ',
    getCount: (db) => db.auditLogs?.length || 0,
    unitEn: 'logs',
    unitMm: 'စောင်',
    icon: History,
    color: 'text-violet-400'
  },
  {
    key: 'operatorProfile',
    labelEn: 'Operator & System Settings',
    labelMm: 'အော်ပရေတာနှင့် ဆက်တင်များ',
    getCount: (db) => db.operatorProfile ? 'Configured' : 'Default',
    unitEn: '',
    unitMm: '',
    icon: Cpu,
    color: 'text-emerald-400'
  },
  {
    key: 'mtoComplianceLimits',
    labelEn: 'MTO & Myanmar Inward Limits',
    labelMm: 'MTO & Inward ကန့်သတ်ချက်များ',
    getCount: (db) => db.mtoComplianceLimits?.length || 0,
    unitEn: 'corridors',
    unitMm: 'စင်္ကြံ',
    icon: Sliders,
    color: 'text-blue-400'
  }
];

export const ALL_PUSH_KEYS: PushTableKey[] = PUSH_TABLE_CONFIGS.map(t => t.key);

interface TursoSyncTabProps {
  onNotify: (type: 'success' | 'error', message: string) => void;
}

export const TursoSyncTab: React.FC<TursoSyncTabProps> = ({ onNotify }) => {
  const { 
    db, 
    setDb, 
    language,
    clearAllTransactions,
    clearAllAuditLogs,
    clearAllCustomers,
    resetToDefaultSeed,
    resetMtoComplianceLimitsToDefault
  } = useRemittance();
  const [status, setStatus] = useState<TursoStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isRemote?: boolean; url?: string } | null>(null);
  const [schemaSql, setSchemaSql] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  // Testing Cleanup state
  const [isClearing, setIsClearing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'clear_tx' | 'clear_audit' | 'clear_customers' | 'reset_seed' | 'reset_mto_limits';
    confirmText: string;
  } | null>(null);

  // Push Table Selection state
  const [selectedPushTables, setSelectedPushTables] = useState<PushTableKey[]>(ALL_PUSH_KEYS);
  const isAllPushSelected = selectedPushTables.length === ALL_PUSH_KEYS.length;
  const isNonePushSelected = selectedPushTables.length === 0;

  const handleToggleSelectAllPush = () => {
    if (isAllPushSelected) {
      setSelectedPushTables([]);
    } else {
      setSelectedPushTables(ALL_PUSH_KEYS);
    }
  };

  const handleToggleTablePush = (key: PushTableKey) => {
    setSelectedPushTables((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Collapsible accordion sections state
  const [showIdNormalizer, setShowIdNormalizer] = useState(false);
  const [showTestingCleaner, setShowTestingCleaner] = useState(false);
  const [showConnectGuide, setShowConnectGuide] = useState(false);
  const [showSchemaDdl, setShowSchemaDdl] = useState(false);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetchTursoStatus();
      setStatus(res);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const loadSchema = async () => {
    try {
      const sql = await fetchTursoSchema();
      setSchemaSql(sql);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStatus();
    loadSchema();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testTursoConnection();
      setTestResult(res);
      if (res.success) {
        onNotify('success', language === 'my' 
          ? `Turso ချိတ်ဆက်မှု အောင်မြင်ပါသည်! (${res.isRemote ? 'Remote Turso Cloud' : 'Local Embedded SQLite'})` 
          : `Turso connection successful! (${res.isRemote ? 'Remote Turso Cloud' : 'Local Embedded SQLite'})`);
      } else {
        onNotify('error', res.message || 'Connection failed');
      }
      await loadStatus();
    } catch (err: any) {
      setTestResult({ success: false, message: err?.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePushData = async () => {
    if (selectedPushTables.length === 0) {
      onNotify(
        'error',
        language === 'my'
          ? 'ကျေးဇူးပြု၍ Turso သို့ ပို့ဆောင်လိုသော Table အနည်းဆုံး တစ်ခုကို ရွေးချယ်ပါ'
          : 'Please select at least one table to push to Turso'
      );
      return;
    }

    setIsSyncing(true);
    try {
      const payload: any = {};
      if (selectedPushTables.includes('transactions')) payload.transactions = db.transactions;
      if (selectedPushTables.includes('exchangeRates')) payload.exchangeRates = db.exchangeRates;
      if (selectedPushTables.includes('customers')) payload.customers = db.customers;
      if (selectedPushTables.includes('branches')) payload.branches = db.branches;
      if (selectedPushTables.includes('users')) payload.users = db.users;
      if (selectedPushTables.includes('companies')) payload.companies = db.companies;
      if (selectedPushTables.includes('currencies')) payload.currencies = db.currencies;
      if (selectedPushTables.includes('countries')) payload.countries = db.countries;
      if (selectedPushTables.includes('blacklist')) payload.blacklist = db.blacklist;
      if (selectedPushTables.includes('purposes')) payload.purposes = db.purposes;
      if (selectedPushTables.includes('auditLogs')) payload.auditLogs = db.auditLogs;
      if (selectedPushTables.includes('operatorProfile')) {
        payload.operatorProfile = db.operatorProfile;
        payload.roleMenuPermissions = db.roleMenuPermissions;
        payload.defaultStatusConfig = db.defaultStatusConfig;
      }
      if (selectedPushTables.includes('mtoComplianceLimits')) payload.mtoComplianceLimits = db.mtoComplianceLimits;

      const res = await pushDataToTurso(payload);

      if (res.success) {
        await loadStatus();
        const saved = res.saved || {};
        const totalPushed =
          (saved.transactions || 0) +
          (saved.exchangeRates || 0) +
          (saved.customers || 0) +
          (saved.branches || 0) +
          (saved.users || 0) +
          (saved.companies || 0) +
          (saved.currencies || 0) +
          (saved.countries || 0) +
          (saved.blacklist || 0) +
          (saved.purposes || 0) +
          (saved.auditLogs || 0) +
          (saved.operatorProfile || 0) +
          (saved.systemSettings || 0) +
          (saved.mtoComplianceLimits || 0);

        if (isAllPushSelected) {
          onNotify(
            'success',
            language === 'my'
              ? `Turso Database သို့ Table အားလုံး (${totalPushed || res.count || 0} records, MTO & Inward Limits အပါအဝင်) အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!`
              : `Successfully pushed all 14 tables (${totalPushed || res.count || 0} records, including MTO & Inward Limits) to Turso Database!`
          );
        } else {
          onNotify(
            'success',
            language === 'my'
              ? `Turso Database သို့ ရွေးချယ်ထားသော Table (${selectedPushTables.length} ခု၊ စုစုပေါင်း ${totalPushed || res.count || 0} records) အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!`
              : `Successfully pushed ${selectedPushTables.length} selected tables (${totalPushed || res.count || 0} records) to Turso Database!`
          );
        }
      } else {
        onNotify('error', res.error || (res as any).message || 'Failed to push data to Turso');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullData = async () => {
    setIsPulling(true);
    try {
      const res = await pullDataFromTurso();
      if (res.success && res.data) {
        const d = res.data;
        const pulledTxCount = d.transactions?.length || 0;
        const pulledRateCount = d.exchangeRates?.length || 0;
        const pulledCustCount = d.customers?.length || 0;
        const pulledBranchCount = d.branches?.length || 0;
        const pulledUserCount = d.users?.length || 0;
        const pulledCompCount = d.companies?.length || 0;
        const pulledCurrCount = d.currencies?.length || 0;
        const pulledCountryCount = d.countries?.length || 0;
        const pulledBlCount = d.blacklist?.length || 0;
        const pulledPurpCount = d.purposes?.length || 0;
        const pulledLogCount = d.auditLogs?.length || 0;
        const pulledMtoCount = d.mtoComplianceLimits?.length || 0;

        setDb((prev) => {
          const updated = { ...prev };
          if (d.transactions && d.transactions.length > 0) {
            const map = new Map<string, any>();
            prev.transactions.forEach((t) => map.set(t.id, t));
            d.transactions.forEach((t: any) => map.set(t.id, { ...map.get(t.id), ...t }));
            updated.transactions = Array.from(map.values());
          }
          if (d.exchangeRates && d.exchangeRates.length > 0) {
            updated.exchangeRates = d.exchangeRates;
          }
          if (d.customers && d.customers.length > 0) {
            const map = new Map<string, any>();
            prev.customers.forEach((c) => map.set(c.id, c));
            d.customers.forEach((c: any) => map.set(c.id, { ...map.get(c.id), ...c }));
            updated.customers = Array.from(map.values());
          }
          if (d.branches && d.branches.length > 0) {
            updated.branches = d.branches;
          }
          if (d.users && d.users.length > 0) {
            updated.users = d.users;
          }
          if (d.companies && d.companies.length > 0) {
            updated.companies = d.companies;
          }
          if (d.currencies && d.currencies.length > 0) {
            updated.currencies = d.currencies;
          }
          if (d.countries && d.countries.length > 0) {
            updated.countries = d.countries;
          }
          if (d.blacklist && d.blacklist.length > 0) {
            updated.blacklist = d.blacklist;
          }
          if (d.purposes && d.purposes.length > 0) {
            updated.purposes = d.purposes;
          }
          if (d.auditLogs && d.auditLogs.length > 0) {
            const map = new Map<string, any>();
            prev.auditLogs.forEach((l) => map.set(l.id, l));
            d.auditLogs.forEach((l: any) => map.set(l.id, l));
            updated.auditLogs = Array.from(map.values());
          }
          if (d.operatorProfile) {
            updated.operatorProfile = d.operatorProfile;
          }
          if (d.roleMenuPermissions) {
            updated.roleMenuPermissions = d.roleMenuPermissions;
          }
          if (d.defaultStatusConfig) {
            updated.defaultStatusConfig = d.defaultStatusConfig;
          }
          if (d.mtoComplianceLimits && d.mtoComplianceLimits.length > 0) {
            updated.mtoComplianceLimits = d.mtoComplianceLimits;
          }
          return updated;
        });

        await loadStatus();
        const totalPulled = pulledTxCount + pulledRateCount + pulledCustCount + pulledBranchCount + pulledUserCount + pulledCompCount + pulledCurrCount + pulledCountryCount + pulledBlCount + pulledPurpCount + pulledLogCount + pulledMtoCount;
        onNotify(
          'success',
          language === 'my'
            ? `Turso မှ Table အားလုံး (${totalPulled} records, MTO & Inward Limits အပါအဝင်) အောင်မြင်စွာ ရယူပြီးပါပြီ!`
            : `Successfully pulled all 14 tables (${totalPulled} records, including MTO & Inward Limits) from Turso Database!`
        );
      } else {
        onNotify('error', res.error || (res as any).message || 'Failed to pull data from Turso');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Sync pull error');
    } finally {
      setIsPulling(false);
    }
  };

  const handleSyncMtoLimits = async () => {
    setIsSyncing(true);
    try {
      const res = await pushDataToTurso({
        mtoComplianceLimits: db.mtoComplianceLimits,
      });
      if (res.success) {
        await loadStatus();
        onNotify(
          'success',
          language === 'my'
            ? `MTO & Myanmar Domestic Inward Remittance Limits (${db.mtoComplianceLimits?.length || 0} corridors) ကို Turso Cloud DB သို့ အောင်မြင်စွာ ပို့ဆောင်သိမ်းဆည်းပြီးပါပြီ!`
            : `Successfully pushed MTO & Myanmar Domestic Inward Limits (${db.mtoComplianceLimits?.length || 0} corridors) to Turso Cloud DB!`
        );
      } else {
        onNotify('error', res.error || 'Failed to sync MTO limits to Turso Cloud DB');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePullMtoLimits = async () => {
    setIsPulling(true);
    try {
      const res = await pullDataFromTurso();
      if (res.success && res.data?.mtoComplianceLimits) {
        setDb((prev) => ({
          ...prev,
          mtoComplianceLimits: res.data!.mtoComplianceLimits!
        }));
        await loadStatus();
        onNotify(
          'success',
          language === 'my'
            ? `Turso Cloud DB မှ MTO & Myanmar Domestic Inward Remittance Limits (${res.data.mtoComplianceLimits.length} corridors) ကို အောင်မြင်စွာ ရယူပြီးပါပြီ!`
            : `Successfully pulled MTO & Myanmar Domestic Inward Limits (${res.data.mtoComplianceLimits.length} corridors) from Turso Cloud DB!`
        );
      } else {
        onNotify('error', res.error || 'Failed to pull MTO limits from Turso Cloud DB');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Pull error');
    } finally {
      setIsPulling(false);
    }
  };

  const handleCleanLongIds = async () => {
    setIsCleaning(true);
    try {
      const res = await tursoWebCleanLongIds();
      if (res.success) {
        onNotify('success', res.message);
        await handlePullData();
        await loadStatus();
      } else {
        onNotify('error', res.message);
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Failed to clean long IDs');
    } finally {
      setIsCleaning(false);
    }
  };

  const handleExecuteCleanup = async () => {
    if (!confirmModal) return;
    setIsClearing(true);
    try {
      if (confirmModal.actionType === 'clear_tx') {
        const res = await clearAllTransactions(true);
        await loadStatus();
        onNotify('success', language === 'my'
          ? `ငွေလွှဲစာရင်း (${res.count}) ခုအား Local နှင့် Turso Cloud (remittance_transactions) မှ အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။`
          : `Cleared ${res.count} transactions from local and Turso cloud.`);
      } else if (confirmModal.actionType === 'clear_audit') {
        const res = await clearAllAuditLogs(true);
        await loadStatus();
        onNotify('success', language === 'my'
          ? `Audit logs (${res.count}) ခုအား Local နှင့် Turso Cloud (audit_logs) မှ အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။`
          : `Cleared ${res.count} audit logs from local and Turso cloud.`);
      } else if (confirmModal.actionType === 'clear_customers') {
        const res = await clearAllCustomers(true);
        await loadStatus();
        onNotify('success', language === 'my'
          ? `Customer profiles (${res.count}) ခုအား Local နှင့် Turso Cloud (customer_profiles) မှ အောင်မြင်စွာ ရှင်းလင်းပြီးပါပြီ။`
          : `Cleared ${res.count} customer profiles from local and Turso cloud.`);
      } else if (confirmModal.actionType === 'reset_seed') {
        resetToDefaultSeed();
        await loadStatus();
        onNotify('success', language === 'my'
          ? 'မူလနမူနာဒေတာများသို့ ပြန်လည်ပြောင်းလဲပြီးပါပြီ။'
          : 'Reset to factory seed data complete.');
      } else if (confirmModal.actionType === 'reset_mto_limits') {
        await resetMtoComplianceLimitsToDefault();
        await loadStatus();
        onNotify('success', language === 'my'
          ? 'MTO & Myanmar Domestic Inward Remittance Limits များကို ဗဟိုဘဏ် CBM စံနှုန်းများအတိုင်း မူလသတ်မှတ်ချက်သို့ ပြန်လည်ထားရှိပြီး Turso Cloud သို့ ချိန်ညှိပြီးပါပြီ။'
          : 'Reset MTO & Myanmar Domestic Inward Remittance Limits to standard CBM defaults and synced to Turso Cloud DB.');
      }
    } catch (err: any) {
      onNotify('error', err?.message || 'Operation failed');
    } finally {
      setIsClearing(false);
      setConfirmModal(null);
    }
  };

  const copySql = () => {
    if (!schemaSql) return;
    navigator.clipboard.writeText(schemaSql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
    onNotify('success', language === 'my' ? 'Turso Schema SQL ကို Copy ကူးပြီးပါပြီ' : 'Turso Schema SQL copied to clipboard');
  };

  const copyCliCommands = () => {
    const cliCommands = `# 1. Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# 2. Login to Turso
turso auth login

# 3. Create a free database
turso db create remittance-db

# 4. Get Database URL
turso db show remittance-db --url

# 5. Create an authentication token
turso db tokens create remittance-db`;

    navigator.clipboard.writeText(cliCommands);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
    onNotify('success', language === 'my' ? 'Turso CLI commands များကို Copy ကူးပြီးပါပြီ' : 'Turso CLI commands copied');
  };

  const isRemote = status?.isRemote || false;
  const isConnected = status?.connected || false;

  return (
    <div className="space-y-6">
      {/* Top Banner: Turso Overview */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-800/40 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Turso LibSQL Cloud Database
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  FREE 9GB TIER
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  SQLite Compatible
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                {language === 'my'
                  ? 'Turso သည် SQLite အခြေခံ Serverless Cloud Database ဖြစ်ပြီး 9GB အခမဲ့ သိုလှောင်ခွင့်နှင့် အလွန်မြန်ဆန်သော LibSQL engine ပါဝင်ပါသည်။ စနစ်သည် Local Embedded SQLite ဖြင့် အဆင်သင့် စတင်အလုပ်လုပ်ပြီး Remote Turso URL ထည့်သွင်းရုံဖြင့် Cloud Database အဖြစ် ပြောင်းလဲအသုံးပြုနိုင်ပါသည်။'
                  : 'Turso is a fast SQLite-compatible cloud database offering 9GB free storage with LibSQL engine. The app works instantly with an embedded engine, and automatically switches to remote cloud when configured.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? (language === 'my' ? 'စစ်ဆေးနေသည်...' : 'Testing...') : (language === 'my' ? 'Connection စမ်းသပ်မည်' : 'Test Connection')}</span>
            </button>

            <a
              href="https://turso.tech"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              <span>turso.tech</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>

        {/* Live Status Pill Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ချိတ်ဆက်မှု အခြေအနေ' : 'Connection Status'}
            </span>
            <div className="flex items-center space-x-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
              <span className="text-xs font-bold text-white">
                {isConnected 
                  ? (isRemote ? 'Remote Turso Cloud' : 'Embedded SQLite Engine') 
                  : 'Disconnected'}
              </span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ငွေလွှဲမှတ်တမ်း (Transactions)' : 'Stored Transactions'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-emerald-400">
                {status?.counts?.transactions ?? db.transactions.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">records</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ဖောက်သည် စာရင်း (Customers)' : 'Customers Profile'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-sky-400">
                {status?.counts?.customers ?? db.customers.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">records</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block mb-1">
              {language === 'my' ? 'ငွေလဲနှုန်းများ (Exchange Rates)' : 'Exchange Rates'}
            </span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-amber-400">
                {status?.counts?.exchangeRates ?? db.exchangeRates.length}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">currencies</span>
            </div>
          </div>
        </div>

        {/* Endpoint address info */}
        {status?.url && (
          <div className="mt-3 flex items-center justify-between bg-slate-950/50 border border-slate-800/80 px-3.5 py-2 rounded-xl text-[11px] text-slate-400">
            <div className="flex items-center space-x-2 truncate">
              <HardDrive className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500">Database Source:</span>
              <span className="font-mono text-slate-300 truncate">{status.url}</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-mono shrink-0 ml-2">
              {isRemote ? 'Cloud Hosted' : 'Embedded Local DB'}
            </span>
          </div>
        )}
      </div>

      {/* Main Two-Column Sync Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Push to Turso Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {language === 'my' ? 'ဒေတာများကို Turso သို့ ပို့မည် (Push Local to Turso)' : 'Push Local Data to Turso'}
                </h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {selectedPushTables.length} / {PUSH_TABLE_CONFIGS.length} {language === 'my' ? 'ရွေးထားသည်' : 'Selected'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {language === 'my'
                ? 'Turso Cloud DB သို့ ပို့ဆောင်လိုသော Table များကို Checkbox ဖြင့် ရွေးချယ်နိုင်ပါသည်။ "Select All" ကို Check လုပ်ထားပါက Table အားလုံး (၁၄ မျိုး) ကို Cloud သို့ တစ်ပြိုင်နက် ပို့ဆောင်ပေးမည် ဖြစ်ပြီး၊ မိမိလိုအပ်သော Table များကိုသာ ရွေးချယ်၍လည်း Push ပြုလုပ်နိုင်ပါသည်။'
                : 'Select the specific tables to push to Turso Cloud DB using the checkboxes below. Checking "Select All" will push all 14 tables to the cloud simultaneously.'}
            </p>

            {/* Select All Bar */}
            <div className="flex items-center justify-between mt-3 px-3.5 py-2.5 bg-slate-950/80 rounded-xl border border-slate-800/90 text-xs">
              <label 
                htmlFor="chk-select-all-push"
                className="flex items-center space-x-2.5 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="chk-select-all-push"
                  checked={isAllPushSelected}
                  onChange={handleToggleSelectAllPush}
                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer accent-emerald-500"
                />
                <span className="font-bold text-white flex items-center gap-1.5">
                  {isAllPushSelected ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : isNonePushSelected ? (
                    <Square className="w-4 h-4 text-slate-500" />
                  ) : (
                    <CheckSquare className="w-4 h-4 text-emerald-400/70" />
                  )}
                  <span>
                    {language === 'my' ? 'အားလုံး ရွေးချယ်မည် (Select All)' : 'Select All Tables'}
                  </span>
                </span>
              </label>

              <div className="flex items-center space-x-1.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setSelectedPushTables(ALL_PUSH_KEYS)}
                  className="px-2 py-0.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'အားလုံးရွေး' : 'Select All'}
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedPushTables([])}
                  className="px-2 py-0.5 rounded text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {language === 'my' ? 'အားလုံးဖြုတ်' : 'Deselect All'}
                </button>
              </div>
            </div>

            {/* Table Checkbox Checklist */}
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 mt-2.5 text-xs max-h-72 overflow-y-auto">
              {PUSH_TABLE_CONFIGS.map((t) => {
                const isChecked = selectedPushTables.includes(t.key);
                const count = t.getCount(db);
                const IconComponent = t.icon;

                return (
                  <label
                    key={t.key}
                    htmlFor={`chk-push-table-${t.key}`}
                    className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'bg-slate-900/90 border-emerald-500/30 text-slate-200 shadow-xs'
                        : 'bg-slate-950/50 border-slate-800/60 text-slate-500 hover:bg-slate-900/40 hover:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        id={`chk-push-table-${t.key}`}
                        checked={isChecked}
                        onChange={() => handleToggleTablePush(t.key)}
                        className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer accent-emerald-500 shrink-0"
                      />
                      <IconComponent className={`w-3.5 h-3.5 shrink-0 ${isChecked ? t.color : 'text-slate-600'}`} />
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1.5 truncate">
                        <span className={`text-xs font-semibold truncate ${isChecked ? 'text-white' : 'text-slate-400'}`}>
                          {t.labelEn}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">
                          ({t.labelMm})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0 font-mono">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isChecked 
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-slate-900 text-slate-600 border border-slate-800'
                      }`}>
                        {count} {t.unitEn && <span className="text-[10px] font-normal text-slate-500 ml-0.5">{t.unitEn}</span>}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-push"
            onClick={handlePushData}
            disabled={isSyncing || selectedPushTables.length === 0}
            className={`w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer ${
              selectedPushTables.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
            }`}
          >
            <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>
              {isSyncing
                ? (language === 'my' 
                    ? `Turso သို့ Table (${selectedPushTables.length}) ခု ပို့ဆောင်နေပါသည်...` 
                    : `Pushing ${selectedPushTables.length} Tables to Turso...`)
                : isAllPushSelected
                  ? (language === 'my' 
                      ? `Turso သို့ Table အားလုံး သိမ်းဆည်းမည် (Push All ${PUSH_TABLE_CONFIGS.length} Tables)` 
                      : `Push All ${PUSH_TABLE_CONFIGS.length} Tables to Turso Database`)
                  : selectedPushTables.length > 0
                    ? (language === 'my' 
                        ? `ရွေးချယ်ထားသော Table (${selectedPushTables.length}) ခုကို Turso သို့ သိမ်းဆည်းမည် (Push Selected)` 
                        : `Push Selected (${selectedPushTables.length} Tables) to Turso Database`)
                    : (language === 'my' 
                        ? 'Table မရွေးချယ်ရသေးပါ (Select Tables)' 
                        : 'No Tables Selected (Select at least one)')}
            </span>
          </button>
        </div>

        {/* Pull from Turso Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <DownloadCloud className="w-5 h-5 text-sky-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'Turso မှ ဒေတာများ ဆွဲယူမည် (Pull from Turso)' : 'Pull Data from Turso'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {language === 'my'
                ? 'Turso Database ထဲတွင် သိမ်းဆည်းထားသော Table အားလုံး (ငွေလွှဲ၊ ငွေလဲနှုန်း၊ ဖောက်သည်၊ ဘဏ်ခွဲ၊ အသုံးပြုသူ၊ ကုမ္ပဏီ၊ ငွေကြေး၊ နိုင်ငံ၊ Blacklist၊ စနစ်မှတ်တမ်း နှင့် MTO & Myanmar Domestic Inward Remittance Limits စသည်) ကို Remittance System ထဲသို့ ပြန်လည်ဆွဲယူပြီး ရောစပ်ဖြည့်သွင်းပါမည် (Full 14 Tables Pull & Merge).'
                : 'Pulls all 14 cloud tables from Turso LibSQL (including MTO & Myanmar Domestic Inward Remittance Limits) and safely merges them with the local active state.'}
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 mt-4 text-xs font-mono max-h-56 overflow-y-auto">
              <div className="flex justify-between text-slate-400">
                <span>Cloud Transactions:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.transactions ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Exchange Rates:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.exchangeRates ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Customers:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.customers ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Branches:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.branches ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud System Users:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.users ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Companies:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.companies ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Currencies:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.currencies ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Countries:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.countries ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Blacklist:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.blacklist ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Purposes:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.purposes ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Audit Logs:</span>
                <span className="text-emerald-400 font-bold">{status?.counts?.auditLogs ?? 'Check'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Cloud Operator & Settings:</span>
                <span className="text-emerald-400 font-bold">Synced</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Cloud MTO & Myanmar Inward Limits:</span>
                </span>
                <span className="text-emerald-400 font-bold">{status?.counts?.mtoComplianceLimits ?? 'Check'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-pull"
            onClick={handlePullData}
            disabled={isPulling}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
            <span>
              {isPulling
                ? (language === 'my' ? 'Turso မှ Table အားလုံး ဆွဲယူနေပါသည်...' : 'Pulling All Tables from Turso...')
                : (language === 'my' ? 'Turso မှ Table အားလုံး ရယူမည် (Pull All Tables)' : 'Pull All Tables from Turso Database')}
            </span>
          </button>
        </div>
      </div>

      {/* Turso Database ID Format & Cleanup Manager */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div 
          onClick={() => setShowIdNormalizer(!showIdNormalizer)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800 cursor-pointer select-none group"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                {language === 'my' ? 'Turso Table ID များ သန့်စင်ပြင်ဆင်မှု (Clean Sequential ID Normalizer)' : 'Turso Clean Sequential ID Normalizer'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'my'
                  ? 'Date.now() ကြောင့်ဖြစ်ပေါ်နေသော Long Number IDs (ဥပမာ- BR-1789830806420, USR-1789831191191) များကို သပ်ရပ်သော နံပါတ်စဉ် (BR-009, USR-007, USR-008, USR-009, TX-001) သို့ တိုက်ရိုက်ရှင်းလင်း ပြင်ဆင်ပါမည်။'
                  : 'Permanently converts legacy timestamp IDs (e.g. BR-1789830806420, USR-1789831191191) to clean sequential format (BR-009, USR-007, USR-008, USR-009, TX-001).'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              id="btn-turso-clean-ids"
              onClick={(e) => {
                e.stopPropagation();
                handleCleanLongIds();
              }}
              disabled={isCleaning}
              className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 ${isCleaning ? 'animate-spin' : ''}`} />
              <span>
                {isCleaning
                  ? (language === 'my' ? 'ID များ ရှင်းလင်းနေပါသည်...' : 'Cleaning Long IDs...')
                  : (language === 'my' ? 'Turso ID များကို နံပါတ်စဉ်အမှန်သို့ ပြင်မည်' : 'Clean & Normalize Turso IDs')}
              </span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowIdNormalizer(!showIdNormalizer);
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title={showIdNormalizer ? (language === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide') : (language === 'my' ? 'အသေးစိတ်ကြည့်မည်' : 'Show')}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showIdNormalizer ? 'rotate-180 text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {showIdNormalizer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1 animate-in fade-in duration-150">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Thai Branch (ဘဏ်ခွဲ)</span>
              <span className="text-slate-400 line-through mr-2">BR-1789830806420</span>
              <span className="text-emerald-400 font-bold font-mono">→ BR-009</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Thai System Users (ဝန်ထမ်းများ)</span>
              <span className="text-slate-400 line-through mr-2">USR-1789831...</span>
              <span className="text-emerald-400 font-bold font-mono">→ USR-007, 008, 009</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[11px] mb-1">Transactions (ငွေလွှဲမှတ်တမ်း)</span>
              <span className="text-slate-400 line-through mr-2">TX-1789...</span>
              <span className="text-emerald-400 font-bold font-mono">→ TX-001, TX-002...</span>
            </div>
          </div>
        )}
      </div>

      {/* Testing Data Reset & Table Cleaner Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-2 border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div 
          onClick={() => setShowTestingCleaner(!showTestingCleaner)}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-rose-500/20 cursor-pointer select-none group"
        >
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                  {language === 'my' 
                    ? 'Turso Database စမ်းသပ်မှုဒေတာ ရှင်းလင်းခြင်း (Testing Data Cleaner)' 
                    : 'Turso Cloud Testing Data Cleaner & Reset'}
                </h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  New Testing
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {language === 'my'
                  ? 'စမ်းသပ်မှုအသစ် ပြုလုပ်ရန်အတွက် Turso Cloud Database နှင့် Local Storage ပေါ်ရှိ Transactions နှင့် Audit Logs များကို တိုက်ရိုက် ရှင်းလင်းနိုင်ပါသည်'
                  : 'Purge test remittance transactions or audit logs from both Turso LibSQL cloud tables and local storage.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <span>TX:</span>
              <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {status?.counts?.transactions ?? db.transactions.length}
              </span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-slate-400">
              <span>Cust:</span>
              <span className="font-mono font-bold text-sky-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                {status?.counts?.customers ?? db.customers.length}
              </span>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTestingCleaner(!showTestingCleaner);
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer ml-1"
              title={showTestingCleaner ? (language === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide') : (language === 'my' ? 'အသေးစိတ်ကြည့်မည်' : 'Show')}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTestingCleaner ? 'rotate-180 text-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {showTestingCleaner && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 text-xs pt-1 animate-in fade-in duration-150">
          {/* Card 1: Clear Transactions */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <Trash2 className="w-4 h-4" />
                  {language === 'my' ? 'ငွေလွှဲများ ရှင်းလင်းမည်' : 'Clear Transactions'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20 text-rose-300 font-mono">
                  {status?.counts?.transactions ?? db.transactions.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso (remittance_transactions) နှင့် Local Storage ငွေလွှဲစာရင်းများ ရှင်းလင်းမည်'
                  : 'Truncate remittance_transactions table in Turso and local cache.'}
              </p>
            </div>
            <button
              type="button"
              id="btn-turso-clear-tx"
              disabled={isClearing}
              onClick={() => setConfirmModal({
                isOpen: true,
                title: language === 'my' ? 'Turso ငွေလွှဲစာရင်းများ ရှင်းလင်းမည်လား?' : 'Clear Turso Transactions?',
                description: language === 'my'
                  ? `Turso Cloud Database (remittance_transactions) နှင့် Local Cache ထဲရှိ ငွေလွှဲမှတ်တမ်း အားလုံးကို ရှင်းလင်းပါမည်။`
                  : 'This will purge all remittance transactions from both remote Turso database and local storage.',
                actionType: 'clear_tx',
                confirmText: language === 'my' ? 'ဟုတ်ကဲ့၊ အားလုံးရှင်းမည်' : 'Yes, Clear Transactions'
              })}
              className="w-full py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'ငွေလွှဲစာရင်းများ ရှင်းလင်းမည်' : 'Clear Transactions'}</span>
            </button>
          </div>

          {/* Card 2: Clear Audit Logs */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <History className="w-4 h-4" />
                  {language === 'my' ? 'Audit Logs ရှင်းလင်းမည်' : 'Clear Audit Logs'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono">
                  {status?.counts?.auditLogs ?? db.auditLogs.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso (audit_logs) နှင့် Local Storage စနစ်မှတ်တမ်းဟောင်းများ ရှင်းလင်းမည်'
                  : 'Truncate audit_logs table in Turso and local cache.'}
              </p>
            </div>
            <button
              type="button"
              id="btn-turso-clear-audit"
              disabled={isClearing}
              onClick={() => setConfirmModal({
                isOpen: true,
                title: language === 'my' ? 'Turso Audit Logs များ ရှင်းလင်းမည်လား?' : 'Clear Turso Audit Logs?',
                description: language === 'my'
                  ? `Turso Cloud Database (audit_logs) နှင့် Local Cache ထဲရှိ စနစ်မှတ်တမ်း အားလုံးကို ရှင်းလင်းပါမည်။`
                  : 'This will purge all audit logs from both remote Turso database and local storage.',
                actionType: 'clear_audit',
                confirmText: language === 'my' ? 'ဟုတ်ကဲ့၊ မှတ်တမ်းများ ရှင်းမည်' : 'Yes, Clear Audit Logs'
              })}
              className="w-full py-2.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'Audit Logs ရှင်းလင်းမည်' : 'Clear Audit Logs'}</span>
            </button>
          </div>

          {/* Card 3: Clear Customer Profiles */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span className="flex items-center gap-1.5 text-sky-400">
                  <Users className="w-4 h-4" />
                  {language === 'my' ? 'Customer များ ရှင်းမည်' : 'Clear Customers'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                  {status?.counts?.customers ?? db.customers.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso (customer_profiles) နှင့် Local Storage Customer စာရင်းများ ရှင်းလင်းမည်'
                  : 'Truncate customer_profiles table in Turso and local cache.'}
              </p>
            </div>
            <button
              type="button"
              id="btn-turso-clear-customers"
              disabled={isClearing}
              onClick={() => setConfirmModal({
                isOpen: true,
                title: language === 'my' ? 'Turso Customer စာရင်းများ ရှင်းလင်းမည်လား?' : 'Clear Turso Customer Profiles?',
                description: language === 'my'
                  ? `Turso Cloud Database (customer_profiles) နှင့် Local Cache ထဲရှိ Customer မှတ်တမ်း အားလုံးကို ရှင်းလင်းပါမည်။`
                  : 'This will purge all customer profiles from both remote Turso database and local storage.',
                actionType: 'clear_customers',
                confirmText: language === 'my' ? 'ဟုတ်ကဲ့၊ Customer များ ရှင်းမည်' : 'Yes, Clear Customers'
              })}
              className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
            >
              <Users className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'Customer များ ရှင်းမည်' : 'Clear Customers'}</span>
            </button>
          </div>

          {/* Card 4: Reset Demo Seed Data */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <RotateCcw className="w-4 h-4" />
                  {language === 'my' ? 'Reset Demo Data' : 'Reset Seed Data'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                  Seed Data
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'မူလသတ်မှတ်ထားသော Standard Seed Mock Data များသို့ စနစ်ကို ပြန်ထားမည်'
                  : 'Re-initialize the local dataset to default seed state.'}
              </p>
            </div>
            <button
              type="button"
              id="btn-turso-reset-seed"
              disabled={isClearing}
              onClick={() => setConfirmModal({
                isOpen: true,
                title: language === 'my' ? 'မူလနမူနာဒေတာများသို့ ပြန်ထားမည်လား?' : 'Reset to Default Seed Data?',
                description: language === 'my'
                  ? 'စနစ်ကို မူလစတင်တပ်ဆင်စဉ်က နမူနာဒေတာများသို့ ပြန်လည်ပြောင်းလဲပါမည်။'
                  : 'Reset entire system database back to standard factory mock dataset.',
                actionType: 'reset_seed',
                confirmText: language === 'my' ? 'ဟုတ်ကဲ့၊ မူလအတိုင်း ပြန်ထားမည်' : 'Yes, Reset Demo Data'
              })}
              className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold shadow-md transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'Reset Demo Data' : 'Reset Demo Data'}</span>
            </button>
          </div>

          {/* Card 5: MTO & Myanmar Domestic Inward Remittance Limits */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between font-bold text-white mb-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Sliders className="w-4 h-4" />
                  {language === 'my' ? 'MTO & Inward Limits' : 'MTO & Inward Limits'}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 font-mono">
                  {status?.counts?.mtoComplianceLimits ?? db.mtoComplianceLimits?.length ?? 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso (mto_compliance_limits) နိုင်ငံအလိုက် MTO နှင့် ဗဟိုဘဏ် Inward USD ကန့်သတ်ချက်များ'
                  : 'MTO currency limits and Myanmar Inward USD monthly caps in Turso cloud.'}
              </p>
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  id="btn-turso-push-mto-limits"
                  disabled={isSyncing}
                  onClick={handleSyncMtoLimits}
                  className="py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40"
                  title="Push MTO & Inward limits to Turso"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>{language === 'my' ? 'Push ပို့' : 'Push'}</span>
                </button>
                <button
                  type="button"
                  id="btn-turso-pull-mto-limits"
                  disabled={isPulling}
                  onClick={handlePullMtoLimits}
                  className="py-1.5 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-[11px] shadow-sm transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40"
                  title="Pull MTO & Inward limits from Turso"
                >
                  <DownloadCloud className="w-3 h-3" />
                  <span>{language === 'my' ? 'Pull ယူ' : 'Pull'}</span>
                </button>
              </div>
              <button
                type="button"
                id="btn-turso-reset-mto-limits"
                disabled={isClearing}
                onClick={() => setConfirmModal({
                  isOpen: true,
                  title: language === 'my' ? 'MTO & Myanmar Inward Limits များကို CBM မူလစံနှုန်းအတိုင်း ပြန်ထားမည်လား?' : 'Reset MTO & Myanmar Inward Limits?',
                  description: language === 'my'
                    ? 'ဗဟိုဘဏ် CBM စံနှုန်းများ (Inward USD $5,000/tx, $25,000/month နှင့် MTO စင်္ကြံ ၇ ခု) အဖြစ် မူလအတိုင်း ပြန်လည်ပြောင်းလဲပြီး Turso Cloud သို့ ချိန်ညှိပါမည်။'
                    : 'Restore default Central Bank of Myanmar regulatory limits (USD $5,000/tx, $25,000/month & 7 major MTO corridors) and sync to Turso Cloud.',
                  actionType: 'reset_mto_limits',
                  confirmText: language === 'my' ? 'ဟုတ်ကဲ့၊ CBM စံနှုန်းအတိုင်း ပြန်ထားမည်' : 'Yes, Reset CBM Limits'
                })}
                className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-[11px] border border-slate-700 transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>{language === 'my' ? 'CBM စံနှုန်းပြန်ထား' : 'Reset CBM Defaults'}</span>
              </button>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Setup Guide: How to configure remote Turso Cloud */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div 
          onClick={() => setShowConnectGuide(!showConnectGuide)}
          className="flex items-center justify-between pb-3 border-b border-slate-800 cursor-pointer select-none group"
        >
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                {language === 'my' ? 'အခမဲ့ Turso Cloud Database ချိတ်ဆက်အသုံးပြုနည်း (Quick Guide)' : 'How to Connect Free Remote Turso Cloud Database'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso တွင် Account ဖွင့်ပြီး URL နှင့် Token ကို Environment Variable ထဲ ထည့်သွင်းရုံဖြင့် Cloud စနစ်အပြည့်အဝ ရရှိနိုင်ပါသည်'
                  : 'Create a free database on Turso and supply the credentials in environment settings.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyCliCommands();
              }}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCli ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'CLI အမိန့်များ ကူးယူမည်' : 'Copy CLI Commands')}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowConnectGuide(!showConnectGuide);
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title={showConnectGuide ? (language === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide') : (language === 'my' ? 'အသေးစိတ်ကြည့်မည်' : 'Show')}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showConnectGuide ? 'rotate-180 text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {showConnectGuide && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-1 animate-in fade-in duration-150">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-500/40 flex items-center justify-center text-[11px]">1</span>
                <span>Create Account</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {language === 'my'
                  ? 'turso.tech သို့ သွား၍ GitHub ဖြင့် အခမဲ့ Sign Up ပြုလုပ်ပါ (Starter Plan သည် အမြဲအခမဲ့ ဖြစ်ပါသည်)'
                  : 'Visit turso.tech and sign up for free using GitHub or email.'}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-teal-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-teal-950 border border-teal-500/40 flex items-center justify-center text-[11px]">2</span>
                <span>Create Database</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {language === 'my'
                  ? 'Turso Web Dashboard သို့မဟုတ် CLI ဖြင့် "remittance-db" အမည်ရှိ Database အသစ်တစ်ခု တည်ဆောက်ပါ'
                  : 'Create a new database named "remittance-db" via Turso CLI or web dashboard.'}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-sky-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-500/40 flex items-center justify-center text-[11px]">3</span>
                <span>Set Environment Variables</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {language === 'my'
                  ? 'TURSO_DATABASE_URL နှင့် TURSO_AUTH_TOKEN ကို App Settings / .env ထဲ ထည့်သွင်းလိုက်ပါက Remote Cloud သို့ အလိုအလျောက် ချိတ်ဆက်သွားပါမည်'
                  : 'Provide TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in app settings.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Turso Schema SQL DDL Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div 
          onClick={() => setShowSchemaDdl(!showSchemaDdl)}
          className="flex items-center justify-between pb-3 border-b border-slate-800 cursor-pointer select-none group"
        >
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                {language === 'my' ? 'Turso LibSQL Table တည်ဆောက်ရန် Schema (DDL)' : 'Turso LibSQL Schema (DDL)'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'ဤ Schema ကို Turso CLI Shell (turso db shell) သို့မဟုတ် DBeaver/TablePlus တွင်လည်း တိုက်ရိုက် run နိုင်ပါသည်'
                  : 'Ready-to-run SQLite/LibSQL DDL for tables, indexes and constraints.'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              id="btn-copy-turso-sql"
              onClick={(e) => {
                e.stopPropagation();
                copySql();
              }}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'SQL Copy ကူးမည်' : 'Copy Turso SQL')}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowSchemaDdl(!showSchemaDdl);
              }}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              title={showSchemaDdl ? (language === 'my' ? 'ခေါက်သိမ်းမည်' : 'Hide') : (language === 'my' ? 'အသေးစိတ်ကြည့်မည်' : 'Show')}
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSchemaDdl ? 'rotate-180 text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {showSchemaDdl && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-72 text-emerald-200/90 font-mono text-[11px] leading-relaxed pt-1 animate-in fade-in duration-150">
            <pre>{schemaSql || '-- Loading Turso LibSQL Schema...'}</pre>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-amber-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {language === 'my'
                  ? 'ဤလုပ်ဆောင်ချက်သည် ဘဏ်ခွဲများ (Branches)၊ User အကောင့်များနှင့် ငွေလဲနှုန်းများကို ဖျက်မည်မဟုတ်ပါ။'
                  : 'Notice: Branches, User accounts, and exchange rates will remain untouched.'}
              </span>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                {language === 'my' ? 'မလုပ်တော့ပါ (Cancel)' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isClearing}
                onClick={handleExecuteCleanup}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-bold shadow-lg transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {isClearing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmModal.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
