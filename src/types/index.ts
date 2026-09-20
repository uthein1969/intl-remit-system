export type Language = 'en' | 'my';

export type UserRole = 'ADMIN' | 'MAKER' | 'CHECKER' | 'AUDITOR';

export type NavigationTab = 
  | 'dashboard'
  | 'outward_entry'
  | 'outward_approve'
  | 'inward_entry'
  | 'inward_approve'
  | 'outward_report'
  | 'total_outward_report'
  | 'inward_report'
  | 'total_inward_report'
  | 'admin_setup'
  | 'audit_log'
  | 'backup_restore'
  | 'turso_sync';

export type RoleMenuPermissions = Record<UserRole, NavigationTab[]>;

export const DEFAULT_ROLE_MENU_PERMISSIONS: RoleMenuPermissions = {
  ADMIN: [
    'dashboard',
    'outward_entry',
    'outward_approve',
    'inward_entry',
    'inward_approve',
    'outward_report',
    'total_outward_report',
    'inward_report',
    'total_inward_report',
    'admin_setup',
    'audit_log',
    'backup_restore',
    'turso_sync',
  ],
  MAKER: [
    'dashboard',
    'outward_entry',
    'inward_entry',
  ],
  CHECKER: [
    'dashboard',
    'outward_approve',
    'inward_approve',
  ],
  AUDITOR: [
    'dashboard',
    'outward_report',
    'total_outward_report',
    'inward_report',
    'total_inward_report',
    'audit_log',
  ],
};

export type RemittanceType = 'OUTWARD' | 'INWARD';

export type RemittanceScope = 'DOMESTIC' | 'INTERNATIONAL';

export type RemittanceStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'PAID_OUT' 
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type PayoutMethod = 'CASH_PICKUP' | 'BANK_ACCOUNT' | 'MOBILE_WALLET';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Branch {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  countryCode?: string;
  city: string;
  phone: string;
  address: string;
  managerName: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  branchId: string;
  countryCode?: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLogin?: string;
  createdAt: string;
  password?: string;
  defaultStatusEnabled?: boolean;
}

