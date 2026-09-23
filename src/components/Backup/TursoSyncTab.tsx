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
  Users
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
    resetToDefaultSeed
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
    actionType: 'clear_tx' | 'clear_audit' | 'clear_customers' | 'reset_seed';
    confirmText: string;
  } | null>(null);

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
    setIsSyncing(true);
    try {
      const res = await pushDataToTurso({
        transactions: db.transactions,
        exchangeRates: db.exchangeRates,
        customers: db.customers,
        auditLogs: db.auditLogs,
        branches: db.branches,
        users: db.users,
        companies: db.companies,
        currencies: db.currencies,
        countries: db.countries,
        blacklist: db.blacklist,
        purposes: db.purposes,
        operatorProfile: db.operatorProfile,
        roleMenuPermissions: db.roleMenuPermissions,
        defaultStatusConfig: db.defaultStatusConfig,
      });

      if (res.success) {
        await loadStatus();
        const saved = res.saved || {};
        const totalPushed = (saved.transactions || 0) + (saved.exchangeRates || 0) + (saved.customers || 0) + (saved.branches || 0) + (saved.users || 0) + (saved.companies || 0) + (saved.currencies || 0) + (saved.countries || 0) + (saved.blacklist || 0) + (saved.purposes || 0) + (saved.auditLogs || 0) + (saved.operatorProfile || 0) + (saved.systemSettings || 0);
        onNotify(
          'success',
          language === 'my'
            ? `Turso Database သို့ Table အားလုံး (${totalPushed || res.count || 0} records) အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!`
            : `Successfully pushed all tables (${totalPushed || res.count || 0} records) to Turso Database!`
        );
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
          return updated;
        });

        await loadStatus();
        const totalPulled = pulledTxCount + pulledRateCount + pulledCustCount + pulledBranchCount + pulledUserCount + pulledCompCount + pulledCurrCount + pulledCountryCount + pulledBlCount + pulledPurpCount + pulledLogCount;
        onNotify(
          'success',
          language === 'my'
            ? `Turso မှ Table အားလုံး (${totalPulled} records) အောင်မြင်စွာ ရယူပြီးပါပြီ!`
            : `Successfully pulled all tables (${totalPulled} records) from Turso Database!`
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
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {language === 'my' ? 'ဒေတာများကို Turso သို့ ပို့မည် (Push Local to Turso)' : 'Push Local Data to Turso'}
              </h4>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              {language === 'my'
                ? 'လက်ရှိ Remittance စနစ်အတွင်းရှိ Table အားလုံး (ငွေလွှဲမှတ်တမ်း၊ ငွေလဲနှုန်း၊ Customer profiles၊ ဘဏ်ခွဲများ၊ User စာရင်းများ၊ ကုမ္ပဏီများ၊ Currencies၊ နိုင်ငံများ၊ Blacklist၊ ရည်ရွယ်ချက်များ၊ Audit Logs နှင့် System Settings) ကို Turso Database သို့ အကုန်အပြည့်အစုံ ပို့ဆောင်သိမ်းဆည်းပါမည် (Full 13 Tables Upsert).'
                : 'Uploads all 13 database tables (Transactions, Exchange Rates, Customers, Branches, Users, Companies, Currencies, Countries, Blacklist, Purposes, Audit Logs, Profile, Settings) into Turso LibSQL.'}
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1.5 mt-4 text-xs font-mono max-h-56 overflow-y-auto">
              <div className="flex justify-between text-slate-400">
                <span>Transactions (ငွေလွှဲမှတ်တမ်း):</span>
                <span className="text-white font-bold">{db.transactions.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Exchange Rates (ငွေလဲနှုန်း):</span>
                <span className="text-white font-bold">{db.exchangeRates.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Customer Profiles (ဖောက်သည်):</span>
                <span className="text-white font-bold">{db.customers.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Branches (ဘဏ်ခွဲများ):</span>
                <span className="text-white font-bold">{db.branches.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>System Users (ဝန်ထမ်းများ):</span>
                <span className="text-white font-bold">{db.users.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Companies (မိတ်ဖက်ကုမ္ပဏီများ):</span>
                <span className="text-white font-bold">{db.companies.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Currencies (ငွေကြေးအမျိုးအစားများ):</span>
                <span className="text-white font-bold">{db.currencies.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Countries (နိုင်ငံများ):</span>
                <span className="text-white font-bold">{db.countries.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Blacklist Entries (နာမည်ပျက်စာရင်း):</span>
                <span className="text-white font-bold">{db.blacklist.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Purposes (လွှဲပို့ရည်ရွယ်ချက်များ):</span>
                <span className="text-white font-bold">{db.purposes.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Audit Logs (စနစ်မှတ်တမ်းများ):</span>
                <span className="text-white font-bold">{db.auditLogs.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Operator Profile & Settings:</span>
                <span className="text-emerald-400 font-bold">{db.operatorProfile ? 'Configured' : 'Default'}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-push"
            onClick={handlePushData}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-lg transition-all active:scale-[0.99] cursor-pointer"
          >
            <UploadCloud className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>
              {isSyncing
                ? (language === 'my' ? 'Turso သို့ Table အားလုံး ပို့ဆောင်နေပါသည်...' : 'Pushing All Tables to Turso...')
                : (language === 'my' ? 'Turso သို့ Table အားလုံး သိမ်းဆည်းမည် (Push All Tables)' : 'Push All Tables to Turso Database')}
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
                ? 'Turso Database ထဲတွင် သိမ်းဆည်းထားသော Table အားလုံး (ငွေလွှဲ၊ ငွေလဲနှုန်း၊ ဖောက်သည်၊ ဘဏ်ခွဲ၊ အသုံးပြုသူ၊ ကုမ္ပဏီ၊ ငွေကြေး၊ နိုင်ငံ၊ Blacklist၊ စနစ်မှတ်တမ်း စသည်) ကို Remittance System ထဲသို့ ပြန်လည်ဆွဲယူပြီး ရောစပ်ဖြည့်သွင်းပါမည် (Full 13 Tables Pull & Merge).'
                : 'Pulls all 13 cloud tables from Turso LibSQL and safely merges them with the local active state.'}
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'Turso Table ID များ သန့်စင်ပြင်ဆင်မှု (Clean Sequential ID Normalizer)' : 'Turso Clean Sequential ID Normalizer'}
              </h4>
              <p className="text-xs text-slate-400">
                {language === 'my'
                  ? 'Date.now() ကြောင့်ဖြစ်ပေါ်နေသော Long Number IDs (ဥပမာ- BR-1789830806420, USR-1789831191191) များကို သပ်ရပ်သော နံပါတ်စဉ် (BR-009, USR-007, USR-008, USR-009, TX-001) သို့ တိုက်ရိုက်ရှင်းလင်း ပြင်ဆင်ပါမည်။'
                  : 'Permanently converts legacy timestamp IDs (e.g. BR-1789830806420, USR-1789831191191) to clean sequential format (BR-009, USR-007, USR-008, USR-009, TX-001).'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-turso-clean-ids"
            onClick={handleCleanLongIds}
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
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
      </div>

      {/* Testing Data Reset & Table Cleaner Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/40 border-2 border-rose-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-rose-500/20">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white">
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
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
        </div>
      </div>

      {/* Setup Guide: How to configure remote Turso Cloud */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'အခမဲ့ Turso Cloud Database ချိတ်ဆက်အသုံးပြုနည်း (Quick Guide)' : 'How to Connect Free Remote Turso Cloud Database'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'Turso တွင် Account ဖွင့်ပြီး URL နှင့် Token ကို Environment Variable ထဲ ထည့်သွင်းရုံဖြင့် Cloud စနစ်အပြည့်အဝ ရရှိနိုင်ပါသည်'
                  : 'Create a free database on Turso and supply the credentials in environment settings.'}
              </p>
            </div>
          </div>

          <button
            onClick={copyCliCommands}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedCli ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'CLI အမိန့်များ ကူးယူမည်' : 'Copy CLI Commands')}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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
      </div>

      {/* Turso Schema SQL DDL Preview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'Turso LibSQL Table တည်ဆောက်ရန် Schema (DDL)' : 'Turso LibSQL Schema (DDL)'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'ဤ Schema ကို Turso CLI Shell (turso db shell) သို့မဟုတ် DBeaver/TablePlus တွင်လည်း တိုက်ရိုက် run နိုင်ပါသည်'
                  : 'Ready-to-run SQLite/LibSQL DDL for tables, indexes and constraints.'}
              </p>
            </div>
          </div>

          <button
            id="btn-copy-turso-sql"
            onClick={copySql}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'SQL Copy ကူးမည်' : 'Copy Turso SQL')}</span>
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-72 text-emerald-200/90 font-mono text-[11px] leading-relaxed">
          <pre>{schemaSql || '-- Loading Turso LibSQL Schema...'}</pre>
        </div>
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
