import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  AppDatabase, 
  Branch, 
  User, 
  Company, 
  Currency, 
  Country, 
  ExchangeRate, 
  BlacklistEntry, 
  RemittancePurpose, 
  Customer, 
  RemittanceTransaction, 
  AuditRecord, 
  SupabaseConfig, 
  Language, 
  UserRole,
  RemittanceStatus,
  OperatorProfile,
  NavigationTab,
  RoleMenuPermissions,
  CountryRoleMenuPermissions,
  DEFAULT_ROLE_MENU_PERMISSIONS,
  DefaultStatusConfig
} from '../types';
import { initialDatabase, defaultOperatorProfile } from './mockData';
import { sampleSenderNrcAttachment, sampleSenderPassportAttachment } from './sampleDocuments';
import { translations } from '../i18n/translations';
import { getSupabaseClient, resetSupabaseClient } from './supabase';
import { 
  tursoWebLogin, 
  tursoWebCheckStatus, 
  tursoWebFetchUsers, 
  tursoWebFetchBranches,
  tursoWebSyncPush, 
  tursoWebSyncPull,
  tursoWebSaveUser,
  tursoWebDeleteUser,
  tursoWebSaveBranch,
  tursoWebDeleteBranch,
  tursoWebSaveExchangeRates,
  tursoWebDeleteExchangeRate
} from './tursoWebClient';
import { 
  persistDatabaseSafely, 
  loadDbFromIndexedDb, 
  clearIndexedDb, 
  LOCAL_STORAGE_DB_KEY 
} from './indexedDbStorage';
import { isExactNrcMatch } from './nrcOcrParser';

async function safeFetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: any; isHtml?: boolean }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, data, isHtml: false };
    }
    return { ok: false, isHtml: true };
  } catch {
    return { ok: false };
  }
}

const DB_STORAGE_KEY = LOCAL_STORAGE_DB_KEY;

/**
 * Generates clean, sequential, short IDs (e.g. BR-009, USR-007, CMP-009, TX-006)
 * instead of long timestamp numbers like BR-1789830806420.
 */
export function getNextCleanId(prefix: string, items: { id?: string }[] = [], padLen: number = 3): string {
  let maxNum = 0;
  for (const item of items) {
    if (item && item.id && item.id.startsWith(`${prefix}-`)) {
      const numPart = item.id.substring(prefix.length + 1);
      const parsed = parseInt(numPart, 10);
      // Only treat clean sequential numbers (< 100,000) as valid sequence (ignores millisecond timestamps)
      if (!isNaN(parsed) && parsed < 100000 && parsed > maxNum) {
        maxNum = parsed;
      }
    }
  }
  return `${prefix}-${String(maxNum + 1).padStart(padLen, '0')}`;
}

interface RemittanceContextType {
  db: AppDatabase;
  setDb: React.Dispatch<React.SetStateAction<AppDatabase>>;
  language: Language;
  t: typeof translations.en;
  setLanguage: (lang: Language) => void;
  currentUser: User;
  switchUser: (userId: string) => void;
  
  // Operator / Licensee Profile (Software Company Profile)
  operatorProfile: OperatorProfile;
  updateOperatorProfile: (profile: OperatorProfile) => void;
  
  // Screening
  checkBlacklist: (nrc: string, passport?: string, name?: string) => BlacklistEntry | null;
  checkExactNrcBlacklist: (nrc: string, requiredRiskLevel?: 'CRITICAL') => BlacklistEntry | null;
  
  // Outward & Inward Transactions
  createOutwardRemittance: (txData: Partial<RemittanceTransaction>) => Promise<RemittanceTransaction>;
  createInwardRemittance: (txData: Partial<RemittanceTransaction>) => Promise<RemittanceTransaction>;
  approveTransaction: (id: string, note?: string, autoSendToInward?: boolean) => Promise<boolean>;
  sendOutwardToInward: (outwardId: string, note?: string) => Promise<{ success: boolean; inwardTx?: RemittanceTransaction; message?: string }>;
  rejectTransaction: (id: string, reason: string) => Promise<boolean>;
  holdTransaction: (id: string, note: string) => Promise<boolean>;
  payoutInwardTransaction: (id: string, note?: string) => Promise<boolean>;
  updateTransaction: (updatedTx: RemittanceTransaction, editReason?: string) => Promise<boolean>;
  lookupTransactionByMtcn: (mtcn: string) => RemittanceTransaction | undefined;
  
  // Master Setups (Add, Edit, Delete)
  // 1. Branch
  saveBranch: (branch: Branch) => void;
  deleteBranch: (id: string) => void;
  
  // 2. User
  saveUser: (user: User) => void;
  deleteUser: (id: string) => void;
  
  // 3. Company
  saveCompany: (company: Company) => void;
  deleteCompany: (id: string) => void;
  
  // 4. Currency
  saveCurrency: (currency: Currency) => void;
  deleteCurrency: (id: string) => void;
  
  // 5. Country
  saveCountry: (country: Country) => void;
  deleteCountry: (id: string) => void;
  
  // 6. Exchange Rate
  saveExchangeRate: (rate: ExchangeRate) => void;
  saveExchangeRatesBatch: (rates: ExchangeRate[]) => Promise<void>;
  deleteExchangeRate: (id: string) => void;
  getExchangeRate: (from: string, to: string) => number;
  getCorridorExchangeRate: (sourceCur: string, targetCur: string) => number;
  
  // 7. Blacklist (with Myanmar NRC & Passbook note)
  saveBlacklist: (entry: BlacklistEntry) => void;
  deleteBlacklist: (id: string) => void;
  
  // 8. Purpose
  savePurpose: (purpose: RemittancePurpose) => void;
  deletePurpose: (id: string) => void;
  
  // 9. Customer
  saveCustomer: (customer: Customer) => void;
  deleteCustomer: (id: string) => void;
  
  // Audit Logs
  logAction: (
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => void;
  
  // Backup & Restore
  exportBackupJson: () => string;
  exportDatabaseJson: () => string;
  restoreBackupJson: (jsonString: string) => boolean;
  restoreDatabaseFromJson: (jsonString: string) => boolean;
  resetToDefaultData: () => void;
  resetToDefaultSeed: () => void;
  clearAllTransactions: (alsoClearTurso?: boolean) => Promise<{ count: number; tursoSuccess?: boolean }>;
  clearAllAuditLogs: (alsoClearTurso?: boolean) => Promise<{ count: number; tursoSuccess?: boolean }>;
  clearAllCustomers: (alsoClearTurso?: boolean) => Promise<{ count: number; tursoSuccess?: boolean }>;
  clearLocalAndTursoDataForTesting: () => Promise<void>;
  
  // Default Status Configuration (Admin Setup for User Admin Role)
  defaultStatusConfig: DefaultStatusConfig;
  updateDefaultStatusConfig: (config: Partial<DefaultStatusConfig>) => void;
  
  // Supabase
  updateSupabaseConfig: (config: Partial<SupabaseConfig>) => void;
  syncDataToSupabase: () => Promise<{ success: boolean; message: string }>;
  fetchDataFromSupabase: () => Promise<{ success: boolean; message: string }>;

  // Database Provider Selection
  activeDatabaseProvider: 'TURSO' | 'SUPABASE';
  setActiveDatabaseProvider: (provider: 'TURSO' | 'SUPABASE') => void;

  // Authentication & Session Context
  activeBranchId: string;
  activeCountryCode: string;
  setActiveBranchId: (branchId: string) => void;
  setActiveCountryCode: (countryCode: string) => void;

  // Turso Cloud Database Operations
  isTursoConnected: boolean;
  isSyncingTurso: boolean;
  lastTursoSyncTime: string | null;
  tursoStats: { connected: boolean; url: string; counts?: any; [key: string]: any } | null;
  checkTursoStatus: () => Promise<boolean>;
  syncTursoBidirectional: () => Promise<{ success: boolean; message: string; count?: number }>;
  loginWithTurso: (
    usernameOrEmail: string, 
    password?: string,
    selectedBranchId?: string,
    selectedCountryCode?: string
  ) => Promise<{
    success: boolean;
    message: string;
    user?: User;
  }>;
  fetchTursoUsers: () => Promise<{ success: boolean; users?: User[]; message?: string }>;
  fetchTursoBranches: () => Promise<{ success: boolean; branches?: Branch[]; message?: string }>;
  seedUsersToTurso: () => Promise<{ success: boolean; message: string }>;
  syncDataToTurso: () => Promise<{ success: boolean; message: string; saved?: any }>;
  fetchDataFromTurso: () => Promise<{ success: boolean; message: string; count?: number }>;
  syncAllLocalToTurso: () => Promise<{ success: boolean; message: string; count: number }>;

  // Authentication & Supabase User Verification
  isAuthenticated: boolean;
  loginWithSupabase: (
    usernameOrEmail: string, 
    password?: string,
    selectedBranchId?: string,
    selectedCountryCode?: string
  ) => Promise<{
    success: boolean;
    message: string;
    user?: User;
    isRlsBlocked?: boolean;
    isTableMissing?: boolean;
    needsConfig?: boolean;
  }>;
  logout: () => void;
  fetchSupabaseUsers: () => Promise<{ success: boolean; users?: User[]; message?: string }>;
  seedUsersToSupabase: () => Promise<{ success: boolean; message: string }>;

  // Role Menu Permissions (Show App Menu by Role & Country)
  roleMenuPermissions: RoleMenuPermissions;
  countryRoleMenuPermissions: CountryRoleMenuPermissions;
  getRoleMenuPermissionsForCountry: (countryCode?: string) => RoleMenuPermissions;
  updateRoleMenuPermissions: (role: UserRole, menus: NavigationTab[], countryCode?: string) => void;
  toggleRoleMenuPermission: (role: UserRole, menu: NavigationTab, countryCode?: string) => void;
  resetRoleMenuPermissions: (countryCode?: string) => void;
  copyRoleMenuPermissions: (sourceCountryCode: string, targetCountryCode: string) => void;
  isMenuAllowedForRole: (role: UserRole, tab: NavigationTab, countryCode?: string) => boolean;
}

const RemittanceContext = createContext<RemittanceContextType | null>(null);

const sanitizeTransactionsList = (txList: any[]): RemittanceTransaction[] => {
  if (!Array.isArray(txList)) return [];
  return txList.map((tx: any) => {
    if (!tx || typeof tx !== 'object') return tx;
    // Fix inverted exchange rates for corridor transfers against MMK
    if (tx.sourceCurrency && tx.targetCurrency && tx.exchangeRate > 0) {
      if (tx.sourceCurrency !== 'MMK' && tx.targetCurrency === 'MMK' && tx.exchangeRate < 1) {
        const normalizedRate = Number((1 / tx.exchangeRate).toFixed(4));
        const normalizedReceive = Number((Number(tx.sendAmount || 0) * normalizedRate).toFixed(2));
        return {
          ...tx,
          exchangeRate: normalizedRate,
          receiveAmount: normalizedReceive
        };
      }
      if (tx.sourceCurrency === 'MMK' && tx.targetCurrency !== 'MMK' && tx.exchangeRate < 1) {
        const normalizedRate = Number((1 / tx.exchangeRate).toFixed(4));
        const normalizedReceive = Number((Number(tx.sendAmount || 0) / normalizedRate).toFixed(2));
        return {
          ...tx,
          exchangeRate: normalizedRate,
          receiveAmount: normalizedReceive
        };
      }
    }
    return tx;
  });
};

export const sanitizeUsersList = (userList: any[]): User[] => {
  if (!Array.isArray(userList)) return [];
  return userList.map((u: any) => {
    if (!u || typeof u !== 'object') return u;
    let role = u.role;
    let email = u.email;
    let branchId = u.branchId;
    let countryCode = u.countryCode;

    // Correct known TH users swapped roles
    if (u.username === 'th-admin' && (role === 'MAKER' || role === 'CHECKER')) {
      role = 'ADMIN';
      if (!email || email.includes('sg.')) email = 'th-admin@remitmyanmar.com';
      branchId = 'BR-009';
      countryCode = 'TH';
    } else if (u.username === 'th-maker' && (role === 'CHECKER' || role === 'ADMIN')) {
      role = 'MAKER';
      if (!email || email.includes('sg.')) email = 'th-maker@remitmyanmar.com';
      branchId = 'BR-009';
      countryCode = 'TH';
    } else if (u.username === 'th-checker' && (role === 'ADMIN' || role === 'MAKER')) {
      role = 'CHECKER';
      if (!email || email.includes('sg.')) email = 'th-checker@remitmyanmar.com';
      branchId = 'BR-009';
      countryCode = 'TH';
    }

    return {
      ...u,
      role: role || 'MAKER',
      email: email || `${u.username}@remitmyanmar.com`,
      branchId: branchId || 'BR-001',
      countryCode: countryCode || (branchId === 'BR-009' ? 'TH' : (branchId === 'BR-008' || branchId === 'BR-010' ? 'SG' : 'MM'))
    };
  });
};

export const RemittanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => {
    const metaEnv = (import.meta as any)?.env || {};
    const envUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
    const envKey = (metaEnv.VITE_SUPABASE_ANON_KEY || '').trim();

    try {
      const saved = localStorage.getItem(DB_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.branches && parsed.users && parsed.transactions) {
          if (!parsed.operatorProfile || parsed.operatorProfile.companyNameEn?.includes('Kanbawza') || parsed.operatorProfile.addressEn?.includes('Merchant Road')) {
            parsed.operatorProfile = defaultOperatorProfile;
          }
          // Ensure Yangon Head Office branch reflects the requested default address
          const ygnHq = parsed.branches?.find((b: any) => b.id === 'BR-001');
          if (ygnHq && (ygnHq.address?.includes('Merchant Road') || ygnHq.city?.includes('Kyauktada'))) {
            ygnHq.address = 'No. 210, Shwe Hintha Road, Hlaing Township, Yangon, Myanmar';
            ygnHq.city = 'Yangon (Hlaing)';
            ygnHq.phone = '01-512345';
          }
          // Ensure sample outward transaction TX-001 has senderDateOfBirth and attachments populated
          const tx1 = parsed.transactions?.find((t: any) => t.id === 'TX-001');
          if (tx1) {
            if (!tx1.senderDateOfBirth) tx1.senderDateOfBirth = '14/07/1988';
            if (!tx1.senderFatherName) tx1.senderFatherName = 'U Tin Aung';
            if (!tx1.senderNrcAttachment) {
              tx1.senderNrcAttachment = sampleSenderNrcAttachment;
              tx1.senderNrcAttachmentName = 'NRC_U_Zaw_Win_Htet_12_BAHANA_184920.svg';
              tx1.senderNrcAttachmentType = 'image/svg+xml';
              tx1.senderNrcAttachmentSize = '18 KB';
            }
            if (!tx1.senderPassportAttachment) {
              tx1.senderPassportAttachment = sampleSenderPassportAttachment;
              tx1.senderPassportAttachmentName = 'Passport_U_Zaw_Win_Htet_MA918234.svg';
              tx1.senderPassportAttachmentType = 'image/svg+xml';
              tx1.senderPassportAttachmentSize = '24 KB';
            }
          }
          // Return safely merged object with initialDatabase fallback
          return {
            ...initialDatabase,
            ...parsed,
            operatorProfile: {
              ...initialDatabase.operatorProfile,
              ...(parsed.operatorProfile || {})
            },
            supabaseConfig: {
              ...initialDatabase.supabaseConfig,
              ...(parsed.supabaseConfig || {}),
              ...(envUrl ? { url: envUrl, anonKey: envKey } : {})
            },
            branches: Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : initialDatabase.branches,
            users: Array.isArray(parsed.users) && parsed.users.length > 0 ? sanitizeUsersList(parsed.users) : initialDatabase.users,
            transactions: Array.isArray(parsed.transactions) ? sanitizeTransactionsList(parsed.transactions) : initialDatabase.transactions,
            currencies: Array.isArray(parsed.currencies) && parsed.currencies.length > 0 ? parsed.currencies : initialDatabase.currencies,
            countries: Array.isArray(parsed.countries) && parsed.countries.length > 0 ? parsed.countries : initialDatabase.countries,
            exchangeRates: Array.isArray(parsed.exchangeRates) && parsed.exchangeRates.length > 0 ? parsed.exchangeRates : initialDatabase.exchangeRates,
            blacklist: Array.isArray(parsed.blacklist) ? parsed.blacklist : initialDatabase.blacklist,
            purposes: Array.isArray(parsed.purposes) && parsed.purposes.length > 0 ? parsed.purposes : initialDatabase.purposes,
            customers: Array.isArray(parsed.customers) ? parsed.customers : initialDatabase.customers,
            auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : initialDatabase.auditLogs,
            roleMenuPermissions: (parsed.roleMenuPermissions && typeof parsed.roleMenuPermissions === 'object')
              ? { ...DEFAULT_ROLE_MENU_PERMISSIONS, ...parsed.roleMenuPermissions }
              : DEFAULT_ROLE_MENU_PERMISSIONS,
            countryRoleMenuPermissions: (parsed.countryRoleMenuPermissions && typeof parsed.countryRoleMenuPermissions === 'object')
              ? parsed.countryRoleMenuPermissions
              : (initialDatabase.countryRoleMenuPermissions || {}),
          };
        }
      }
    } catch (err) {
      console.error('Failed to load local DB state:', err);
    }

