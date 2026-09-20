import React, { useState, useEffect } from 'react';
import {
  Database,
  RefreshCw,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Copy,
  ExternalLink,
  Server,
  Globe,
  Key,
  Eye,
  EyeOff,
  Check,
  Unplug,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import {
  testSupabaseConnection,
  SUPABASE_SCHEMA_SQL,
  SUPABASE_DISABLE_RLS_SQL
} from '../../lib/supabase';

interface SupabaseSyncTabProps {
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

export const SupabaseSyncTab: React.FC<SupabaseSyncTabProps> = ({ onNotify }) => {
  const {
    db,
    language,
    updateSupabaseConfig,
    syncDataToSupabase,
    fetchDataFromSupabase
  } = useRemittance();

  const [supabaseUrl, setSupabaseUrl] = useState(db.supabaseConfig.url || '');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState(db.supabaseConfig.anonKey || '');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; isRlsBlocked?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  useEffect(() => {
    if (db.supabaseConfig.url && !supabaseUrl) {
      setSupabaseUrl(db.supabaseConfig.url);
    }
    if (db.supabaseConfig.anonKey && !supabaseAnonKey) {
      setSupabaseAnonKey(db.supabaseConfig.anonKey);
    }
  }, [db.supabaseConfig.url, db.supabaseConfig.anonKey]);

  // Test Supabase Connection
  const handleTestConnection = async () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setTestResult({
        success: false,
        message: language === 'my' 
          ? 'ကျေးဇူးပြု၍ Supabase URL နှင့် Anon Key နှစ်ခုစလုံးကို ထည့်သွင်းပါ' 
          : 'Please enter both Supabase URL and Anon API Key'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    const result = await testSupabaseConnection(supabaseUrl, supabaseAnonKey);
    setIsTesting(false);
    setTestResult(result);

    if (result.success) {
      updateSupabaseConfig({
        url: supabaseUrl.trim(),
        anonKey: supabaseAnonKey.trim(),
        isConnected: true,
      });
      if (onNotify) {
        onNotify('success', language === 'my' 
          ? 'Supabase Cloud Database သို့ အောင်မြင်စွာ ချိတ်ဆက်ပြီးပါပြီ!' 
          : 'Successfully connected to Supabase Cloud Database!');
      }
    } else {
      if (onNotify) onNotify('error', result.message);
    }
  };

  // Save Supabase Config
  const handleSaveConfig = () => {
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      if (onNotify) {
        onNotify('error', language === 'my' 
          ? 'Supabase URL နှင့် Anon Key ကို ထည့်သွင်းပေးပါ' 
          : 'Please enter both Supabase URL and Anon Key');
      }
      return;
    }

    updateSupabaseConfig({
      url: supabaseUrl.trim(),
      anonKey: supabaseAnonKey.trim(),
      isConnected: true,
    });

    if (onNotify) {
      onNotify('success', language === 'my'
        ? 'Supabase Database ချိတ်ဆက်မှု အချက်အလက်များ သိမ်းဆည်းပြီးပါပြီ'
        : 'Supabase Database credentials saved successfully');
    }
  };

  // Disconnect Supabase
  const handleDisconnect = () => {
    updateSupabaseConfig({
      url: '',
      anonKey: '',
      isConnected: false,
      syncStatus: 'IDLE',
    });
    setSupabaseUrl('');
    setSupabaseAnonKey('');
    setTestResult(null);
    if (onNotify) {
      onNotify('success', language === 'my' ? 'Supabase ချိတ်ဆက်မှုကို ဖြတ်တောက်လိုက်ပါပြီ' : 'Disconnected from Supabase');
    }
  };

  // Sync / Push Data to Supabase
  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    const result = await syncDataToSupabase();
    setIsSyncing(false);
    if (onNotify) {
      onNotify(result.success ? 'success' : 'error', result.message);
    }
  };

  // Pull Data from Supabase
  const handlePullSupabase = async () => {
    setIsPulling(true);
    const result = await fetchDataFromSupabase();
    setIsPulling(false);
    if (onNotify) {
      onNotify(result.success ? 'success' : 'error', result.message);
    }
  };

  // Copy Schema SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Copy RLS SQL
  const handleCopyRlsSql = () => {
    navigator.clipboard.writeText(SUPABASE_DISABLE_RLS_SQL);
    setCopiedRlsSql(true);
    setTimeout(() => setCopiedRlsSql(false), 2000);
    if (onNotify) {
      onNotify('success', language === 'my' ? 'RLS Disable SQL ကို Copy ကူးပြီးပါပြီ' : 'Copied RLS Disable SQL script');
    }
  };

  // All 11 entities defined in the schema and shown in user's Supabase screenshot
  const entities = [
    { name: 'branches', labelEn: 'Branches', labelMm: 'ဘဏ်ခွဲများ', count: db.branches.length },
    { name: 'users', labelEn: 'Users & Roles', labelMm: 'အသုံးပြုသူများ', count: db.users.length },
    { name: 'companies', labelEn: 'Partner Companies', labelMm: 'မိတ်ဖက်များ', count: db.companies.length },
    { name: 'currencies', labelEn: 'Currencies', labelMm: 'ငွေကြေးများ', count: db.currencies.length },
    { name: 'countries', labelEn: 'Countries', labelMm: 'နိုင်ငံများ', count: db.countries.length },
    { name: 'exchange_rates', labelEn: 'Exchange Rates', labelMm: 'လဲလှယ်နှုန်းများ', count: db.exchangeRates.length },
    { name: 'blacklist', labelEn: 'Compliance Blacklist', labelMm: 'နာမည်ပျက်စာရင်း', count: db.blacklist.length },
    { name: 'purposes', labelEn: 'Remittance Purposes', labelMm: 'ရည်ရွယ်ချက်များ', count: db.purposes.length },
    { name: 'customers', labelEn: 'Customers', labelMm: 'ဖောက်သည်များ', count: db.customers.length },
    { name: 'transactions', labelEn: 'Remittance Transactions', labelMm: 'ငွေလွှဲမှတ်တမ်း', count: db.transactions.length },
    { name: 'audit_logs', labelEn: 'Audit Logs', labelMm: 'စစ်ဆေးမှုမှတ်တမ်း', count: db.auditLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Table Status Banner: Confirms the 11 tables are already built! */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 shadow-sm">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{language === 'my' ? 'Table (၁၁) ခုစလုံး Supabase တွင် အောင်မြင်စွာ တည်ဆောက်ပြီးဖြစ်ပါသည်' : 'All 11 Tables Successfully Created in Supabase'}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                UNRESTRICTED
              </span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {language === 'my' 
                ? 'နောက်ထပ် Table အသစ်များ တည်ဆောက်ရန် မလိုတော့ပါခင်ဗျာ။ စနစ်တစ်ခုလုံးအတွက် လိုအပ်သော Table (၁၁) ခုစလုံး အပြည့်အစုံ ရှိနှင့်ပြီးဖြစ်ပါသည်။ ယခုအခါ အောက်ပါ "Push Data to Cloud" ခလုတ်ကို နှိပ်၍ စနစ်တွင်းရှိ အချက်အလက်များကို Supabase သို့ တိုက်ရိုက် ထည့်သွင်းသိမ်းဆည်းနိုင်ပါပြီ။'
                : 'No additional tables need to be created. All 11 required system tables are already in place and unrestricted. You can now use "Push Data to Cloud" below to populate and sync your application data into Supabase.'}
            </p>
          </div>
        </div>
      </div>

      {/* Top Status & Sync Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center font-black text-lg">
              ⚡
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">
                  Supabase PostgreSQL Cloud Sync
                </h3>
                {db.supabaseConfig.isConnected ? (
                  <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <span>Ready to Connect</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'my'
                  ? 'ငွေလွှဲဒေတာ၊ အသုံးပြုသူများနှင့် Audit Log များကို Supabase PostgreSQL Cloud နှင့် ထပ်တူပြုသိမ်းဆည်းခြင်း'
                  : 'Synchronize local remittance records, users, and audit trail with your Supabase PostgreSQL cloud database.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-supabase-push"
              type="button"
              onClick={handleSyncSupabase}
              disabled={isSyncing || !db.supabaseConfig.isConnected}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? (language === 'my' ? 'ပို့နေသည်...' : 'Pushing...') : (language === 'my' ? 'ဒေတာများ Supabase သို့ ပို့မည်' : 'Push Data to Cloud')}</span>
            </button>

            <button
              id="btn-supabase-pull"
              type="button"
              onClick={handlePullSupabase}
              disabled={isPulling || !db.supabaseConfig.isConnected}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs shadow-sm transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
              <span>{isPulling ? (language === 'my' ? 'ရယူနေသည်...' : 'Pulling...') : (language === 'my' ? 'Cloud မှ ဒေတာရယူမည်' : 'Pull Data from Cloud')}</span>
            </button>
          </div>
        </div>

        {/* 11 Tables Grid Status */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-teal-400" />
              <h4 className="text-xs font-bold text-slate-200">
                {language === 'my' ? 'တည်ဆောက်ပြီးသော Table (၁၁) ခု၏ ဒေတာအခြေအနေ' : '11 Replicated Database Entities & Local Records'}
              </h4>
            </div>
            <span className="text-[11px] font-mono text-teal-400 font-semibold">
              Public Schema (11 Tables Active)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 text-xs">
            {entities.map((item) => (
              <div key={item.name} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-teal-400 font-semibold text-[11px]">{item.name}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold text-[10px]">
                    {item.count}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] truncate">
                  {language === 'my' ? item.labelMm : item.labelEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supabase Connection Setup Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-teal-400" />
            <h4 className="text-sm font-bold text-white">
              {language === 'my' ? 'Supabase ချိတ်ဆက်မှု အချက်အလက်များ' : 'Supabase Project Credentials'}
            </h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Settings → API
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-teal-400" />
                <span>Supabase Project URL</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">https://*.supabase.co</span>
            </label>
            <input
              id="input-supabase-url"
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://your-project-id.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-teal-400" />
                <span>Project API Key (anon / public)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowAnonKey(!showAnonKey)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                {showAnonKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showAnonKey ? 'Hide' : 'Show'}</span>
              </button>
            </label>
            <div className="relative">
              <input
                id="input-supabase-anon-key"
                type={showAnonKey ? 'text' : 'password'}
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 text-xs font-mono focus:outline-none focus:border-teal-500 transition-colors pr-10"
              />
            </div>
          </div>
        </div>

        {testResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 transition-all ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1 flex-1">
              <div className="font-semibold">{testResult.message}</div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-supabase-test"
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !supabaseUrl || !supabaseAnonKey}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-teal-400 font-bold text-xs rounded-xl border border-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? (language === 'my' ? 'စမ်းသပ်နေသည်...' : 'Testing...') : (language === 'my' ? 'ချိတ်ဆက်မှု စမ်းသပ်မည်' : 'Test Connection')}</span>
            </button>

            <button
              id="btn-supabase-save"
              type="button"
              onClick={handleSaveConfig}
              disabled={!supabaseUrl || !supabaseAnonKey}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'ချိတ်ဆက်မှု သိမ်းဆည်းမည်' : 'Save Connection'}</span>
            </button>
          </div>

          {db.supabaseConfig.isConnected && (
            <button
              id="btn-supabase-disconnect"
              type="button"
              onClick={handleDisconnect}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Unplug className="w-3.5 h-3.5" />
              <span>{language === 'my' ? 'ဖြတ်တောက်မည်' : 'Disconnect'}</span>
            </button>
          )}
        </div>
      </div>

      {/* SQL Script Reference */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <Terminal className="w-5 h-5 text-teal-400" />
            <div>
              <h4 className="text-sm font-bold text-white">
                {language === 'my' ? 'SQL DDL Reference Script' : 'SQL DDL Reference Script (11 Tables)'}
              </h4>
              <p className="text-[11px] text-slate-400">
                {language === 'my'
                  ? 'အကယ်၍ အခြား Supabase Project တစ်ခုတွင် Table များ ထပ်မံတည်ဆောက်လိုပါက ဤ Script ကို အသုံးပြုနိုင်ပါသည်'
                  : 'Reference DDL script for duplicating the 11 tables in another environment.'}
              </p>
            </div>
          </div>

          <button
            id="btn-copy-full-sql"
            type="button"
            onClick={handleCopySql}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedSql ? (language === 'my' ? 'ကူးယူပြီး!' : 'Copied!') : (language === 'my' ? 'SQL Script Copy ကူးမည်' : 'Copy SQL Script')}</span>
          </button>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto max-h-56 text-slate-300 font-mono text-[11px] leading-relaxed">
          <pre>{SUPABASE_SCHEMA_SQL}</pre>
        </div>
      </div>
    </div>
  );
};
