import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Lock, 
  User as UserIcon, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Settings, 
  Copy, 
  Check, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Zap,
  Cloud,
  Layers,
  UploadCloud,
  Globe,
  Building2,
  MapPin
} from 'lucide-react';
import { useRemittance } from '../../lib/store';
import { User, UserRole } from '../../types';
import { SUPABASE_SCHEMA_SQL, SUPABASE_DISABLE_RLS_SQL, testSupabaseConnection } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { 
    db, 
    language, 
    setLanguage, 
    loginWithSupabase, 
    fetchSupabaseUsers, 
    seedUsersToSupabase,
    updateSupabaseConfig,
    loginWithTurso,
    fetchTursoUsers,
    fetchTursoBranches,
    seedUsersToTurso,
    syncAllLocalToTurso,
    isTursoConnected,
    tursoStats,
    checkTursoStatus
  } = useRemittance();

  // Database provider choice: 'TURSO' (Default) or 'SUPABASE'
  const [selectedProvider, setSelectedProvider] = useState<'TURSO' | 'SUPABASE'>('TURSO');

  const [usernameOrEmail, setUsernameOrEmail] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mandatory Branch and Country Selection for Logon
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>('MM');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('BR-001');

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    const branchesForCountry = (db?.branches || []).filter(b => b.countryCode === countryCode);
    if (branchesForCountry.length > 0) {
      setSelectedBranchId(branchesForCountry[0].id);
    }
  };

  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);
    const branch = db?.branches?.find(b => b.id === branchId);
    if (branch && branch.countryCode) {
      setSelectedCountryCode(branch.countryCode);
    }
  };

  // Auto-detect country and branch if user types username
  const handleUsernameChange = (val: string) => {
    setUsernameOrEmail(val);
    const trimmed = val.trim().toLowerCase();
    if (!trimmed) return;

    const allUsers = [...tursoUsers, ...supabaseUsers, ...(db?.users || [])];
    const matched = allUsers.find(u => u.username.toLowerCase() === trimmed || u.email?.toLowerCase() === trimmed);
    if (matched) {
      let country = matched.countryCode;
      let branchId = matched.branchId;
      const lowerU = matched.username.toLowerCase();
      const lowerF = (matched.fullName || '').toLowerCase();
      if (!country || country === 'MM') {
        if (lowerU.startsWith('th-') || lowerU.includes('thai')) country = 'TH';
        else if (lowerU.startsWith('sg-') || lowerU.includes('singapore')) country = 'SG';
      }
      if (!branchId || branchId === 'BR-001') {
        if (lowerU.startsWith('sg-maker1') || lowerU.startsWith('sg-checker1') || lowerU.startsWith('sg-admin1') || lowerF.includes('changi')) branchId = 'BR-010';
        else if (lowerU.startsWith('th-maker2') || lowerU.startsWith('th-checker2') || lowerF.includes('pathum')) branchId = 'BR-011';
        else if (country === 'TH' || lowerU.startsWith('th-')) branchId = 'BR-009';
        else if (country === 'SG' || lowerU.startsWith('sg-')) branchId = 'BR-008';
      }
      const b = db?.branches?.find(br => br.id === branchId);
      if (b?.countryCode) country = b.countryCode;
      if (country) setSelectedCountryCode(country);
      if (branchId) setSelectedBranchId(branchId);
    } else if (trimmed.startsWith('sg-maker1') || trimmed.startsWith('sg-checker1') || trimmed.startsWith('sg-admin1')) {
      setSelectedCountryCode('SG');
      const changiBranch = db?.branches?.find(b => b.id === 'BR-010' || b.nameEn?.toLowerCase().includes('changi'));
      if (changiBranch) setSelectedBranchId(changiBranch.id);
      else setSelectedBranchId('BR-010');
    } else if (trimmed.startsWith('th-maker2') || trimmed.startsWith('th-checker2')) {
      setSelectedCountryCode('TH');
      const pathumBranch = db?.branches?.find(b => b.id === 'BR-011' || b.nameEn?.toLowerCase().includes('pathum'));
      if (pathumBranch) setSelectedBranchId(pathumBranch.id);
      else setSelectedBranchId('BR-011');
    } else if (trimmed.startsWith('th-') || trimmed.includes('thai')) {
      setSelectedCountryCode('TH');
      const thBranch = db?.branches?.find(b => b.countryCode === 'TH');
      if (thBranch) setSelectedBranchId(thBranch.id);
    } else if (trimmed.startsWith('sg-') || trimmed.includes('singapore')) {
      setSelectedCountryCode('SG');
      const sgBranch = db?.branches?.find(b => b.countryCode === 'SG');
      if (sgBranch) setSelectedBranchId(sgBranch.id);
    }
  };

  // Turso state
  const [tursoUsers, setTursoUsers] = useState<User[]>([]);
  const [loadingTursoUsers, setLoadingTursoUsers] = useState(false);
  const [seedingTursoUsers, setSeedingTursoUsers] = useState(false);
  const [syncingTurso, setSyncingTurso] = useState(false);

  // Supabase quick info & helper drawers
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [supabaseUsers, setSupabaseUsers] = useState<User[]>([]);
  const [loadingSupabaseUsers, setLoadingSupabaseUsers] = useState(false);
  const [copiedSql, setCopiedSql] = useState<'ddl' | 'rls' | null>(null);
  const [seedingSupabaseUsers, setSeedingSupabaseUsers] = useState(false);

  // Connection settings state (Supabase)
  const [cfgUrl, setCfgUrl] = useState(db?.supabaseConfig?.url || '');
  const [cfgKey, setCfgKey] = useState(db?.supabaseConfig?.anonKey || '');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingConn, setTestingConn] = useState(false);

  // Load Turso users
  const loadTursoUsers = async () => {
    setLoadingTursoUsers(true);
    try {
      const res = await fetchTursoUsers();
      if (res.success && res.users && res.users.length > 0) {
        setTursoUsers(res.users);
      } else {
        // Fallback to local system users if remote table not seeded yet
        setTursoUsers(db?.users || []);
      }
    } catch {
      setTursoUsers(db?.users || []);
    } finally {
      setLoadingTursoUsers(false);
    }
  };

  // Load Supabase users
  const loadSupabaseUsers = async () => {
    if (!db?.supabaseConfig?.url || !db?.supabaseConfig?.anonKey) return;
    setLoadingSupabaseUsers(true);
    const res = await fetchSupabaseUsers();
    if (res.success && res.users) {
      setSupabaseUsers(res.users);
    }
    setLoadingSupabaseUsers(false);
  };

  useEffect(() => {
    loadTursoUsers();
    fetchTursoBranches();
    checkTursoStatus();
  }, []);

  useEffect(() => {
    if (selectedProvider === 'SUPABASE') {
      loadSupabaseUsers();
    }
  }, [selectedProvider, db?.supabaseConfig?.url, db?.supabaseConfig?.anonKey]);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    let effectiveCountry = selectedCountryCode;
    let effectiveBranch = selectedBranchId;
    const trimmedU = usernameOrEmail.trim().toLowerCase();
    const allUsers = [...tursoUsers, ...supabaseUsers, ...(db?.users || [])];
    const matchedUser = allUsers.find(u => u.username.toLowerCase() === trimmedU || u.email?.toLowerCase() === trimmedU);

    if (matchedUser) {
      const uname = matchedUser.username.toLowerCase();
      const fname = (matchedUser.fullName || '').toLowerCase();
      let uCountry = matchedUser.countryCode;
      if (!uCountry || uCountry === 'MM') {
        if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai')) uCountry = 'TH';
        else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore')) uCountry = 'SG';
      }
      let uBranch = matchedUser.branchId;
      if (!uBranch || uBranch === 'BR-001') {
        if (uname.startsWith('sg-maker1') || uname.startsWith('sg-checker1') || uname.startsWith('sg-admin1') || fname.includes('changi')) uBranch = 'BR-010';
        else if (uname.startsWith('th-maker2') || uname.startsWith('th-checker2') || fname.includes('pathum')) uBranch = 'BR-011';
        else if (uCountry === 'TH' || uname.startsWith('th-')) uBranch = 'BR-009';
        else if (uCountry === 'SG' || uname.startsWith('sg-')) uBranch = 'BR-008';
      }
      const b = db?.branches?.find(br => br.id === uBranch);
      if (b?.countryCode) uCountry = b.countryCode;

      if (uCountry && uCountry !== 'MM') {
        effectiveCountry = uCountry;
        setSelectedCountryCode(uCountry);
      }
      if (uBranch && uBranch !== 'BR-001') {
        effectiveBranch = uBranch;
        setSelectedBranchId(uBranch);
      }
    } else if (trimmedU.startsWith('sg-maker1') || trimmedU.startsWith('sg-checker1') || trimmedU.startsWith('sg-admin1')) {
      effectiveCountry = 'SG';
      setSelectedCountryCode('SG');
      effectiveBranch = 'BR-010';
      setSelectedBranchId('BR-010');
    } else if (trimmedU.startsWith('th-maker2') || trimmedU.startsWith('th-checker2')) {
      effectiveCountry = 'TH';
      setSelectedCountryCode('TH');
      effectiveBranch = 'BR-011';
      setSelectedBranchId('BR-011');
    } else if (trimmedU.startsWith('th-') && effectiveCountry === 'MM') {
      effectiveCountry = 'TH';
      setSelectedCountryCode('TH');
      const thBranch = db?.branches?.find(b => b.countryCode === 'TH');
      if (thBranch) {
        effectiveBranch = thBranch.id;
        setSelectedBranchId(thBranch.id);
      }
    } else if (trimmedU.startsWith('sg-') && effectiveCountry === 'MM') {
      effectiveCountry = 'SG';
      setSelectedCountryCode('SG');
      const sgBranch = db?.branches?.find(b => b.countryCode === 'SG');
      if (sgBranch) {
        effectiveBranch = sgBranch.id;
        setSelectedBranchId(sgBranch.id);
      }
    }

    if (selectedProvider === 'TURSO') {
      const result = await loginWithTurso(usernameOrEmail, password, effectiveBranch, effectiveCountry);
      setLoading(false);
      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        if (result.user?.countryCode) {
          setSelectedCountryCode(result.user.countryCode);
        }
        if (result.user?.branchId) {
          setSelectedBranchId(result.user.branchId);
        }
        setSuccessMessage(result.message);
      }
    } else {
      const result = await loginWithSupabase(usernameOrEmail, password, effectiveBranch, effectiveCountry);
      setLoading(false);
      if (!result.success) {
        setErrorMessage(result.message);
        if (result.needsConfig) {
          setShowConfigDrawer(true);
        }
      } else {
        if (result.user?.countryCode) {
          setSelectedCountryCode(result.user.countryCode);
        }
        if (result.user?.branchId) {
          setSelectedBranchId(result.user.branchId);
        }
        setSuccessMessage(result.message);
      }
    }
  };

  const handleQuickSelectUser = (u: User) => {
    setUsernameOrEmail(u.username);
    setPassword(u.password || 'password123');

    const uname = (u.username || '').toLowerCase();
    const fname = (u.fullName || '').toLowerCase();

    let country = u.countryCode;
    if (!country || country === 'MM') {
      if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai')) {
        country = 'TH';
      } else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore')) {
        country = 'SG';
      } else if (uname.startsWith('my-') || uname.includes('malaysia')) {
        country = 'MY';
      }
    }

    let branchId = u.branchId;
    if (!branchId || branchId === 'BR-001') {
      if (uname.startsWith('sg-maker1') || uname.startsWith('sg-checker1') || uname.startsWith('sg-admin1') || fname.includes('changi')) {
        branchId = 'BR-010';
      } else if (uname.startsWith('th-maker2') || uname.startsWith('th-checker2') || fname.includes('pathum')) {
        branchId = 'BR-011';
      } else if (country === 'TH' || uname.startsWith('th-')) {
        branchId = 'BR-009';
      } else if (country === 'SG' || uname.startsWith('sg-')) {
        branchId = 'BR-008';
      } else {
        branchId = 'BR-001';
      }
    }

    const branch = db?.branches?.find(b => b.id === branchId);
    if (branch?.countryCode) {
      country = branch.countryCode;
    }

    setSelectedCountryCode(country || 'MM');
    setSelectedBranchId(branchId || 'BR-001');
    setErrorMessage(null);
  };

  const handleCopy = (type: 'ddl' | 'rls') => {
    const text = type === 'ddl' ? SUPABASE_SCHEMA_SQL : SUPABASE_DISABLE_RLS_SQL;
    navigator.clipboard.writeText(text);
    setCopiedSql(type);
    setTimeout(() => setCopiedSql(null), 2500);
  };

  const handleTestAndSaveConfig = async () => {
    if (!cfgUrl.trim() || !cfgKey.trim()) {
      setTestResult({
        success: false,
        message: language === 'my' ? 'URL နှင့် Key ကို ပြည့်စုံစွာ ဖြည့်ပါ' : 'Please fill in both URL and Key'
      });
      return;
    }
    setTestingConn(true);
    const res = await testSupabaseConnection(cfgUrl.trim(), cfgKey.trim());
    setTestingConn(false);
    setTestResult(res);

    if (res.success) {
      updateSupabaseConfig({
        url: cfgUrl.trim(),
        anonKey: cfgKey.trim(),
        isConnected: true,
      });
      setTimeout(() => {
        loadSupabaseUsers();
      }, 500);
    }
  };

  const handleSeedTurso = async () => {
    setSeedingTursoUsers(true);
    const res = await seedUsersToTurso();
    setSeedingTursoUsers(false);
    if (res.success) {
      setSuccessMessage(res.message);
      loadTursoUsers();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSyncAllToTurso = async () => {
    setSyncingTurso(true);
    const res = await syncAllLocalToTurso();
    setSyncingTurso(false);
    if (res.success) {
      setSuccessMessage(res.message);
      checkTursoStatus();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleSeedSupabase = async () => {
    setSeedingSupabaseUsers(true);
    const res = await seedUsersToSupabase();
    setSeedingSupabaseUsers(false);
    if (res.success) {
      setSuccessMessage(res.message);
      loadSupabaseUsers();
    } else {
      setErrorMessage(res.message);
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'MAKER': return 'bg-[#D1F2EB] text-black border-[#85D4C3]';
      case 'CHECKER': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'AUDITOR': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#D1F2EB] text-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#A2D9CE] selection:text-black">
      {/* Top Bar: Brand, CBM Badge & Language Switcher */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#D1F2EB] text-black border border-[#85D4C3] flex items-center justify-center shadow-xs">
            <ArrowLeftRight className="w-5 h-5 text-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-900 font-bold text-base sm:text-lg tracking-tight">
                {language === 'my' ? 'ပြည်တွင်း ပြည်ပ ငွေလွှဲစနစ်' : 'Remittance Management Portal'}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D1F2EB] text-black border border-[#85D4C3]">
                Multi-DB Ready
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {language === 'my' ? 'မြန်မာနိုင်ငံတော်ဗဟိုဘဏ် စည်းမျဉ်းကိုက် လုံခြုံရေးစနစ်' : 'CBM-Regulated Multi-Currency Settlement Engine'}
            </p>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-xs">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              language === 'en' 
                ? 'bg-[#D1F2EB] text-black border border-[#85D4C3] shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('my')}
            className={`px-2.5 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
              language === 'my' 
                ? 'bg-[#D1F2EB] text-black border border-[#85D4C3] shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            မြန်မာ
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Login Card with Database Choice */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Database Provider Selection Tabs (Turso Default) */}
          <div className="bg-slate-50 p-2.5 border-b border-slate-200">
            <div className="text-[11px] font-semibold text-slate-600 mb-1.5 px-1 flex items-center justify-between">
              <span>{language === 'my' ? 'အသုံးပြုလိုသော Cloud Database ရွေးချယ်ပါ:' : 'Select Authentication Database:'}</span>
              <span className="text-[10px] text-emerald-700 font-mono font-bold">Turso: Default</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Turso Cloud Option (DEFAULT) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('TURSO');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                  selectedProvider === 'TURSO'
                    ? 'bg-[#D1F2EB] text-black border-[#85D4C3] shadow-sm font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${selectedProvider === 'TURSO' ? 'text-black' : 'text-slate-400'}`} />
                <span>Turso Cloud</span>
                <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                  selectedProvider === 'TURSO' ? 'bg-[#A2D9CE] text-slate-900 border border-[#85D4C3]' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  Default
                </span>
              </button>

              {/* Supabase Cloud Option */}
              <button
                type="button"
                onClick={() => {
                  setSelectedProvider('SUPABASE');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer border ${
                  selectedProvider === 'SUPABASE'
                    ? 'bg-[#D1F2EB] text-black border-[#85D4C3] shadow-sm font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Cloud className={`w-3.5 h-3.5 ${selectedProvider === 'SUPABASE' ? 'text-black' : 'text-slate-400'}`} />
                <span>Supabase</span>
                {db?.supabaseConfig?.isConnected && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            </div>
          </div>

          {/* Card Header */}
          <div className="bg-[#D1F2EB] border-b border-[#85D4C3] p-6 text-black relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-black" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {selectedProvider === 'TURSO' ? 'Turso Cloud Login' : 'Supabase Login'}
                </span>
              </div>
              
              {/* Provider Connection Status Pill */}
              {selectedProvider === 'TURSO' ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-[#A2D9CE] text-black border-[#85D4C3]">
                  <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                  <span>Turso Connected</span>
                </div>
              ) : (
                <div className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  db?.supabaseConfig?.isConnected 
                    ? 'bg-[#A2D9CE] text-black border-[#85D4C3]' 
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${db?.supabaseConfig?.isConnected ? 'bg-black animate-pulse' : 'bg-amber-500'}`} />
                  <span>{db?.supabaseConfig?.isConnected ? 'Supabase Connected' : 'DB Not Connected'}</span>
                </div>
              )}
            </div>

            <h2 className="text-2xl font-bold mt-2 text-black flex items-center gap-2">
              <Lock className="w-6 h-6 text-black" />
              <span>User Login</span>
            </h2>
            <p className="text-xs text-slate-700 mt-1">
              {selectedProvider === 'TURSO'
                ? (language === 'my' 
                    ? 'Turso Cloud database ရှိ "system_users" table မှ user အကောင့်ဖြင့် login ဝင်ပါ (Default)' 
                    : 'Sign in with Turso Cloud database verified system_users (Default)')
                : (language === 'my' 
                    ? 'Supabase database ရှိ "users" table မှ user အကောင့်ဖြင့် login ဝင်ပါ' 
                    : 'Sign in with verified Supabase users table')}
            </p>
          </div>

          {/* Form Area */}
          <div className="p-6 sm:p-7 space-y-5">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <div className="font-semibold">{errorMessage}</div>
                  {errorMessage.includes('RLS') && (
                    <button
                      type="button"
                      onClick={() => handleCopy('rls')}
                      className="inline-flex items-center space-x-1 text-[11px] font-bold text-black hover:underline pt-0.5"
                    >
                      <Copy className="w-3 h-3 text-black" />
                      <span>{language === 'my' ? 'RLS Disable Script ကူးယူမည်' : 'Copy Disable RLS SQL'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Mandatory Country & Branch Selection */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-700">
                    <Building2 className="w-4 h-4 text-black" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {language === 'my' ? 'နိုင်ငံ နှင့် ဘဏ်ခွဲ ရွေးချယ်မှု (Mandatory Context)' : 'Operating Country & Branch'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                    {language === 'my' ? 'မှန်ကန်စွာရွေးချယ်ပါ' : 'Strict Match'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Country Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center space-x-1">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'my' ? 'နိုင်ငံ (Country) *' : 'Country *'}</span>
                    </label>
                    <select
                      value={selectedCountryCode}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#85D4C3] focus:border-[#85D4C3] transition-colors"
                    >
                      {(db?.countries || []).map(c => (
                        <option key={c.code} value={c.code}>
                          {c.flagEmoji} {language === 'my' ? (c.nameMm || c.nameEn) : c.nameEn} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'my' ? 'ဘဏ်ခွဲ (Branch) *' : 'Branch *'}</span>
                    </label>
                    <select
                      value={selectedBranchId}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full text-xs font-medium bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#85D4C3] focus:border-[#85D4C3] transition-colors"
                    >
                      {(() => {
                        const filteredBranches = (db?.branches || []).filter(b => !selectedCountryCode || b.countryCode === selectedCountryCode);
                        const branchesToShow = filteredBranches.length > 0 ? filteredBranches : (db?.branches || []);
                        return branchesToShow.map(b => (
                          <option key={b.id} value={b.id}>
                            [{b.countryCode}] {language === 'my' ? (b.nameMm || b.nameEn) : b.nameEn} - {b.city}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 leading-tight">
                  {language === 'my' 
                    ? '⚠️ အသုံးပြုသူအကောင့်နှင့် ဤသတ်မှတ်ထားသော နိုင်ငံ/ဘဏ်ခွဲ ကိုက်ညီမှသာ စနစ်သို့ ဝင်ရောက်ခွင့်ရရှိပါမည်။' 
                    : '⚠️ Login requires strict match with your assigned operator Country and Branch.'}
                </div>
              </div>

              {/* Username or Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {language === 'my' ? 'အသုံးပြုသူ အမည် သို့မဟုတ် အီးမေးလ်' : 'Username or Email'}
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={usernameOrEmail}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder={language === 'my' ? 'ဥပမာ- admin သို့မဟုတ် th-maker' : 'e.g. admin or th-maker'}
                    className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#85D4C3] focus:border-[#85D4C3] text-slate-900 transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'my' ? 'လျှို့ဝှက်နံပါတ် (Password)' : 'Password / Security PIN'}
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Default: <span className="font-mono font-bold text-black">password123</span>
                  </span>
                </div>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#85D4C3] focus:border-[#85D4C3] text-slate-900 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#D1F2EB] hover:bg-[#BCE7DE] active:bg-[#A2D9CE] text-black border border-[#85D4C3] font-bold text-sm shadow-xs transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span className="text-black">
                      {selectedProvider === 'TURSO'
                        ? (language === 'my' ? 'Turso Cloud တွင် စစ်ဆေးနေပါသည်...' : 'Authenticating with Turso Cloud...')
                        : (language === 'my' ? 'Supabase Table တွင် စစ်ဆေးနေသည်...' : 'Authenticating with Supabase...')}
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-black" />
                    <span className="text-black">
                      {language === 'my' 
                        ? `User Login (ဝင်မည် - ${selectedProvider === 'TURSO' ? 'Turso Cloud' : 'Supabase'})` 
                        : `User Login (${selectedProvider === 'TURSO' ? 'Turso Cloud' : 'Supabase'})`}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Bottom Tools for Turso Provider */}
            {selectedProvider === 'TURSO' && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center space-x-2 text-slate-600">
                  <Zap className="w-3.5 h-3.5 text-black" />
                  <span className="font-mono text-[11px] truncate max-w-[220px]">
                    {tursoStats?.url || 'libsql://remittance-db-uthein.turso.io'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={syncingTurso}
                  onClick={handleSyncAllToTurso}
                  className="inline-flex items-center space-x-1 font-semibold text-black hover:text-slate-800 cursor-pointer"
                  title="Push all local transactions to Turso Cloud"
                >
                  <UploadCloud className={`w-3.5 h-3.5 text-black ${syncingTurso ? 'animate-bounce' : ''}`} />
                  <span className="text-black">{syncingTurso ? 'Syncing...' : (language === 'my' ? 'Cloud Sync လုပ်မည်' : 'Sync to Cloud')}</span>
                </button>
              </div>
            )}

            {/* Bottom Tools for Supabase Provider */}
            {selectedProvider === 'SUPABASE' && (
              <>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                    className="inline-flex items-center space-x-1.5 font-medium text-slate-600 hover:text-black transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{language === 'my' ? 'Supabase Database ချိတ်ဆက်မှု ပြင်ဆင်ရန်' : 'Configure Supabase Database'}</span>
                    {showConfigDrawer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy('ddl')}
                    className="inline-flex items-center space-x-1 font-medium text-slate-500 hover:text-slate-800"
                    title="Copy SQL Schema"
                  >
                    {copiedSql === 'ddl' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql === 'ddl' ? 'Copied!' : 'SQL DDL'}</span>
                  </button>
                </div>

                {/* Collapsible Supabase Connection Config */}
                {showConfigDrawer && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                        <Database className="w-3.5 h-3.5 text-black" />
                        <span>Supabase Project Connection</span>
                      </div>
                      <a
                        href="https://supabase.com/dashboard"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-black hover:underline flex items-center space-x-1"
                      >
                        <span>Supabase Dashboard</span>
                        <ExternalLink className="w-3 h-3 text-black" />
                      </a>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Project URL</label>
                        <input
                          type="text"
                          value={cfgUrl}
                          onChange={(e) => setCfgUrl(e.target.value)}
                          placeholder="https://xyzcompany.supabase.co"
                          className="w-full mt-0.5 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-[#85D4C3] text-slate-800 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600">Anon Public Key</label>
                        <input
                          type="password"
                          value={cfgKey}
                          onChange={(e) => setCfgKey(e.target.value)}
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          className="w-full mt-0.5 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-[#85D4C3] text-slate-800 font-mono"
                        />
                      </div>
                    </div>

                    {testResult && (
                      <div className={`p-2 rounded text-[11px] ${testResult.success ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {testResult.message}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        disabled={seedingSupabaseUsers}
                        onClick={handleSeedSupabase}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-[#D1F2EB] text-black hover:bg-[#BCE7DE] border border-[#85D4C3] transition-colors flex items-center space-x-1 cursor-pointer"
                        title="Upload standard users into Supabase users table"
                      >
                        {seedingSupabaseUsers ? <RefreshCw className="w-3 h-3 animate-spin text-black" /> : <Sparkles className="w-3 h-3 text-black" />}
                        <span className="text-black">{language === 'my' ? 'User များ ထည့်သွင်းမည် (Seed)' : 'Seed Users to Cloud'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={testingConn}
                        onClick={handleTestAndSaveConfig}
                        className="px-3 py-1 text-xs font-bold rounded bg-[#D1F2EB] hover:bg-[#BCE7DE] text-black border border-[#85D4C3] transition-colors flex items-center space-x-1 cursor-pointer"
                      >
                        {testingConn ? <RefreshCw className="w-3 h-3 animate-spin text-black" /> : <Check className="w-3 h-3 text-black" />}
                        <span className="text-black">{language === 'my' ? 'စမ်းသပ်ပြီး သိမ်းမည်' : 'Test & Save'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Database Users Directory & Fast Account Selection */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Quick Select User Accounts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-slate-900 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-black" />
                <h3 className="font-bold text-sm text-slate-900">
                  {selectedProvider === 'TURSO'
                    ? (language === 'my' ? 'Turso Cloud Table မှ User များ' : 'Users in Turso Cloud')
                    : (language === 'my' ? 'Supabase Table မှ User များ' : 'Users in Supabase Table')}
                </h3>
              </div>
              <button
                onClick={selectedProvider === 'TURSO' ? loadTursoUsers : loadSupabaseUsers}
                disabled={loadingTursoUsers || loadingSupabaseUsers}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                title="Refresh users list"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${(loadingTursoUsers || loadingSupabaseUsers) ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <p className="text-xs text-slate-600 mt-2.5 mb-3 leading-relaxed">
              {language === 'my'
                ? 'အောက်ပါအကောင့်များကို နှိပ်၍ အသုံးပြုသူအမည်နှင့် လျှို့ဝှက်နံပါတ်ကို အလိုအလျောက် ဖြည့်သွင်းနိုင်ပါသည်:'
                : 'Click any account below to autofill and verify authentication instantly:'}
            </p>

            {/* User List */}
            <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
              {((selectedProvider === 'TURSO' ? tursoUsers : supabaseUsers).length > 0 
                ? (selectedProvider === 'TURSO' ? tursoUsers : supabaseUsers) 
                : db.users
              ).map((u) => {
                const uname = (u.username || '').toLowerCase();
                const fname = (u.fullName || '').toLowerCase();
                let userCountryCode = u.countryCode;
                if (!userCountryCode || userCountryCode === 'MM') {
                  if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai')) userCountryCode = 'TH';
                  else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore')) userCountryCode = 'SG';
                  else if (uname.startsWith('my-') || uname.includes('malaysia')) userCountryCode = 'MY';
                }
                let uBranchId = u.branchId;
                if (!uBranchId || uBranchId === 'BR-001') {
                  if (userCountryCode === 'TH' || uname.startsWith('th-')) uBranchId = 'BR-009';
                  else if (userCountryCode === 'SG' || uname.startsWith('sg-')) uBranchId = 'BR-008';
                }
                const branch = db?.branches?.find(b => b.id === uBranchId);
                if (branch?.countryCode) userCountryCode = branch.countryCode;
                const country = db?.countries?.find(c => c.code === (userCountryCode || 'MM'));
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickSelectUser(u)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex items-center justify-between group cursor-pointer ${
                      usernameOrEmail === u.username
                        ? 'bg-[#D1F2EB] border-[#85D4C3] ring-1 ring-[#85D4C3]'
                        : 'bg-slate-50 border-slate-200 hover:bg-[#D1F2EB] hover:border-[#85D4C3]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-900 group-hover:text-black transition-colors truncate">
                          {u.fullName}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(u.role)}`}>
                          {u.role}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center space-x-1.5 truncate">
                        <span>@{u.username}</span>
                        <span>•</span>
                        <span className="text-amber-800 font-sans text-[10px] bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                          {country?.flagEmoji || '🌐'} {branch?.nameEn || u.branchId || 'BR-001'}
                        </span>
                      </div>
                    </div>

                    <div className="pl-2">
                      <span className="text-[10px] font-semibold text-black px-2 py-1 rounded bg-[#D1F2EB] border border-[#85D4C3]">
                        {language === 'my' ? 'ရွေးမည်' : 'Select'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Turso Cloud Helper Actions */}
            {selectedProvider === 'TURSO' && (
              <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={seedingTursoUsers}
                  onClick={handleSeedTurso}
                  className="px-2.5 py-1.5 rounded-lg bg-[#D1F2EB] hover:bg-[#BCE7DE] border border-[#85D4C3] text-black text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  {seedingTursoUsers ? <RefreshCw className="w-3 h-3 animate-spin text-black" /> : <Sparkles className="w-3 h-3 text-black" />}
                  <span className="text-black">{language === 'my' ? 'Turso သို့ User ထည့်မည်' : 'Seed Turso Users'}</span>
                </button>

                <button
                  type="button"
                  disabled={syncingTurso}
                  onClick={handleSyncAllToTurso}
                  className="px-2.5 py-1.5 rounded-lg bg-[#D1F2EB] hover:bg-[#BCE7DE] border border-[#85D4C3] text-black text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <UploadCloud className={`w-3.5 h-3.5 text-black ${syncingTurso ? 'animate-bounce' : ''}`} />
                  <span className="text-black">{language === 'my' ? 'Data အားလုံး Sync မည်' : 'Sync All Data'}</span>
                </button>
              </div>
            )}

            {/* Supabase Empty Seed Helper */}
            {selectedProvider === 'SUPABASE' && supabaseUsers.length === 0 && db.supabaseConfig.isConnected && (
              <div className="mt-3 p-3 rounded-lg bg-[#D1F2EB] border border-[#85D4C3] text-xs">
                <div className="text-black font-semibold mb-1">
                  {language === 'my' ? 'Supabase Table တွင် User မရှိသေးပါသလား?' : 'Empty Users Table on Supabase?'}
                </div>
                <p className="text-[11px] text-slate-700 mb-2">
                  {language === 'my'
                    ? 'စနစ်တွင်းရှိ မူလ User (၅) ဦးကို Supabase သို့ ချက်ချင်းထည့်သွင်းနိုင်ပါသည်'
                    : 'Upload 5 pre-configured operator roles (Admin, Maker, Checker, Auditor) to Supabase now.'}
                </p>
                <button
                  type="button"
                  disabled={seedingSupabaseUsers}
                  onClick={handleSeedSupabase}
                  className="w-full py-1.5 px-2.5 rounded bg-[#D1F2EB] hover:bg-[#BCE7DE] text-black border border-[#85D4C3] font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer shadow-xs"
                >
                  {seedingSupabaseUsers ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" /> : <Sparkles className="w-3.5 h-3.5 text-black" />}
                  <span className="text-black">{language === 'my' ? 'User စာရင်းကို Supabase သို့ ပို့မည်' : 'Upload Users to Supabase'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Database Info & Architecture Note */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2 shadow-sm">
            <div className="font-bold text-slate-900 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-black" />
              <span>
                {selectedProvider === 'TURSO' 
                  ? (language === 'my' ? 'Turso Cloud Architecture (Default)' : 'Turso LibSQL Cloud Architecture')
                  : (language === 'my' ? 'Supabase PostgreSQL Architecture' : 'Supabase PostgreSQL Architecture')}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600">
              {selectedProvider === 'TURSO' 
                ? (language === 'my'
                    ? 'Turso Cloud သည် Serverless LibSQL SQLite ဖြစ်ပြီး Local Storage နှင့် Realtime Cloud Synchronization ကို တစ်ပြိုင်တည်း ထောက်ပံ့ပေးပါသည်။ အင်တာနက်ပြတ်တောက်ချိန်တွင်လည်း Local တွင် သိမ်းဆည်းထားနိုင်ပြီး အင်တာနက်ရချိန်တွင် Auto-Sync ပြုလုပ်ပေးပါသည်။'
                    : 'Turso Cloud operates on distributed LibSQL with embedded resilience. Local outward and inward transactions sync directly to the cloud table remittance_transactions.')
                : (language === 'my'
                    ? 'Supabase တွင် Row-Level Security (RLS) ကြောင့် ဖတ်မရပါက "Copy RLS Script" နှိပ်၍ Supabase SQL Editor တွင် Run ပေးပါရန် လိုအပ်ပါသည်။'
                    : 'If Supabase blocks login with a permission error, Row Level Security is active. Run the RLS disable query in your Supabase SQL Editor.')}
            </p>
            {selectedProvider === 'SUPABASE' && (
              <div className="pt-1 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('rls')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer border border-slate-300"
                >
                  {copiedSql === 'rls' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql === 'rls' ? 'Copied!' : 'Copy RLS Script'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('ddl')}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center space-x-1 transition-colors cursor-pointer border border-slate-300"
                >
                  {copiedSql === 'ddl' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedSql === 'ddl' ? 'Copied!' : 'Copy Full DDL'}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