export interface Company {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  countryCode: string;
  type: 'BANK' | 'AGENT' | 'FINTECH' | 'MONEY_CHANGER';
  swiftCode?: string;
  licenseNo: string;
  phone: string;
  email: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export interface Currency {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  symbol: string;
  isBaseCurrency: boolean;
  decimals: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Country {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  dialCode: string;
  flagEmoji: string;
  currencyCode: string;
  isDomestic: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  buyRate: number;
  sellRate: number;
  transferRate: number; // Remittance special rate
  effectiveDate: string; // YYYY-MM-DD
  effectiveTime: string;
  updatedBy: string;
  note?: string;
}

export interface BlacklistEntry {
  id: string;
  fullNameEn: string;
  fullNameMm: string;
  nameEn?: string; // alias for fullNameEn
  nameMm?: string; // alias for fullNameMm
  nrcNumber: string; // Myanmar NRC e.g. 12/LKN(N)123456
  passportNumber?: string; // Passport No
  passbookNumber?: string; // Legacy alias
  reason: string;
  note: string; // Detail note text box requested by user
  riskLevel: RiskLevel;
  addedBy: string;
  active: boolean;
  createdAt: string;
}

export interface RemittancePurpose {
  id: string;
  code: string;
  nameEn: string;
  nameMm: string;
  category: 'PERSONAL' | 'BUSINESS' | 'EDUCATION' | 'MEDICAL' | 'SALARY' | 'OTHER';
  requiresDocProof: boolean;
  maxDailyLimitMMK?: number;
}

export interface Customer {
  id: string;
  customerCode: string;
  fullNameEn: string;
  fullNameMm: string;
  nrcNumber: string;
  passportNumber?: string; // Passport No
  passbookNumber?: string; // Legacy alias
  phone: string;
  address: string;
  customerType: 'SENDER' | 'RECEIVER' | 'BOTH';
  riskRating: RiskLevel;
  totalTransactions: number;
  totalVolumeMMK: number;
  notes?: string;
  createdAt: string;
}

export interface RemittanceTransaction {
  id: string;
  transactionNo: string; // e.g. REM-OUT-20260902-001
  mtcn: string; // 10-digit Money Transfer Control Number
  type: RemittanceType;
  scope: RemittanceScope;
  status: RemittanceStatus;
  
  // Sender
  senderName: string;
  senderNameMm?: string;
  senderIdType?: 'NRC' | 'PASSPORT';
  senderNrc: string;
  senderPassport?: string;
  senderPassbook?: string; // Compatibility
  senderPhone: string;
  senderAddress: string;
  senderCountryCode: string;
  senderFatherName?: string;
  senderOccupation?: string;
  senderSourceOfFund?: string;
  senderDateOfBirth?: string; // Stored as DD/MM/YYYY or YYYY-MM-DD
  senderNrcAttachment?: string; // Base64 data URL or Supabase storage public URL (primary/front)
  senderNrcAttachmentName?: string;
  senderNrcAttachmentType?: string;
  senderNrcAttachmentSize?: string;
  senderNrcFrontAttachment?: string;
  senderNrcFrontAttachmentName?: string;
  senderNrcFrontAttachmentType?: string;
  senderNrcFrontAttachmentSize?: string;
  senderNrcBackAttachment?: string;
  senderNrcBackAttachmentName?: string;
  senderNrcBackAttachmentType?: string;
  senderNrcBackAttachmentSize?: string;
  senderPassportAttachment?: string; // Base64 data URL or Supabase storage public URL
  senderPassportAttachmentName?: string;
  senderPassportAttachmentType?: string;
  senderPassportAttachmentSize?: string;
  senderPassbookAttachment?: string; // Compatibility alias
  senderPassbookAttachmentName?: string;
  senderPassbookAttachmentType?: string;
  senderPassbookAttachmentSize?: string;
  
  // Receiver
  receiverName: string;
  receiverNameMm?: string;
  receiverNrc: string;
  receiverPassport?: string;
  receiverPassbook?: string; // Compatibility
  receiverPhone: string;
  receiverAddress: string;
  receiverCountryCode: string;
  
  // Financials
  sourceCurrency: string;
  targetCurrency: string;
  sendAmount: number;
  exchangeRate: number;
  receiveAmount: number;
  serviceFee: number;
  commissionFee: number;
  taxAmount: number;
  totalPayableAmount: number;
  
  // Processing info
  payoutMethod: PayoutMethod;
  payoutBankName?: string;
  payoutAccountNumber?: string;
  
  sendingBranchId: string;
  payoutBranchId?: string;
  branchId?: string;
  partnerCompanyId?: string;
  
  purposeId: string;
  purposeName: string;
  senderNote?: string;
  proofDocumentName?: string;
  proofDocumentUrl?: string;
  proofDocumentType?: string;
  proofDocumentSize?: string;
  proofDocCategory?: 'NRC' | 'DEPOSIT_RECEIPT' | 'PASSPORT' | 'OTHER' | 'CUSTOM';
  
  // Security & Screening
  blacklistChecked: boolean;
  blacklistAlert?: string | boolean;
  receiverRelationship?: string;
  date?: string;
  sendCurrency?: string;
  
  // Maker-Checker
  creatorUserId: string;
  creatorName: string;
  approverUserId?: string;
  approverName?: string;
  approvalNote?: string;
  rejectionReason?: string;
  
  createdDate: string; // ISO string
  approvedDate?: string;
  paidOutDate?: string;
}

export interface AuditRecord {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'HOLD' | 'PAYOUT' | 'LOGIN' | 'EXPORT' | 'BACKUP' | 'RESTORE' | 'SYNC' | 'SCREENING';
  entityType: 'OUTWARD' | 'INWARD' | 'BRANCH' | 'USER' | 'COMPANY' | 'CURRENCY' | 'COUNTRY' | 'EXCHANGE_RATE' | 'BLACKLIST' | 'PURPOSE' | 'CUSTOMER' | 'SYSTEM';
  entityId: string;
  details: string;
  previousValue?: string;
  newValue?: string;
}

export interface OperatorProfile {
  companyNameEn: string;
  companyNameMm: string;
  licenseNo: string;
  phone: string;
  hotline: string;
  addressEn: string;
  addressMm: string;
  email: string;
  website?: string;
  taxId?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncTime?: string;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  autoSync: boolean;
}

export interface TursoConfig {
  databaseUrl: string;
  authToken: string;
  isConnected: boolean;
  isRemote: boolean;
  lastSyncTime?: string;
  syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'ERROR';
  errorMessage?: string;
  autoSync: boolean;
  tableCounts?: {
    transactions: number;
    customers: number;
    exchangeRates: number;
    auditLogs: number;
  };
}

export interface DefaultStatusConfig {
  autoCountryDefault: boolean; // default true: Myanmar -> Domestic & NRC, Other Country -> International & Passport
  applyOutwardEntry: boolean; // default true
  applyReviewEdit: boolean; // default true
  enforceNonMyanmarPassport: boolean; // default true
  enforceMyanmarNrc: boolean; // default true
  updatedAt?: string;
  updatedBy?: string;
}

export interface AppDatabase {
  operatorProfile?: OperatorProfile;
  branches: Branch[];
  users: User[];
  companies: Company[];
  currencies: Currency[];
  countries: Country[];
  exchangeRates: ExchangeRate[];
  blacklist: BlacklistEntry[];
  purposes: RemittancePurpose[];
  customers: Customer[];
  transactions: RemittanceTransaction[];
  auditLogs: AuditRecord[];
  supabaseConfig: SupabaseConfig;
  tursoConfig?: TursoConfig;
  activeLanguage: Language;
  currentUserId: string;
  roleMenuPermissions?: RoleMenuPermissions;
  defaultStatusConfig?: DefaultStatusConfig;
}