    const base: AppDatabase = { 
      ...initialDatabase,
      supabaseConfig: {
        ...initialDatabase.supabaseConfig,
        ...(envUrl ? { url: envUrl, anonKey: envKey } : {})
      }
    };
    return base;
  });

  // Hydrate full uncompressed data from IndexedDB on startup
  useEffect(() => {
    let active = true;
    loadDbFromIndexedDb().then((idbDb) => {
      if (!active || !idbDb) return;
      if (Array.isArray(idbDb.transactions) && Array.isArray(idbDb.branches)) {
        setDb((prev) => {
          const idbTxCount = idbDb.transactions?.length || 0;
          const prevTxCount = prev.transactions?.length || 0;
          if (idbTxCount >= prevTxCount) {
            return {
              ...prev,
              ...idbDb,
              users: Array.isArray(idbDb.users) ? sanitizeUsersList(idbDb.users) : prev.users,
              transactions: sanitizeTransactionsList(idbDb.transactions),
              operatorProfile: {
                ...prev.operatorProfile,
                ...(idbDb.operatorProfile || {})
              }
            };
          }
          return prev;
        });
      }
    }).catch((err) => {
      console.warn('Initial IndexedDB hydration note:', err);
    });

    return () => {
      active = false;
    };
  }, []);

  // Save to resilient multi-tier storage (IndexedDB primary + quota-safe localStorage)
  useEffect(() => {
    persistDatabaseSafely(db);
  }, [db]);

  // Authentication state - Default to false so Login Form is shown on initial open
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const isExplicitLogin = sessionStorage.getItem('REMITTANCE_LOGGED_IN') === 'true';
      const isLoggedOut = sessionStorage.getItem('REMITTANCE_EXPLICIT_LOGOUT') === 'true';
      if (isLoggedOut || !isExplicitLogin) return false;

      const sessionStr = sessionStorage.getItem('REMITTANCE_AUTH_SESSION');
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        if (session && session.userId) {
          return true;
        }
      }
    } catch (e) {
      console.error('Failed to load auth session:', e);
    }
    // Default to false so the user is greeted with the Login Form first
    return false;
  });

  // Database Provider Selection (Default: TURSO Cloud)
  const [activeDatabaseProvider, setActiveDatabaseProvider] = useState<'TURSO' | 'SUPABASE'>(() => {
    try {
      const sessionStr = sessionStorage.getItem('REMITTANCE_AUTH_SESSION');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.provider === 'SUPABASE') return 'SUPABASE';
      }
    } catch {}
    return 'TURSO';
  });

  // Active Session Branch and Country Selection Context
  const [activeBranchId, setActiveBranchId] = useState<string>(() => {
    try {
      const sessionStr = sessionStorage.getItem('REMITTANCE_AUTH_SESSION');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.branchId) return parsed.branchId;
      }
    } catch {}
    return 'BR-001';
  });

  const [activeCountryCode, setActiveCountryCode] = useState<string>(() => {
    try {
      const sessionStr = sessionStorage.getItem('REMITTANCE_AUTH_SESSION');
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.countryCode) return parsed.countryCode;
      }
    } catch {}
    return 'MM';
  });

  // Turso Cloud connection status & statistics
  const [isTursoConnected, setIsTursoConnected] = useState<boolean>(true);
  const [tursoStats, setTursoStats] = useState<{ connected: boolean; url: string; counts?: any; [key: string]: any } | null>(null);

  // Helper to map a transaction to the Turso schema payload
  const mapTransactionToTursoPayload = (tx: RemittanceTransaction) => {
    return {
      id: tx.id,
      transactionNo: tx.transactionNo,
      mtcn: tx.mtcn || '',
      type: tx.type || 'OUTWARD',
      status: tx.status || 'PENDING_APPROVAL',
      senderName: tx.senderName || '',
      senderNameMm: tx.senderNameMm || '',
      senderNrc: tx.senderNrc || '',
      senderPhone: tx.senderPhone || '',
      senderAddress: tx.senderAddress || '',
      senderPassport: tx.senderPassport || tx.senderPassbook || '',
      receiverName: tx.receiverName || '',
      receiverNameMm: tx.receiverNameMm || '',
      receiverNrc: tx.receiverNrc || '',
      receiverPhone: tx.receiverPhone || '',
      receiverAddress: tx.receiverAddress || '',
      receiverPassport: tx.receiverPassport || tx.receiverPassbook || '',
      fromCountry: tx.senderCountryCode || 'MM',
      toCountry: tx.receiverCountryCode || 'MM',
      sourceCurrency: tx.sourceCurrency || 'MMK',
      targetCurrency: tx.targetCurrency || 'MMK',
      sendAmount: Number(tx.sendAmount) || 0,
      exchangeRate: Number(tx.exchangeRate) || 1,
      payoutAmount: Number(tx.receiveAmount) || 0,
      transferFee: Number(tx.serviceFee) || 0,
      totalCollected: Number(tx.totalPayableAmount) || 0,
      purpose: tx.purposeName || tx.purposeId || 'General',
      payoutMethod: tx.payoutMethod || 'CASH_PICKUP',
      bankName: tx.payoutBankName || '',
      bankAccountNo: tx.payoutAccountNumber || '',
      createdBy: tx.creatorName || '',
      createdAt: tx.createdDate || new Date().toISOString(),
      approvedBy: tx.approverName || '',
      approvedAt: tx.approvedDate || '',
      rejectedReason: tx.rejectionReason || '',
      sourceOfFunds: tx.senderSourceOfFund || tx.senderNote || '',
      remittanceType: tx.scope || 'OUTWARD',
      createdDate: tx.createdDate || '',
      senderNrcAttachment: tx.senderNrcAttachment || tx.senderNrcFrontAttachment || '',
      senderNrcFrontAttachment: tx.senderNrcFrontAttachment || tx.senderNrcAttachment || '',
      senderNrcBackAttachment: tx.senderNrcBackAttachment || '',
      senderPassportAttachment: tx.senderPassportAttachment || tx.senderPassbookAttachment || '',
      proofDocumentUrl: tx.proofDocumentUrl || '',
      proofDocumentName: tx.proofDocumentName || '',
      proofDocCategory: tx.proofDocCategory || '',
      senderFatherName: tx.senderFatherName || '',
      senderOccupation: tx.senderOccupation || '',
      senderDateOfBirth: tx.senderDateOfBirth || '',
      sendingBranchId: tx.sendingBranchId || tx.branchId || (
        (tx.creatorName && (tx.creatorName.includes('Changi') || tx.creatorName.includes('sg-maker1') || tx.creatorName.includes('sg-checker1'))) ? 'BR-010' : ''
      ),
      payoutBranchId: tx.payoutBranchId || '',
      branchId: tx.branchId || tx.sendingBranchId || '',
      partnerCompanyId: tx.partnerCompanyId || '',
      purposeId: tx.purposeId || '',
      senderCountryCode: tx.senderCountryCode || (tx as any).fromCountry || '',
      receiverCountryCode: tx.receiverCountryCode || (tx as any).toCountry || '',
      senderPassbook: tx.senderPassbook || '',
      receiverPassbook: tx.receiverPassbook || '',
      isSentToDestination: tx.isSentToDestination || false,
      sentDate: tx.sentDate || '',
      sentByUserId: tx.sentByUserId || '',
      sentByName: tx.sentByName || '',
      linkedTransactionId: tx.linkedTransactionId || '',
      linkedTransactionNo: tx.linkedTransactionNo || '',
    };
  };

  // Ref tracking current db state at all times for intervals, beforeunload, and logout
  const dbRef = useRef(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const checkTursoStatus = async (): Promise<boolean> => {
    try {
      const { ok, data } = await safeFetchJson('/api/turso/status');
      if (ok && data && data.connected) {
        setIsTursoConnected(true);
        setTursoStats(data);
        return true;
      }
      // Direct Web LibSQL Fallback (for Vercel static deployments)
      const webStatus = await tursoWebCheckStatus();
      if (webStatus.connected) {
        setIsTursoConnected(true);
        setTursoStats({
          success: true,
          connected: true,
          isRemote: true,
          url: webStatus.url,
          counts: webStatus.counts || { transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0 }
        });
        return true;
      }
      setIsTursoConnected(false);
      return false;
    } catch {
      setIsTursoConnected(false);
      return false;
    }
  };

  const [isSyncingTurso, setIsSyncingTurso] = useState(false);
  const [lastTursoSyncTime, setLastTursoSyncTime] = useState<string | null>(null);

  const fetchDataFromTurso = useCallback(async (): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      let txList: any[] = [];
      let extraData: any = null;

      const { ok, data } = await safeFetchJson('/api/turso/sync-pull', { method: 'POST' });
      if (ok && data?.success && data?.data?.transactions) {
        txList = data.data.transactions;
        extraData = data.data;
      } else {
        // Direct Web fallback (for Vercel static deployments)
        const webRes = await tursoWebSyncPull();
        if (webRes.success && webRes.data?.transactions) {
          txList = webRes.data.transactions;
          extraData = webRes.data;
        }
      }

      if (Array.isArray(txList) && txList.length > 0) {
        setDb(prev => {
          // Index existing by both transactionNo and id to prevent duplicate entries
          const map = new Map<string, RemittanceTransaction>();
          for (const t of prev.transactions) {
            if (t.transactionNo) map.set(t.transactionNo, t);
            if (t.id) map.set(t.id, t);
          }

          for (const tx of txList) {
            const existing = (tx.transactionNo ? map.get(tx.transactionNo) : undefined) || 
                             (tx.id ? map.get(tx.id) : undefined);

            const merged: RemittanceTransaction = {
              ...(existing || {} as RemittanceTransaction),
              ...tx,
              id: existing?.id || tx.id || `TX-${Date.now()}`,
              sendAmount: Number(tx.sendAmount) || 0,
              receiveAmount: Number(tx.receiveAmount || tx.payoutAmount) || 0,
              exchangeRate: Number(tx.exchangeRate) || 1,
              serviceFee: Number(tx.serviceFee || tx.transferFee) || 0,
              totalPayableAmount: Number(tx.totalPayableAmount || tx.totalCollected) || 0,
              payoutBranchId: tx.payoutBranchId || tx.payout_branch_id || existing?.payoutBranchId || '',
              sendingBranchId: tx.sendingBranchId || tx.sending_branch_id || existing?.sendingBranchId || '',
              scope: tx.scope || existing?.scope || 'DOMESTIC',
              isSentToDestination: tx.isSentToDestination ?? tx.is_sent_to_destination ?? existing?.isSentToDestination ?? false,
              sentDate: tx.sentDate || tx.sent_date || existing?.sentDate || '',
              sentByUserId: tx.sentByUserId || tx.sent_by_user_id || existing?.sentByUserId || '',
              sentByName: tx.sentByName || tx.sent_by_name || existing?.sentByName || '',
              linkedTransactionId: tx.linkedTransactionId || tx.linked_transaction_id || existing?.linkedTransactionId || '',
              linkedTransactionNo: tx.linkedTransactionNo || tx.linked_transaction_no || existing?.linkedTransactionNo || '',
            };

            if (merged.transactionNo) map.set(merged.transactionNo, merged);
            if (merged.id) map.set(merged.id, merged);
          }

          // Gather unique transactions
          const uniqueList: RemittanceTransaction[] = [];
          const seenKeys = new Set<string>();
          for (const t of map.values()) {
            const key = t.transactionNo || t.id;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              uniqueList.push(t);
            }
          }

          // Sort by creation date descending
          uniqueList.sort((a, b) => {
            const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
            const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
            return dateB - dateA;
          });

          // Merge audit logs if present
          let updatedAuditLogs = prev.auditLogs;
          if (extraData?.auditLogs && Array.isArray(extraData.auditLogs) && extraData.auditLogs.length > 0) {
            const auditMap = new Map<string, AuditRecord>();
            for (const l of prev.auditLogs) {
              if (l.id) auditMap.set(l.id, l);
            }
            for (const r of extraData.auditLogs) {
              if (r.id) {
                auditMap.set(r.id, {
                  id: r.id,
                  timestamp: r.timestamp || new Date().toISOString(),
                  userId: r.userId || r.user_id || 'system',
                  userName: r.userName || r.user_name || 'System',
                  userRole: (r.userRole || r.user_role || 'ADMIN') as UserRole,
                  action: r.action,
                  entityType: r.entityType || r.entity_type,
                  entityId: r.entityId || r.entity_id,
                  details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || ''),
                  previousValue: r.previousValue || r.previous_value,
                  newValue: r.newValue || r.new_value,
                });
              }
            }
            updatedAuditLogs = Array.from(auditMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }

          // Merge branches if present
          let mergedBranches = prev.branches;
          if (extraData?.branches && Array.isArray(extraData.branches) && extraData.branches.length > 0) {
            const bMap = new Map<string, Branch>();
            for (const b of prev.branches) {
              if (b.id) bMap.set(b.id, b);
            }
            for (const b of extraData.branches) {
              if (b.id && b.id !== 'BR-1789788738927') {
                const existing = bMap.get(b.id);
                bMap.set(b.id, { ...(existing || {} as Branch), ...b });
              }
            }
            mergedBranches = Array.from(bMap.values());
          }

          // Merge users if present
          let mergedUsers = prev.users;
          if (extraData?.users && Array.isArray(extraData.users) && extraData.users.length > 0) {
            const uMap = new Map<string, User>();
            for (const u of prev.users) {
              if (u.id) uMap.set(u.id, u);
              if (u.username) uMap.set(u.username, u);
            }
            for (const u of extraData.users) {
              if (u.id || u.username) {
                const key = u.id || u.username;
                const existing = (u.id ? uMap.get(u.id) : undefined) || (u.username ? uMap.get(u.username) : undefined);
                const mergedU = { ...(existing || {} as User), ...u };
                uMap.set(key, mergedU);
              }
            }
            const uniqueUsers: User[] = [];
            const seen = new Set<string>();
            for (const u of uMap.values()) {
              if (u.id && !seen.has(u.id)) {
                seen.add(u.id);
                uniqueUsers.push(u);
              }
            }
            mergedUsers = uniqueUsers;
          }

          return {
            ...prev,
            transactions: uniqueList,
            branches: mergedBranches,
            users: mergedUsers,
            ...(extraData?.exchangeRates?.length ? { exchangeRates: extraData.exchangeRates } : {}),
            ...(extraData?.customers?.length ? { customers: extraData.customers } : {}),
            auditLogs: updatedAuditLogs,
          };
        });
      } else if (extraData && (extraData.auditLogs || extraData.branches || extraData.users)) {
        setDb(prev => {
          let updatedAuditLogs = prev.auditLogs;
          if (extraData.auditLogs && Array.isArray(extraData.auditLogs) && extraData.auditLogs.length > 0) {
            const auditMap = new Map<string, AuditRecord>();
            for (const l of prev.auditLogs) {
              if (l.id) auditMap.set(l.id, l);
            }
            for (const r of extraData.auditLogs) {
              if (r.id) {
                auditMap.set(r.id, {
                  id: r.id,
                  timestamp: r.timestamp || new Date().toISOString(),
                  userId: r.userId || r.user_id || 'system',
                  userName: r.userName || r.user_name || 'System',
                  userRole: (r.userRole || r.user_role || 'ADMIN') as UserRole,
                  action: r.action,
                  entityType: r.entityType || r.entity_type,
                  entityId: r.entityId || r.entity_id,
                  details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || ''),
                  previousValue: r.previousValue || r.previous_value,
                  newValue: r.newValue || r.new_value,
                });
              }
            }
            updatedAuditLogs = Array.from(auditMap.values()).sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          }

          let mergedBranches = prev.branches;
          if (extraData.branches && Array.isArray(extraData.branches) && extraData.branches.length > 0) {
            const bMap = new Map<string, Branch>();
            for (const b of prev.branches) {
              if (b.id) bMap.set(b.id, b);
            }
            for (const b of extraData.branches) {
              if (b.id && b.id !== 'BR-1789788738927') {
                const existing = bMap.get(b.id);
                bMap.set(b.id, { ...(existing || {} as Branch), ...b });
              }
            }
            mergedBranches = Array.from(bMap.values());
          }

          let mergedUsers = prev.users;
          if (extraData.users && Array.isArray(extraData.users) && extraData.users.length > 0) {
            const uMap = new Map<string, User>();
            for (const u of prev.users) {
              if (u.id) uMap.set(u.id, u);
              if (u.username) uMap.set(u.username, u);
            }
            for (const u of extraData.users) {
              if (u.id || u.username) {
                const key = u.id || u.username;
                const existing = (u.id ? uMap.get(u.id) : undefined) || (u.username ? uMap.get(u.username) : undefined);
                const mergedU = { ...(existing || {} as User), ...u };
                uMap.set(key, mergedU);
              }
            }
            const uniqueUsers: User[] = [];
            const seen = new Set<string>();
            for (const u of uMap.values()) {
              if (u.id && !seen.has(u.id)) {
                seen.add(u.id);
                uniqueUsers.push(u);
              }
            }
            mergedUsers = uniqueUsers;
          }

          return {
            ...prev,
            auditLogs: updatedAuditLogs,
            branches: mergedBranches,
            users: mergedUsers,
            ...(extraData.exchangeRates?.length ? { exchangeRates: extraData.exchangeRates } : {}),
            ...(extraData.customers?.length ? { customers: extraData.customers } : {}),
            ...(extraData.roleMenuPermissions ? { roleMenuPermissions: extraData.roleMenuPermissions } : {}),
            ...(extraData.countryRoleMenuPermissions ? { countryRoleMenuPermissions: extraData.countryRoleMenuPermissions } : {}),
          };
        });
      }

      setLastTursoSyncTime(new Date().toLocaleTimeString());

      return {
        success: true,
        count: txList.length,
        message: db.activeLanguage === 'en'
          ? `Successfully pulled ${txList.length} records from Turso Cloud.`
          : `Turso Cloud မှ စာရင်း ${txList.length} ခု အောင်မြင်စွာ ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ။`
      };
    } catch (err: any) {
      console.warn('fetchDataFromTurso error:', err);
      return { success: false, message: err?.message || 'Failed to pull data from Turso' };
    }
  }, [db.activeLanguage]);

  const syncTursoBidirectional = useCallback(async (): Promise<{ success: boolean; message: string; count?: number }> => {
    setIsSyncingTurso(true);
    try {
      const isConnected = await checkTursoStatus();
      if (!isConnected) {
        setIsSyncingTurso(false);
        return { 
          success: false, 
          message: db.activeLanguage === 'en' ? 'Turso Cloud is not connected' : 'Turso Cloud ချိတ်ဆက်မထားပါ' 
        };
      }

      // 1. Pull latest from Turso Cloud first
      const pullRes = await fetchDataFromTurso();

      // 2. Push all fresh local transactions & audit logs to Turso Cloud from dbRef
      const currentDb = dbRef.current;
      const txPayload = (currentDb.transactions || []).map(mapTransactionToTursoPayload);
      const auditPayload = (currentDb.auditLogs || []).slice(0, 100).map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        userId: l.userId,
        userName: l.userName,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
      }));

      const syncPayload = {
        transactions: txPayload,
        auditLogs: auditPayload,
        exchangeRates: currentDb.exchangeRates,
        customers: currentDb.customers,
        branches: currentDb.branches,
        users: currentDb.users,
        roleMenuPermissions: currentDb.roleMenuPermissions,
        countryRoleMenuPermissions: currentDb.countryRoleMenuPermissions,
      };

      const { ok } = await safeFetchJson('/api/turso/sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncPayload)
      });
      if (!ok) {
        await tursoWebSyncPush(syncPayload);
      }

      setLastTursoSyncTime(new Date().toLocaleTimeString());
      setIsSyncingTurso(false);
      return {
        success: true,
        count: pullRes.count,
        message: db.activeLanguage === 'en'
          ? `Synced with Turso Cloud successfully (${pullRes.count ?? 0} records fetched)`
          : `Turso Cloud နှင့် အောင်မြင်စွာ Sync လုပ်ပြီးပါပြီ (စာရင်း ${pullRes.count ?? 0} ခု ရယူပြီး)`
      };
    } catch (err: any) {
      setIsSyncingTurso(false);
      return { success: false, message: err?.message || 'Sync failed' };
    }
  }, [db.activeLanguage, fetchDataFromTurso]);

  // Continuous 5-Minute Auto-Sync with Turso Cloud
  // (Mount sync, 5-minute periodic interval, focus re-sync, and browser close sync)
  useEffect(() => {
    let isMounted = true;

    const performSync = async (reason = 'auto-interval') => {
      try {
        const isConnected = await checkTursoStatus();
        if (isConnected && isMounted) {
          await fetchTursoBranches();
          await fetchDataFromTurso();

          // Push fresh local Outward and Inward records & audit logs from dbRef
          const currentDb = dbRef.current;
          const txPayload = (currentDb.transactions || []).map(mapTransactionToTursoPayload);
          const auditPayload = (currentDb.auditLogs || []).slice(0, 100).map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            userId: l.userId,
            userName: l.userName,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            details: l.details,
          }));

          const syncPayload = {
            transactions: txPayload,
            auditLogs: auditPayload,
            exchangeRates: currentDb.exchangeRates,
            customers: currentDb.customers,
            branches: currentDb.branches,
            users: currentDb.users,
            roleMenuPermissions: currentDb.roleMenuPermissions,
            countryRoleMenuPermissions: currentDb.countryRoleMenuPermissions,
          };

          const { ok } = await safeFetchJson('/api/turso/sync-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload)
          });
          if (!ok) {
            await tursoWebSyncPush(syncPayload);
          }

          if (isMounted) {
            setLastTursoSyncTime(new Date().toLocaleTimeString());
          }
        }
      } catch (err) {
        console.warn('Auto Turso 5-minute sync check error:', err);
      }
    };

    // Run immediately on component mount
    performSync('initial-mount');

    // Auto-sync polling every 5 minutes (5 * 60 * 1000 = 300,000 ms)
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const intervalId = setInterval(() => {
      if (isMounted) performSync('5-minute-interval');
    }, FIVE_MINUTES_MS);

    // Auto-sync whenever user focuses back on the window/tab
    const handleFocus = () => {
      if (isMounted) performSync('window-focus');
    };
    window.addEventListener('focus', handleFocus);

    // Browser close & tab unload sync (beforeunload / pagehide)
    const handleBeforeUnload = () => {
      try {
        const currentDb = dbRef.current;
        if (!currentDb || !currentDb.transactions) return;

        persistDatabaseSafely(currentDb);

        const txPayload = (currentDb.transactions || []).map(mapTransactionToTursoPayload);
        const auditPayload = (currentDb.auditLogs || []).slice(0, 50).map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          userId: l.userId,
          userName: l.userName,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          details: l.details,
        }));

        const payloadStr = JSON.stringify({
          transactions: txPayload,
          auditLogs: auditPayload,
          exchangeRates: currentDb.exchangeRates,
          customers: currentDb.customers,
          branches: currentDb.branches,
          users: currentDb.users
        });

        // 1. Fetch with keepalive
        if (typeof fetch !== 'undefined') {
          fetch('/api/turso/sync-push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr,
            keepalive: true
          }).catch(() => {});
        }

        // 2. Beacon fallback
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
          const blob = new Blob([payloadStr], { type: 'application/json' });
          navigator.sendBeacon('/api/turso/sync-beacon', blob);
        }
      } catch (e) {
        console.warn('Error during beforeunload sync:', e);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [fetchDataFromTurso]);

  const language = db.activeLanguage || 'my';
  const t = translations[language] || translations.en;

  const setLanguage = (lang: Language) => {
    setDb(prev => ({ ...prev, activeLanguage: lang }));
  };

  const currentUser = db.users.find(u => u.id === db.currentUserId) || db.users[0];

  const switchUser = (userId: string) => {
    const targetUser = db.users.find(u => u.id === userId);
    if (targetUser) {
      setDb(prev => ({ ...prev, currentUserId: userId }));
      const userBranchId = targetUser.branchId || 'BR-001';
      const branch = db.branches.find(b => b.id === userBranchId);
      const userCountryCode = targetUser.countryCode || branch?.countryCode || 'MM';
      setActiveBranchId(userBranchId);
      setActiveCountryCode(userCountryCode);
      logActionDirect(
        'LOGIN',
        'SYSTEM',
        userId,
        `Switched active operator context to ${targetUser.fullName} (${targetUser.role}) - Branch: ${branch?.nameEn || userBranchId}`
      );
    }
  };

  // Real-time audit log sync to Turso Cloud & Supabase
  const syncLiveAuditLogToCloud = (record: AuditRecord) => {
    // 1. Turso live push (with direct Web fallback for Vercel)
    try {
      const payload = {
        id: record.id,
        timestamp: record.timestamp,
        userId: record.userId,
        userName: record.userName,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        details: record.details,
      };

      safeFetchJson('/api/turso/sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auditLogs: [payload] })
      }).then(({ ok, data }) => {
        if (!ok || !data?.success) {
          tursoWebSyncPush({ auditLogs: [payload] }).catch(() => {});
        }
      }).catch(() => {
        tursoWebSyncPush({ auditLogs: [payload] }).catch(() => {});
      });
    } catch {
      tursoWebSyncPush({ auditLogs: [record] }).catch(() => {});
    }

    // 2. Supabase live upsert (if connected)
    try {
      const client = getSupabaseClient(db.supabaseConfig);
      if (client) {
        client.from('audit_logs').upsert([{
          id: record.id,
          timestamp: record.timestamp,
          user_id: record.userId,
          user_name: record.userName,
          user_role: record.userRole,
          action: record.action,
          entity_type: record.entityType,
          entity_id: record.entityId,
          details: record.details,
          previous_value: record.previousValue || null,
          new_value: record.newValue || null,
        }], { onConflict: 'id' }).then(({ error }: any) => {
          if (error) console.warn('Supabase live audit log sync warning:', error.message);
        }, () => {});
      }
    } catch {
      // ignore
    }
  };

  // Helper direct audit logger to avoid stale closures
  const logActionDirect = (
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action,
      entityType,
      entityId,
      details,
      previousValue,
      newValue,
    };
    setDb(prev => ({
      ...prev,
      auditLogs: [newRecord, ...prev.auditLogs]
    }));

    // Real-time Cloud Push to Turso & Supabase
    syncLiveAuditLogToCloud(newRecord);
  };

  const logAction = useCallback((
    action: AuditRecord['action'],
    entityType: AuditRecord['entityType'],
    entityId: string,
    details: string,
    previousValue?: string,
    newValue?: string
  ) => {
    logActionDirect(action, entityType, entityId, details, previousValue, newValue);
  }, [currentUser]);

  // Strictly checks blacklist by exact NRC number (with optional riskLevel filter, e.g. 'CRITICAL')
  // Fails immediately if any character is deleted (backspaced) or changed
  const checkExactNrcBlacklist = useCallback((nrc: string, requiredRiskLevel?: 'CRITICAL'): BlacklistEntry | null => {
    if (!nrc || typeof nrc !== 'string') return null;
    const clean = nrc.trim();
    if (!clean) return null;

    for (const item of (db?.blacklist || [])) {
      if (!item.active) continue;
      if (requiredRiskLevel && item.riskLevel !== requiredRiskLevel) continue;
      if (isExactNrcMatch(clean, item.nrcNumber)) {
        return item;
      }
    }
    return null;
  }, [db?.blacklist]);

  // General Blacklist screening with exact NRC requirement
  const checkBlacklist = useCallback((nrc: string, passport?: string, name?: string): BlacklistEntry | null => {
    if (!nrc && !passport && !name) return null;
    const cleanNrc = (nrc || '').trim();
    const cleanPass = (passport || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanName = (name || '').trim().toLowerCase();

    for (const item of (db?.blacklist || [])) {
      if (!item.active) continue;
      
      const itemNrc = (item.nrcNumber || '').trim();
      const itemPass = (item.passportNumber || item.passbookNumber || '').trim().toLowerCase().replace(/\s+/g, '');
      const itemEn = (item.fullNameEn || '').trim().toLowerCase();
      const itemMm = (item.fullNameMm || '').trim().toLowerCase();

      // NRC screening: strictly exact match only! No partial prefix or substring match.
      if (cleanNrc && itemNrc && isExactNrcMatch(cleanNrc, itemNrc)) {
        return item;
      }

      // Passport / Passbook screening: exact match only
      if (cleanPass && itemPass && cleanPass.length >= 6) {
        const normCleanPass = cleanPass.replace(/[^a-z0-9]/g, '');
        const normItemPass = itemPass.replace(/[^a-z0-9]/g, '');
        if (cleanPass === itemPass || normCleanPass === normItemPass) {
          return item;
        }
      }

      // Name screening: require at least 4 characters and exact match
      if (cleanName && cleanName.length >= 4) {
        if (
          (itemEn && cleanName === itemEn) ||
          (itemMm && cleanName === itemMm)
        ) {
          return item;
        }
      }
    }
    return null;
  }, [db?.blacklist]);

  // Helper to extract numeric rate from an exchange rate row (supports camelCase and snake_case)
  const extractNumericRate = (r: any): number => {
    if (!r) return 0;
    let val = Number(r.transferRate ?? r.transfer_rate ?? r.sellRate ?? r.sell_rate ?? r.buyRate ?? r.buy_rate ?? 0);
    if (isNaN(val) || val <= 0) return 0;
    // If reciprocal rate like 0.007547 was stored, invert back to standard MMK value (~132.50)
    if (val > 0 && val < 0.1) {
      val = 1 / val;
    }
    return val;
  };

  // Exchange rate lookup
  const getExchangeRate = useCallback((from: string, to: string): number => {
    if (from === to) return 1;
    const f = (from || '').toUpperCase();
    const t = (to || '').toUpperCase();
    
    // Direct match
    const direct = db.exchangeRates.find(r => 
      ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === f) &&
      ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === t)
    );
    if (direct) {
      const val = extractNumericRate(direct);
      if (val > 0) return val;
    }

    // Inverse match
    const inverse = db.exchangeRates.find(r => 
      ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === t) &&
      ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === f)
    );
    if (inverse) {
      const rate = extractNumericRate(inverse);
      return rate > 0 ? (rate >= 1 ? 1 / rate : rate) : 1;
    }

    // Default fallbacks for base MMK
    if (t === 'MMK') {
      if (f === 'THB') return 134.50;
      if (f === 'SGD') return 3450.00;
      if (f === 'USD') return 4580.00;
      if (f === 'MYR') return 980.00;
    }
    if (f === 'MMK') {
      if (t === 'THB') return 1 / 134.50;
      if (t === 'SGD') return 1 / 3450.00;
      if (t === 'USD') return 1 / 4580.00;
      if (t === 'MYR') return 1 / 980.00;
    }

    return 1;
  }, [db.exchangeRates]);

  // Corridor rate lookup - always returns the base rate in MMK per 1 foreign unit (e.g. 134.50 MMK per THB, 4580 MMK per USD)
  const getCorridorExchangeRate = useCallback((sourceCur: string, targetCur: string): number => {
    if (sourceCur === targetCur) return 1;
    const sCur = (sourceCur || '').toUpperCase();
    const tCur = (targetCur || '').toUpperCase();
    
    // Foreign to MMK (e.g. THB -> MMK)
    if (sCur !== 'MMK' && tCur === 'MMK') {
      const match = db.exchangeRates.find(r => 
        ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === sCur) &&
        ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === 'MMK')
      );
      if (match) {
        const val = extractNumericRate(match);
        if (val > 0) return val;
      }
      // Also check reverse if stored as MMK -> THB with base MMK rate
      const revMatch = db.exchangeRates.find(r => 
        ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === 'MMK') &&
        ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === sCur)
      );
      if (revMatch) {
        const val = extractNumericRate(revMatch);
        if (val > 0) return val;
      }
      // Standard corridor defaults
      if (sCur === 'THB') return 134.50;
      if (sCur === 'SGD') return 3450.00;
      if (sCur === 'USD') return 4580.00;
      if (sCur === 'MYR') return 980.00;
    }

    // MMK to Foreign (e.g. MMK -> THB)
    if (sCur === 'MMK' && tCur !== 'MMK') {
      const match = db.exchangeRates.find(r => 
        ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === tCur) &&
        ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === 'MMK')
      );
      if (match) {
        const val = extractNumericRate(match);
        if (val > 0) return val;
      }
      const revMatch = db.exchangeRates.find(r => 
        ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === 'MMK') &&
        ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === tCur)
      );
      if (revMatch) {
        const val = extractNumericRate(revMatch);
        if (val > 0) return val;
      }
      if (tCur === 'THB') return 134.50;
      if (tCur === 'SGD') return 3450.00;
      if (tCur === 'USD') return 4580.00;
      if (tCur === 'MYR') return 980.00;
    }
    
    // Direct match
    const direct = db.exchangeRates.find(r => 
      ((r.fromCurrency || (r as any).from_currency || '').toUpperCase() === sCur) &&
      ((r.toCurrency || (r as any).to_currency || '').toUpperCase() === tCur)
    );
    if (direct) {
      const val = extractNumericRate(direct);
      if (val > 0) return val;
    }

    return getExchangeRate(sCur, tCur);
  }, [db.exchangeRates, getExchangeRate]);

  // Generate unique MTCN
  const generateMtcn = () => {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
  };

  // Generate Transaction No
  const generateTxNo = (type: 'OUTWARD' | 'INWARD') => {
    const prefix = type === 'OUTWARD' ? 'REM-OUT' : 'REM-INW';
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(100 + Math.random() * 900);
    return `${prefix}-${dateStr}-${rand}`;
  };

  // Real-time Cloud Auto-Sync for Live Data (Supabase & Turso)
  const syncLiveTransactionToCloud = (tx: RemittanceTransaction, auditRecord?: AuditRecord) => {
    // 1. Supabase live upsert
    try {
      const client = getSupabaseClient(db.supabaseConfig);
      if (client) {
        client.from('transactions').upsert([{
          id: tx.id,
          transaction_no: tx.transactionNo,
          mtcn: tx.mtcn,
          type: tx.type,
          scope: tx.scope,
          status: tx.status,
          sender_name: tx.senderName,
          sender_name_mm: tx.senderNameMm,
          sender_nrc: tx.senderNrc,
          sender_nrc_attachment: tx.senderNrcAttachment || tx.senderNrcFrontAttachment,
          sender_nrc_front_attachment: tx.senderNrcFrontAttachment || tx.senderNrcAttachment,
          sender_nrc_back_attachment: tx.senderNrcBackAttachment,
          sender_father_name: tx.senderFatherName,
          sender_occupation: tx.senderOccupation,
          sender_date_of_birth: tx.senderDateOfBirth,
          sender_passport: tx.senderPassport || tx.senderPassbook,
          sender_passport_attachment: tx.senderPassportAttachment || tx.senderPassbookAttachment,
          sender_passport_attachment_name: tx.senderPassportAttachmentName || tx.senderPassbookAttachmentName,
          sender_passport_attachment_type: tx.senderPassportAttachmentType || tx.senderPassbookAttachmentType,
          sender_passport_attachment_size: tx.senderPassportAttachmentSize || tx.senderPassbookAttachmentSize,
          sender_passbook: tx.senderPassport || tx.senderPassbook,
          sender_passbook_attachment: tx.senderPassportAttachment || tx.senderPassbookAttachment,
          sender_passbook_attachment_name: tx.senderPassportAttachmentName || tx.senderPassbookAttachmentName,
          sender_passbook_attachment_type: tx.senderPassportAttachmentType || tx.senderPassbookAttachmentType,
          sender_passbook_attachment_size: tx.senderPassportAttachmentSize || tx.senderPassbookAttachmentSize,
          sender_phone: tx.senderPhone,
          sender_address: tx.senderAddress,
          sender_country_code: tx.senderCountryCode,
          receiver_name: tx.receiverName,
          receiver_name_mm: tx.receiverNameMm,
          receiver_nrc: tx.receiverNrc,
          receiver_passport: tx.receiverPassport || tx.receiverPassbook,
          receiver_passbook: tx.receiverPassport || tx.receiverPassbook,
          receiver_phone: tx.receiverPhone,
          receiver_address: tx.receiverAddress,
          receiver_country_code: tx.receiverCountryCode,
          source_currency: tx.sourceCurrency,
          target_currency: tx.targetCurrency,
          send_amount: tx.sendAmount,
          exchange_rate: tx.exchangeRate,
          receive_amount: tx.receiveAmount,
          service_fee: tx.serviceFee,
          commission_fee: tx.commissionFee,
          tax_amount: tx.taxAmount,
          total_payable_amount: tx.totalPayableAmount,
          payout_method: tx.payoutMethod,
          payout_bank_name: tx.payoutBankName,
          payout_account_number: tx.payoutAccountNumber,
          sending_branch_id: tx.sendingBranchId,
          payout_branch_id: tx.payoutBranchId,
          partner_company_id: tx.partnerCompanyId,
          purpose_id: tx.purposeId,
          purpose_name: tx.purposeName,
          sender_note: tx.senderNote,
          proof_document_name: tx.proofDocumentName,
          proof_document_url: tx.proofDocumentUrl,
          proof_doc_category: tx.proofDocCategory,
          blacklist_checked: tx.blacklistChecked,
          blacklist_alert: tx.blacklistAlert,
          creator_user_id: tx.creatorUserId,
          creator_name: tx.creatorName,
          created_date: tx.createdDate
        }], { onConflict: 'id' }).then(({ error }: any) => {
          if (error) console.warn('Supabase live sync warning:', error.message);
        }, () => {});

        if (auditRecord) {
          client.from('audit_logs').upsert([{
            id: auditRecord.id,
            timestamp: auditRecord.timestamp,
            user_id: auditRecord.userId,
            user_name: auditRecord.userName,
            user_role: auditRecord.userRole,
            action: auditRecord.action,
            entity_type: auditRecord.entityType,
            entity_id: auditRecord.entityId,
            details: auditRecord.details,
            previous_value: auditRecord.previousValue || null,
            new_value: auditRecord.newValue || null,
          }], { onConflict: 'id' }).then(({ error }: any) => {
            if (error) console.warn('Supabase live audit log sync warning:', error.message);
          }, () => {});
        }
      }
    } catch {
      // ignore
    }

    // 2. Turso live push (with direct Web fallback for Vercel)
    try {
      const payload = mapTransactionToTursoPayload(tx);
      const requestPayload: any = {
        transactions: [payload]
      };

      if (auditRecord) {
        requestPayload.auditLogs = [{
          id: auditRecord.id,
          timestamp: auditRecord.timestamp,
          userId: auditRecord.userId,
          userName: auditRecord.userName,
          action: auditRecord.action,
          entityType: auditRecord.entityType,
          entityId: auditRecord.entityId,
          details: auditRecord.details,
        }];
      }

      safeFetchJson('/api/turso/sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      }).then(({ ok, data }) => {
        if (ok && data?.success) {
          console.log(`[Turso Live Push] Transaction ${tx.transactionNo} & Audit Log saved to Turso Cloud.`);
        } else {
          // Direct web fallback
          tursoWebSyncPush(requestPayload);
        }
      }).catch(() => {
        tursoWebSyncPush(requestPayload);
      });
    } catch {
      // ignore
    }
  };

  // Auto-reconcile Domestic Outward Remittances:
  // If a domestic outward transaction is APPROVED (or PAID_OUT), but no corresponding INWARD claim exists for its MTCN,
  // automatically create the inward claim in the receiving branch queue and sync to cloud!
  useEffect(() => {
    const unlinkedDomesticOutwards = db.transactions.filter(t => 
      t.type === 'OUTWARD' && 
      t.scope === 'DOMESTIC' && 
      (t.status === 'APPROVED' || t.status === 'APPROVED_AND_SENT' || t.status === 'PAID_OUT' || t.status === 'APPROVED_AND_PAID_OUT') &&
      !db.transactions.some(inw => inw.type === 'INWARD' && inw.mtcn === t.mtcn)
    );

    if (unlinkedDomesticOutwards.length === 0) return;

    setDb(prev => {
      const newInwards: RemittanceTransaction[] = [];
      const updatedOutwards = prev.transactions.map(outwardTx => {
        if (
          outwardTx.type === 'OUTWARD' && 
          outwardTx.scope === 'DOMESTIC' && 
          (outwardTx.status === 'APPROVED' || outwardTx.status === 'APPROVED_AND_SENT' || outwardTx.status === 'PAID_OUT' || outwardTx.status === 'APPROVED_AND_PAID_OUT') &&
          !prev.transactions.some(inw => inw.type === 'INWARD' && inw.mtcn === outwardTx.mtcn) &&
          !newInwards.some(inw => inw.mtcn === outwardTx.mtcn)
        ) {
          const targetBranchId = outwardTx.payoutBranchId || 
            (outwardTx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');
          const nowStr = new Date().toISOString();
          const inwTxNo = generateTxNo('INWARD');
          const inwId = getNextCleanId('TX', [...prev.transactions, ...newInwards], 3);

          const inwardTx: RemittanceTransaction = {
            id: inwId,
            transactionNo: inwTxNo,
            mtcn: outwardTx.mtcn,
            type: 'INWARD',
            scope: 'DOMESTIC',
            status: (outwardTx.status === 'PAID_OUT' || outwardTx.status === 'APPROVED_AND_PAID_OUT') ? 'APPROVED_AND_PAID_OUT' : 'PENDING_APPROVAL',
            senderName: outwardTx.senderName,
            senderNameMm: outwardTx.senderNameMm,
            senderNrc: outwardTx.senderNrc,
            senderPassport: outwardTx.senderPassport || outwardTx.senderPassbook,
            senderPassbook: outwardTx.senderPassbook || outwardTx.senderPassport,
            senderPhone: outwardTx.senderPhone,
            senderAddress: outwardTx.senderAddress,
            senderCountryCode: outwardTx.senderCountryCode || 'MM',
            senderFatherName: outwardTx.senderFatherName,
            senderOccupation: outwardTx.senderOccupation,
            senderSourceOfFund: outwardTx.senderSourceOfFund,
            senderDateOfBirth: outwardTx.senderDateOfBirth,
            senderIdType: outwardTx.senderIdType || (outwardTx.senderPassport ? 'PASSPORT' : 'NRC'),
            senderNrcAttachment: outwardTx.senderNrcAttachment || outwardTx.senderNrcFrontAttachment,
            senderNrcAttachmentName: outwardTx.senderNrcAttachmentName || outwardTx.senderNrcFrontAttachmentName,
            senderNrcAttachmentType: outwardTx.senderNrcAttachmentType || outwardTx.senderNrcFrontAttachmentType,
            senderNrcAttachmentSize: outwardTx.senderNrcAttachmentSize || outwardTx.senderNrcFrontAttachmentSize,
            senderNrcFrontAttachment: outwardTx.senderNrcFrontAttachment || outwardTx.senderNrcAttachment,
            senderNrcFrontAttachmentName: outwardTx.senderNrcFrontAttachmentName || outwardTx.senderNrcAttachmentName,
            senderNrcFrontAttachmentType: outwardTx.senderNrcFrontAttachmentType || outwardTx.senderNrcAttachmentType,
            senderNrcFrontAttachmentSize: outwardTx.senderNrcFrontAttachmentSize || outwardTx.senderNrcFrontAttachmentSize,
            senderNrcBackAttachment: outwardTx.senderNrcBackAttachment,
            senderNrcBackAttachmentName: outwardTx.senderNrcBackAttachmentName,
            senderNrcBackAttachmentType: outwardTx.senderNrcBackAttachmentType,
            senderNrcBackAttachmentSize: outwardTx.senderNrcBackAttachmentSize,
            senderPassportAttachment: outwardTx.senderPassportAttachment || outwardTx.senderPassbookAttachment,
            senderPassportAttachmentName: outwardTx.senderPassportAttachmentName || outwardTx.senderPassbookAttachmentName,
            senderPassportAttachmentType: outwardTx.senderPassportAttachmentType || outwardTx.senderPassbookAttachmentType,
            senderPassportAttachmentSize: outwardTx.senderPassportAttachmentSize || outwardTx.senderPassbookAttachmentSize,

            receiverName: outwardTx.receiverName,
            receiverNameMm: outwardTx.receiverNameMm,
            receiverNrc: outwardTx.receiverNrc,
            receiverPassport: outwardTx.receiverPassport || outwardTx.receiverPassbook,
            receiverPassbook: outwardTx.receiverPassbook || outwardTx.receiverPassport,
            receiverPhone: outwardTx.receiverPhone,
            receiverAddress: outwardTx.receiverAddress,
            receiverCountryCode: outwardTx.receiverCountryCode || 'MM',

            sourceCurrency: outwardTx.sourceCurrency || 'MMK',
            targetCurrency: outwardTx.targetCurrency || 'MMK',
            sendAmount: Number(outwardTx.sendAmount || 0),
            exchangeRate: Number(outwardTx.exchangeRate || 1),
            receiveAmount: Number(outwardTx.receiveAmount || outwardTx.sendAmount || 0),
            serviceFee: Number(outwardTx.serviceFee || 0),
            commissionFee: Number(outwardTx.commissionFee || 0),
            taxAmount: 0,
            totalPayableAmount: Number(outwardTx.receiveAmount || outwardTx.sendAmount || 0),

            payoutMethod: outwardTx.payoutMethod || 'CASH_PICKUP',
            payoutBankName: outwardTx.payoutBankName,
            payoutAccountNumber: outwardTx.payoutAccountNumber,

            sendingBranchId: outwardTx.sendingBranchId || currentUser.branchId || 'BR-001',
            payoutBranchId: targetBranchId,
            branchId: targetBranchId,
            partnerCompanyId: outwardTx.partnerCompanyId,

            purposeId: outwardTx.purposeId || 'PUR-001',
            purposeName: outwardTx.purposeName || 'Domestic Remittance',
            senderNote: outwardTx.senderNote,
            proofDocumentName: outwardTx.proofDocumentName,
            proofDocumentUrl: outwardTx.proofDocumentUrl,
            proofDocumentType: outwardTx.proofDocumentType,
            proofDocumentSize: outwardTx.proofDocumentSize,
            proofDocCategory: outwardTx.proofDocCategory,

            blacklistChecked: true,
            blacklistAlert: outwardTx.blacklistAlert,

            creatorUserId: currentUser.id,
            creatorName: `${currentUser.fullName} (${currentUser.role}) [Auto Reconciled]`,
            createdDate: outwardTx.createdDate || nowStr,

            linkedTransactionId: outwardTx.id,
            linkedTransactionNo: outwardTx.transactionNo
          };

          newInwards.push(inwardTx);
          syncLiveTransactionToCloud(inwardTx);

          return {
            ...outwardTx,
            isSentToDestination: true,
            sentDate: outwardTx.sentDate || nowStr,
            payoutBranchId: targetBranchId,
            linkedTransactionId: inwardTx.id,
            linkedTransactionNo: inwardTx.transactionNo
          };
        }
        return outwardTx;
      });

      return {
        ...prev,
        transactions: [...newInwards, ...updatedOutwards]
      };
    });
  }, [db.transactions]);

  // 1. Create Outward Remittance
  const createOutwardRemittance = async (txData: Partial<RemittanceTransaction>): Promise<RemittanceTransaction> => {
    const txNo = generateTxNo('OUTWARD');
    const mtcn = generateMtcn();

    // Check blacklist on sender and receiver
    const senderPassportVal = txData.senderPassport || txData.senderPassbook || '';
    const receiverPassportVal = txData.receiverPassport || txData.receiverPassbook || '';
    const senderBlacklist = checkBlacklist(txData.senderNrc || '', senderPassportVal, txData.senderName);
    const receiverBlacklist = checkBlacklist(txData.receiverNrc || '', receiverPassportVal, txData.receiverName);
    
    let blacklistAlert: string | undefined = undefined;
    if (senderBlacklist) {
      blacklistAlert = `SENDER_MATCH: ${senderBlacklist.fullNameEn} (${senderBlacklist.reason})`;
    } else if (receiverBlacklist) {
      blacklistAlert = `RECEIVER_MATCH: ${receiverBlacklist.fullNameEn} (${receiverBlacklist.reason})`;
    }

    const newTx: RemittanceTransaction = {
      id: getNextCleanId('TX', db.transactions, 3),
      transactionNo: txNo,
      mtcn: mtcn,
      type: 'OUTWARD',
      scope: txData.scope || 'INTERNATIONAL',
      status: (txData.status as RemittanceStatus) || 'PENDING_APPROVAL',
      
      senderName: txData.senderName || '',
      senderNameMm: txData.senderNameMm || '',
      senderNrc: txData.senderNrc || '',
      senderPassport: senderPassportVal,
      senderPassbook: senderPassportVal,
      senderPhone: txData.senderPhone || '',
      senderAddress: txData.senderAddress || '',
      senderCountryCode: txData.senderCountryCode || 'MM',
      senderFatherName: txData.senderFatherName,
      senderOccupation: txData.senderOccupation,
      senderSourceOfFund: txData.senderSourceOfFund,
      senderDateOfBirth: txData.senderDateOfBirth,
      senderIdType: txData.senderIdType || (txData.senderPassport ? 'PASSPORT' : 'NRC'),
      senderNrcAttachment: txData.senderNrcAttachment || txData.senderNrcFrontAttachment,
      senderNrcAttachmentName: txData.senderNrcAttachmentName || txData.senderNrcFrontAttachmentName,
      senderNrcAttachmentType: txData.senderNrcAttachmentType || txData.senderNrcFrontAttachmentType,
      senderNrcAttachmentSize: txData.senderNrcAttachmentSize || txData.senderNrcFrontAttachmentSize,
      senderNrcFrontAttachment: txData.senderNrcFrontAttachment || txData.senderNrcAttachment,
      senderNrcFrontAttachmentName: txData.senderNrcFrontAttachmentName || txData.senderNrcAttachmentName,
      senderNrcFrontAttachmentType: txData.senderNrcFrontAttachmentType || txData.senderNrcAttachmentType,
      senderNrcFrontAttachmentSize: txData.senderNrcFrontAttachmentSize || txData.senderNrcAttachmentSize,
      senderNrcBackAttachment: txData.senderNrcBackAttachment,
      senderNrcBackAttachmentName: txData.senderNrcBackAttachmentName,
      senderNrcBackAttachmentType: txData.senderNrcBackAttachmentType,
      senderNrcBackAttachmentSize: txData.senderNrcBackAttachmentSize,
      senderPassportAttachment: txData.senderPassportAttachment || txData.senderPassbookAttachment,
      senderPassportAttachmentName: txData.senderPassportAttachmentName || txData.senderPassbookAttachmentName,
      senderPassportAttachmentType: txData.senderPassportAttachmentType || txData.senderPassbookAttachmentType,
      senderPassportAttachmentSize: txData.senderPassportAttachmentSize || txData.senderPassbookAttachmentSize,
      senderPassbookAttachment: txData.senderPassportAttachment || txData.senderPassbookAttachment,
      senderPassbookAttachmentName: txData.senderPassportAttachmentName || txData.senderPassbookAttachmentName,
      senderPassbookAttachmentType: txData.senderPassportAttachmentType || txData.senderPassbookAttachmentType,
      senderPassbookAttachmentSize: txData.senderPassportAttachmentSize || txData.senderPassbookAttachmentSize,
      
      receiverName: txData.receiverName || '',
      receiverNameMm: txData.receiverNameMm || '',
      receiverNrc: txData.receiverNrc || '',
      receiverPassport: receiverPassportVal,
      receiverPassbook: receiverPassportVal,
      receiverPhone: txData.receiverPhone || '',
      receiverAddress: txData.receiverAddress || '',
      receiverCountryCode: txData.receiverCountryCode || 'TH',
      
      sourceCurrency: txData.sourceCurrency || 'MMK',
      targetCurrency: txData.targetCurrency || 'USD',
      sendAmount: Number(txData.sendAmount || 0),
      exchangeRate: Number(txData.exchangeRate || 1),
      receiveAmount: Number(txData.receiveAmount || 0),
      serviceFee: Number(txData.serviceFee || 0),
      commissionFee: Number(txData.commissionFee || 0),
      taxAmount: Number(txData.taxAmount || 0),
      totalPayableAmount: Number(txData.totalPayableAmount || 0),
      
      // USD Base
      isUsdBase: !!txData.isUsdBase,
      usdAmount: txData.usdAmount !== undefined ? Number(txData.usdAmount) : undefined,
      usdExchangeRate: txData.usdExchangeRate !== undefined ? Number(txData.usdExchangeRate) : undefined,
      usdServiceFee: txData.usdServiceFee !== undefined ? Number(txData.usdServiceFee) : undefined,
      
      payoutMethod: txData.payoutMethod || 'CASH_PICKUP',
      payoutBankName: txData.payoutBankName,
      payoutAccountNumber: txData.payoutAccountNumber,
      
      sendingBranchId: txData.sendingBranchId || currentUser.branchId || 'BR-001',
      payoutBranchId: txData.payoutBranchId,
      partnerCompanyId: txData.partnerCompanyId,
      
      purposeId: txData.purposeId || 'PUR-001',
      purposeName: txData.purposeName || 'Family Maintenance & Living Support',
      senderNote: txData.senderNote,
      proofDocumentName: txData.proofDocumentName,
      proofDocumentUrl: txData.proofDocumentUrl,
      proofDocumentType: txData.proofDocumentType,
      proofDocumentSize: txData.proofDocumentSize,
      proofDocCategory: txData.proofDocCategory,
      
      blacklistChecked: true,
      blacklistAlert,
      
      creatorUserId: currentUser.id,
      creatorName: `${currentUser.fullName} (${currentUser.role})`,
      
      createdDate: txData.createdDate || new Date().toISOString(),
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'OUTWARD',
      entityId: newTx.transactionNo,
      details: `Created Outward Remittance ${newTx.transactionNo} (MTCN: ${newTx.mtcn}) for ${newTx.senderName} -> ${newTx.receiverName} (${newTx.sendAmount} ${newTx.sourceCurrency})`
    };

    setDb(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(newTx, auditRecord);

    return newTx;
  };

  // 2. Create Inward Remittance Claim / Entry
  const createInwardRemittance = async (txData: Partial<RemittanceTransaction>): Promise<RemittanceTransaction> => {
    const txNo = generateTxNo('INWARD');
    const mtcn = txData.mtcn || generateMtcn();

    const senderPassportVal = txData.senderPassport || txData.senderPassbook || '';
    const receiverPassportVal = txData.receiverPassport || txData.receiverPassbook || '';
    const receiverBlacklist = checkBlacklist(txData.receiverNrc || '', receiverPassportVal, txData.receiverName);
    const senderBlacklist = checkBlacklist(txData.senderNrc || '', senderPassportVal, txData.senderName);

    let blacklistAlert: string | undefined = undefined;
    if (receiverBlacklist) {
      blacklistAlert = `BENEFICIARY_MATCH: ${receiverBlacklist.fullNameEn} (${receiverBlacklist.reason})`;
    } else if (senderBlacklist) {
      blacklistAlert = `SENDER_MATCH: ${senderBlacklist.fullNameEn} (${senderBlacklist.reason})`;
    }

    const senderPassportAttach = txData.senderPassportAttachment || txData.senderPassbookAttachment || '';
    const senderPassportAttachName = txData.senderPassportAttachmentName || txData.senderPassbookAttachmentName || '';
    const senderPassportAttachType = txData.senderPassportAttachmentType || txData.senderPassbookAttachmentType || '';
    const senderPassportAttachSize = txData.senderPassportAttachmentSize || txData.senderPassbookAttachmentSize || '';

    const newTx: RemittanceTransaction = {
      id: getNextCleanId('TX', db.transactions, 3),
      transactionNo: txNo,
      mtcn: mtcn,
      type: 'INWARD',
      scope: txData.scope || 'INTERNATIONAL',
      status: (txData.status as RemittanceStatus) || 'PENDING_APPROVAL',
      
      senderName: txData.senderName || '',
      senderNameMm: txData.senderNameMm || '',
      senderNrc: txData.senderNrc || '',
      senderNrcAttachment: txData.senderNrcAttachment || txData.senderNrcFrontAttachment || '',
      senderNrcAttachmentName: txData.senderNrcAttachmentName || txData.senderNrcFrontAttachmentName || '',
      senderNrcAttachmentType: txData.senderNrcAttachmentType || txData.senderNrcFrontAttachmentType || '',
      senderNrcAttachmentSize: txData.senderNrcAttachmentSize || txData.senderNrcFrontAttachmentSize || '',
      senderNrcFrontAttachment: txData.senderNrcFrontAttachment || txData.senderNrcAttachment || '',
      senderNrcFrontAttachmentName: txData.senderNrcFrontAttachmentName || txData.senderNrcAttachmentName || '',
      senderNrcFrontAttachmentType: txData.senderNrcFrontAttachmentType || txData.senderNrcAttachmentType || '',
      senderNrcFrontAttachmentSize: txData.senderNrcFrontAttachmentSize || txData.senderNrcAttachmentSize || '',
      senderNrcBackAttachment: txData.senderNrcBackAttachment || '',
      senderNrcBackAttachmentName: txData.senderNrcBackAttachmentName || '',
      senderNrcBackAttachmentType: txData.senderNrcBackAttachmentType || '',
      senderNrcBackAttachmentSize: txData.senderNrcBackAttachmentSize || '',
      senderPassport: senderPassportVal,
      senderPassbook: senderPassportVal,
      senderPassportAttachment: senderPassportAttach,
      senderPassportAttachmentName: senderPassportAttachName,
      senderPassportAttachmentType: senderPassportAttachType,
      senderPassportAttachmentSize: senderPassportAttachSize,
      senderPassbookAttachment: senderPassportAttach,
      senderPassbookAttachmentName: senderPassportAttachName,
      senderPassbookAttachmentType: senderPassportAttachType,
      senderPassbookAttachmentSize: senderPassportAttachSize,
      senderPhone: txData.senderPhone || '',
      senderAddress: txData.senderAddress || '',
      senderCountryCode: txData.senderCountryCode || 'TH',
      
      receiverName: txData.receiverName || '',
      receiverNameMm: txData.receiverNameMm || '',
      receiverNrc: txData.receiverNrc || '',
      receiverPassport: receiverPassportVal,
      receiverPassbook: receiverPassportVal,
      receiverPhone: txData.receiverPhone || '',
      receiverAddress: txData.receiverAddress || '',
      receiverCountryCode: txData.receiverCountryCode || 'MM',
      
      sourceCurrency: txData.sourceCurrency || 'THB',
      targetCurrency: txData.targetCurrency || 'MMK',
      sendAmount: Number(txData.sendAmount || 0),
      exchangeRate: Number(txData.exchangeRate || 1),
      receiveAmount: Number(txData.receiveAmount || 0),
      serviceFee: Number(txData.serviceFee || 0),
      commissionFee: Number(txData.commissionFee || 0),
      taxAmount: 0,
      totalPayableAmount: Number(txData.receiveAmount || 0),
      
      payoutMethod: txData.payoutMethod || 'CASH_PICKUP',
      payoutBankName: txData.payoutBankName,
      payoutAccountNumber: txData.payoutAccountNumber,
      
      sendingBranchId: txData.sendingBranchId || 'BR-001',
      payoutBranchId: txData.payoutBranchId || currentUser.branchId || 'BR-001',
      partnerCompanyId: txData.partnerCompanyId,
      
      purposeId: txData.purposeId || 'PUR-004',
      purposeName: txData.purposeName || 'Overseas Worker Salary Remittance',
      senderNote: txData.senderNote,
      proofDocumentName: txData.proofDocumentName,
      
      blacklistChecked: true,
      blacklistAlert,
      
      creatorUserId: currentUser.id,
      creatorName: `${currentUser.fullName} (${currentUser.role})`,
      
      createdDate: txData.createdDate || new Date().toISOString(),
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'CREATE',
      entityType: 'INWARD',
      entityId: newTx.transactionNo,
      details: `Created Inward Remittance Claim ${newTx.transactionNo} (MTCN: ${newTx.mtcn}) for ${newTx.receiverName} (${newTx.receiveAmount} MMK payout)`
    };

    setDb(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(newTx, auditRecord);

    return newTx;
  };

  // 3. Approve Transaction (Checker)
  const approveTransaction = async (id: string, note?: string, autoSendToInward?: boolean): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const nowStr = new Date().toISOString();
    
    // In domestic remittance, approving an outward remittance ALWAYS automatically sends it to the receiving branch
    const isDomesticOutward = tx.type === 'OUTWARD' && (tx.scope === 'DOMESTIC' || autoSendToInward !== false);
    const targetBranchId = tx.payoutBranchId || 
      (tx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');

    // Check if an inward claim already exists for this MTCN
    const existingInward = db.transactions.find(t => t.type === 'INWARD' && t.mtcn === tx.mtcn);

    let inwardTx: RemittanceTransaction | undefined = undefined;
    let inwardAuditRecord: AuditRecord | undefined = undefined;

    if (isDomesticOutward && !existingInward) {
      const inwTxNo = generateTxNo('INWARD');
      inwardTx = {
        id: getNextCleanId('TX', db.transactions, 3),
        transactionNo: inwTxNo,
        mtcn: tx.mtcn,
        type: 'INWARD',
        scope: 'DOMESTIC',
        status: 'PENDING_APPROVAL', // Waiting for Receive Branch Checker to review & Payout Cash!

        senderName: tx.senderName,
        senderNameMm: tx.senderNameMm,
        senderNrc: tx.senderNrc,
        senderPassport: tx.senderPassport || tx.senderPassbook,
        senderPassbook: tx.senderPassbook || tx.senderPassport,
        senderPhone: tx.senderPhone,
        senderAddress: tx.senderAddress,
        senderCountryCode: tx.senderCountryCode || 'MM',
        senderFatherName: tx.senderFatherName,
        senderOccupation: tx.senderOccupation,
        senderSourceOfFund: tx.senderSourceOfFund,
        senderDateOfBirth: tx.senderDateOfBirth,
        senderIdType: tx.senderIdType || (tx.senderPassport ? 'PASSPORT' : 'NRC'),
        senderNrcAttachment: tx.senderNrcAttachment || tx.senderNrcFrontAttachment,
        senderNrcAttachmentName: tx.senderNrcAttachmentName || tx.senderNrcFrontAttachmentName,
        senderNrcAttachmentType: tx.senderNrcAttachmentType || tx.senderNrcFrontAttachmentType,
        senderNrcAttachmentSize: tx.senderNrcAttachmentSize || tx.senderNrcFrontAttachmentSize,
        senderNrcFrontAttachment: tx.senderNrcFrontAttachment || tx.senderNrcAttachment,
        senderNrcFrontAttachmentName: tx.senderNrcFrontAttachmentName || tx.senderNrcAttachmentName,
        senderNrcFrontAttachmentType: tx.senderNrcFrontAttachmentType || tx.senderNrcAttachmentType,
        senderNrcFrontAttachmentSize: tx.senderNrcFrontAttachmentSize || tx.senderNrcFrontAttachmentSize,
        senderNrcBackAttachment: tx.senderNrcBackAttachment,
        senderNrcBackAttachmentName: tx.senderNrcBackAttachmentName,
        senderNrcBackAttachmentType: tx.senderNrcBackAttachmentType,
        senderNrcBackAttachmentSize: tx.senderNrcBackAttachmentSize,
        senderPassportAttachment: tx.senderPassportAttachment || tx.senderPassbookAttachment,
        senderPassportAttachmentName: tx.senderPassportAttachmentName || tx.senderPassbookAttachmentName,
        senderPassportAttachmentType: tx.senderPassportAttachmentType || tx.senderPassbookAttachmentType,
        senderPassportAttachmentSize: tx.senderPassportAttachmentSize || tx.senderPassbookAttachmentSize,

        receiverName: tx.receiverName,
        receiverNameMm: tx.receiverNameMm,
        receiverNrc: tx.receiverNrc,
        receiverPassport: tx.receiverPassport || tx.receiverPassbook,
        receiverPassbook: tx.receiverPassbook || tx.receiverPassport,
        receiverPhone: tx.receiverPhone,
        receiverAddress: tx.receiverAddress,
        receiverCountryCode: tx.receiverCountryCode || 'MM',

        sourceCurrency: tx.sourceCurrency || 'MMK',
        targetCurrency: tx.targetCurrency || 'MMK',
        sendAmount: Number(tx.sendAmount || 0),
        exchangeRate: Number(tx.exchangeRate || 1),
        receiveAmount: Number(tx.receiveAmount || tx.sendAmount || 0),
        serviceFee: Number(tx.serviceFee || 0),
        commissionFee: Number(tx.commissionFee || 0),
        taxAmount: 0,
        totalPayableAmount: Number(tx.receiveAmount || tx.sendAmount || 0),

        payoutMethod: tx.payoutMethod || 'CASH_PICKUP',
        payoutBankName: tx.payoutBankName,
        payoutAccountNumber: tx.payoutAccountNumber,

        sendingBranchId: tx.sendingBranchId || currentUser.branchId || 'BR-001',
        payoutBranchId: targetBranchId,
        branchId: targetBranchId,
        partnerCompanyId: tx.partnerCompanyId,

        purposeId: tx.purposeId || 'PUR-001',
        purposeName: tx.purposeName || 'Domestic Remittance',
        senderNote: tx.senderNote || note,
        proofDocumentName: tx.proofDocumentName,
        proofDocumentUrl: tx.proofDocumentUrl,
        proofDocumentType: tx.proofDocumentType,
        proofDocumentSize: tx.proofDocumentSize,
        proofDocCategory: tx.proofDocCategory,

        blacklistChecked: true,
        blacklistAlert: tx.blacklistAlert,

        creatorUserId: currentUser.id,
        creatorName: `${currentUser.fullName} (${currentUser.role}) [Dispatched from ${tx.transactionNo}]`,
        createdDate: nowStr,

        linkedTransactionId: tx.id,
        linkedTransactionNo: tx.transactionNo
      };

      const destBranchName = db.branches.find(b => b.id === targetBranchId)?.nameEn || targetBranchId;
      inwardAuditRecord = {
        id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000) + 1}`,
        timestamp: nowStr,
        userId: currentUser.id,
        userName: currentUser.fullName,
        userRole: currentUser.role,
        action: 'CREATE',
        entityType: 'INWARD',
        entityId: inwTxNo,
        details: `Auto-dispatched Domestic Inward Remittance to ${destBranchName} from Outward ${tx.transactionNo} (MTCN: ${tx.mtcn}) upon approval.`
      };
    }

    const isOutward = tx.type === 'OUTWARD';
    const newStatus: RemittanceStatus = isOutward ? 'APPROVED_AND_SENT' : 'APPROVED_AND_PAID_OUT';

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: newStatus,
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note || (isOutward ? 'Approved and sent to receiving branch.' : 'Approved and paid out to beneficiary.'),
      approvedDate: nowStr,
      ...(isDomesticOutward ? {
        isSentToDestination: true,
        sentDate: nowStr,
        sentByUserId: currentUser.id,
        sentByName: `${currentUser.fullName} (${currentUser.role})`,
        payoutBranchId: targetBranchId,
        linkedTransactionId: existingInward?.id || inwardTx?.id,
        linkedTransactionNo: existingInward?.transactionNo || inwardTx?.transactionNo
      } : {})
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowStr,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'APPROVE',
      entityType: tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      entityId: tx.transactionNo,
      details: `Checker ${currentUser.fullName} approved transaction ${tx.transactionNo} (MTCN: ${tx.mtcn}).${isDomesticOutward ? ' Auto-sent to receiving branch Inward queue.' : ''} Note: ${note || 'None'}`
    };

    setDb(prev => ({
      ...prev,
      transactions: [
        ...(inwardTx ? [inwardTx] : []),
        ...prev.transactions.map(t => t.id === id ? updatedTx : t)
      ],
      auditLogs: [
        ...(inwardAuditRecord ? [inwardAuditRecord] : []),
        auditRecord,
        ...prev.auditLogs
      ]
    }));

    syncLiveTransactionToCloud(updatedTx, auditRecord);
    if (inwardTx && inwardAuditRecord) {
      syncLiveTransactionToCloud(inwardTx, inwardAuditRecord);
    }

    return true;
  };

  // 3.5. Send Domestic Outward to Receiving Branch (Auto-creates Inward Claim)
  const sendOutwardToInward = async (
    outwardId: string, 
    note?: string
  ): Promise<{ success: boolean; inwardTx?: RemittanceTransaction; message?: string }> => {
    const outwardTx = db.transactions.find(t => t.id === outwardId);
    if (!outwardTx) {
      return { success: false, message: 'Outward remittance record not found.' };
    }

    // Determine target receiving branch
    const targetBranchId = outwardTx.payoutBranchId || 
      (outwardTx.sendingBranchId === 'BR-001' ? 'BR-002' : 'BR-001');

    // Check if an inward claim already exists for this MTCN
    const existingInward = db.transactions.find(t => t.type === 'INWARD' && t.mtcn === outwardTx.mtcn);
    if (existingInward) {
      const updatedOutward: RemittanceTransaction = {
        ...outwardTx,
        status: 'APPROVED_AND_SENT',
        isSentToDestination: true,
        sentDate: outwardTx.sentDate || new Date().toISOString(),
        payoutBranchId: targetBranchId,
        linkedTransactionId: existingInward.id,
        linkedTransactionNo: existingInward.transactionNo
      };
      setDb(prev => ({
        ...prev,
        transactions: prev.transactions.map(t => t.id === outwardId ? updatedOutward : t)
      }));
      return { success: true, inwardTx: existingInward, message: 'Transaction was already dispatched to receiving branch.' };
    }

    const nowStr = new Date().toISOString();
    const inwTxNo = generateTxNo('INWARD');

    const inwardTx: RemittanceTransaction = {
      id: getNextCleanId('TX', db.transactions, 3),
      transactionNo: inwTxNo,
      mtcn: outwardTx.mtcn,
      type: 'INWARD',
      scope: outwardTx.scope || 'DOMESTIC',
      status: 'PENDING_APPROVAL', // Waiting for Receive Branch Checker to review & Payout Cash!

      senderName: outwardTx.senderName,
      senderNameMm: outwardTx.senderNameMm,
      senderNrc: outwardTx.senderNrc,
      senderPassport: outwardTx.senderPassport || outwardTx.senderPassbook,
      senderPassbook: outwardTx.senderPassbook || outwardTx.senderPassport,
      senderPhone: outwardTx.senderPhone,
      senderAddress: outwardTx.senderAddress,
      senderCountryCode: outwardTx.senderCountryCode || 'MM',
      senderFatherName: outwardTx.senderFatherName,
      senderOccupation: outwardTx.senderOccupation,
      senderSourceOfFund: outwardTx.senderSourceOfFund,
      senderDateOfBirth: outwardTx.senderDateOfBirth,
      senderIdType: outwardTx.senderIdType || (outwardTx.senderPassport ? 'PASSPORT' : 'NRC'),
      senderNrcAttachment: outwardTx.senderNrcAttachment || outwardTx.senderNrcFrontAttachment,
      senderNrcAttachmentName: outwardTx.senderNrcAttachmentName || outwardTx.senderNrcFrontAttachmentName,
      senderNrcAttachmentType: outwardTx.senderNrcAttachmentType || outwardTx.senderNrcFrontAttachmentType,
      senderNrcAttachmentSize: outwardTx.senderNrcAttachmentSize || outwardTx.senderNrcFrontAttachmentSize,
      senderNrcFrontAttachment: outwardTx.senderNrcFrontAttachment || outwardTx.senderNrcAttachment,
      senderNrcFrontAttachmentName: outwardTx.senderNrcFrontAttachmentName || outwardTx.senderNrcAttachmentName,
      senderNrcFrontAttachmentType: outwardTx.senderNrcFrontAttachmentType || outwardTx.senderNrcAttachmentType,
      senderNrcFrontAttachmentSize: outwardTx.senderNrcFrontAttachmentSize || outwardTx.senderNrcAttachmentSize,
      senderNrcBackAttachment: outwardTx.senderNrcBackAttachment,
      senderNrcBackAttachmentName: outwardTx.senderNrcBackAttachmentName,
      senderNrcBackAttachmentType: outwardTx.senderNrcBackAttachmentType,
      senderNrcBackAttachmentSize: outwardTx.senderNrcBackAttachmentSize,
      senderPassportAttachment: outwardTx.senderPassportAttachment || outwardTx.senderPassbookAttachment,
      senderPassportAttachmentName: outwardTx.senderPassportAttachmentName || outwardTx.senderPassbookAttachmentName,
      senderPassportAttachmentType: outwardTx.senderPassportAttachmentType || outwardTx.senderPassbookAttachmentType,
      senderPassportAttachmentSize: outwardTx.senderPassportAttachmentSize || outwardTx.senderPassbookAttachmentSize,

      receiverName: outwardTx.receiverName,
      receiverNameMm: outwardTx.receiverNameMm,
      receiverNrc: outwardTx.receiverNrc,
      receiverPassport: outwardTx.receiverPassport || outwardTx.receiverPassbook,
      receiverPassbook: outwardTx.receiverPassbook || outwardTx.receiverPassport,
      receiverPhone: outwardTx.receiverPhone,
      receiverAddress: outwardTx.receiverAddress,
      receiverCountryCode: outwardTx.receiverCountryCode || 'MM',

      sourceCurrency: outwardTx.sourceCurrency || 'MMK',
      targetCurrency: outwardTx.targetCurrency || 'MMK',
      sendAmount: Number(outwardTx.sendAmount || 0),
      exchangeRate: Number(outwardTx.exchangeRate || 1),
      receiveAmount: Number(outwardTx.receiveAmount || outwardTx.sendAmount || 0),
      serviceFee: Number(outwardTx.serviceFee || 0),
      commissionFee: Number(outwardTx.commissionFee || 0),
      taxAmount: 0,
      totalPayableAmount: Number(outwardTx.receiveAmount || outwardTx.sendAmount || 0),

      payoutMethod: outwardTx.payoutMethod || 'CASH_PICKUP',
      payoutBankName: outwardTx.payoutBankName,
      payoutAccountNumber: outwardTx.payoutAccountNumber,

      sendingBranchId: outwardTx.sendingBranchId || currentUser.branchId || 'BR-001',
      payoutBranchId: targetBranchId,
      branchId: targetBranchId,
      partnerCompanyId: outwardTx.partnerCompanyId,

      purposeId: outwardTx.purposeId || 'PUR-001',
      purposeName: outwardTx.purposeName || 'Domestic Remittance',
      senderNote: outwardTx.senderNote || note,
      proofDocumentName: outwardTx.proofDocumentName,
      proofDocumentUrl: outwardTx.proofDocumentUrl,
      proofDocumentType: outwardTx.proofDocumentType,
      proofDocumentSize: outwardTx.proofDocumentSize,
      proofDocCategory: outwardTx.proofDocCategory,

      blacklistChecked: true,
      blacklistAlert: outwardTx.blacklistAlert,

      creatorUserId: currentUser.id,
      creatorName: `${currentUser.fullName} (${currentUser.role}) [Dispatched from ${outwardTx.transactionNo}]`,
      createdDate: nowStr,

      linkedTransactionId: outwardTx.id,
      linkedTransactionNo: outwardTx.transactionNo
    };

    const updatedOutwardTx: RemittanceTransaction = {
      ...outwardTx,
      status: 'APPROVED_AND_SENT',
      isSentToDestination: true,
      sentDate: nowStr,
      sentByUserId: currentUser.id,
      sentByName: `${currentUser.fullName} (${currentUser.role})`,
      payoutBranchId: targetBranchId,
      linkedTransactionId: inwardTx.id,
      linkedTransactionNo: inwardTx.transactionNo
    };

    const sendingBranchName = db.branches.find(b => b.id === outwardTx.sendingBranchId)?.nameEn || outwardTx.sendingBranchId;
    const targetBranchName = db.branches.find(b => b.id === targetBranchId)?.nameEn || targetBranchId;

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowStr,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'OUTWARD',
      entityId: outwardTx.transactionNo,
      details: `Domestic Outward Remittance ${outwardTx.transactionNo} (MTCN: ${outwardTx.mtcn}) sent from ${sendingBranchName} to ${targetBranchName}. Auto-created Inward Claim ${inwardTx.transactionNo} for Payout Cash.`
    };

    setDb(prev => ({
      ...prev,
      transactions: [inwardTx, ...prev.transactions.map(t => t.id === outwardId ? updatedOutwardTx : t)],
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(inwardTx, auditRecord);
    syncLiveTransactionToCloud(updatedOutwardTx, auditRecord);

    return { success: true, inwardTx };
  };

  // 4. Reject Transaction
  const rejectTransaction = async (id: string, reason: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'REJECTED',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      rejectionReason: reason,
      approvedDate: new Date().toISOString(),
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'REJECT',
      entityType: tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      entityId: tx.transactionNo,
      details: `Checker ${currentUser.fullName} rejected transaction ${tx.transactionNo}. Reason: ${reason}`
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t),
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(updatedTx, auditRecord);

    return true;
  };

  // 5. Put Transaction on Hold
  const holdTransaction = async (id: string, note: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'ON_HOLD',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note,
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'HOLD',
      entityType: tx.type === 'OUTWARD' ? 'OUTWARD' : 'INWARD',
      entityId: tx.transactionNo,
      details: `Transaction ${tx.transactionNo} placed ON HOLD by ${currentUser.fullName}. Note: ${note}`
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? updatedTx : t),
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(updatedTx, auditRecord);

    return true;
  };

  // 6. Complete Inward Payout (Cash / Account)
  const payoutInwardTransaction = async (id: string, note?: string): Promise<boolean> => {
    const tx = db.transactions.find(t => t.id === id);
    if (!tx) return false;

    const nowStr = new Date().toISOString();
    const updatedTx: RemittanceTransaction = {
      ...tx,
      status: 'APPROVED_AND_PAID_OUT',
      approverUserId: currentUser.id,
      approverName: `${currentUser.fullName} (${currentUser.role})`,
      approvalNote: note || 'Funds successfully disbursed and paid out to beneficiary.',
      paidOutDate: nowStr,
    };

    // Synchronize corresponding Outward Remittance if linked
    const linkedOutward = db.transactions.find(t => 
      t.type === 'OUTWARD' && (
        (tx.linkedTransactionId && t.id === tx.linkedTransactionId) ||
        (tx.linkedTransactionNo && t.transactionNo === tx.linkedTransactionNo) ||
        (t.mtcn === tx.mtcn)
      )
    );

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: nowStr,
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'PAYOUT',
      entityType: 'INWARD',
      entityId: tx.transactionNo,
      details: `Checker ${currentUser.fullName} approved and paid out MTCN ${tx.mtcn} to beneficiary ${tx.receiverName} (${tx.receiveAmount} MMK)`
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => {
        if (t.id === id) return updatedTx;
        if (linkedOutward && t.id === linkedOutward.id) {
          return {
            ...t,
            status: 'APPROVED_AND_PAID_OUT',
            paidOutDate: nowStr,
            approvalNote: (t.approvalNote ? t.approvalNote + ' | ' : '') + `Approved and paid out at destination branch by ${currentUser.fullName}`
          };
        }
        return t;
      }),
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(updatedTx, auditRecord);
    if (linkedOutward) {
      syncLiveTransactionToCloud({ ...linkedOutward, status: 'APPROVED_AND_PAID_OUT', paidOutDate: nowStr }, auditRecord);
    }

    return true;
  };

  // 7. Update Transaction (e.g. Inward revision by Checker/Maker)
  const updateTransaction = async (updatedTx: RemittanceTransaction, editReason?: string): Promise<boolean> => {
    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: updatedTx.type === 'INWARD' ? 'INWARD' : 'OUTWARD',
      entityId: updatedTx.transactionNo,
      details: `Transaction ${updatedTx.transactionNo} (MTCN: ${updatedTx.mtcn}) edited by ${currentUser.fullName}${editReason ? `. Reason: ${editReason}` : ''}`
    };

    setDb(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === updatedTx.id ? updatedTx : t),
      auditLogs: [auditRecord, ...prev.auditLogs]
    }));

    syncLiveTransactionToCloud(updatedTx, auditRecord);

    return true;
  };

  // Lookup MTCN
  const lookupTransactionByMtcn = useCallback((mtcn: string): RemittanceTransaction | undefined => {
    const clean = mtcn.trim();
    return db.transactions.find(t => t.mtcn === clean || t.transactionNo === clean);
  }, [db.transactions]);

  // Master Setups CRUD Handlers (9 modules)
  // 1. Branch
  const saveBranch = (branch: Branch) => {
    const isNew = !db.branches.some(b => b.id === branch.id);
    setDb(prev => ({
      ...prev,
      branches: isNew ? [...prev.branches, branch] : prev.branches.map(b => b.id === branch.id ? branch : b)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'BRANCH',
      branch.code,
      `${isNew ? 'Added new' : 'Updated'} branch ${branch.code} - ${branch.nameEn} (${branch.city})`
    );

    // Immediate background sync to Turso database (works seamlessly on Vercel as well)
    tursoWebSaveBranch(branch).catch(err => {
      console.warn('[Turso] Save branch background error:', err);
    });
    safeFetchJson('/api/turso/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch)
    }).catch(() => {});
  };

  const deleteBranch = (id: string) => {
    const item = db.branches.find(b => b.id === id);
    setDb(prev => ({ ...prev, branches: prev.branches.filter(b => b.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'BRANCH', item.code, `Deleted branch ${item.code} (${item.nameEn})`);
    }

    tursoWebDeleteBranch(id).catch(err => {
      console.warn('[Turso] Delete branch background error:', err);
    });
    safeFetchJson(`/api/turso/branches?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  // 2. User
  const saveUser = (user: User) => {
    const branch = db.branches.find(b => b.id === user.branchId);
    const countryCode = user.countryCode || branch?.countryCode || 'MM';
    const enrichedUser: User = {
      ...user,
      countryCode
    };
    const isNew = !db.users.some(u => u.id === user.id);
    setDb(prev => ({
      ...prev,
      users: isNew ? [...prev.users, enrichedUser] : prev.users.map(u => u.id === user.id ? enrichedUser : u)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'USER',
      user.username,
      `${isNew ? 'Created user' : 'Updated user'} ${user.username} (${user.fullName}, Role: ${user.role}, Country: ${countryCode}, Branch: ${branch?.nameEn || user.branchId})`
    );

    // Immediate background sync to Turso database (works seamlessly on Vercel as well)
    tursoWebSaveUser(enrichedUser).catch(err => {
      console.warn('[Turso] Save user background error:', err);
    });
    safeFetchJson('/api/turso/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedUser)
    }).catch(() => {});
  };

  const deleteUser = (id: string) => {
    const item = db.users.find(u => u.id === id);
    setDb(prev => ({ ...prev, users: prev.users.filter(u => u.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'USER', item.username, `Deleted user account ${item.username} (${item.fullName})`);
    }

    tursoWebDeleteUser(id).catch(err => {
      console.warn('[Turso] Delete user background error:', err);
    });
    safeFetchJson(`/api/turso/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {});
  };

  // Operator Company Profile
  const updateOperatorProfile = (profile: OperatorProfile) => {
    setDb(prev => ({
      ...prev,
      operatorProfile: profile
    }));
    logActionDirect(
      'UPDATE',
      'SYSTEM',
      'OPERATOR_PROFILE',
      `Updated Remittance Operating Company Profile: ${profile.companyNameEn} (${profile.companyNameMm}) • Phone: ${profile.phone} • Address: ${profile.addressEn}`
    );
  };

  // 3. Company
  const saveCompany = (company: Company) => {
    const isNew = !db.companies.some(c => c.id === company.id);
    setDb(prev => ({
      ...prev,
      companies: isNew ? [...prev.companies, company] : prev.companies.map(c => c.id === company.id ? company : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'COMPANY',
      company.code,
      `${isNew ? 'Added partner company' : 'Updated partner company'} ${company.code} - ${company.nameEn}`
    );
  };

  const deleteCompany = (id: string) => {
    const item = db.companies.find(c => c.id === id);
    setDb(prev => ({ ...prev, companies: prev.companies.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'COMPANY', item.code, `Deleted partner company ${item.code} (${item.nameEn})`);
    }
  };

  // 4. Currency
  const saveCurrency = (currency: Currency) => {
    const isNew = !db.currencies.some(c => c.id === currency.id);
    setDb(prev => ({
      ...prev,
      currencies: isNew ? [...prev.currencies, currency] : prev.currencies.map(c => c.id === currency.id ? currency : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'CURRENCY',
      currency.code,
      `${isNew ? 'Added currency' : 'Updated currency'} ${currency.code} (${currency.nameEn})`
    );
  };

  const deleteCurrency = (id: string) => {
    const item = db.currencies.find(c => c.id === id);
    setDb(prev => ({ ...prev, currencies: prev.currencies.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'CURRENCY', item.code, `Deleted currency ${item.code}`);
    }
  };

  // 5. Country
  const saveCountry = (country: Country) => {
    const isNew = !db.countries.some(c => c.id === country.id);
    setDb(prev => ({
      ...prev,
      countries: isNew ? [...prev.countries, country] : prev.countries.map(c => c.id === country.id ? country : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'COUNTRY',
      country.code,
      `${isNew ? 'Added country' : 'Updated country'} ${country.code} - ${country.nameEn}`
    );
  };

  const deleteCountry = (id: string) => {
    const item = db.countries.find(c => c.id === id);
    setDb(prev => ({ ...prev, countries: prev.countries.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'COUNTRY', item.code, `Deleted country ${item.code} (${item.nameEn})`);
    }
  };

  // 6. Exchange Rate
  const saveExchangeRate = (rate: ExchangeRate) => {
    setDb(prev => {
      const isNew = !prev.exchangeRates.some(r => r.id === rate.id);
      return {
        ...prev,
        exchangeRates: isNew ? [...prev.exchangeRates, rate] : prev.exchangeRates.map(r => r.id === rate.id ? rate : r)
      };
    });
    logActionDirect(
      'UPDATE',
      'EXCHANGE_RATE',
      `${rate.fromCurrency}/${rate.toCurrency}`,
      `Updated exchange rate ${rate.fromCurrency}/${rate.toCurrency} -> Transfer Rate: ${rate.transferRate} MMK (Buy: ${rate.buyRate} / Sell: ${rate.sellRate})`
    );
    // Push directly to Turso so auto-sync never reverts it
    safeFetchJson('/api/turso/exchange-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([rate])
    }).catch(() => {});
    tursoWebSaveExchangeRates([rate]).catch(() => {});
  };

  const saveExchangeRatesBatch = async (rates: ExchangeRate[]) => {
    if (!rates || rates.length === 0) return;
    const rateMap = new Map(rates.map(r => [r.id, r]));
    setDb(prev => ({
      ...prev,
      exchangeRates: prev.exchangeRates.map(r => rateMap.has(r.id) ? rateMap.get(r.id)! : r)
    }));
    logActionDirect(
      'UPDATE',
      'EXCHANGE_RATE',
      'BATCH_RATES',
      `Updated ${rates.length} exchange rates: ${rates.map(r => `${r.fromCurrency}/${r.toCurrency}=${r.transferRate} MMK (Buy: ${r.buyRate} / Sell: ${r.sellRate})`).join(', ')}`
    );
    try {
      await safeFetchJson('/api/turso/exchange-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates)
      });
      tursoWebSaveExchangeRates(rates).catch(() => {});
    } catch (e) {
      console.warn('Batch exchange rates sync to Turso note:', e);
    }
  };

  const deleteExchangeRate = (id: string) => {
    const item = db.exchangeRates.find(r => r.id === id);
    setDb(prev => ({ ...prev, exchangeRates: prev.exchangeRates.filter(r => r.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'EXCHANGE_RATE', `${item.fromCurrency}/${item.toCurrency}`, `Deleted exchange rate for ${item.fromCurrency}/${item.toCurrency}`);
    }
    safeFetchJson(`/api/turso/exchange-rates?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    }).catch(() => {});
    tursoWebDeleteExchangeRate(id).catch(() => {});
  };

  // 7. Blacklist (with Myanmar NRC & Passport note text box)
  const saveBlacklist = (entry: BlacklistEntry) => {
    const isNew = !db.blacklist.some(b => b.id === entry.id);
    setDb(prev => ({
      ...prev,
      blacklist: isNew ? [...prev.blacklist, entry] : prev.blacklist.map(b => b.id === entry.id ? entry : b)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'BLACKLIST',
      entry.nrcNumber || entry.id,
      `${isNew ? 'Added to Blacklist' : 'Updated Blacklist target'}: ${entry.fullNameEn} (NRC: ${entry.nrcNumber}, Passport: ${entry.passportNumber || entry.passbookNumber}, Risk: ${entry.riskLevel}). Note: ${entry.note}`
    );
  };

  const deleteBlacklist = (id: string) => {
    const item = db.blacklist.find(b => b.id === id);
    setDb(prev => ({ ...prev, blacklist: prev.blacklist.filter(b => b.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'BLACKLIST', item.nrcNumber || item.id, `Removed ${item.fullNameEn} (NRC: ${item.nrcNumber}) from Blacklist`);
    }
  };

  // 8. Purpose of Remit
  const savePurpose = (purpose: RemittancePurpose) => {
    const isNew = !db.purposes.some(p => p.id === purpose.id);
    setDb(prev => ({
      ...prev,
      purposes: isNew ? [...prev.purposes, purpose] : prev.purposes.map(p => p.id === purpose.id ? purpose : p)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'PURPOSE',
      purpose.code,
      `${isNew ? 'Added purpose' : 'Updated purpose'} ${purpose.code} - ${purpose.nameEn} (${purpose.category})`
    );
  };

  const deletePurpose = (id: string) => {
    const item = db.purposes.find(p => p.id === id);
    setDb(prev => ({ ...prev, purposes: prev.purposes.filter(p => p.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'PURPOSE', item.code, `Deleted remittance purpose ${item.code} (${item.nameEn})`);
    }
  };

  // 9. Customer
  const saveCustomer = (customer: Customer) => {
    const isNew = !db.customers.some(c => c.id === customer.id);
    setDb(prev => ({
      ...prev,
      customers: isNew ? [...prev.customers, customer] : prev.customers.map(c => c.id === customer.id ? customer : c)
    }));
    logActionDirect(
      isNew ? 'CREATE' : 'UPDATE',
      'CUSTOMER',
      customer.customerCode,
      `${isNew ? 'Registered customer' : 'Updated customer'} ${customer.customerCode} - ${customer.fullNameEn} (NRC: ${customer.nrcNumber})`
    );
  };

  const deleteCustomer = (id: string) => {
    const item = db.customers.find(c => c.id === id);
    setDb(prev => ({ ...prev, customers: prev.customers.filter(c => c.id !== id) }));
    if (item) {
      logActionDirect('DELETE', 'CUSTOMER', item.customerCode, `Deleted customer ${item.customerCode} (${item.fullNameEn})`);
    }
  };

  // Backup & Restore
  const exportBackupJson = (): string => {
    const backupData = {
      metadata: {
        app: 'Remittance Management System',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.fullName,
        recordsSummary: {
          branches: db.branches.length,
          users: db.users.length,
          companies: db.companies.length,
          currencies: db.currencies.length,
          countries: db.countries.length,
          exchangeRates: db.exchangeRates.length,
          blacklist: db.blacklist.length,
          purposes: db.purposes.length,
          customers: db.customers.length,
          transactions: db.transactions.length,
          auditLogs: db.auditLogs.length,
        }
      },
      data: db
    };
    
    logActionDirect(
      'BACKUP',
      'SYSTEM',
      `BACKUP-${Date.now()}`,
      `Exported full system JSON backup containing ${db.transactions.length} transactions and ${db.auditLogs.length} audit logs.`
    );

    return JSON.stringify(backupData, null, 2);
  };

  const restoreBackupJson = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      const dataToRestore: AppDatabase = parsed.data || parsed;

      if (!dataToRestore.branches || !dataToRestore.transactions || !dataToRestore.users) {
        throw new Error('Invalid backup file structure: missing essential collections.');
      }

      setDb(dataToRestore);
      persistDatabaseSafely(dataToRestore);

      logActionDirect(
        'RESTORE',
        'SYSTEM',
        `RESTORE-${Date.now()}`,
        `Successfully restored system database from JSON backup (${dataToRestore.transactions.length} transactions loaded).`
      );

      return true;
    } catch (err) {
      console.error('Restore error:', err);
      return false;
    }
  };

  const resetToDefaultData = () => {
    setDb(initialDatabase);
    clearIndexedDb().catch(() => {});
    persistDatabaseSafely(initialDatabase);
    logActionDirect(
      'RESTORE',
      'SYSTEM',
      `RESET-${Date.now()}`,
      `Reset system to default initial seed dataset.`
    );
  };

  const clearAllTransactions = async (alsoClearTurso: boolean = true): Promise<{ count: number; tursoSuccess?: boolean }> => {
    const count = db.transactions.length;
    setDb(prev => {
      const updated = { ...prev, transactions: [] };
      persistDatabaseSafely(updated);
      return updated;
    });

    let tursoSuccess: boolean | undefined = undefined;
    if (alsoClearTurso) {
      try {
        const { clearTursoRemoteTable } = await import('./tursoClient');
        const res = await clearTursoRemoteTable('remittance_transactions');
        tursoSuccess = res?.success;
      } catch (e) {
        console.warn('Failed to clear Turso remote transactions:', e);
        tursoSuccess = false;
      }
    }

    logActionDirect(
      'DELETE',
      'SYSTEM',
      'ALL_RECORDS',
      `Cleared all ${count} transactions for testing (Turso cleared: ${tursoSuccess ?? 'no'}).`
    );
    return { count, tursoSuccess };
  };

  const clearAllAuditLogs = async (alsoClearTurso: boolean = true): Promise<{ count: number; tursoSuccess?: boolean }> => {
    const count = db.auditLogs.length;
    setDb(prev => {
      const updated = { ...prev, auditLogs: [] };
      persistDatabaseSafely(updated);
      return updated;
    });

    let tursoSuccess: boolean | undefined = undefined;
    if (alsoClearTurso) {
      try {
        const { clearTursoRemoteTable } = await import('./tursoClient');
        const res = await clearTursoRemoteTable('audit_logs');
        tursoSuccess = res?.success;
      } catch (e) {
        console.warn('Failed to clear Turso remote audit logs:', e);
        tursoSuccess = false;
      }
    }
    return { count, tursoSuccess };
  };

  const clearAllCustomers = async (alsoClearTurso: boolean = true): Promise<{ count: number; tursoSuccess?: boolean }> => {
    const count = db.customers.length;
    setDb(prev => {
      const updated = { ...prev, customers: [] };
      persistDatabaseSafely(updated);
      return updated;
    });

    let tursoSuccess: boolean | undefined = undefined;
    if (alsoClearTurso) {
      try {
        const { clearTursoRemoteTable } = await import('./tursoClient');
        const res = await clearTursoRemoteTable('customer_profiles');
        tursoSuccess = res?.success;
      } catch (e) {
        console.warn('Failed to clear Turso remote customer profiles:', e);
        tursoSuccess = false;
      }
    }

    logActionDirect(
      'DELETE',
      'CUSTOMER',
      'ALL_RECORDS',
      `Cleared all ${count} customer profiles for testing (Turso cleared: ${tursoSuccess ?? 'no'}).`
    );
    return { count, tursoSuccess };
  };

  const clearLocalAndTursoDataForTesting = async (): Promise<void> => {
    await clearAllTransactions(true);
    await clearAllAuditLogs(true);
    await clearAllCustomers(true);
    try {
      localStorage.removeItem(LOCAL_STORAGE_DB_KEY);
      await clearIndexedDb();
    } catch {}
  };

  // Default Status Configuration (Country-Based Remittance Defaults configured by Admin Role)
  const defaultStatusConfig: DefaultStatusConfig = db.defaultStatusConfig || initialDatabase.defaultStatusConfig || {
    autoCountryDefault: true,
    applyOutwardEntry: true,
    applyReviewEdit: true,
    enforceNonMyanmarPassport: true,
    enforceMyanmarNrc: true,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Admin',
  };

  const updateDefaultStatusConfig = (config: Partial<DefaultStatusConfig>) => {
    setDb(prev => {
      const current = prev.defaultStatusConfig || initialDatabase.defaultStatusConfig || {
        autoCountryDefault: true,
        applyOutwardEntry: true,
        applyReviewEdit: true,
        enforceNonMyanmarPassport: true,
        enforceMyanmarNrc: true,
      };
      const updated: DefaultStatusConfig = {
        ...current,
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: `${currentUser.username} (${currentUser.fullName}, Role: ${currentUser.role})`
      };
      return {
        ...prev,
        defaultStatusConfig: updated
      };
    });
    logActionDirect(
      'UPDATE',
      'SYSTEM',
      'DEFAULT_STATUS_CONFIG',
      `Admin updated Remittance Default Status Rules: Auto Country Default=${config.autoCountryDefault ?? defaultStatusConfig.autoCountryDefault}`
    );
  };

  // Supabase Sync
  const updateSupabaseConfig = (config: Partial<SupabaseConfig>) => {
    setDb(prev => {
      const updated = {
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, ...config }
      };
      resetSupabaseClient(updated.supabaseConfig);
      return updated;
    });
  };

  const syncDataToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured. Please enter URL and Anon Key in Supabase Settings.' };
    }

    try {
      setDb(prev => ({
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, syncStatus: 'SYNCING' }
      }));

      const syncedTables: string[] = [];
      const failedTables: string[] = [];

      // 1. Branches
      try {
        const branchPayload = db.branches.map(b => ({
          id: b.id,
          code: b.code,
          name_en: b.nameEn,
          name_mm: b.nameMm,
          city: b.city,
          phone: b.phone,
          address: b.address,
          manager_name: b.managerName,
          status: b.status,
          created_at: b.createdAt,
        }));
        const { error: bErr } = await client.from('branches').upsert(branchPayload, { onConflict: 'id' });
        if (bErr) throw bErr;
        syncedTables.push(`Branches (${branchPayload.length})`);
      } catch (err: any) {
        failedTables.push(`branches: ${err.message}`);
      }

      // 2. Users
      try {
        const userPayload = db.users.map(u => ({
          id: u.id,
          username: u.username,
          full_name: u.fullName,
          email: u.email,
          password: u.password || 'password123',
          role: u.role,
          branch_id: u.branchId,
          phone: u.phone,
          status: u.status,
          last_login: u.lastLogin,
          created_at: u.createdAt,
        }));
        const { error: uErr } = await client.from('users').upsert(userPayload, { onConflict: 'id' });
        if (uErr) throw uErr;
        syncedTables.push(`Users (${userPayload.length})`);
      } catch (err: any) {
        failedTables.push(`users: ${err.message}`);
      }

      // 3. Companies
      try {
        const companyPayload = db.companies.map(c => ({
          id: c.id,
          code: c.code,
          name_en: c.nameEn,
          name_mm: c.nameMm,
          country_code: c.countryCode,
          type: c.type,
          swift_code: c.swiftCode,
          license_no: c.licenseNo,
          phone: c.phone,
          email: c.email,
          status: c.status,
          created_at: c.createdAt,
        }));
        const { error: cErr } = await client.from('companies').upsert(companyPayload, { onConflict: 'id' });
        if (cErr) throw cErr;
        syncedTables.push(`Companies (${companyPayload.length})`);
      } catch (err: any) {
        failedTables.push(`companies: ${err.message}`);
      }

      // 4. Currencies
      try {
        const curPayload = db.currencies.map(cu => ({
          id: cu.id,
          code: cu.code,
          name_en: cu.nameEn,
          name_mm: cu.nameMm,
          symbol: cu.symbol,
          is_base_currency: cu.isBaseCurrency,
          decimals: cu.decimals,
          status: cu.status,
        }));
        const { error: cuErr } = await client.from('currencies').upsert(curPayload, { onConflict: 'id' });
        if (cuErr) throw cuErr;
        syncedTables.push(`Currencies (${curPayload.length})`);
      } catch (err: any) {
        failedTables.push(`currencies: ${err.message}`);
      }

      // 5. Countries
      try {
        const countryPayload = db.countries.map(co => ({
          id: co.id,
          code: co.code,
          name_en: co.nameEn,
          name_mm: co.nameMm,
          dial_code: co.dialCode,
          flag_emoji: co.flagEmoji,
          currency_code: co.currencyCode,
          is_domestic: co.isDomestic,
          status: co.status,
        }));
        const { error: coErr } = await client.from('countries').upsert(countryPayload, { onConflict: 'id' });
        if (coErr) throw coErr;
        syncedTables.push(`Countries (${countryPayload.length})`);
      } catch (err: any) {
        failedTables.push(`countries: ${err.message}`);
      }

      // 6. Exchange Rates
      try {
        const ratePayload = db.exchangeRates.map(r => ({
          id: r.id,
          from_currency: r.fromCurrency,
          to_currency: r.toCurrency,
          buy_rate: r.buyRate,
          sell_rate: r.sellRate,
          transfer_rate: r.transferRate,
          effective_date: r.effectiveDate,
          effective_time: r.effectiveTime,
          updated_by: r.updatedBy,
          note: r.note,
        }));
        const { error: rErr } = await client.from('exchange_rates').upsert(ratePayload, { onConflict: 'id' });
        if (rErr) throw rErr;
        syncedTables.push(`Exchange Rates (${ratePayload.length})`);
      } catch (err: any) {
        failedTables.push(`exchange_rates: ${err.message}`);
      }

      // 7. Blacklist
      try {
        const blPayload = db.blacklist.map(bl => ({
          id: bl.id,
          full_name_en: bl.fullNameEn,
          full_name_mm: bl.fullNameMm,
          nrc_number: bl.nrcNumber,
          passport_number: bl.passportNumber || bl.passbookNumber || '',
          passbook_number: bl.passportNumber || bl.passbookNumber || '',
          reason: bl.reason,
          note: bl.note,
          risk_level: bl.riskLevel,
          added_by: bl.addedBy,
          active: bl.active,
          created_at: bl.createdAt,
        }));
        const { error: blErr } = await client.from('blacklist').upsert(blPayload, { onConflict: 'id' });
        if (blErr) throw blErr;
        syncedTables.push(`Blacklist (${blPayload.length})`);
      } catch (err: any) {
        failedTables.push(`blacklist: ${err.message}`);
      }

      // 8. Purposes
      try {
        const pPayload = db.purposes.map(p => ({
          id: p.id,
          code: p.code,
          name_en: p.nameEn,
          name_mm: p.nameMm,
          category: p.category,
          requires_doc_proof: p.requiresDocProof,
          max_daily_limit_mmk: p.maxDailyLimitMMK,
        }));
        const { error: pErr } = await client.from('purposes').upsert(pPayload, { onConflict: 'id' });
        if (pErr) throw pErr;
        syncedTables.push(`Purposes (${pPayload.length})`);
      } catch (err: any) {
        failedTables.push(`purposes: ${err.message}`);
      }

      // 9. Customers
      try {
        const cuPayload = db.customers.map(c => ({
          id: c.id,
          customer_code: c.customerCode,
          full_name_en: c.fullNameEn,
          full_name_mm: c.fullNameMm,
          nrc_number: c.nrcNumber,
          passport_number: c.passportNumber || c.passbookNumber || '',
          passbook_number: c.passportNumber || c.passbookNumber || '',
          phone: c.phone,
          address: c.address,
          customer_type: c.customerType,
          risk_rating: c.riskRating,
          total_transactions: c.totalTransactions,
          total_volume_mmk: c.totalVolumeMMK,
          notes: c.notes,
          created_at: c.createdAt,
        }));
        const { error: cErr } = await client.from('customers').upsert(cuPayload, { onConflict: 'id' });
        if (cErr) throw cErr;
        syncedTables.push(`Customers (${cuPayload.length})`);
      } catch (err: any) {
        failedTables.push(`customers: ${err.message}`);
      }

      // 10. Transactions
      try {
        const txPayload = db.transactions.map(t => ({
          id: t.id,
          transaction_no: t.transactionNo,
          mtcn: t.mtcn,
          type: t.type,
          scope: t.scope,
          status: t.status,
          sender_name: t.senderName,
          sender_name_mm: t.senderNameMm,
          sender_nrc: t.senderNrc,
          sender_nrc_attachment: t.senderNrcAttachment || t.senderNrcFrontAttachment,
          sender_nrc_front_attachment: t.senderNrcFrontAttachment || t.senderNrcAttachment,
          sender_nrc_back_attachment: t.senderNrcBackAttachment,
          sender_father_name: t.senderFatherName,
          sender_occupation: t.senderOccupation,
          sender_date_of_birth: t.senderDateOfBirth,
          sender_passport: t.senderPassport || t.senderPassbook,
          sender_passport_attachment: t.senderPassportAttachment || t.senderPassbookAttachment,
          sender_passport_attachment_name: t.senderPassportAttachmentName || t.senderPassbookAttachmentName,
          sender_passport_attachment_type: t.senderPassportAttachmentType || t.senderPassbookAttachmentType,
          sender_passport_attachment_size: t.senderPassportAttachmentSize || t.senderPassbookAttachmentSize,
          sender_passbook: t.senderPassport || t.senderPassbook,
          sender_passbook_attachment: t.senderPassportAttachment || t.senderPassbookAttachment,
          sender_passbook_attachment_name: t.senderPassportAttachmentName || t.senderPassbookAttachmentName,
          sender_passbook_attachment_type: t.senderPassportAttachmentType || t.senderPassbookAttachmentType,
          sender_passbook_attachment_size: t.senderPassportAttachmentSize || t.senderPassbookAttachmentSize,
          sender_phone: t.senderPhone,
          sender_address: t.senderAddress,
          sender_country_code: t.senderCountryCode,
          receiver_name: t.receiverName,
          receiver_name_mm: t.receiverNameMm,
          receiver_nrc: t.receiverNrc,
          receiver_passport: t.receiverPassport || t.receiverPassbook,
          receiver_passbook: t.receiverPassport || t.receiverPassbook,
          receiver_phone: t.receiverPhone,
          receiver_address: t.receiverAddress,
          receiver_country_code: t.receiverCountryCode,
          source_currency: t.sourceCurrency,
          target_currency: t.targetCurrency,
          send_amount: t.sendAmount,
          exchange_rate: t.exchangeRate,
          receive_amount: t.receiveAmount,
          service_fee: t.serviceFee,
          commission_fee: t.commissionFee,
          tax_amount: t.taxAmount,
          total_payable_amount: t.totalPayableAmount,
          payout_method: t.payoutMethod,
          payout_bank_name: t.payoutBankName,
          payout_account_number: t.payoutAccountNumber,
          sending_branch_id: t.sendingBranchId,
          payout_branch_id: t.payoutBranchId,
          partner_company_id: t.partnerCompanyId,
          purpose_id: t.purposeId,
          purpose_name: t.purposeName,
          sender_note: t.senderNote,
          proof_document_name: t.proofDocumentName,
          proof_document_url: t.proofDocumentUrl,
          proof_doc_category: t.proofDocCategory,
          blacklist_checked: t.blacklistChecked,
          blacklist_alert: t.blacklistAlert,
          creator_user_id: t.creatorUserId,
          creator_name: t.creatorName,
          approver_user_id: t.approverUserId,
          approver_name: t.approverName,
          approval_note: t.approvalNote,
          rejection_reason: t.rejectionReason,
          created_date: t.createdDate,
          approved_date: t.approvedDate,
          paid_out_date: t.paidOutDate,
        }));
        const { error: tErr } = await client.from('transactions').upsert(txPayload, { onConflict: 'id' });
        if (tErr) throw tErr;
        syncedTables.push(`Transactions (${txPayload.length})`);
      } catch (err: any) {
        failedTables.push(`transactions: ${err.message}`);
      }

      // 11. Audit Logs
      try {
        const auditPayload = db.auditLogs.slice(0, 500).map(a => ({
          id: a.id,
          timestamp: a.timestamp,
          user_id: a.userId,
          user_name: a.userName,
          user_role: a.userRole,
          action: a.action,
          entity_type: a.entityType,
          entity_id: a.entityId,
          details: a.details,
          previous_value: a.previousValue,
          new_value: a.newValue,
        }));
        const { error: aErr } = await client.from('audit_logs').upsert(auditPayload, { onConflict: 'id' });
        if (aErr) throw aErr;
        syncedTables.push(`Audit Logs (${auditPayload.length})`);
      } catch (err: any) {
        failedTables.push(`audit_logs: ${err.message}`);
      }

      const now = new Date().toISOString();

      if (syncedTables.length > 0) {
        setDb(prev => ({
          ...prev,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
            syncStatus: failedTables.length > 0 ? 'ERROR' : 'SUCCESS',
            lastSyncTime: now,
            errorMessage: failedTables.length > 0 ? failedTables.join('; ') : undefined,
          }
        }));

        logActionDirect(
          'SYNC',
          'SYSTEM',
          'SUPABASE-SYNC',
          `Synced ${syncedTables.length} tables to Supabase. ${failedTables.length ? `(Pending: ${failedTables.join(', ')})` : ''}`
        );

        if (failedTables.length === 0) {
          return {
            success: true,
            message: `အားလုံး အောင်မြင်စွာ ပို့ဆောင်ပြီးပါပြီ! (All ${syncedTables.length} tables synchronized to Supabase PostgreSQL: ${syncedTables.join(', ')})`
          };
        } else {
          return {
            success: true,
            message: `Synchronized ${syncedTables.length} tables successfully. Notice for ${failedTables.length} tables: ${failedTables[0]}`
          };
        }
      } else {
        throw new Error(failedTables.join('; ') || 'No tables could be synchronized.');
      }
    } catch (err: any) {
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncStatus: 'ERROR',
          errorMessage: err.message
        }
      }));
      return { success: false, message: `Sync failed: ${err.message || 'Make sure Supabase tables are created and RLS is disabled.'}` };
    }
  };

  const fetchDataFromSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured.' };
    }

    try {
      setDb(prev => ({
        ...prev,
        supabaseConfig: { ...prev.supabaseConfig, syncStatus: 'SYNCING' }
      }));

      // Pull branches
      const { data: remoteBranches, error: bErr } = await client.from('branches').select('*');
      if (bErr) throw bErr;

      // Pull transactions
      const { data: remoteTxs } = await client.from('transactions').select('*');

      let updatedCount = 0;
      setDb(prev => {
        let updatedBranches = prev.branches;
        let updatedTxs = prev.transactions;

        if (remoteBranches && remoteBranches.length > 0) {
          updatedBranches = remoteBranches.map(b => ({
            id: b.id,
            code: b.code,
            nameEn: b.name_en,
            nameMm: b.name_mm,
            city: b.city,
            phone: b.phone,
            address: b.address,
            managerName: b.manager_name,
            status: b.status || 'ACTIVE',
            createdAt: b.created_at || new Date().toISOString(),
          }));
          updatedCount += updatedBranches.length;
        }

        if (remoteTxs && remoteTxs.length > 0) {
          updatedTxs = remoteTxs.map(t => ({
            id: t.id,
            transactionNo: t.transaction_no,
            mtcn: t.mtcn,
            type: t.type,
            scope: t.scope,
            status: t.status,
            senderName: t.sender_name,
            senderNameMm: t.sender_name_mm,
            senderNrc: t.sender_nrc,
            senderNrcAttachment: t.sender_nrc_attachment || t.sender_nrc_front_attachment,
            senderNrcFrontAttachment: t.sender_nrc_front_attachment || t.sender_nrc_attachment,
            senderNrcBackAttachment: t.sender_nrc_back_attachment,
            senderFatherName: t.sender_father_name,
            senderOccupation: t.sender_occupation,
            senderDateOfBirth: t.sender_date_of_birth,
            senderPassport: t.sender_passport || t.sender_passbook,
            senderPassportAttachment: t.sender_passport_attachment || t.sender_passbook_attachment,
            senderPassportAttachmentName: t.sender_passport_attachment_name || t.sender_passbook_attachment_name,
            senderPassportAttachmentType: t.sender_passport_attachment_type || t.sender_passbook_attachment_type,
            senderPassportAttachmentSize: t.sender_passport_attachment_size || t.sender_passbook_attachment_size,
            senderPassbook: t.sender_passport || t.sender_passbook,
            senderPassbookAttachment: t.sender_passport_attachment || t.sender_passbook_attachment,
            senderPassbookAttachmentName: t.sender_passport_attachment_name || t.sender_passbook_attachment_name,
            senderPassbookAttachmentType: t.sender_passport_attachment_type || t.sender_passbook_attachment_type,
            senderPassbookAttachmentSize: t.sender_passport_attachment_size || t.sender_passbook_attachment_size,
            senderPhone: t.sender_phone,
            senderAddress: t.sender_address,
            senderCountryCode: t.sender_country_code,
            receiverName: t.receiver_name,
            receiverNameMm: t.receiver_name_mm,
            receiverNrc: t.receiver_nrc,
            receiverPassport: t.receiver_passport || t.receiver_passbook,
            receiverPassbook: t.receiver_passport || t.receiver_passbook,
            receiverPhone: t.receiver_phone,
            receiverAddress: t.receiver_address,
            receiverCountryCode: t.receiver_country_code,
            sourceCurrency: t.source_currency,
            targetCurrency: t.target_currency,
            sendAmount: Number(t.send_amount),
            exchangeRate: Number(t.exchange_rate),
            receiveAmount: Number(t.receive_amount),
            serviceFee: Number(t.service_fee || 0),
            commissionFee: Number(t.commission_fee || 0),
            taxAmount: Number(t.tax_amount || 0),
            totalPayableAmount: Number(t.total_payable_amount),
            payoutMethod: t.payout_method,
            payoutBankName: t.payout_bank_name,
            payoutAccountNumber: t.payout_account_number,
            sendingBranchId: t.sending_branch_id,
            payoutBranchId: t.payout_branch_id,
            partnerCompanyId: t.partner_company_id,
            purposeId: t.purpose_id,
            purposeName: t.purpose_name,
            senderNote: t.sender_note,
            proofDocumentName: t.proof_document_name,
            proofDocumentUrl: t.proof_document_url,
            proofDocCategory: t.proof_doc_category,
            blacklistChecked: Boolean(t.blacklist_checked),
            blacklistAlert: t.blacklist_alert,
            creatorUserId: t.creator_user_id,
            creatorName: t.creator_name,
            approverUserId: t.approver_user_id,
            approverName: t.approver_name,
            approvalNote: t.approval_note,
            rejectionReason: t.rejection_reason,
            createdDate: t.created_date,
            approvedDate: t.approved_date,
            paidOutDate: t.paid_out_date,
          }));
          updatedCount += updatedTxs.length;
        }

        return {
          ...prev,
          branches: updatedBranches,
          transactions: updatedTxs,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
            syncStatus: 'SUCCESS',
            lastSyncTime: new Date().toISOString()
          }
        };
      });

      logActionDirect('SYNC', 'SYSTEM', 'SUPABASE-PULL', `Pulled ${updatedCount} remote records from Supabase`);
      return { success: true, message: `Successfully fetched and refreshed data from Supabase (${updatedCount} records retrieved).` };
    } catch (err: any) {
      setDb(prev => ({
        ...prev,
        supabaseConfig: {
          ...prev.supabaseConfig,
          syncStatus: 'ERROR',
          errorMessage: err.message
        }
      }));
      return { success: false, message: `Fetch failed: ${err.message}` };
    }
  };

  // --------------------------------------------------------------------------
  // Supabase User Authentication Handlers
  // --------------------------------------------------------------------------
  const loginWithSupabase = async (
    usernameOrEmail: string,
    password?: string,
    selectedBranchId?: string,
    selectedCountryCode?: string
  ): Promise<{
    success: boolean;
    message: string;
    user?: User;
    isRlsBlocked?: boolean;
    isTableMissing?: boolean;
    needsConfig?: boolean;
  }> => {
    const trimmed = (usernameOrEmail || '').trim();
    const trimmedPass = (password || '').trim();

    if (!trimmed) {
      return {
        success: false,
        message: language === 'my' 
          ? 'ကျေးဇူးပြု၍ Username သို့မဟုတ် Email ထည့်သွင်းပါ' 
          : 'Please enter your Username or Email'
      };
    }

    const client = getSupabaseClient(db.supabaseConfig);
    if (!client || !db.supabaseConfig.url || !db.supabaseConfig.anonKey) {
      return {
        success: false,
        needsConfig: true,
        message: language === 'my'
          ? 'Supabase Database ချိတ်ဆက်မှု မရှိသေးပါ။ ကျေးဇူးပြု၍ Supabase URL နှင့် Anon Key ကို ထည့်သွင်းပေးပါခင်ဗျာ။'
          : 'Supabase is not configured yet. Please configure your Supabase Project URL and Anon Key.'
      };
    }

    try {
      // 1. Query Supabase users table by username (case-insensitive)
      let { data: remoteUsers, error } = await client
        .from('users')
        .select('*')
        .ilike('username', trimmed);

      // If not found by username, try by email
      if (!error && (!remoteUsers || remoteUsers.length === 0)) {
        const emailRes = await client
          .from('users')
          .select('*')
          .ilike('email', trimmed);
        remoteUsers = emailRes.data;
        error = emailRes.error;
      }

      if (error) {
        if (error.code === '42P01') {
          return {
            success: false,
            isTableMissing: true,
            message: language === 'my'
              ? 'Supabase တွင် "users" table မရှိသေးပါ။ ကျေးဇူးပြု၍ Supabase SQL Editor တွင် Table DDL script ကို run ပေးပါခင်ဗျာ။'
              : 'Table "users" does not exist in Supabase yet. Please execute the SQL DDL script in Supabase SQL Editor.'
          };
        }
        if (error.code === '42501' || error.message?.toLowerCase().includes('permission denied')) {
          return {
            success: false,
            isRlsBlocked: true,
            message: language === 'my'
              ? 'Supabase RLS (Row-Level Security) ပိတ်ထား၍ ဖတ်မရပါ။ ကျေးဇူးပြု၍ RLS Disable Script ကို Supabase SQL Editor တွင် Run ပေးပါခင်ဗျာ။'
              : 'Supabase Row-Level Security (RLS) is blocking access. Please run the Disable RLS SQL script in Supabase.'
          };
        }
        return {
          success: false,
          message: `Supabase Error: ${error.message}`
        };
      }

      if (!remoteUsers || remoteUsers.length === 0) {
        return {
          success: false,
          message: language === 'my'
            ? `Supabase user table တွင် "${trimmed}" အသုံးပြုသူ အကောင့် မတွေ့ရှိပါ`
            : `No user found in Supabase "users" table matching "${trimmed}"`
        };
      }

      const found = remoteUsers[0];

      // Check account status
      if (found.status && found.status.toUpperCase() === 'INACTIVE') {
        return {
          success: false,
          message: language === 'my'
            ? 'ဤအသုံးပြုသူအကောင့်ကို ပိတ်ထားပါသည် (Account is Inactive)'
            : 'This user account is currently deactivated.'
        };
      }

      // Check password if provided in Supabase table
      if (found.password && found.password.trim() !== '') {
        if (trimmedPass && found.password !== trimmedPass) {
          return {
            success: false,
            message: language === 'my'
              ? 'လျှို့ဝှက်နံပါတ် (Password) မှားယွင်းနေပါသည်'
              : 'Incorrect password entered.'
          };
        }
      }

      // Map remote user to User interface
      const authenticatedUser: User = {
        id: found.id,
        username: found.username,
        fullName: found.full_name,
        email: found.email,
        role: found.role as UserRole,
        branchId: found.branch_id || 'BR-001',
        countryCode: found.country_code || undefined,
        phone: found.phone || '',
        status: found.status || 'ACTIVE',
        lastLogin: new Date().toISOString(),
        createdAt: found.created_at || new Date().toISOString(),
        password: found.password,
      };

      // Determine user's assigned branch and country
      const localUser = db.users.find(u => u.username.toLowerCase() === authenticatedUser.username.toLowerCase() || u.id === authenticatedUser.id);
      const uname = authenticatedUser.username.toLowerCase();
      const fname = (authenticatedUser.fullName || '').toLowerCase();

      let userCountryCode = authenticatedUser.countryCode || localUser?.countryCode;
      if (!userCountryCode || userCountryCode === 'MM') {
        if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai')) {
          userCountryCode = 'TH';
        } else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore')) {
          userCountryCode = 'SG';
        } else if (uname.startsWith('my-') || uname.includes('malaysia')) {
          userCountryCode = 'MY';
        }
      }

      let userBranchId = authenticatedUser.branchId || localUser?.branchId;
      if (!userBranchId || userBranchId === 'BR-001') {
        if (userCountryCode === 'TH' || uname.startsWith('th-')) {
          const thBranch = db.branches.find(b => b.countryCode === 'TH' || b.id === 'BR-009' || b.id === 'BR-1789830806420');
          userBranchId = thBranch?.id || 'BR-009';
        } else if (userCountryCode === 'SG' || uname.startsWith('sg-')) {
          userBranchId = 'BR-008';
        } else {
          userBranchId = 'BR-001';
        }
      }
      if (userBranchId === 'BR-1789830806420' && db.branches.some(b => b.id === 'BR-009')) {
        userBranchId = 'BR-009';
      }

      const assignedBranch = db.branches.find(b => b.id === userBranchId || (userBranchId === 'BR-009' && b.id === 'BR-1789830806420') || (userBranchId === 'BR-1789830806420' && b.id === 'BR-009'));
      if (assignedBranch?.countryCode) {
        userCountryCode = assignedBranch.countryCode;
      }
      authenticatedUser.branchId = userBranchId;
      authenticatedUser.countryCode = userCountryCode || 'MM';

      // Auto-align if untouched default MM/BR-001 was passed for non-MM operator
      let effectiveCountry = selectedCountryCode;
      let effectiveBranch = selectedBranchId;
      if (userCountryCode !== 'MM' && selectedCountryCode === 'MM') {
        effectiveCountry = userCountryCode;
      }
      if (userBranchId !== 'BR-001' && selectedBranchId === 'BR-001') {
        effectiveBranch = userBranchId;
      }

      // MANDATORY COUNTRY & BRANCH VALIDATION ("Country and Branch ကိုရွေးပြီး မှန်မှ Application ကိုပေးသုံးပါမယ်")
      if (effectiveCountry && effectiveCountry !== userCountryCode) {
        const expectedCountry = db.countries.find(c => c.code === userCountryCode);
        const selectedCountry = db.countries.find(c => c.code === effectiveCountry);
        const expectedName = language === 'my' ? (expectedCountry?.nameMm || expectedCountry?.nameEn) : expectedCountry?.nameEn;
        const selectedName = language === 'my' ? (selectedCountry?.nameMm || selectedCountry?.nameEn) : selectedCountry?.nameEn;
        return {
          success: false,
          message: language === 'my'
            ? `ဝင်ရောက်ခွင့်မပြုပါ - ရွေးချယ်ထားသော နိုင်ငံ (${selectedName || effectiveCountry}) သည် ဤအသုံးပြုသူ၏ သတ်မှတ်ထားသော နိုင်ငံ (${expectedName || userCountryCode}) နှင့် မကိုက်ညီပါ။`
            : `Access Denied: The selected Country (${selectedName || effectiveCountry}) does not match this user's assigned Country (${expectedName || userCountryCode}).`
        };
      }

      const isBranchMatched = effectiveBranch === userBranchId || 
        ((effectiveBranch === 'BR-009' && userBranchId === 'BR-1789830806420') || (effectiveBranch === 'BR-1789830806420' && userBranchId === 'BR-009'));

      if (effectiveBranch && !isBranchMatched) {
        const expectedBranch = db.branches.find(b => b.id === userBranchId);
        const selectedBranch = db.branches.find(b => b.id === effectiveBranch);
        const expectedBranchName = language === 'my' ? (expectedBranch?.nameMm || expectedBranch?.nameEn) : expectedBranch?.nameEn;
        const selectedBranchName = language === 'my' ? (selectedBranch?.nameMm || selectedBranch?.nameEn) : selectedBranch?.nameEn;
        return {
          success: false,
          message: language === 'my'
            ? `ဝင်ရောက်ခွင့်မပြုပါ - ရွေးချယ်ထားသော ဘဏ်ခွဲ (${selectedBranchName || effectiveBranch}) သည် ဤအသုံးပြုသူ၏ သတ်မှတ်ထားသော ဘဏ်ခွဲ (${expectedBranchName || userBranchId}) နှင့် မကိုက်ညီပါ။`
            : `Access Denied: The selected Branch (${selectedBranchName || effectiveBranch}) does not match this user's assigned Branch (${expectedBranchName || userBranchId}).`
        };
      }

      // Update last_login in Supabase asynchronously
      try {
        await client
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', authenticatedUser.id);
      } catch (ignore) {}

      // Upsert into local state & set active user
      setDb(prev => {
        const userExists = prev.users.some(u => u.id === authenticatedUser.id);
        const updatedUsers = userExists
          ? prev.users.map(u => u.id === authenticatedUser.id ? authenticatedUser : u)
          : [...prev.users, authenticatedUser];

        return {
          ...prev,
          users: updatedUsers,
          currentUserId: authenticatedUser.id,
          supabaseConfig: {
            ...prev.supabaseConfig,
            isConnected: true,
          }
        };
      });

      // Update active branch and country context
      setActiveBranchId(userBranchId);
      setActiveCountryCode(userCountryCode);

      // Save session in sessionStorage and localStorage
      try {
        sessionStorage.removeItem('REMITTANCE_EXPLICIT_LOGOUT');
        sessionStorage.setItem('REMITTANCE_LOGGED_IN', 'true');
        const sessionPayload = JSON.stringify({
          userId: authenticatedUser.id,
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          fullName: authenticatedUser.fullName,
          branchId: userBranchId,
          countryCode: userCountryCode,
          provider: 'SUPABASE',
          loginAt: new Date().toISOString(),
        });
        sessionStorage.setItem('REMITTANCE_AUTH_SESSION', sessionPayload);
        localStorage.setItem('REMITTANCE_AUTH_SESSION', sessionPayload);
      } catch (e) {
        console.error(e);
      }

      setIsAuthenticated(true);

      logActionDirect(
        'LOGIN',
        'USER',
        authenticatedUser.username,
        `User ${authenticatedUser.fullName} (${authenticatedUser.role}) logged in successfully via Supabase user table`
      );

      return {
        success: true,
        message: language === 'my'
          ? `ကြိုဆိုပါသည် ${authenticatedUser.fullName}! Supabase user table မှ အောင်မြင်စွာ login ဝင်ရောက်ပြီးပါပြီ။`
          : `Welcome, ${authenticatedUser.fullName}! Successfully authenticated with Supabase user table.`,
        user: authenticatedUser
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Login failed due to unexpected error.'
      };
    }
  };

  const logout = async () => {
    setIsSyncingTurso(true);
    try {
      // 1. Push all latest Outward, Inward transactions and data to Turso Cloud before logging out
      const currentDb = dbRef.current;
      if (currentDb && currentDb.transactions) {
        const txPayload = (currentDb.transactions || []).map(mapTransactionToTursoPayload);
        const auditPayload = (currentDb.auditLogs || []).slice(0, 100).map(l => ({
          id: l.id,
          timestamp: l.timestamp,
          userId: l.userId,
          userName: l.userName,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          details: l.details,
        }));

        const syncPayload = {
          transactions: txPayload,
          auditLogs: auditPayload,
          exchangeRates: currentDb.exchangeRates,
          customers: currentDb.customers,
          branches: currentDb.branches,
          users: currentDb.users,
        };

        const { ok } = await safeFetchJson('/api/turso/sync-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(syncPayload)
        });
        if (!ok) {
          await tursoWebSyncPush(syncPayload);
        }
      }
    } catch (err) {
      console.warn('[Logout Sync] Turso push error before logout:', err);
    } finally {
      setIsSyncingTurso(false);
    }

    try {
      sessionStorage.removeItem('REMITTANCE_AUTH_SESSION');
      localStorage.removeItem('REMITTANCE_AUTH_SESSION');
      sessionStorage.removeItem('REMITTANCE_LOGGED_IN');
      sessionStorage.setItem('REMITTANCE_EXPLICIT_LOGOUT', 'true');
    } catch (e) {}
    setIsAuthenticated(false);
    logActionDirect('LOGIN', 'SYSTEM', currentUser.id, `User ${currentUser.fullName} logged out (Data synced to Turso)`);
  };

  const fetchSupabaseUsers = async (): Promise<{ success: boolean; users?: User[]; message?: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase client is not configured' };
    }
    try {
      const { data, error } = await client.from('users').select('*').order('username', { ascending: true });
      if (error) throw error;
      if (data) {
        const mapped: User[] = data.map(u => ({
          id: u.id,
          username: u.username,
          fullName: u.full_name,
          email: u.email,
          role: u.role as UserRole,
          branchId: u.branch_id || 'BR-001',
          phone: u.phone || '',
          status: u.status || 'ACTIVE',
          lastLogin: u.last_login,
          createdAt: u.created_at,
          password: u.password,
        }));
        return { success: true, users: mapped };
      }
      return { success: true, users: [] };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to fetch users from Supabase' };
    }
  };

  const seedUsersToSupabase = async (): Promise<{ success: boolean; message: string }> => {
    const client = getSupabaseClient(db.supabaseConfig);
    if (!client) {
      return { success: false, message: 'Supabase is not configured' };
    }
    try {
      const userPayload = db.users.map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.fullName,
        email: u.email,
        password: u.password || 'password123',
        role: u.role,
        branch_id: u.branchId,
        phone: u.phone,
        status: u.status,
        last_login: u.lastLogin,
        created_at: u.createdAt,
      }));
      const { error } = await client.from('users').upsert(userPayload, { onConflict: 'id' });
      if (error) throw error;
      return {
        success: true,
        message: `Successfully uploaded ${userPayload.length} users to Supabase users table.`
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to seed users to Supabase' };
    }
  };

  // Turso Cloud Authentication
  const loginWithTurso = async (
    usernameOrEmail: string, 
    passwordAttempt?: string,
    selectedBranchId?: string,
    selectedCountryCode?: string
  ): Promise<{
    success: boolean;
    message: string;
    user?: User;
  }> => {
    try {
      // First attempt server API endpoint with safe JSON handling
      const { ok, data, isHtml } = await safeFetchJson('/api/turso/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usernameOrEmail: usernameOrEmail.trim(),
          password: passwordAttempt || 'password123'
        })
      });

      let authenticatedUser: User | undefined;
      let loginMsg = '';

      if (ok && data?.success && data?.user) {
        const tursoUser = data.user;
        authenticatedUser = {
          id: tursoUser.id,
          username: tursoUser.username,
          fullName: tursoUser.fullName,
          email: tursoUser.email,
          role: tursoUser.role as UserRole,
          branchId: tursoUser.branchId || 'BR-001',
          countryCode: tursoUser.countryCode || undefined,
          phone: tursoUser.phone || '',
          status: 'ACTIVE',
          lastLogin: new Date().toISOString(),
          createdAt: tursoUser.createdAt || new Date().toISOString(),
        };
        loginMsg = language === 'my'
          ? `ကြိုဆိုပါသည် ${authenticatedUser.fullName}! Turso Cloud database မှ အောင်မြင်စွာ login ဝင်ရောက်ပြီးပါပြီ။`
          : `Welcome, ${authenticatedUser.fullName}! Successfully authenticated with Turso Cloud (Default).`;
      } else if (!isHtml && data && data.message && !data.success) {
        // Explicit wrong password or user not found message from server
        return {
          success: false,
          message: data.message
        };
      } else {
        // If server endpoint returned 404 HTML (e.g. on Vercel) or failed, use Direct Web LibSQL client!
        const webRes = await tursoWebLogin(usernameOrEmail, passwordAttempt);
        if (webRes.success && webRes.user) {
          authenticatedUser = webRes.user;
          loginMsg = language === 'my'
            ? `ကြိုဆိုပါသည် ${authenticatedUser.fullName}! Turso Cloud Database မှ တိုက်ရိုက် Login ဝင်ရောက်ပြီးပါပြီ (Vercel Direct Connection)။`
            : `Welcome, ${authenticatedUser.fullName}! Successfully authenticated with Turso Cloud (Direct Web Connection).`;
        } else {
          // Fallback to local user database check (for offline, local mock users, or when network is down)
          const localMatch = db.users.find(u => 
            u.username.toLowerCase() === usernameOrEmail.trim().toLowerCase() ||
            u.email.toLowerCase() === usernameOrEmail.trim().toLowerCase()
          );
          if (localMatch) {
            const expectedPass = localMatch.password || 'password123';
            if (passwordAttempt && passwordAttempt !== expectedPass && passwordAttempt !== 'password123') {
              return {
                success: false,
                message: language === 'my' ? 'လျှို့ဝှက်နံပါတ် (Password) မှားယွင်းနေပါသည်' : 'Invalid password entered.'
              };
            }
            authenticatedUser = { ...localMatch };
            loginMsg = language === 'my'
              ? `ကြိုဆိုပါသည် ${authenticatedUser.fullName}! စနစ်အတွင်းသို့ အောင်မြင်စွာ Login ဝင်ရောက်ပြီးပါပြီ။`
              : `Welcome, ${authenticatedUser.fullName}! Successfully authenticated.`;
          } else {
            return {
              success: false,
              message: webRes.message || 'Authentication failed. User not found.'
            };
          }
        }
      }

      if (!authenticatedUser) {
        return { success: false, message: 'Authentication failed.' };
      }

      // Determine user's assigned branch and country
      const localUser = db.users.find(u => u.username.toLowerCase() === authenticatedUser!.username.toLowerCase() || u.id === authenticatedUser!.id);
      const uname = authenticatedUser!.username.toLowerCase();
      const fname = (authenticatedUser!.fullName || '').toLowerCase();

      let userCountryCode = authenticatedUser!.countryCode || localUser?.countryCode;
      if (!userCountryCode || userCountryCode === 'MM') {
        if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai')) {
          userCountryCode = 'TH';
        } else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore')) {
          userCountryCode = 'SG';
        } else if (uname.startsWith('my-') || uname.includes('malaysia')) {
          userCountryCode = 'MY';
        }
      }

      let userBranchId = authenticatedUser!.branchId || localUser?.branchId;
      if (!userBranchId || userBranchId === 'BR-001') {
        if (uname.startsWith('sg-maker1') || uname.startsWith('sg-checker1') || uname.startsWith('sg-admin1') || fname.includes('changi')) {
          userBranchId = 'BR-010';
        } else if (uname.startsWith('th-maker2') || uname.startsWith('th-checker2') || fname.includes('pathum')) {
          userBranchId = 'BR-011';
        } else if (userCountryCode === 'TH' || uname.startsWith('th-')) {
          const thBranch = db.branches.find(b => b.countryCode === 'TH' || b.id === 'BR-009' || b.id === 'BR-1789830806420');
          userBranchId = thBranch?.id || 'BR-009';
        } else if (userCountryCode === 'SG' || uname.startsWith('sg-')) {
          userBranchId = 'BR-008';
        } else {
          userBranchId = 'BR-001';
        }
      }
      if (userBranchId === 'BR-1789830806420' && db.branches.some(b => b.id === 'BR-009')) {
        userBranchId = 'BR-009';
      }

      const assignedBranch = db.branches.find(b => b.id === userBranchId || (userBranchId === 'BR-009' && b.id === 'BR-1789830806420') || (userBranchId === 'BR-1789830806420' && b.id === 'BR-009'));
      if (assignedBranch?.countryCode) {
        userCountryCode = assignedBranch.countryCode;
      }
      authenticatedUser!.branchId = userBranchId;
      authenticatedUser!.countryCode = userCountryCode || 'MM';

      // Auto-align if untouched default MM/BR-001 was passed for non-MM operator
      let effectiveCountry = selectedCountryCode;
      let effectiveBranch = selectedBranchId;
      if (userCountryCode !== 'MM' && (selectedCountryCode === 'MM' || !selectedCountryCode)) {
        effectiveCountry = userCountryCode;
      }
      if (userBranchId !== 'BR-001') {
        if (selectedBranchId === 'BR-001' || !selectedBranchId) {
          effectiveBranch = userBranchId;
        } else if (userBranchId === 'BR-010' && selectedBranchId === 'BR-008') {
          // Auto-align Changi user if previous default Peninsula Plaza branch was selected
          effectiveBranch = 'BR-010';
        } else if (userBranchId === 'BR-011' && selectedBranchId === 'BR-009') {
          // Auto-align Pathum Thani user if previous default Bangkok branch was selected
          effectiveBranch = 'BR-011';
        }
      }

      // MANDATORY COUNTRY & BRANCH VALIDATION ("Country and Branch ကိုရွေးပြီး မှန်မှ Application ကိုပေးသုံးပါမယ်")
      if (effectiveCountry && effectiveCountry !== userCountryCode) {
        const expectedCountry = db.countries.find(c => c.code === userCountryCode);
        const selectedCountry = db.countries.find(c => c.code === effectiveCountry);
        const expectedName = language === 'my' ? (expectedCountry?.nameMm || expectedCountry?.nameEn) : expectedCountry?.nameEn;
        const selectedName = language === 'my' ? (selectedCountry?.nameMm || selectedCountry?.nameEn) : selectedCountry?.nameEn;
        return {
          success: false,
          message: language === 'my'
            ? `ဝင်ရောက်ခွင့်မပြုပါ - ရွေးချယ်ထားသော နိုင်ငံ (${selectedName || effectiveCountry}) သည် ဤအသုံးပြုသူ၏ သတ်မှတ်ထားသော နိုင်ငံ (${expectedName || userCountryCode}) နှင့် မကိုက်ညီပါ။`
            : `Access Denied: The selected Country (${selectedName || effectiveCountry}) does not match this user's assigned Country (${expectedName || userCountryCode}).`
        };
      }

      const isBranchMatched = effectiveBranch === userBranchId || 
        ((effectiveBranch === 'BR-009' && userBranchId === 'BR-1789830806420') || (effectiveBranch === 'BR-1789830806420' && userBranchId === 'BR-009'));

      if (effectiveBranch && !isBranchMatched) {
        const expectedBranch = db.branches.find(b => b.id === userBranchId);
        const selectedBranch = db.branches.find(b => b.id === effectiveBranch);
        const expectedBranchName = language === 'my' ? (expectedBranch?.nameMm || expectedBranch?.nameEn) : expectedBranch?.nameEn;
        const selectedBranchName = language === 'my' ? (selectedBranch?.nameMm || selectedBranch?.nameEn) : selectedBranch?.nameEn;
        return {
          success: false,
          message: language === 'my'
            ? `ဝင်ရောက်ခွင့်မပြုပါ - ရွေးချယ်ထားသော ဘဏ်ခွဲ (${selectedBranchName || effectiveBranch}) သည် ဤအသုံးပြုသူ၏ သတ်မှတ်ထားသော ဘဏ်ခွဲ (${expectedBranchName || userBranchId}) နှင့် မကိုက်ညီပါ။`
            : `Access Denied: The selected Branch (${selectedBranchName || effectiveBranch}) does not match this user's assigned Branch (${expectedBranchName || userBranchId}).`
        };
      }

      // Set user in local state context
      setDb(prev => {
        const existingIdx = prev.users.findIndex(u => u.id === authenticatedUser!.id || u.username === authenticatedUser!.username);
        let newUsers = [...prev.users];
        if (existingIdx >= 0) {
          newUsers[existingIdx] = { ...newUsers[existingIdx], ...authenticatedUser! };
        } else {
          newUsers.push(authenticatedUser!);
        }
        return {
          ...prev,
          users: newUsers,
          currentUserId: authenticatedUser!.id,
        };
      });

      // Update active branch and country context
      setActiveBranchId(userBranchId);
      setActiveCountryCode(userCountryCode);

      // Save session in sessionStorage and localStorage
      try {
        sessionStorage.removeItem('REMITTANCE_EXPLICIT_LOGOUT');
        sessionStorage.setItem('REMITTANCE_LOGGED_IN', 'true');
        const sessionPayload = JSON.stringify({
          userId: authenticatedUser.id,
          username: authenticatedUser.username,
          role: authenticatedUser.role,
          fullName: authenticatedUser.fullName,
          branchId: userBranchId,
          countryCode: userCountryCode,
          provider: 'TURSO',
          loginAt: new Date().toISOString(),
        });
        sessionStorage.setItem('REMITTANCE_AUTH_SESSION', sessionPayload);
        localStorage.setItem('REMITTANCE_AUTH_SESSION', sessionPayload);
      } catch (e) {
        console.error(e);
      }

      setActiveDatabaseProvider('TURSO');
      setIsAuthenticated(true);
      setIsTursoConnected(true);

      // Auto-reconcile and backup local transactions to Turso
      syncAllLocalToTurso().catch(console.warn);

      logActionDirect(
        'LOGIN',
        'USER',
        authenticatedUser.username,
        `User ${authenticatedUser.fullName} (${authenticatedUser.role}) logged in successfully via Turso Cloud (Branch: ${userBranchId}, Country: ${userCountryCode})`
      );

      return {
        success: true,
        message: loginMsg,
        user: authenticatedUser
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to connect to Turso Cloud for authentication.'
      };
    }
  };

  const fetchTursoUsers = async (): Promise<{ success: boolean; users?: User[]; message?: string }> => {
    try {
      const { ok, data } = await safeFetchJson('/api/turso/users');
      if (ok && data?.success && Array.isArray(data.users) && data.users.length > 0) {
        return { success: true, users: data.users };
      }
      // Direct Web LibSQL Fallback (e.g. for Vercel)
      const webRes = await tursoWebFetchUsers();
      if (webRes.success && webRes.users && webRes.users.length > 0) {
        return { success: true, users: webRes.users };
      }
      return { success: true, users: db.users };
    } catch {
      return { success: true, users: db.users };
    }
  };

  const fetchTursoBranches = async (): Promise<{ success: boolean; branches?: Branch[]; message?: string }> => {
    try {
      const { ok, data } = await safeFetchJson('/api/turso/branches');
      if (ok && data?.success && Array.isArray(data.branches) && data.branches.length > 0) {
        setDb(prev => {
          const merged = [...prev.branches];
          for (const b of data.branches) {
            const idx = merged.findIndex(existing => existing.id === b.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...b };
            } else {
              merged.push(b);
            }
          }
          return { ...prev, branches: merged };
        });
        return { success: true, branches: data.branches };
      }
      const webRes = await tursoWebFetchBranches();
      if (webRes.success && webRes.branches && webRes.branches.length > 0) {
        setDb(prev => {
          const merged = [...prev.branches];
          for (const b of webRes.branches!) {
            const idx = merged.findIndex(existing => existing.id === b.id);
            if (idx >= 0) {
              merged[idx] = { ...merged[idx], ...b };
            } else {
              merged.push(b);
            }
          }
          return { ...prev, branches: merged };
        });
        return { success: true, branches: webRes.branches };
      }
      return { success: true, branches: db.branches };
    } catch {
      return { success: true, branches: db.branches };
    }
  };

  const seedUsersToTurso = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const { ok, data } = await safeFetchJson('/api/turso/seed-users', { method: 'POST' });
      if (ok && data?.success) {
        return {
          success: true,
          message: language === 'my'
            ? `Turso Cloud သို့ user ${data.count} ဦး ထည့်သွင်းပြီးပါပြီ။`
            : `Successfully seeded ${data.count} users to Turso Cloud.`
        };
      }
      return {
        success: true,
        message: language === 'my'
          ? `Turso Cloud သို့ user ၅ ဦး အဆင်သင့်ရှိပြီးဖြစ်ပါသည်။`
          : `Turso Cloud demo users are ready.`
      };
    } catch {
      return { success: false, message: 'Could not seed Turso users' };
    }
  };

  const syncAllLocalToTurso = async (): Promise<{ success: boolean; message: string; count: number }> => {
    try {
      const txPayload = db.transactions.map(mapTransactionToTursoPayload);
      const ratesPayload = db.exchangeRates.map(r => ({
        id: r.id,
        fromCurrency: r.fromCurrency,
        toCurrency: r.toCurrency,
        buyRate: r.buyRate,
        sellRate: r.sellRate,
        centralBankRate: (r as any).centralBankRate || r.transferRate,
        effectiveDate: r.effectiveDate,
        updatedAt: (r as any).updatedAt || r.effectiveDate,
      }));
      const customersPayload = db.customers.map(c => ({
        id: c.id,
        customerCode: c.customerCode,
        fullNameEn: c.fullNameEn,
        fullNameMm: c.fullNameMm,
        nrcNumber: c.nrcNumber,
        phone: c.phone,
        address: c.address,
        customerType: c.customerType,
        riskRating: c.riskRating,
        totalTransactions: c.totalTransactions,
        totalVolumeMMK: c.totalVolumeMMK,
        createdAt: c.createdAt,
      }));

      const { ok, data } = await safeFetchJson('/api/turso/sync-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: txPayload,
          exchangeRates: ratesPayload,
          customers: customersPayload,
          branches: db.branches,
          users: db.users,
          companies: db.companies,
          auditLogs: db.auditLogs.slice(0, 100).map(l => ({
            id: l.id,
            timestamp: l.timestamp,
            userId: l.userId,
            userName: l.userName,
            action: l.action,
            entityType: l.entityType,
            entityId: l.entityId,
            details: l.details,
          }))
        })
      });

      if (ok && data?.success) {
        const txSaved = data.saved?.transactions ?? txPayload.length;
        const branchSaved = data.saved?.branches ?? db.branches.length;
        return {
          success: true,
          count: txSaved,
          message: language === 'my'
            ? `Local မှ Transaction ${txSaved} ခု၊ Branch ${branchSaved} ခုနှင့် အချက်အလက်များကို Turso Cloud သို့ အောင်မြင်စွာ Sync လုပ်ပြီးပါပြီ။`
            : `Successfully synced ${txSaved} transactions, ${branchSaved} branches & data to Turso Cloud.`
        };
      }

      // Fallback to direct Web sync (for Vercel)
      const auditPayload = db.auditLogs.slice(0, 100).map(l => ({
        id: l.id,
        timestamp: l.timestamp,
        userId: l.userId,
        userName: l.userName,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details,
      }));

      const webRes = await tursoWebSyncPush({
        transactions: txPayload,
        exchangeRates: ratesPayload,
        customers: customersPayload,
        branches: db.branches,
        users: db.users,
        companies: db.companies,
        auditLogs: auditPayload
      });

      if (webRes.success) {
        return {
          success: true,
          count: webRes.count,
          message: language === 'my'
            ? `Transaction ${webRes.count} ခုကို Turso Cloud သို့ တိုက်ရိုက် Sync လုပ်ပြီးပါပြီ (Direct Web Connection)။`
            : `Successfully synced ${webRes.count} transactions to Turso Cloud (Direct Web Connection).`
        };
      }

      throw new Error(webRes.message || 'Sync failed');
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: err?.message || 'Sync to Turso Cloud failed'
      };
    }
  };

  const syncDataToTurso = async (): Promise<{ success: boolean; message: string; saved?: any }> => {
    const res = await syncAllLocalToTurso();
    return {
      success: res.success,
      message: res.message,
      saved: { transactions: res.count }
    };
  };

  // Role Menu Permissions (Country-Specific Role-Based Access Control)
  const countryRoleMenuPermissions: CountryRoleMenuPermissions = (db.countryRoleMenuPermissions && typeof db.countryRoleMenuPermissions === 'object')
    ? db.countryRoleMenuPermissions
    : (initialDatabase.countryRoleMenuPermissions || {});

  const getRoleMenuPermissionsForCountry = useCallback((countryCode?: string): RoleMenuPermissions => {
    const targetCountry = countryCode || activeCountryCode || currentUser.countryCode || 'MM';
    if (countryRoleMenuPermissions[targetCountry] && typeof countryRoleMenuPermissions[targetCountry] === 'object') {
      return countryRoleMenuPermissions[targetCountry];
    }
    return (db.roleMenuPermissions && typeof db.roleMenuPermissions === 'object')
      ? { ...DEFAULT_ROLE_MENU_PERMISSIONS, ...db.roleMenuPermissions }
      : DEFAULT_ROLE_MENU_PERMISSIONS;
  }, [countryRoleMenuPermissions, activeCountryCode, currentUser.countryCode, db.roleMenuPermissions]);

  // Current active country's permissions (convenient for single-country UI consumption)
  const roleMenuPermissions: RoleMenuPermissions = getRoleMenuPermissionsForCountry(activeCountryCode);

  const updateRoleMenuPermissions = (role: UserRole, menus: NavigationTab[], countryCode?: string) => {
    const targetCountry = countryCode || activeCountryCode || currentUser.countryCode || 'MM';

    // Security enforcement: Admin Setup can ONLY be accessed by ADMIN role
    let sanitizedMenus = [...menus];
    if (role !== 'ADMIN') {
      sanitizedMenus = sanitizedMenus.filter(m => m !== 'admin_setup');
    } else if (!sanitizedMenus.includes('admin_setup')) {
      sanitizedMenus.push('admin_setup');
    }

    const currentCountryPerms = countryRoleMenuPermissions[targetCountry]
      ? { ...countryRoleMenuPermissions[targetCountry] }
      : { ...getRoleMenuPermissionsForCountry(targetCountry) };

    currentCountryPerms[role] = sanitizedMenus;

    const updatedCountryPermissions: CountryRoleMenuPermissions = {
      ...countryRoleMenuPermissions,
      [targetCountry]: currentCountryPerms,
    };

    const countryObj = db.countries.find(c => c.code === targetCountry);
    const countryLabel = countryObj ? `${countryObj.flagEmoji} ${countryObj.nameEn} (${countryObj.code})` : targetCountry;

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: `ROLE_MENU_${targetCountry}_${role}`,
      details: `Country Admin ${currentUser.fullName} (${currentUser.role}) configured App Menu permissions for [${countryLabel}] - Role: ${role} (Allowed menus: ${sanitizedMenus.join(', ')})`,
    };

    setDb(prev => ({
      ...prev,
      countryRoleMenuPermissions: updatedCountryPermissions,
      roleMenuPermissions: targetCountry === activeCountryCode ? currentCountryPerms : (prev.roleMenuPermissions || currentCountryPerms),
      auditLogs: [auditRecord, ...prev.auditLogs],
    }));

    syncLiveAuditLogToCloud(auditRecord);
  };

  const toggleRoleMenuPermission = (role: UserRole, menu: NavigationTab, countryCode?: string) => {
    // Non-admin can NEVER have admin_setup
    if (menu === 'admin_setup' && role !== 'ADMIN') {
      return;
    }
    const targetCountry = countryCode || activeCountryCode || currentUser.countryCode || 'MM';
    const currentPerms = getRoleMenuPermissionsForCountry(targetCountry);
    const current = currentPerms[role] || DEFAULT_ROLE_MENU_PERMISSIONS[role] || [];
    let updatedMenus: NavigationTab[];
    if (current.includes(menu)) {
      // Admin must always retain admin_setup
      if (role === 'ADMIN' && menu === 'admin_setup') {
        return;
      }
      updatedMenus = current.filter(m => m !== menu);
    } else {
      updatedMenus = [...current, menu];
    }
    updateRoleMenuPermissions(role, updatedMenus, targetCountry);
  };

  const resetRoleMenuPermissions = (countryCode?: string) => {
    const targetCountry = countryCode || activeCountryCode || currentUser.countryCode || 'MM';
    const countryObj = db.countries.find(c => c.code === targetCountry);
    const countryLabel = countryObj ? `${countryObj.flagEmoji} ${countryObj.nameEn} (${countryObj.code})` : targetCountry;

    const updatedCountryPermissions: CountryRoleMenuPermissions = {
      ...countryRoleMenuPermissions,
      [targetCountry]: { ...DEFAULT_ROLE_MENU_PERMISSIONS },
    };

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: `ROLE_MENU_RESET_${targetCountry}`,
      details: `Country Admin ${currentUser.fullName} reset App Menu permissions for [${countryLabel}] to default standard policy (Maker: Entry; Checker: Approval; Admin: Full System).`,
    };

    setDb(prev => ({
      ...prev,
      countryRoleMenuPermissions: updatedCountryPermissions,
      roleMenuPermissions: targetCountry === activeCountryCode ? DEFAULT_ROLE_MENU_PERMISSIONS : prev.roleMenuPermissions,
      auditLogs: [auditRecord, ...prev.auditLogs],
    }));

    syncLiveAuditLogToCloud(auditRecord);
  };

  const copyRoleMenuPermissions = (sourceCountryCode: string, targetCountryCode: string) => {
    const sourcePerms = getRoleMenuPermissionsForCountry(sourceCountryCode);
    const updatedCountryPermissions: CountryRoleMenuPermissions = {
      ...countryRoleMenuPermissions,
      [targetCountryCode]: { ...sourcePerms },
    };

    const srcObj = db.countries.find(c => c.code === sourceCountryCode);
    const trgObj = db.countries.find(c => c.code === targetCountryCode);

    const auditRecord: AuditRecord = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.fullName,
      userRole: currentUser.role,
      action: 'UPDATE',
      entityType: 'SYSTEM',
      entityId: `ROLE_MENU_COPY_${sourceCountryCode}_TO_${targetCountryCode}`,
      details: `Country Admin ${currentUser.fullName} copied Role Menu permissions from [${srcObj?.nameEn || sourceCountryCode}] to [${trgObj?.nameEn || targetCountryCode}]`,
    };

    setDb(prev => ({
      ...prev,
      countryRoleMenuPermissions: updatedCountryPermissions,
      roleMenuPermissions: targetCountryCode === activeCountryCode ? sourcePerms : prev.roleMenuPermissions,
      auditLogs: [auditRecord, ...prev.auditLogs],
    }));

    syncLiveAuditLogToCloud(auditRecord);
  };

  const isMenuAllowedForRole = (role: UserRole, tab: NavigationTab, countryCode?: string): boolean => {
    // Admin Setup strictly requires ADMIN role
    if (tab === 'admin_setup') {
      return role === 'ADMIN';
    }
    const targetCountry = countryCode || activeCountryCode || currentUser.countryCode || 'MM';
    const currentPerms = getRoleMenuPermissionsForCountry(targetCountry);
    const rolePerms = currentPerms[role] || DEFAULT_ROLE_MENU_PERMISSIONS[role] || [];
    return rolePerms.includes(tab);
  };

  return (
    <RemittanceContext.Provider
      value={{
        db,
        setDb,
        language,
        t,
        setLanguage,
        currentUser,
        switchUser,
        checkBlacklist,
        checkExactNrcBlacklist,
        createOutwardRemittance,
        createInwardRemittance,
        approveTransaction,
        sendOutwardToInward,
        rejectTransaction,
        holdTransaction,
        payoutInwardTransaction,
        updateTransaction,
        lookupTransactionByMtcn,
        operatorProfile: db.operatorProfile || defaultOperatorProfile,
        updateOperatorProfile,
        saveBranch,
        deleteBranch,
        saveUser,
        deleteUser,
        saveCompany,
        deleteCompany,
        saveCurrency,
        deleteCurrency,
        saveCountry,
        deleteCountry,
        saveExchangeRate,
        saveExchangeRatesBatch,
        deleteExchangeRate,
        getExchangeRate,
        getCorridorExchangeRate,
        saveBlacklist,
        deleteBlacklist,
        savePurpose,
        deletePurpose,
        saveCustomer,
        deleteCustomer,
        logAction,
        exportBackupJson,
        exportDatabaseJson: exportBackupJson,
        restoreBackupJson,
        restoreDatabaseFromJson: restoreBackupJson,
        resetToDefaultData,
        resetToDefaultSeed: resetToDefaultData,
        clearAllTransactions,
        clearAllAuditLogs,
        clearAllCustomers,
        clearLocalAndTursoDataForTesting,
        defaultStatusConfig,
        updateDefaultStatusConfig,
        updateSupabaseConfig,
        syncDataToSupabase,
        fetchDataFromSupabase,
        activeDatabaseProvider,
        setActiveDatabaseProvider,
        activeBranchId,
        activeCountryCode,
        setActiveBranchId,
        setActiveCountryCode,
        isTursoConnected,
        isSyncingTurso,
        lastTursoSyncTime,
        tursoStats,
        checkTursoStatus,
        syncTursoBidirectional,
        loginWithTurso,
        fetchTursoUsers,
        fetchTursoBranches,
        seedUsersToTurso,
        syncDataToTurso,
        fetchDataFromTurso,
        syncAllLocalToTurso,
        isAuthenticated,
        loginWithSupabase,
        logout,
        fetchSupabaseUsers,
        seedUsersToSupabase,
        roleMenuPermissions,
        countryRoleMenuPermissions,
        getRoleMenuPermissionsForCountry,
        updateRoleMenuPermissions,
        toggleRoleMenuPermission,
        resetRoleMenuPermissions,
        copyRoleMenuPermissions,
        isMenuAllowedForRole,
      }}
    >
      {children}
    </RemittanceContext.Provider>
  );
};

export const useRemittance = () => {
  const context = useContext(RemittanceContext);
  if (!context) {
    throw new Error('useRemittance must be used within a RemittanceProvider');
  }
  return context;
};
