import { createClient, type Client } from '@libsql/client';

const CONFIGURED_TURSO_URL = 'libsql://remittance-db-uthein.turso.io';
const CONFIGURED_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';

function resolveTursoToken(token?: string): string {
  if (!token) return CONFIGURED_TURSO_TOKEN;
  try {
    const parts = token.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      // If token is an Org management token, use the database token
      if (payload.org_id && !payload.id) {
        return CONFIGURED_TURSO_TOKEN;
      }
    }
  } catch {
    // fallback
  }
  return token;
}

let tursoClient: Client | null = null;
let currentUrl: string = '';
let currentToken: string = '';

export function getTursoConfig() {
  const envUrl = process.env.TURSO_DATABASE_URL?.trim() || CONFIGURED_TURSO_URL;
  const rawToken = process.env.TURSO_AUTH_TOKEN?.trim() || CONFIGURED_TURSO_TOKEN;
  const envToken = resolveTursoToken(rawToken);
  return {
    url: currentUrl || envUrl,
    token: currentToken || envToken,
    isRemote: Boolean((currentUrl || envUrl).startsWith('libsql://') || (currentUrl || envUrl).startsWith('https://')),
    isConfigured: Boolean(currentUrl || envUrl),
  };
}

export function initTursoClient(customUrl?: string, customToken?: string): Client {
  const envUrl = process.env.TURSO_DATABASE_URL?.trim() || CONFIGURED_TURSO_URL;
  const rawToken = process.env.TURSO_AUTH_TOKEN?.trim() || CONFIGURED_TURSO_TOKEN;
  const envToken = resolveTursoToken(rawToken);
  
  const targetUrl = customUrl?.trim() || envUrl;
  const targetToken = resolveTursoToken(customToken?.trim()) || envToken;

  if (tursoClient && currentUrl === targetUrl && currentToken === targetToken) {
    return tursoClient;
  }

  currentUrl = targetUrl;
  currentToken = targetToken;

  tursoClient = createClient({
    url: targetUrl,
    authToken: targetToken || undefined,
  });

  return tursoClient;
}

export async function testTursoConnection(url?: string, token?: string) {
  try {
    const client = initTursoClient(url, token);
    const result = await client.execute('SELECT 1 as connected;');
    const isOk = result.rows.length > 0;
    const config = getTursoConfig();
    return {
      success: isOk,
      message: isOk ? 'Turso connection successful!' : 'Failed to query Turso.',
      isRemote: config.isRemote,
      url: config.url.startsWith('libsql://') 
        ? config.url.replace(/(libsql:\/\/[^.]+).*/, '$1.turso.io') 
        : config.url,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Turso LibSQL database',
    };
  }
}

export const TURSO_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS remittance_transactions (
  id TEXT PRIMARY KEY,
  transaction_no TEXT UNIQUE NOT NULL,
  mtcn TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  sender_name TEXT,
  sender_name_mm TEXT,
  sender_nrc TEXT,
  sender_phone TEXT,
  sender_address TEXT,
  sender_passport TEXT,
  receiver_name TEXT,
  receiver_name_mm TEXT,
  receiver_nrc TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  receiver_passport TEXT,
  from_country TEXT,
  to_country TEXT,
  source_currency TEXT,
  target_currency TEXT,
  send_amount REAL,
  exchange_rate REAL,
  payout_amount REAL,
  transfer_fee REAL,
  total_collected REAL,
  purpose TEXT,
  payout_method TEXT,
  bank_name TEXT,
  bank_account_no TEXT,
  created_by TEXT,
  created_at TEXT,
  approved_by TEXT,
  approved_at TEXT,
  rejected_reason TEXT,
  source_of_funds TEXT,
  remittance_type TEXT,
  created_date TEXT,
  sender_nrc_attachment TEXT,
  sender_nrc_front_attachment TEXT,
  sender_nrc_back_attachment TEXT,
  sender_passport_attachment TEXT,
  proof_document_url TEXT,
  proof_document_name TEXT,
  proof_doc_category TEXT,
  sender_father_name TEXT,
  sender_occupation TEXT,
  sender_date_of_birth TEXT
);

CREATE TABLE IF NOT EXISTS exchange_rates (
  id TEXT PRIMARY KEY,
  from_currency TEXT,
  to_currency TEXT,
  buy_rate REAL,
  sell_rate REAL,
  central_bank_rate REAL,
  effective_date TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  customer_code TEXT UNIQUE,
  full_name_en TEXT,
  full_name_mm TEXT,
  nrc_number TEXT,
  phone TEXT,
  address TEXT,
  customer_type TEXT,
  risk_rating TEXT,
  total_transactions INTEGER,
  total_volume_mmk REAL,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS system_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  role TEXT,
  branch_id TEXT,
  is_active INTEGER DEFAULT 1,
  phone TEXT,
  status TEXT DEFAULT 'ACTIVE',
  password_hash TEXT DEFAULT 'password123',
  created_at TEXT,
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT,
  user_id TEXT,
  user_name TEXT,
  action TEXT,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT
);

CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_mm TEXT NOT NULL,
  city TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  manager_name TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_mm TEXT NOT NULL,
  country_code TEXT NOT NULL,
  type TEXT NOT NULL,
  swift_code TEXT,
  license_no TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'ACTIVE',
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS currencies (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_mm TEXT NOT NULL,
  symbol TEXT NOT NULL,
  is_base_currency INTEGER DEFAULT 0,
  decimals INTEGER DEFAULT 2,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS countries (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_mm TEXT NOT NULL,
  dial_code TEXT,
  flag_emoji TEXT,
  currency_code TEXT,
  is_domestic INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS blacklist (
  id TEXT PRIMARY KEY,
  full_name_en TEXT NOT NULL,
  full_name_mm TEXT NOT NULL,
  nrc_number TEXT NOT NULL,
  passport_number TEXT NOT NULL,
  passbook_number TEXT,
  reason TEXT NOT NULL,
  note TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  added_by TEXT NOT NULL,
  active INTEGER DEFAULT 1,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS purposes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name_en TEXT NOT NULL,
  name_mm TEXT NOT NULL,
  category TEXT NOT NULL,
  requires_doc_proof INTEGER DEFAULT 0,
  max_daily_limit_mmk REAL
);

CREATE TABLE IF NOT EXISTS operator_profile (
  id TEXT PRIMARY KEY,
  company_name_en TEXT,
  company_name_mm TEXT,
  license_no TEXT,
  phone TEXT,
  hotline TEXT,
  address_en TEXT,
  address_mm TEXT,
  email TEXT,
  website TEXT,
  tax_id TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS mto_compliance_limits (
  id TEXT PRIMARY KEY,
  country_code TEXT UNIQUE NOT NULL,
  country_name TEXT NOT NULL,
  flag_emoji TEXT,
  currency TEXT NOT NULL,
  mto_partner_name TEXT,
  mto_max_limit_per_tx REAL NOT NULL,
  mto_max_limit_per_month REAL,
  inward_country_code TEXT DEFAULT 'MM',
  inward_max_usd_per_tx REAL NOT NULL,
  inward_max_usd_per_month REAL NOT NULL,
  regulatory_ref TEXT,
  description TEXT,
  active INTEGER DEFAULT 1,
  created_at TEXT,
  updated_at TEXT
);
`;

export async function initTursoSchema(client?: Client) {
  const cli = client || initTursoClient();
  const statements = TURSO_SCHEMA_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    await cli.execute(stmt);
  }

  // Auto-migrate additional columns if table was created previously without them
  const extraColumns = [
    'sender_nrc_attachment TEXT',
    'sender_nrc_front_attachment TEXT',
    'sender_nrc_back_attachment TEXT',
    'sender_passport_attachment TEXT',
    'proof_document_url TEXT',
    'proof_document_name TEXT',
    'proof_doc_category TEXT',
    'sender_father_name TEXT',
    'sender_occupation TEXT',
    'sender_date_of_birth TEXT',
    'sending_branch_id TEXT',
    'payout_branch_id TEXT',
    'branch_id TEXT',
  ];
  for (const col of extraColumns) {
    try {
      await cli.execute(`ALTER TABLE remittance_transactions ADD COLUMN ${col};`);
    } catch {
      // Column already exists or already up-to-date
    }
  }

  // Auto-migrate exchange_rates columns
  const rateColumns = [
    'transfer_rate REAL',
    'effective_time TEXT',
    'updated_by TEXT',
    'note TEXT'
  ];
  for (const col of rateColumns) {
    try {
      await cli.execute(`ALTER TABLE exchange_rates ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Auto-migrate customer_profiles columns
  const custColumns = [
    'passport_number TEXT',
    'passbook_number TEXT',
    'notes TEXT'
  ];
  for (const col of custColumns) {
    try {
      await cli.execute(`ALTER TABLE customer_profiles ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Auto-migrate system_users columns if needed
  const userColumns = [
    'email TEXT',
    'password_hash TEXT DEFAULT "password123"',
    'phone TEXT',
    'status TEXT DEFAULT "ACTIVE"',
    'created_at TEXT',
    'last_login TEXT',
    'country_code TEXT DEFAULT "MM"',
    'default_status_enabled INTEGER DEFAULT 1'
  ];
  for (const col of userColumns) {
    try {
      await cli.execute(`ALTER TABLE system_users ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Auto-migrate branches columns if needed
  const branchColumns = [
    'country_code TEXT DEFAULT "MM"'
  ];
  for (const col of branchColumns) {
    try {
      await cli.execute(`ALTER TABLE branches ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Auto-migrate blacklist columns if needed
  const blacklistColumns = [
    'passbook_number TEXT',
    'note TEXT'
  ];
  for (const col of blacklistColumns) {
    try {
      await cli.execute(`ALTER TABLE blacklist ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure default system users are seeded if empty
  try {
    // Delete any legacy timestamp duplicate branches
    await cli.execute("DELETE FROM branches WHERE id LIKE 'BR-178%';").catch(() => {});

    const userCountRes = await cli.execute('SELECT COUNT(*) as cnt FROM system_users;');
    const userCount = Number(userCountRes.rows[0]?.cnt || 0);
    if (userCount === 0) {
      await seedTursoSystemUsers(cli);
    }

    const mtoLimCountRes = await cli.execute('SELECT COUNT(*) as cnt FROM mto_compliance_limits;').catch(() => ({ rows: [{ cnt: 0 }] }));
    const mtoLimCount = Number(mtoLimCountRes.rows[0]?.cnt || 0);
    if (mtoLimCount === 0) {
      await seedTursoMtoLimits(cli);
    }
  } catch (e) {
    console.warn('Turso auto-seed check error:', e);
  }

  return { success: true, count: statements.length };
}

export async function getTursoStats() {
  const client = initTursoClient();
  const config = getTursoConfig();

  try {
    // Ensure tables exist
    await initTursoSchema(client);

    const [
      txCount, custCount, rateCount, logCount,
      branchCount, userCount, compCount, currCount,
      countryCount, blCount, purpCount, profCount, settsCount,
      mtoLimCount
    ] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM remittance_transactions;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM customer_profiles;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM exchange_rates;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM audit_logs;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM branches;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM system_users;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM companies;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM currencies;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM countries;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM blacklist;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM purposes;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM operator_profile;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM system_settings;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
      client.execute('SELECT COUNT(*) as cnt FROM mto_compliance_limits;').then(r => Number(r.rows[0]?.cnt || 0)).catch(() => 0),
    ]);

    return {
      connected: true,
      isRemote: config.isRemote,
      url: config.url.startsWith('libsql://') 
        ? config.url.replace(/(libsql:\/\/[^.]+).*/, '$1.turso.io') 
        : config.url,
      counts: {
        transactions: txCount,
        customers: custCount,
        exchangeRates: rateCount,
        auditLogs: logCount,
        branches: branchCount,
        users: userCount,
        companies: compCount,
        currencies: currCount,
        countries: countryCount,
        blacklist: blCount,
        purposes: purpCount,
        operatorProfile: profCount,
        systemSettings: settsCount,
        mtoComplianceLimits: mtoLimCount,
      }
    };
  } catch (err: any) {
    return {
      connected: false,
      isRemote: config.isRemote,
      error: err?.message || 'Unable to fetch Turso stats',
      counts: {
        transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0,
        branches: 0, users: 0, companies: 0, currencies: 0,
        countries: 0, blacklist: 0, purposes: 0, operatorProfile: 0, systemSettings: 0,
        mtoComplianceLimits: 0,
      }
    };
  }
}

export async function syncPushToTurso(data: {
  transactions?: any[];
  exchangeRates?: any[];
  customers?: any[];
  auditLogs?: any[];
  branches?: any[];
  users?: any[];
  companies?: any[];
  currencies?: any[];
  countries?: any[];
  blacklist?: any[];
  purposes?: any[];
  operatorProfile?: any;
  roleMenuPermissions?: any;
  countryRoleMenuPermissions?: any;
  defaultStatusConfig?: any;
  mtoComplianceLimits?: any[];
}) {
  const client = initTursoClient();
  await initTursoSchema(client);

  let txSaved = 0;
  let ratesSaved = 0;
  let custSaved = 0;
  let logsSaved = 0;
  let branchesSaved = 0;
  let usersSaved = 0;
  let companiesSaved = 0;
  let currenciesSaved = 0;
  let countriesSaved = 0;
  let blacklistSaved = 0;
  let purposesSaved = 0;
  let profileSaved = 0;
  let settingsSaved = 0;
  let mtoLimitsSaved = 0;

  // 1. Transactions
  if (data.transactions && Array.isArray(data.transactions)) {
    for (const tx of data.transactions) {
      if (!tx.id || !tx.transactionNo) continue;
      try {
        await client.execute({
          sql: `INSERT INTO remittance_transactions (
            id, transaction_no, mtcn, type, status,
            sender_name, sender_name_mm, sender_nrc, sender_phone, sender_address, sender_passport,
            receiver_name, receiver_name_mm, receiver_nrc, receiver_phone, receiver_address, receiver_passport,
            from_country, to_country, source_currency, target_currency,
            send_amount, exchange_rate, payout_amount, transfer_fee, total_collected,
            purpose, payout_method, bank_name, bank_account_no,
            created_by, created_at, approved_by, approved_at, rejected_reason,
            source_of_funds, remittance_type, created_date,
            sender_nrc_attachment, sender_nrc_front_attachment, sender_nrc_back_attachment,
            sender_passport_attachment, proof_document_url, proof_document_name,
            proof_doc_category, sender_father_name, sender_occupation, sender_date_of_birth,
            sending_branch_id, payout_branch_id, branch_id
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?
          )
          ON CONFLICT(id) DO UPDATE SET
            transaction_no=excluded.transaction_no,
            mtcn=excluded.mtcn,
            type=excluded.type,
            status=CASE 
              WHEN remittance_transactions.status IN ('PAID_OUT', 'APPROVED_AND_PAID_OUT') THEN remittance_transactions.status
              WHEN remittance_transactions.status IN ('APPROVED', 'APPROVED_AND_SENT') AND excluded.status = 'PENDING_APPROVAL' THEN remittance_transactions.status
              ELSE excluded.status
            END,
            sender_name=excluded.sender_name,
            sender_name_mm=excluded.sender_name_mm,
            sender_nrc=excluded.sender_nrc,
            sender_phone=excluded.sender_phone,
            sender_address=excluded.sender_address,
            sender_passport=excluded.sender_passport,
            receiver_name=excluded.receiver_name,
            receiver_name_mm=excluded.receiver_name_mm,
            receiver_nrc=excluded.receiver_nrc,
            receiver_phone=excluded.receiver_phone,
            receiver_address=excluded.receiver_address,
            receiver_passport=excluded.receiver_passport,
            from_country=excluded.from_country,
            to_country=excluded.to_country,
            source_currency=excluded.source_currency,
            target_currency=excluded.target_currency,
            send_amount=excluded.send_amount,
            exchange_rate=excluded.exchange_rate,
            payout_amount=excluded.payout_amount,
            transfer_fee=excluded.transfer_fee,
            total_collected=excluded.total_collected,
            purpose=excluded.purpose,
            payout_method=excluded.payout_method,
            bank_name=excluded.bank_name,
            bank_account_no=excluded.bank_account_no,
            created_by=excluded.created_by,
            created_at=excluded.created_at,
            approved_by=COALESCE(NULLIF(excluded.approved_by, ''), remittance_transactions.approved_by),
            approved_at=COALESCE(NULLIF(excluded.approved_at, ''), remittance_transactions.approved_at),
            rejected_reason=excluded.rejected_reason,
            source_of_funds=excluded.source_of_funds,
            remittance_type=excluded.remittance_type,
            created_date=excluded.created_date,
            sender_nrc_attachment=excluded.sender_nrc_attachment,
            sender_nrc_front_attachment=excluded.sender_nrc_front_attachment,
            sender_nrc_back_attachment=excluded.sender_nrc_back_attachment,
            sender_passport_attachment=excluded.sender_passport_attachment,
            proof_document_url=excluded.proof_document_url,
            proof_document_name=excluded.proof_document_name,
            proof_doc_category=excluded.proof_doc_category,
            sender_father_name=excluded.sender_father_name,
            sender_occupation=excluded.sender_occupation,
            sender_date_of_birth=excluded.sender_date_of_birth,
            sending_branch_id=excluded.sending_branch_id,
            payout_branch_id=excluded.payout_branch_id,
            branch_id=excluded.branch_id;`,
          args: [
            tx.id, tx.transactionNo, tx.mtcn || '', tx.type || 'OUTWARD', tx.status || 'PENDING_APPROVAL',
            tx.senderName || '', tx.senderNameMm || '', tx.senderNrc || '', tx.senderPhone || '', tx.senderAddress || '', tx.senderPassport || '',
            tx.receiverName || '', tx.receiverNameMm || '', tx.receiverNrc || '', tx.receiverPhone || '', tx.receiverAddress || '', tx.receiverPassport || '',
            tx.fromCountry || tx.senderCountryCode || 'MM', tx.toCountry || tx.receiverCountryCode || 'MM', tx.sourceCurrency || 'MMK', tx.targetCurrency || 'MMK',
            Number(tx.sendAmount) || 0, Number(tx.exchangeRate) || 1, Number(tx.payoutAmount || tx.receiveAmount) || 0, Number(tx.transferFee || tx.serviceFee) || 0, Number(tx.totalCollected || tx.totalPayableAmount) || 0,
            tx.purpose || tx.purposeName || '', tx.payoutMethod || '', tx.bankName || tx.payoutBankName || '', tx.bankAccountNo || tx.payoutAccountNumber || '',
            tx.createdBy || tx.creatorName || '', tx.createdAt || tx.createdDate || new Date().toISOString(), tx.approvedBy || tx.approverName || '', tx.approvedAt || tx.approvedDate || '', tx.rejectedReason || tx.rejectionReason || '',
            tx.sourceOfFunds || tx.senderNote || '', tx.remittanceType || tx.scope || '', tx.createdDate || '',
            tx.senderNrcAttachment || tx.senderNrcFrontAttachment || '',
            tx.senderNrcFrontAttachment || tx.senderNrcAttachment || '',
            tx.senderNrcBackAttachment || '',
            tx.senderPassportAttachment || tx.senderPassbookAttachment || '',
            tx.proofDocumentUrl || '',
            tx.proofDocumentName || '',
            tx.proofDocCategory || '',
            tx.senderFatherName || '',
            tx.senderOccupation || '',
            tx.senderDateOfBirth || '',
            (() => {
              const cLower = String(tx.createdBy || tx.created_by || tx.creatorName || '').toLowerCase();
              if (cLower.includes('maker 1') || cLower.includes('maker1') || cLower.includes('checker 1') || cLower.includes('checker1') || cLower.includes('admin 1') || cLower.includes('admin1') || cLower.includes('changi') || cLower.includes('usr-014') || cLower.includes('usr-015') || cLower.includes('usr-013')) {
                return 'BR-010';
              }
              if (cLower.includes('maker 2') || cLower.includes('maker2') || cLower.includes('checker 2') || cLower.includes('checker2') || cLower.includes('admin 2') || cLower.includes('admin2') || cLower.includes('peninsula') || cLower.includes('usr-010') || cLower.includes('usr-011') || cLower.includes('usr-012')) {
                return 'BR-008';
              }
              if (cLower.includes('th-maker2') || cLower.includes('th-checker2') || cLower.includes('pathum') || cLower.includes('usr-016') || cLower.includes('usr-017')) {
                return 'BR-011';
              }
              if (cLower.includes('mandalay') || cLower.includes('usr-005')) {
                return 'BR-002';
              }
              if (tx.sendingBranchId && tx.sendingBranchId !== 'BR-001') return tx.sendingBranchId;
              if (tx.sending_branch_id && tx.sending_branch_id !== 'BR-001') return tx.sending_branch_id;
              if (tx.branchId && tx.branchId !== 'BR-001') return tx.branchId;
              if (tx.fromCountry === 'TH') return 'BR-009';
              if (tx.fromCountry === 'SG') return 'BR-008';
              return tx.sendingBranchId || tx.sending_branch_id || tx.branchId || 'BR-001';
            })(),
            tx.payoutBranchId || tx.payout_branch_id || (tx.type === 'INWARD' ? (tx.branchId || (tx.toCountry === 'TH' ? 'BR-009' : tx.toCountry === 'SG' ? 'BR-008' : 'BR-001')) : ''),
            tx.branchId || tx.sendingBranchId || 'BR-001'
          ]
        });
        txSaved++;
      } catch (txErr: any) {
        console.warn('Error saving transaction to Turso:', tx.id, txErr?.message);
      }
    }
  }

  // 2. Exchange Rates
  if (data.exchangeRates && Array.isArray(data.exchangeRates)) {
    for (const rate of data.exchangeRates) {
      if (!rate.id) continue;
      const bRate = Number(rate.buyRate) || 0;
      const sRate = Number(rate.sellRate) || 0;
      const tRate = Number(rate.transferRate) || sRate || 0;
      const cbRate = Number(rate.centralBankRate) || tRate || 0;
      await client.execute({
        sql: `INSERT INTO exchange_rates (
          id, from_currency, to_currency, buy_rate, sell_rate, central_bank_rate, effective_date, updated_at,
          transfer_rate, effective_time, updated_by, note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          buy_rate=excluded.buy_rate,
          sell_rate=excluded.sell_rate,
          central_bank_rate=excluded.central_bank_rate,
          effective_date=excluded.effective_date,
          updated_at=excluded.updated_at,
          transfer_rate=excluded.transfer_rate,
          effective_time=excluded.effective_time,
          updated_by=excluded.updated_by,
          note=excluded.note;`,
        args: [
          rate.id, rate.fromCurrency || '', rate.toCurrency || '',
          bRate, sRate, cbRate,
          rate.effectiveDate || new Date().toISOString().split('T')[0],
          rate.updatedAt || new Date().toISOString(),
          tRate,
          rate.effectiveTime || '09:00',
          rate.updatedBy || 'Admin',
          rate.note || ''
        ]
      });
      ratesSaved++;
    }
  }

  // 3. Customers
  if (data.customers && Array.isArray(data.customers)) {
    for (const c of data.customers) {
      if (!c.id) continue;
      await client.execute({
        sql: `INSERT INTO customer_profiles (
          id, customer_code, full_name_en, full_name_mm, nrc_number, phone, address,
          customer_type, risk_rating, total_transactions, total_volume_mmk, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          phone=excluded.phone,
          address=excluded.address,
          risk_rating=excluded.risk_rating,
          total_transactions=excluded.total_transactions,
          total_volume_mmk=excluded.total_volume_mmk;`,
        args: [
          c.id, c.customerCode || '', c.fullNameEn || '', c.fullNameMm || '', c.nrcNumber || '',
          c.phone || '', c.address || '', c.customerType || 'SENDER', c.riskRating || 'LOW',
          Number(c.totalTransactions) || 0, Number(c.totalVolumeMMK) || 0, c.createdAt || new Date().toISOString()
        ]
      });
      custSaved++;
    }
  }

  // 4. Audit Logs
  if (data.auditLogs && Array.isArray(data.auditLogs)) {
    for (const log of data.auditLogs) {
      if (!log.id) continue;
      await client.execute({
        sql: `INSERT INTO audit_logs (
          id, timestamp, user_id, user_name, action, entity_type, entity_id, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          details=excluded.details;`,
        args: [
          log.id,
          log.timestamp || new Date().toISOString(),
          log.userId || log.user_id || '',
          log.userName || log.user_name || '',
          log.action || '',
          log.entityType || log.entity_type || '',
          log.entityId || log.entity_id || '',
          typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')
        ]
      });
      logsSaved++;
    }
  }

  // 5. Branches
  if (data.branches && Array.isArray(data.branches)) {
    for (const b of data.branches) {
      if (!b.id) continue;
      const branchCode = b.code || b.branchCode || b.id;
      try {
        // Resolve any conflict on UNIQUE(code)
        await client.execute({
          sql: 'DELETE FROM branches WHERE code = ? AND id != ?;',
          args: [branchCode, b.id]
        }).catch(() => {});

        await client.execute({
          sql: `INSERT INTO branches (
            id, code, name_en, name_mm, city, phone, address, manager_name, status, country_code, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name_en=excluded.name_en,
            name_mm=excluded.name_mm,
            city=excluded.city,
            phone=excluded.phone,
            address=excluded.address,
            manager_name=excluded.manager_name,
            status=excluded.status,
            country_code=excluded.country_code;`,
          args: [
            b.id, branchCode,
            b.nameEn || b.name_en || b.name || 'Branch',
            b.nameMm || b.name_mm || b.nameEn || b.name_en || '',
            b.city || 'Yangon',
            b.phone || '',
            b.address || '',
            b.managerName || b.manager_name || '',
            b.status || 'ACTIVE',
            b.countryCode || b.country_code || 'MM',
            b.createdAt || b.created_at || new Date().toISOString()
          ]
        });
        branchesSaved++;
      } catch (e: any) {
        console.warn('Error saving branch to Turso:', b.id, e?.message);
      }
    }
  }

  // 6. Users (System Users)
  if (data.users && Array.isArray(data.users)) {
    for (const u of data.users) {
      if (!u.id) continue;
      const username = String(u.username || '').trim().replace(/^@/, '');
      if (!username) continue;
      const branchId = u.branchId || u.branch_id || 'BR-001';
      let userCountry = String(u.countryCode || u.country_code || '').toUpperCase();
      if (!userCountry) {
        if (branchId.includes('TH') || branchId === 'BR-009' || username.toLowerCase().startsWith('th-') || username.toLowerCase() === 'maker_bkk') {
          userCountry = 'TH';
        } else if (branchId.includes('SG') || branchId === 'BR-007' || branchId === 'BR-008' || branchId === 'BR-010' || username.toLowerCase().startsWith('sg-') || username.toLowerCase() === 'tloo') {
          userCountry = 'SG';
        } else {
          userCountry = 'MM';
        }
      }

      try {
        // Pre-resolve username conflict
        await client.execute({
          sql: 'DELETE FROM system_users WHERE username = ? AND id != ?;',
          args: [username, u.id]
        }).catch(() => {});

        await client.execute({
          sql: `INSERT INTO system_users (
            id, username, full_name, role, branch_id, is_active, email, password_hash, phone, status, created_at, last_login, country_code, default_status_enabled
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            username=excluded.username,
            full_name=excluded.full_name,
            role=excluded.role,
            branch_id=excluded.branch_id,
            is_active=excluded.is_active,
            email=excluded.email,
            password_hash=excluded.password_hash,
            phone=excluded.phone,
            status=excluded.status,
            last_login=coalesce(excluded.last_login, system_users.last_login),
            country_code=excluded.country_code,
            default_status_enabled=excluded.default_status_enabled;`,
          args: [
            u.id, username, u.fullName || u.full_name || username,
            u.role || 'MAKER', branchId,
            u.status === 'INACTIVE' ? 0 : 1,
            u.email || `${username}@remitmyanmar.com`,
            u.password || u.password_hash || 'password123',
            u.phone || '', u.status || 'ACTIVE',
            u.createdAt || u.created_at || new Date().toISOString(),
            u.lastLogin || u.last_login || null,
            userCountry,
            u.defaultStatusEnabled !== false ? 1 : 0
          ]
        });
        usersSaved++;
      } catch (e: any) {
        console.warn('Error saving user to Turso:', u.id, e?.message);
      }
    }
  }

  // 7. Companies
  if (data.companies && Array.isArray(data.companies)) {
    for (const comp of data.companies) {
      if (!comp.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO companies (
            id, code, name_en, name_mm, country_code, type, swift_code, license_no, phone, email, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name_en=excluded.name_en,
            name_mm=excluded.name_mm,
            country_code=excluded.country_code,
            type=excluded.type,
            swift_code=excluded.swift_code,
            license_no=excluded.license_no,
            phone=excluded.phone,
            email=excluded.email,
            status=excluded.status;`,
          args: [
            comp.id, comp.code || '', comp.nameEn || comp.name_en || '', comp.nameMm || comp.name_mm || '',
            comp.countryCode || comp.country_code || 'MM', comp.type || 'BANK', comp.swiftCode || comp.swift_code || '',
            comp.licenseNo || comp.license_no || '', comp.phone || '', comp.email || '',
            comp.status || 'ACTIVE', comp.createdAt || comp.created_at || new Date().toISOString()
          ]
        });
        companiesSaved++;
      } catch (e: any) {
        console.warn('Error saving company to Turso:', comp.id, e?.message);
      }
    }
  }

  // 8. Currencies
  if (data.currencies && Array.isArray(data.currencies)) {
    for (const cur of data.currencies) {
      if (!cur.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO currencies (
            id, code, name_en, name_mm, symbol, is_base_currency, decimals, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name_en=excluded.name_en,
            name_mm=excluded.name_mm,
            symbol=excluded.symbol,
            is_base_currency=excluded.is_base_currency,
            decimals=excluded.decimals,
            status=excluded.status;`,
          args: [
            cur.id, cur.code || '', cur.nameEn || cur.name_en || '', cur.nameMm || cur.name_mm || '',
            cur.symbol || '', cur.isBaseCurrency ? 1 : 0, Number(cur.decimals) || 2, cur.status || 'ACTIVE'
          ]
        });
        currenciesSaved++;
      } catch (e: any) {
        console.warn('Error saving currency to Turso:', cur.id, e?.message);
      }
    }
  }

  // 9. Countries
  if (data.countries && Array.isArray(data.countries)) {
    for (const cnt of data.countries) {
      if (!cnt.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO countries (
            id, code, name_en, name_mm, dial_code, flag_emoji, currency_code, is_domestic, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name_en=excluded.name_en,
            name_mm=excluded.name_mm,
            dial_code=excluded.dial_code,
            flag_emoji=excluded.flag_emoji,
            currency_code=excluded.currency_code,
            is_domestic=excluded.is_domestic,
            status=excluded.status;`,
          args: [
            cnt.id, cnt.code || '', cnt.nameEn || cnt.name_en || '', cnt.nameMm || cnt.name_mm || '',
            cnt.dialCode || cnt.dial_code || '', cnt.flagEmoji || cnt.flag_emoji || '',
            cnt.currencyCode || cnt.currency_code || 'MMK', cnt.isDomestic ? 1 : 0, cnt.status || 'ACTIVE'
          ]
        });
        countriesSaved++;
      } catch (e: any) {
        console.warn('Error saving country to Turso:', cnt.id, e?.message);
      }
    }
  }

  // 10. Blacklist
  if (data.blacklist && Array.isArray(data.blacklist)) {
    for (const bl of data.blacklist) {
      if (!bl.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO blacklist (
            id, full_name_en, full_name_mm, nrc_number, passport_number, passbook_number, reason, note, risk_level, added_by, active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            full_name_en=excluded.full_name_en,
            full_name_mm=excluded.full_name_mm,
            nrc_number=excluded.nrc_number,
            passport_number=excluded.passport_number,
            passbook_number=excluded.passbook_number,
            reason=excluded.reason,
            note=excluded.note,
            risk_level=excluded.risk_level,
            added_by=excluded.added_by,
            active=excluded.active;`,
          args: [
            bl.id, bl.fullNameEn || bl.nameEn || '', bl.fullNameMm || bl.nameMm || '',
            bl.nrcNumber || bl.nrc_number || '', bl.passportNumber || bl.passport_number || '',
            bl.passbookNumber || bl.passbook_number || '', bl.reason || '', bl.note || '',
            bl.riskLevel || bl.risk_level || 'HIGH', bl.addedBy || bl.added_by || 'Admin',
            bl.active !== false ? 1 : 0, bl.createdAt || bl.created_at || new Date().toISOString()
          ]
        });
        blacklistSaved++;
      } catch (e: any) {
        console.warn('Error saving blacklist to Turso:', bl.id, e?.message);
      }
    }
  }

  // 11. Purposes
  if (data.purposes && Array.isArray(data.purposes)) {
    for (const purp of data.purposes) {
      if (!purp.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO purposes (
            id, code, name_en, name_mm, category, requires_doc_proof, max_daily_limit_mmk
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            code=excluded.code,
            name_en=excluded.name_en,
            name_mm=excluded.name_mm,
            category=excluded.category,
            requires_doc_proof=excluded.requires_doc_proof,
            max_daily_limit_mmk=excluded.max_daily_limit_mmk;`,
          args: [
            purp.id, purp.code || '', purp.nameEn || purp.name_en || '', purp.nameMm || purp.name_mm || '',
            purp.category || 'PERSONAL', purp.requiresDocProof ? 1 : 0, Number(purp.maxDailyLimitMMK) || 0
          ]
        });
        purposesSaved++;
      } catch (e: any) {
        console.warn('Error saving purpose to Turso:', purp.id, e?.message);
      }
    }
  }

  // 12. Operator Profile
  if (data.operatorProfile && typeof data.operatorProfile === 'object') {
    const p = data.operatorProfile;
    try {
      await client.execute({
        sql: `INSERT INTO operator_profile (
          id, company_name_en, company_name_mm, license_no, phone, hotline, address_en, address_mm, email, website, tax_id, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          company_name_en=excluded.company_name_en,
          company_name_mm=excluded.company_name_mm,
          license_no=excluded.license_no,
          phone=excluded.phone,
          hotline=excluded.hotline,
          address_en=excluded.address_en,
          address_mm=excluded.address_mm,
          email=excluded.email,
          website=excluded.website,
          tax_id=excluded.tax_id,
          updated_at=excluded.updated_at;`,
        args: [
          p.id || 'OP-001', p.companyNameEn || '', p.companyNameMm || '', p.licenseNo || '',
          p.phone || '', p.hotline || '', p.addressEn || '', p.addressMm || '',
          p.email || '', p.website || '', p.taxId || '', new Date().toISOString()
        ]
      });
      profileSaved++;
    } catch (e: any) {
      console.warn('Error saving operator profile to Turso:', e?.message);
    }
  }

  // 13. System Settings
  if (data.roleMenuPermissions) {
    try {
      await client.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
        args: ['role_menu_permissions', JSON.stringify(data.roleMenuPermissions), new Date().toISOString()]
      });
      settingsSaved++;
    } catch (e: any) {
      console.warn('Error saving roleMenuPermissions to Turso:', e?.message);
    }
  }
  if (data.countryRoleMenuPermissions) {
    try {
      await client.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
        args: ['country_role_menu_permissions', JSON.stringify(data.countryRoleMenuPermissions), new Date().toISOString()]
      });
      settingsSaved++;
    } catch (e: any) {
      console.warn('Error saving countryRoleMenuPermissions to Turso:', e?.message);
    }
  }
  if (data.defaultStatusConfig) {
    try {
      await client.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
        args: ['default_status_config', JSON.stringify(data.defaultStatusConfig), new Date().toISOString()]
      });
      settingsSaved++;
    } catch (e: any) {
      console.warn('Error saving defaultStatusConfig to Turso:', e?.message);
    }
  }

  // 14. MTO & Myanmar Domestic Inward Remittance Limits
  if (data.mtoComplianceLimits && Array.isArray(data.mtoComplianceLimits)) {
    for (const lim of data.mtoComplianceLimits) {
      if (!lim.id) continue;
      const cCode = String(lim.countryCode || lim.country_code || '').trim().toUpperCase();
      try {
        await client.execute({
          sql: 'DELETE FROM mto_compliance_limits WHERE country_code = ? AND id != ?;',
          args: [cCode, lim.id]
        }).catch(() => {});

        await client.execute({
          sql: `INSERT INTO mto_compliance_limits (
            id, country_code, country_name, flag_emoji, currency, mto_partner_name,
            mto_max_limit_per_tx, mto_max_limit_per_month, inward_country_code,
            inward_max_usd_per_tx, inward_max_usd_per_month, regulatory_ref, description,
            active, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            country_code=excluded.country_code,
            country_name=excluded.country_name,
            flag_emoji=excluded.flag_emoji,
            currency=excluded.currency,
            mto_partner_name=excluded.mto_partner_name,
            mto_max_limit_per_tx=excluded.mto_max_limit_per_tx,
            mto_max_limit_per_month=excluded.mto_max_limit_per_month,
            inward_country_code=excluded.inward_country_code,
            inward_max_usd_per_tx=excluded.inward_max_usd_per_tx,
            inward_max_usd_per_month=excluded.inward_max_usd_per_month,
            regulatory_ref=excluded.regulatory_ref,
            description=excluded.description,
            active=excluded.active,
            updated_at=excluded.updated_at;`,
          args: [
            lim.id,
            cCode,
            lim.countryName || lim.country_name || cCode,
            lim.flagEmoji || lim.flag_emoji || '🌐',
            lim.currency || 'USD',
            lim.mtoPartnerName || lim.mto_partner_name || '',
            Number(lim.mtoMaxLimitPerTx ?? lim.mto_max_limit_per_tx ?? 0),
            lim.mtoMaxLimitPerMonth !== undefined && lim.mtoMaxLimitPerMonth !== null ? Number(lim.mtoMaxLimitPerMonth) : (lim.mto_max_limit_per_month ? Number(lim.mto_max_limit_per_month) : null),
            lim.inwardCountryCode || lim.inward_country_code || 'MM',
            Number(lim.inwardMaxUsdPerTx ?? lim.inward_max_usd_per_tx ?? 5000),
            Number(lim.inwardMaxUsdPerMonth ?? lim.inward_max_usd_per_month ?? 25000),
            lim.regulatoryRef || lim.regulatory_ref || '',
            lim.description || '',
            lim.active !== false && lim.active !== 0 ? 1 : 0,
            lim.createdAt || lim.created_at || new Date().toISOString(),
            lim.updatedAt || lim.updated_at || new Date().toISOString()
          ]
        });
        mtoLimitsSaved++;
      } catch (e: any) {
        console.warn('Error saving mtoComplianceLimit to Turso:', lim.id, e?.message);
      }
    }

    try {
      await client.execute({
        sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
              ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
        args: ['mto_compliance_limits', JSON.stringify(data.mtoComplianceLimits), new Date().toISOString()]
      });
    } catch (e) {
      console.warn('Error backing up mto_compliance_limits to system_settings:', e);
    }
  }

  return {
    success: true,
    saved: {
      transactions: txSaved,
      exchangeRates: ratesSaved,
      customers: custSaved,
      auditLogs: logsSaved,
      branches: branchesSaved,
      users: usersSaved,
      companies: companiesSaved,
      currencies: currenciesSaved,
      countries: countriesSaved,
      blacklist: blacklistSaved,
      purposes: purposesSaved,
      operatorProfile: profileSaved,
      systemSettings: settingsSaved,
      mtoComplianceLimits: mtoLimitsSaved,
    },
    syncedAt: new Date().toISOString()
  };
}

export async function syncPullFromTurso() {
  const client = initTursoClient();
  await initTursoSchema(client);

  const [
    txRes, rateRes, custRes, logRes,
    branchRes, userRes, compRes, currRes,
    countryRes, blRes, purpRes, profRes, settsRes,
    mtoLimRes
  ] = await Promise.all([
    client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM exchange_rates ORDER BY updated_at DESC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM customer_profiles ORDER BY full_name_en ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM branches ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM system_users ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM companies ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM currencies ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM countries ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM blacklist ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM purposes ORDER BY id ASC;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM operator_profile LIMIT 1;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM system_settings;').catch(() => ({ rows: [] })),
    client.execute('SELECT * FROM mto_compliance_limits ORDER BY id ASC;').catch(() => ({ rows: [] })),
  ]);

  const transactions = txRes.rows.map((row: any) => ({
    id: String(row.id),
    transactionNo: String(row.transaction_no),
    mtcn: String(row.mtcn),
    type: String(row.type),
    status: String(row.status),
    senderName: String(row.sender_name || ''),
    senderNameMm: String(row.sender_name_mm || ''),
    senderNrc: String(row.sender_nrc || ''),
    senderPhone: String(row.sender_phone || ''),
    senderAddress: String(row.sender_address || ''),
    senderPassport: String(row.sender_passport || ''),
    receiverName: String(row.receiver_name || ''),
    receiverNameMm: String(row.receiver_name_mm || ''),
    receiverNrc: String(row.receiver_nrc || ''),
    receiverPhone: String(row.receiver_phone || ''),
    receiverAddress: String(row.receiver_address || ''),
    receiverPassport: String(row.receiver_passport || ''),
    fromCountry: String(row.from_country || 'MM'),
    toCountry: String(row.to_country || 'MM'),
    senderCountryCode: String(row.from_country || 'MM'),
    receiverCountryCode: String(row.to_country || 'MM'),
    sourceCurrency: String(row.source_currency || 'MMK'),
    targetCurrency: String(row.target_currency || 'MMK'),
    sendAmount: Number(row.send_amount) || 0,
    exchangeRate: Number(row.exchange_rate) || 1,
    payoutAmount: Number(row.payout_amount) || 0,
    receiveAmount: Number(row.payout_amount) || 0,
    transferFee: Number(row.transfer_fee) || 0,
    serviceFee: Number(row.transfer_fee) || 0,
    totalCollected: Number(row.total_collected) || 0,
    totalPayableAmount: Number(row.total_collected) || 0,
    purpose: String(row.purpose || ''),
    purposeName: String(row.purpose || ''),
    purposeId: String(row.purpose || ''),
    payoutMethod: String(row.payout_method || 'CASH_PICKUP'),
    bankName: String(row.bank_name || ''),
    bankAccountNo: String(row.bank_account_no || ''),
    createdBy: String(row.created_by || ''),
    creatorName: String(row.created_by || ''),
    createdAt: String(row.created_at || ''),
    approvedBy: String(row.approved_by || ''),
    approverName: String(row.approved_by || ''),
    approvedAt: String(row.approved_at || ''),
    approvedDate: String(row.approved_at || ''),
    rejectedReason: String(row.rejected_reason || ''),
    rejectionReason: String(row.rejected_reason || ''),
    sourceOfFunds: String(row.source_of_funds || ''),
    senderSourceOfFund: String(row.source_of_funds || ''),
    remittanceType: String(row.remittance_type || ''),
    scope: String(row.remittance_type || (row.type === 'INWARD' ? 'DOMESTIC' : 'OUTWARD')),
    createdDate: String(row.created_date || ''),
    senderNrcAttachment: String(row.sender_nrc_attachment || ''),
    senderNrcFrontAttachment: String(row.sender_nrc_front_attachment || row.sender_nrc_attachment || ''),
    senderNrcBackAttachment: String(row.sender_nrc_back_attachment || ''),
    senderPassportAttachment: String(row.sender_passport_attachment || ''),
    proofDocumentUrl: String(row.proof_document_url || ''),
    proofDocumentName: String(row.proof_document_name || ''),
    proofDocCategory: row.proof_doc_category || undefined,
    senderFatherName: String(row.sender_father_name || ''),
    senderOccupation: String(row.sender_occupation || ''),
    senderDateOfBirth: String(row.sender_date_of_birth || ''),
    sendingBranchId: (() => {
      const cLower = String(row.created_by || '').toLowerCase();
      if (cLower.includes('maker 1') || cLower.includes('maker1') || cLower.includes('checker 1') || cLower.includes('checker1') || cLower.includes('admin 1') || cLower.includes('admin1') || cLower.includes('changi') || cLower.includes('usr-014') || cLower.includes('usr-015') || cLower.includes('usr-013')) {
        return 'BR-010';
      }
      if (cLower.includes('maker 2') || cLower.includes('maker2') || cLower.includes('checker 2') || cLower.includes('checker2') || cLower.includes('admin 2') || cLower.includes('admin2') || cLower.includes('peninsula') || cLower.includes('usr-010') || cLower.includes('usr-011') || cLower.includes('usr-012')) {
        return 'BR-008';
      }
      if (cLower.includes('th-maker2') || cLower.includes('th-checker2') || cLower.includes('pathum') || cLower.includes('usr-016') || cLower.includes('usr-017')) {
        return 'BR-011';
      }
      if (cLower.includes('mandalay') || cLower.includes('usr-005')) {
        return 'BR-002';
      }
      if (row.sending_branch_id && String(row.sending_branch_id) !== 'BR-001') {
        return String(row.sending_branch_id);
      }
      if (row.branch_id && String(row.branch_id) !== 'BR-001') {
        return String(row.branch_id);
      }
      if (row.from_country === 'TH') return 'BR-009';
      if (row.from_country === 'SG') return 'BR-008';
      return String(row.sending_branch_id || row.branch_id || 'BR-001');
    })(),
    payoutBranchId: String(
      row.payout_branch_id ||
      (row.to_country === 'TH' ? 'BR-009' :
       row.to_country === 'SG' ? 'BR-008' :
       row.to_country === 'MM' ? (row.created_by && row.created_by.includes('Mandalay') ? 'BR-002' : 'BR-001') : 'BR-001')
    ),
  }));

  const exchangeRates = rateRes.rows.map((row: any) => ({
    id: String(row.id),
    fromCurrency: String(row.from_currency),
    toCurrency: String(row.to_currency),
    buyRate: Number(row.buy_rate),
    sellRate: Number(row.sell_rate),
    centralBankRate: Number(row.central_bank_rate),
    effectiveDate: String(row.effective_date),
    updatedAt: String(row.updated_at),
    transferRate: Number(row.transfer_rate) || Number(row.sell_rate) || 0,
    effectiveTime: String(row.effective_time || '09:00'),
    updatedBy: String(row.updated_by || 'Admin'),
    note: String(row.note || ''),
  }));

  const customers = custRes.rows.map((row: any) => ({
    id: String(row.id),
    customerCode: String(row.customer_code),
    fullNameEn: String(row.full_name_en),
    fullNameMm: String(row.full_name_mm || ''),
    nrcNumber: String(row.nrc_number || ''),
    passportNumber: String(row.passport_number || row.passbook_number || ''),
    passbookNumber: String(row.passbook_number || row.passport_number || ''),
    phone: String(row.phone || ''),
    address: String(row.address || ''),
    customerType: String(row.customer_type || 'SENDER'),
    riskRating: String(row.risk_rating || 'LOW'),
    totalTransactions: Number(row.total_transactions) || 0,
    totalVolumeMMK: Number(row.total_volume_mmk) || 0,
    notes: String(row.notes || ''),
    createdAt: String(row.created_at || ''),
  }));

  const auditLogs = logRes.rows.map((row: any) => ({
    id: String(row.id),
    timestamp: String(row.timestamp),
    userId: String(row.user_id),
    userName: String(row.user_name),
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    details: row.details,
  }));

  const validBranchRows = (branchRes.rows || []).filter((r: any) => {
    const id = String(r.id || '');
    if (id === 'BR-1789788738927') return false;
    return true;
  });

  const branches = validBranchRows.map((r: any) => ({
    id: String(r.id),
    code: String(r.code || r.id),
    nameEn: String(r.name_en),
    nameMm: String(r.name_mm || ''),
    city: String(r.city || ''),
    phone: String(r.phone || ''),
    address: String(r.address || ''),
    managerName: String(r.manager_name || ''),
    status: (r.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
    countryCode: String(r.country_code || 'MM'),
    createdAt: String(r.created_at || ''),
  }));

  const users = (userRes.rows || []).map((r: any) => {
    let branchId = String(r.branch_id || 'BR-001');
    if (branchId === 'BR-1789788738927') branchId = 'BR-001';
    const uName = String(r.username || '').toLowerCase();
    let countryCode = String(r.country_code || 'MM');
    if (!countryCode || countryCode === 'NULL') {
      if (branchId.includes('TH') || branchId === 'BR-009' || uName.startsWith('th-') || uName === 'maker_bkk') {
        countryCode = 'TH';
      } else if (branchId.includes('SG') || branchId === 'BR-007' || branchId === 'BR-008' || branchId === 'BR-010' || uName.startsWith('sg-') || uName === 'tloo') {
        countryCode = 'SG';
      } else {
        countryCode = 'MM';
      }
    }
    return {
      id: String(r.id),
      username: String(r.username).replace(/^@/, ''),
      fullName: String(r.full_name || ''),
      email: String(r.email || `${r.username}@remitmyanmar.com`),
      role: String(r.role || 'MAKER'),
      branchId,
      countryCode,
      phone: String(r.phone || ''),
      status: (r.status || (r.is_active === 0 ? 'INACTIVE' : 'ACTIVE')) as 'ACTIVE' | 'INACTIVE',
      password: String(r.password_hash || 'password123'),
      createdAt: String(r.created_at || ''),
      lastLogin: String(r.last_login || ''),
      defaultStatusEnabled: r.default_status_enabled !== 0,
    };
  });

  const companies = compRes.rows.map((r: any) => ({
    id: String(r.id),
    code: String(r.code),
    nameEn: String(r.name_en),
    nameMm: String(r.name_mm || ''),
    countryCode: String(r.country_code || 'MM'),
    type: (r.type || 'BANK') as 'BANK' | 'AGENT' | 'FINTECH' | 'MONEY_CHANGER',
    swiftCode: r.swift_code ? String(r.swift_code) : undefined,
    licenseNo: String(r.license_no || ''),
    phone: String(r.phone || ''),
    email: String(r.email || ''),
    status: (r.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
    createdAt: String(r.created_at || ''),
  }));

  const currencies = currRes.rows.map((r: any) => ({
    id: String(r.id),
    code: String(r.code),
    nameEn: String(r.name_en),
    nameMm: String(r.name_mm || ''),
    symbol: String(r.symbol || ''),
    isBaseCurrency: r.is_base_currency === 1,
    decimals: Number(r.decimals) || 2,
    status: (r.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
  }));

  const countries = countryRes.rows.map((r: any) => ({
    id: String(r.id),
    code: String(r.code),
    nameEn: String(r.name_en),
    nameMm: String(r.name_mm || ''),
    dialCode: String(r.dial_code || ''),
    flagEmoji: String(r.flag_emoji || ''),
    currencyCode: String(r.currency_code || 'MMK'),
    isDomestic: r.is_domestic === 1,
    status: (r.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
  }));

  const blacklist = blRes.rows.map((r: any) => ({
    id: String(r.id),
    fullNameEn: String(r.full_name_en),
    fullNameMm: String(r.full_name_mm || ''),
    nameEn: String(r.full_name_en),
    nameMm: String(r.full_name_mm || ''),
    nrcNumber: String(r.nrc_number || ''),
    passportNumber: String(r.passport_number || r.passbook_number || ''),
    passbookNumber: String(r.passbook_number || r.passport_number || ''),
    reason: String(r.reason || ''),
    note: String(r.note || ''),
    riskLevel: (r.risk_level || 'HIGH') as any,
    addedBy: String(r.added_by || 'Admin'),
    active: r.active !== 0,
    createdAt: String(r.created_at || ''),
  }));

  const purposes = purpRes.rows.map((r: any) => ({
    id: String(r.id),
    code: String(r.code),
    nameEn: String(r.name_en),
    nameMm: String(r.name_mm || ''),
    category: (r.category || 'PERSONAL') as any,
    requiresDocProof: r.requires_doc_proof === 1,
    maxDailyLimitMMK: r.max_daily_limit_mmk ? Number(r.max_daily_limit_mmk) : undefined,
  }));

  let operatorProfile: any = undefined;
  if (profRes.rows && profRes.rows.length > 0) {
    const pr: any = profRes.rows[0];
    operatorProfile = {
      companyNameEn: String(pr.company_name_en || ''),
      companyNameMm: String(pr.company_name_mm || ''),
      licenseNo: String(pr.license_no || ''),
      phone: String(pr.phone || ''),
      hotline: String(pr.hotline || ''),
      addressEn: String(pr.address_en || ''),
      addressMm: String(pr.address_mm || ''),
      email: String(pr.email || ''),
      website: pr.website ? String(pr.website) : undefined,
      taxId: pr.tax_id ? String(pr.tax_id) : undefined,
    };
  }

  let roleMenuPermissions: any = undefined;
  let countryRoleMenuPermissions: any = undefined;
  let defaultStatusConfig: any = undefined;
  if (settsRes.rows && settsRes.rows.length > 0) {
    for (const row of settsRes.rows as any[]) {
      if (row.key === 'role_menu_permissions') {
        try {
          roleMenuPermissions = JSON.parse(row.value);
        } catch {
          // ignore
        }
      } else if (row.key === 'country_role_menu_permissions') {
        try {
          countryRoleMenuPermissions = JSON.parse(row.value);
        } catch {
          // ignore
        }
      } else if (row.key === 'default_status_config') {
        try {
          defaultStatusConfig = JSON.parse(row.value);
        } catch {
          // ignore
        }
      }
    }
  }

  let mtoComplianceLimits = (mtoLimRes.rows || []).map((r: any) => ({
    id: String(r.id),
    countryCode: String(r.country_code),
    countryName: String(r.country_name),
    flagEmoji: String(r.flag_emoji || ''),
    currency: String(r.currency),
    mtoPartnerName: String(r.mto_partner_name || ''),
    mtoMaxLimitPerTx: Number(r.mto_max_limit_per_tx) || 0,
    mtoMaxLimitPerMonth: r.mto_max_limit_per_month !== null && r.mto_max_limit_per_month !== undefined ? Number(r.mto_max_limit_per_month) : undefined,
    inwardCountryCode: String(r.inward_country_code || 'MM'),
    inwardMaxUsdPerTx: Number(r.inward_max_usd_per_tx) || 5000,
    inwardMaxUsdPerMonth: Number(r.inward_max_usd_per_month) || 25000,
    regulatoryRef: String(r.regulatory_ref || ''),
    description: String(r.description || ''),
    active: r.active !== 0,
    createdAt: String(r.created_at || ''),
    updatedAt: String(r.updated_at || ''),
  }));

  if (mtoComplianceLimits.length === 0 && settsRes.rows && settsRes.rows.length > 0) {
    const limSetting = (settsRes.rows as any[]).find(r => r.key === 'mto_compliance_limits');
    if (limSetting?.value) {
      try {
        const parsed = JSON.parse(limSetting.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          mtoComplianceLimits = parsed;
        }
      } catch {}
    }
  }

  return {
    success: true,
    data: {
      transactions,
      exchangeRates,
      customers,
      auditLogs,
      branches,
      users,
      companies,
      currencies,
      countries,
      blacklist,
      purposes,
      operatorProfile,
      roleMenuPermissions,
      countryRoleMenuPermissions,
      defaultStatusConfig,
      mtoComplianceLimits,
    }
  };
}

export async function seedTursoSystemUsers(clientInstance?: Client) {
  const client = clientInstance || initTursoClient();
  const defaultUsers = [
    { 
      id: 'USR-001', 
      username: 'admin', 
      full_name: 'U Thein Than (System Administrator)', 
      email: 'admin@remitmyanmar.com', 
      role: 'ADMIN', 
      branch_id: 'BR-001', 
      is_active: 1, 
      phone: '09-450012345', 
      status: 'ACTIVE', 
      password_hash: 'password123' 
    },
    { 
      id: 'USR-002', 
      username: 'maker_thura', 
      full_name: 'U Thura Lin (Maker / Operator)', 
      email: 'thura.lin@remitmyanmar.com', 
      role: 'MAKER', 
      branch_id: 'BR-001', 
      is_active: 1, 
      phone: '09-798123456', 
      status: 'ACTIVE', 
      password_hash: 'password123' 
    },
    { 
      id: 'USR-003', 
      username: 'checker_khinmar', 
      full_name: 'Daw Khin Mar Lar (Checker / Approver)', 
      email: 'khinmar.lar@remitmyanmar.com', 
      role: 'CHECKER', 
      branch_id: 'BR-001', 
      is_active: 1, 
      phone: '09-250987654', 
      status: 'ACTIVE', 
      password_hash: 'password123' 
    },
    { 
      id: 'USR-004', 
      username: 'auditor_ayeaye', 
      full_name: 'Daw Aye Aye Win (Compliance Auditor)', 
      email: 'ayeaye.win@remitmyanmar.com', 
      role: 'AUDITOR', 
      branch_id: 'BR-001', 
      is_active: 1, 
      phone: '09-970112233', 
      status: 'ACTIVE', 
      password_hash: 'password123' 
    },
    { 
      id: 'USR-005', 
      username: 'maker_mandalay', 
      full_name: 'Ko Kyaw Swar (Mandalay Operator)', 
      email: 'kyawswar.mdy@remitmyanmar.com', 
      role: 'MAKER', 
      branch_id: 'BR-002', 
      is_active: 1, 
      phone: '09-440112233', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'MM'
    },
    { 
      id: 'USR-007', 
      username: 'th-admin', 
      full_name: 'Thai Admin (Thailand Operations)', 
      email: 'th-admin@remit.internal', 
      role: 'ADMIN', 
      branch_id: 'BR-009', 
      is_active: 1, 
      phone: '+66-81-2345678', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'TH'
    },
    { 
      id: 'USR-008', 
      username: 'th-maker', 
      full_name: 'Thai Maker (Bangkok Operator)', 
      email: 'th-maker@remit.internal', 
      role: 'MAKER', 
      branch_id: 'BR-009', 
      is_active: 1, 
      phone: '+66-81-2345679', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'TH'
    },
    { 
      id: 'USR-009', 
      username: 'th-checker', 
      full_name: 'Thai Checker (Bangkok Approver)', 
      email: 'th-checker@remit.internal', 
      role: 'CHECKER', 
      branch_id: 'BR-009', 
      is_active: 1, 
      phone: '+66-81-2345680', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'TH'
    },
    { 
      id: 'USR-012', 
      username: 'sg-admin2', 
      full_name: 'Admin 2 (Singapore Lead)', 
      email: 'sg.admin2@remitmyanmar.com', 
      role: 'ADMIN', 
      branch_id: 'BR-008', 
      is_active: 1, 
      phone: '+65-6338-0001', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'SG'
    },
    { 
      id: 'USR-011', 
      username: 'sg-checker2', 
      full_name: 'Checker 2 (Singapore Approver)', 
      email: 'sg.checker2@remitmyanmar.com', 
      role: 'CHECKER', 
      branch_id: 'BR-008', 
      is_active: 1, 
      phone: '+65-6338-0002', 
      status: 'ACTIVE', 
      password_hash: 'password123',
      country_code: 'SG'
    }
  ];

  let inserted = 0;
  for (const u of defaultUsers) {
    try {
      await client.execute({
        sql: `INSERT INTO system_users (
          id, username, full_name, email, role, branch_id, is_active, phone, status, password_hash, country_code, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          username=excluded.username,
          full_name=excluded.full_name,
          email=excluded.email,
          role=excluded.role,
          branch_id=excluded.branch_id,
          is_active=excluded.is_active,
          phone=excluded.phone,
          status=excluded.status,
          password_hash=excluded.password_hash,
          country_code=excluded.country_code;`,
        args: [u.id, u.username, u.full_name, u.email, u.role, u.branch_id, u.is_active, u.phone, u.status, u.password_hash, (u as any).country_code || 'MM']
      });
      inserted++;
    } catch (e: any) {
      console.warn('Error inserting user to Turso:', u.username, e?.message);
    }
  }

  return { success: true, count: inserted };
}

export async function getTursoUsers() {
  const client = initTursoClient();
  await initTursoSchema(client);

  const res = await client.execute('SELECT * FROM system_users ORDER BY id ASC;');
  const users = res.rows.map((r: any) => {
    let countryCode = String(r.country_code || '').trim().toUpperCase();
    if (!countryCode || countryCode === 'NULL') {
      const username = String(r.username || '').toLowerCase();
      const fullName = String(r.full_name || '').toLowerCase();
      const branchId = String(r.branch_id || '');
      if (username.startsWith('th-') || username.includes('thai') || fullName.includes('thai') || branchId.includes('1789830806420')) {
        countryCode = 'TH';
      } else if (username.startsWith('sg-') || username.includes('singapore') || fullName.includes('singapore') || branchId === 'BR-007' || branchId === 'BR-008') {
        countryCode = 'SG';
      } else if (username.startsWith('my-') || username.includes('malaysia')) {
        countryCode = 'MY';
      } else {
        countryCode = 'MM';
      }
    }

    const username = String(r.username || '');
    let branchId = String(r.branch_id || '');
    if (!branchId || branchId === 'BR-001' || branchId === 'BR-1789830806420') {
      if (countryCode === 'TH' || username.startsWith('th-')) {
        branchId = 'BR-009';
      } else if (countryCode === 'SG' || username.startsWith('sg-')) {
        branchId = 'BR-008';
      } else if (!branchId) {
        branchId = 'BR-001';
      }
    }

    return {
      id: String(r.id),
      username: username,
      fullName: String(r.full_name || ''),
      email: String(r.email || `${r.username}@remitmyanmar.com`),
      role: String(r.role || 'MAKER'),
      branchId: branchId,
      countryCode: countryCode,
      phone: String(r.phone || ''),
      status: String(r.status || (r.is_active === 0 ? 'INACTIVE' : 'ACTIVE')),
      createdAt: String(r.created_at || ''),
      lastLogin: String(r.last_login || '')
    };
  });

  return { success: true, users };
}

export async function loginTursoUser(usernameOrEmail: string, passwordAttempt: string) {
  const client = initTursoClient();
  await initTursoSchema(client);

  const trimmed = usernameOrEmail.trim().toLowerCase();
  if (!trimmed) {
    return { success: false, message: 'Username or Email is required.' };
  }

  const queryRes = await client.execute({
    sql: `SELECT * FROM system_users 
          WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?) 
          LIMIT 1;`,
    args: [trimmed, trimmed]
  });

  if (!queryRes.rows || queryRes.rows.length === 0) {
    return { 
      success: false, 
      message: `No user found in Turso Cloud database matching "${usernameOrEmail}".` 
    };
  }

  const row: any = queryRes.rows[0];

  // Check account status
  const statusStr = String(row.status || '').toUpperCase();
  if (statusStr === 'INACTIVE' || row.is_active === 0) {
    return { 
      success: false, 
      message: 'This user account is deactivated in Turso Cloud.' 
    };
  }

  // Password verification: support standard password123 or stored password_hash
  const expectedPassword = row.password_hash || 'password123';
  if (passwordAttempt && passwordAttempt !== expectedPassword && passwordAttempt !== 'password123') {
    return { 
      success: false, 
      message: 'Invalid password. (Default password for all demo accounts is password123).' 
    };
  }

  // Update last_login
  try {
    await client.execute({
      sql: `UPDATE system_users SET last_login = datetime('now') WHERE id = ?;`,
      args: [row.id]
    });
  } catch {
    // ignore
  }

  let userCountryCode = String(row.country_code || '').trim().toUpperCase();
  const username = String(row.username || '');
  const lowerUname = username.toLowerCase();
  const lowerFull = String(row.full_name || '').toLowerCase();
  let userBranchId = String(row.branch_id || '');

  if (!userCountryCode || userCountryCode === 'NULL') {
    if (lowerUname.startsWith('th-') || lowerUname.includes('thai') || lowerFull.includes('thai') || userBranchId.includes('1789830806420')) {
      userCountryCode = 'TH';
    } else if (lowerUname.startsWith('sg-') || lowerUname.includes('singapore') || lowerFull.includes('singapore') || userBranchId === 'BR-007' || userBranchId === 'BR-008') {
      userCountryCode = 'SG';
    } else if (lowerUname.startsWith('my-') || lowerUname.includes('malaysia')) {
      userCountryCode = 'MY';
    } else {
      userCountryCode = 'MM';
    }
  }

  if (!userBranchId || userBranchId === 'BR-001' || userBranchId === 'BR-1789830806420') {
    if (userCountryCode === 'TH' || lowerUname.startsWith('th-')) {
      userBranchId = 'BR-009';
    } else if (userCountryCode === 'SG' || lowerUname.startsWith('sg-')) {
      userBranchId = 'BR-008';
    }
  }

  const user = {
    id: String(row.id),
    username: username,
    fullName: String(row.full_name || ''),
    email: String(row.email || `${row.username}@remitmyanmar.com`),
    role: String(row.role || 'MAKER'),
    branchId: userBranchId || 'BR-001',
    countryCode: userCountryCode || 'MM',
    phone: String(row.phone || ''),
    status: 'ACTIVE' as const,
    lastLogin: new Date().toISOString(),
    createdAt: String(row.created_at || '')
  };

  return {
    success: true,
    user,
    message: `Logged in successfully with Turso Cloud as ${user.fullName} (${user.role}).`
  };
}

export async function getTursoBranches() {
  const client = initTursoClient();
  await initTursoSchema(client);

  const res = await client.execute('SELECT * FROM branches ORDER BY id ASC;');
  const validRows = (res.rows || []).filter((r: any) => {
    const id = String(r.id || '');
    if (id === 'BR-1789788738927') return false;
    return true;
  });

  const branches = validRows.map((r: any) => {
    let countryCode = String(r.country_code || '').trim().toUpperCase();
    const bId = String(r.id || '');
    const bCode = String(r.code || '').toUpperCase();
    const bCity = String(r.city || '').toLowerCase();
    const bName = String(r.name_en || '').toLowerCase();

    if (!countryCode || countryCode === 'NULL') {
      if (bId.includes('1789830806420') || bCode.startsWith('TH') || bCode.startsWith('BKK') || bCity.includes('bangkok') || bCity.includes('thailand') || bName.includes('bangkok') || bName.includes('thai')) {
        countryCode = 'TH';
      } else if (bCode.startsWith('SG') || bCode.startsWith('SIN') || bCity.includes('singapore') || bName.includes('singapore') || bId === 'BR-007' || bId === 'BR-008' || bId === 'BR-010') {
        countryCode = 'SG';
      } else {
        countryCode = 'MM';
      }
    }

    return {
      id: bId,
      code: String(r.code || r.id),
      nameEn: String(r.name_en || ''),
      nameMm: String(r.name_mm || ''),
      countryCode: countryCode,
      city: String(r.city || ''),
      phone: String(r.phone || ''),
      address: String(r.address || ''),
      managerName: String(r.manager_name || ''),
      status: String(r.status || 'ACTIVE'),
      createdAt: String(r.created_at || '')
    };
  });

  return { success: true, branches };
}

export async function saveTursoUser(user: any) {
  const client = initTursoClient();
  await initTursoSchema(client);
  const username = String(user.username || '').trim().replace(/^@/, '');
  if (!username) return { success: false, error: 'Username is required' };
  const branchId = user.branchId || 'BR-001';
  let countryCode = user.countryCode;
  if (!countryCode) {
    if (branchId.startsWith('BR-009') || username.startsWith('th-') || username.includes('bkk')) countryCode = 'TH';
    else if (branchId.startsWith('BR-007') || branchId.startsWith('BR-008') || branchId.startsWith('BR-010') || username.startsWith('sg-')) countryCode = 'SG';
    else countryCode = 'MM';
  }

  await client.execute({
    sql: 'DELETE FROM system_users WHERE username = ? AND id != ?;',
    args: [username, user.id]
  }).catch(() => {});

  await client.execute({
    sql: `INSERT INTO system_users (
      id, username, full_name, role, branch_id, is_active, email, password_hash, phone, status, created_at, last_login, country_code, default_status_enabled
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username=excluded.username,
      full_name=excluded.full_name,
      role=excluded.role,
      branch_id=excluded.branch_id,
      is_active=excluded.is_active,
      email=excluded.email,
      password_hash=excluded.password_hash,
      phone=excluded.phone,
      status=excluded.status,
      last_login=coalesce(excluded.last_login, system_users.last_login),
      country_code=excluded.country_code,
      default_status_enabled=excluded.default_status_enabled;`,
    args: [
      user.id,
      username,
      user.fullName || username,
      user.role || 'MAKER',
      branchId,
      user.status === 'INACTIVE' ? 0 : 1,
      user.email || `${username}@remitmyanmar.com`,
      user.password || 'password123',
      user.phone || '',
      user.status || 'ACTIVE',
      user.createdAt || new Date().toISOString(),
      user.lastLogin || null,
      countryCode,
      user.defaultStatusEnabled !== false ? 1 : 0
    ]
  });

  return { success: true };
}

export async function deleteTursoUser(id: string) {
  const client = initTursoClient();
  await initTursoSchema(client);
  await client.execute({
    sql: 'DELETE FROM system_users WHERE id = ?;',
    args: [id]
  });
  return { success: true };
}

export async function saveTursoBranch(b: any) {
  const client = initTursoClient();
  await initTursoSchema(client);
  const branchCode = b.code || b.branchCode || b.id;
  await client.execute({
    sql: 'DELETE FROM branches WHERE code = ? AND id != ?;',
    args: [branchCode, b.id]
  }).catch(() => {});

  await client.execute({
    sql: `INSERT INTO branches (
      id, code, name_en, name_mm, city, phone, address, manager_name, status, country_code, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      code=excluded.code,
      name_en=excluded.name_en,
      name_mm=excluded.name_mm,
      city=excluded.city,
      phone=excluded.phone,
      address=excluded.address,
      manager_name=excluded.manager_name,
      status=excluded.status,
      country_code=excluded.country_code;`,
    args: [
      b.id,
      branchCode,
      b.nameEn || b.nameMm || 'Branch',
      b.nameMm || b.nameEn || '',
      b.city || 'Yangon',
      b.phone || '',
      b.address || '',
      b.managerName || '',
      b.status || 'ACTIVE',
      b.countryCode || 'MM',
      b.createdAt || new Date().toISOString()
    ]
  });
  return { success: true };
}

export async function deleteTursoBranch(id: string) {
  const client = initTursoClient();
  await initTursoSchema(client);
  await client.execute({
    sql: 'DELETE FROM branches WHERE id = ?;',
    args: [id]
  });
  return { success: true };
}

export async function saveTursoExchangeRates(rates: any[]) {
  const client = initTursoClient();
  await initTursoSchema(client);
  const list = Array.isArray(rates) ? rates : [rates];
  for (const rate of list) {
    if (!rate || !rate.id) continue;
    const bRate = Number(rate.buyRate) || 0;
    const sRate = Number(rate.sellRate) || 0;
    const tRate = Number(rate.transferRate) || sRate || 0;
    const cbRate = Number(rate.centralBankRate) || tRate || 0;
    await client.execute({
      sql: `INSERT INTO exchange_rates (
        id, from_currency, to_currency, buy_rate, sell_rate, central_bank_rate, effective_date, updated_at,
        transfer_rate, effective_time, updated_by, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        buy_rate=excluded.buy_rate,
        sell_rate=excluded.sell_rate,
        central_bank_rate=excluded.central_bank_rate,
        effective_date=excluded.effective_date,
        updated_at=excluded.updated_at,
        transfer_rate=excluded.transfer_rate,
        effective_time=excluded.effective_time,
        updated_by=excluded.updated_by,
        note=excluded.note;`,
      args: [
        rate.id,
        rate.fromCurrency || '',
        rate.toCurrency || 'MMK',
        bRate,
        sRate,
        cbRate,
        rate.effectiveDate || new Date().toISOString().split('T')[0],
        rate.updatedAt || new Date().toISOString(),
        tRate,
        rate.effectiveTime || '09:00',
        rate.updatedBy || 'Admin',
        rate.note || ''
      ]
    });
  }
  return { success: true, count: list.length };
}

export async function deleteTursoExchangeRate(id: string) {
  const client = initTursoClient();
  await initTursoSchema(client);
  await client.execute({
    sql: 'DELETE FROM exchange_rates WHERE id = ?;',
    args: [id]
  });
  return { success: true };
}

export async function clearTursoTable(tableName: 'remittance_transactions' | 'audit_logs' | 'customer_profiles') {
  const allowed = ['remittance_transactions', 'audit_logs', 'customer_profiles'];
  if (!allowed.includes(tableName)) {
    throw new Error(`Table ${tableName} is not allowed to be cleared.`);
  }
  const client = initTursoClient();
  await initTursoSchema(client);
  const countRes = await client.execute(`SELECT COUNT(*) as cnt FROM ${tableName};`).catch(() => ({ rows: [{ cnt: 0 }] }));
  const count = Number(countRes.rows[0]?.cnt || 0);
  await client.execute(`DELETE FROM ${tableName};`);
  return { success: true, table: tableName, count };
}

export async function searchTursoCustomers(query: string) {
  const client = initTursoClient();
  await initTursoSchema(client);
  const q = (query || '').trim();
  let rows: any[] = [];
  
  if (!q) {
    const res = await client.execute('SELECT * FROM customer_profiles ORDER BY full_name_en ASC LIMIT 30;').catch(() => ({ rows: [] }));
    rows = res.rows as any[];
  } else {
    const pattern = `%${q}%`;
    const res = await client.execute({
      sql: `SELECT * FROM customer_profiles 
            WHERE full_name_en LIKE ? 
               OR full_name_mm LIKE ? 
               OR nrc_number LIKE ? 
               OR passport_number LIKE ? 
               OR passbook_number LIKE ? 
               OR phone LIKE ? 
               OR customer_code LIKE ? 
               OR address LIKE ?
            ORDER BY full_name_en ASC 
            LIMIT 30;`,
      args: [pattern, pattern, pattern, pattern, pattern, pattern, pattern, pattern]
    }).catch((err) => {
      console.warn('Error querying customer_profiles in Turso:', err);
      return { rows: [] };
    });
    rows = res.rows as any[];
  }

  return rows.map((row: any) => ({
    id: String(row.id),
    customerCode: String(row.customer_code || ''),
    fullNameEn: String(row.full_name_en || ''),
    fullNameMm: String(row.full_name_mm || ''),
    nrcNumber: String(row.nrc_number || ''),
    passportNumber: String(row.passport_number || row.passbook_number || ''),
    passbookNumber: String(row.passbook_number || row.passport_number || ''),
    phone: String(row.phone || ''),
    address: String(row.address || ''),
    customerType: String(row.customer_type || 'SENDER'),
    riskRating: String(row.risk_rating || 'LOW'),
    totalTransactions: Number(row.total_transactions) || 0,
    totalVolumeMMK: Number(row.total_volume_mmk) || 0,
    notes: String(row.notes || ''),
    createdAt: String(row.created_at || ''),
  }));
}

export async function seedTursoMtoLimits(clientInstance?: Client) {
  const cli = clientInstance || initTursoClient();
  const defaultLimits = [
    {
      id: 'MTO-LIM-001',
      countryCode: 'TH',
      countryName: 'Thailand (ထိုင်းနိုင်ငံ)',
      flagEmoji: '🇹🇭',
      currency: 'THB',
      mtoPartnerName: 'TrueMoney / DeeMoney / Kasikorn Remit',
      mtoMaxLimitPerTx: 100000,
      mtoMaxLimitPerMonth: 500000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Bank of Thailand (BOT) & Central Bank of Myanmar (CBM) Cross-Border Remittance Bilateral Ceiling',
      description: 'ထိုင်းနိုင်ငံမှ မြန်မာနိုင်ငံသို့ ငွေလွှဲရာတွင် MTO အများဆုံး ၁ သိန်း THB နှင့် ပြည်တွင်း Inward အများဆုံး $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-002',
      countryCode: 'SG',
      countryName: 'Singapore (စင်ကာပူနိုင်ငံ)',
      flagEmoji: '🇸🇬',
      currency: 'SGD',
      mtoPartnerName: 'SingX / DBS Remit / InstaReM',
      mtoMaxLimitPerTx: 5000,
      mtoMaxLimitPerMonth: 25000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Monetary Authority of Singapore (MAS) & CBM Worker Remittance Framework',
      description: 'စင်ကာပူနိုင်ငံမှ မြန်မာပြည်သို့ ငွေလွှဲရာတွင် ၅,၀၀၀ SGD နှင့် ပြည်တွင်း Inward $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-003',
      countryCode: 'MY',
      countryName: 'Malaysia (မလေးရှားနိုင်ငံ)',
      flagEmoji: '🇲🇾',
      currency: 'MYR',
      mtoPartnerName: 'Merchantrade Asia / Valyou MTO',
      mtoMaxLimitPerTx: 15000,
      mtoMaxLimitPerMonth: 60000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Bank Negara Malaysia (BNM) & CBM Cross-Border Remittance Guidelines',
      description: 'မလေးရှားနိုင်ငံမှ မြန်မာပြည်သို့ ငွေလွှဲရာတွင် ၁၅,၀၀၀ MYR နှင့် ပြည်တွင်း Inward $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-004',
      countryCode: 'JP',
      countryName: 'Japan (ဂျပန်နိုင်ငံ)',
      flagEmoji: '🇯🇵',
      currency: 'JPY',
      mtoPartnerName: 'Kyodai Remittance / SBI Remit',
      mtoMaxLimitPerTx: 1000000,
      mtoMaxLimitPerMonth: 3000000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Japan Financial Services Agency (FSA) & CBM Bilateral Directive',
      description: 'ဂျပန်နိုင်ငံမှ မြန်မာပြည်သို့ ငွေလွှဲရာတွင် ယန်း ၁ သန်း (1,000,000 JPY) နှင့် ပြည်တွင်း Inward $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-005',
      countryCode: 'KR',
      countryName: 'South Korea (တောင်ကိုရီးယားနိုင်ငံ)',
      flagEmoji: '🇰🇷',
      currency: 'KRW',
      mtoPartnerName: 'GmoneyTrans / Hanpass / Sentbe',
      mtoMaxLimitPerTx: 5000000,
      mtoMaxLimitPerMonth: 25000000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Bank of Korea (BOK) Foreign Exchange Act & CBM AML Guidelines',
      description: 'တောင်ကိုရီးယားမှ မြန်မာပြည်သို့ ငွေလွှဲရာတွင် ဝမ် ၅ သန်း (5,000,000 KRW) နှင့် ပြည်တွင်း Inward $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-006',
      countryCode: 'AE',
      countryName: 'United Arab Emirates (ဒူဘိုင်း/ယူအေအီး)',
      flagEmoji: '🇦🇪',
      currency: 'AED',
      mtoPartnerName: 'Al Ansari Exchange / LuLu International Exchange',
      mtoMaxLimitPerTx: 20000,
      mtoMaxLimitPerMonth: 100000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Central Bank of the UAE (CBUAE) & CBM Remittance Compliance Framework',
      description: 'ယူအေအီးဒူဘိုင်းမှ မြန်မာပြည်သို့ ငွေလွှဲရာတွင် ၂၀,၀၀၀ AED နှင့် ပြည်တွင်း Inward $5,000 USD / လစဉ် $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    },
    {
      id: 'MTO-LIM-007',
      countryCode: 'DEFAULT',
      countryName: 'All Other International Countries (အခြားနိုင်ငံများ)',
      flagEmoji: '🌐',
      currency: 'USD',
      mtoPartnerName: 'Global Licensed MTO Partners / Western Union / MoneyGram',
      mtoMaxLimitPerTx: 5000,
      mtoMaxLimitPerMonth: 25000,
      inwardCountryCode: 'MM',
      inwardMaxUsdPerTx: 5000,
      inwardMaxUsdPerMonth: 25000,
      regulatoryRef: 'Central Bank of Myanmar (CBM) Standard Cross-Border Inward Remittance Ceiling',
      description: 'အခြားနိုင်ငံများအားလုံးအတွက် စံသတ်မှတ်ချက် - တစ်ကြိမ်လျှင် $5,000 USD နှင့် တစ်လလျှင် အများဆုံး $25,000 USD သတ်မှတ်ချက်',
      active: 1,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z'
    }
  ];

  for (const lim of defaultLimits) {
    try {
      await cli.execute({
        sql: `INSERT INTO mto_compliance_limits (
          id, country_code, country_name, flag_emoji, currency, mto_partner_name,
          mto_max_limit_per_tx, mto_max_limit_per_month, inward_country_code,
          inward_max_usd_per_tx, inward_max_usd_per_month, regulatory_ref, description,
          active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING;`,
        args: [
          lim.id, lim.countryCode, lim.countryName, lim.flagEmoji, lim.currency, lim.mtoPartnerName,
          lim.mtoMaxLimitPerTx, lim.mtoMaxLimitPerMonth, lim.inwardCountryCode,
          lim.inwardMaxUsdPerTx, lim.inwardMaxUsdPerMonth, lim.regulatoryRef, lim.description,
          lim.active, lim.createdAt, lim.updatedAt
        ]
      });
    } catch (e) {
      console.warn('Error auto-seeding mto limit:', lim.id, e);
    }
  }
}

export async function getTursoMtoLimits() {
  const client = initTursoClient();
  await initTursoSchema(client);
  const res = await client.execute('SELECT * FROM mto_compliance_limits ORDER BY id ASC;');
  return res.rows.map((r: any) => ({
    id: String(r.id),
    countryCode: String(r.country_code),
    countryName: String(r.country_name),
    flagEmoji: String(r.flag_emoji || ''),
    currency: String(r.currency),
    mtoPartnerName: String(r.mto_partner_name || ''),
    mtoMaxLimitPerTx: Number(r.mto_max_limit_per_tx) || 0,
    mtoMaxLimitPerMonth: r.mto_max_limit_per_month !== null && r.mto_max_limit_per_month !== undefined ? Number(r.mto_max_limit_per_month) : undefined,
    inwardCountryCode: String(r.inward_country_code || 'MM'),
    inwardMaxUsdPerTx: Number(r.inward_max_usd_per_tx) || 5000,
    inwardMaxUsdPerMonth: Number(r.inward_max_usd_per_month) || 25000,
    regulatoryRef: String(r.regulatory_ref || ''),
    description: String(r.description || ''),
    active: r.active !== 0,
    createdAt: String(r.created_at || ''),
    updatedAt: String(r.updated_at || ''),
  }));
}

export async function saveTursoMtoLimit(lim: any) {
  if (!lim || !lim.id) throw new Error('MTO limit id is required.');
  const client = initTursoClient();
  await initTursoSchema(client);

  const cCode = String(lim.countryCode || lim.country_code || '').trim().toUpperCase();
  await client.execute({
    sql: 'DELETE FROM mto_compliance_limits WHERE country_code = ? AND id != ?;',
    args: [cCode, lim.id]
  }).catch(() => {});

  await client.execute({
    sql: `INSERT INTO mto_compliance_limits (
      id, country_code, country_name, flag_emoji, currency, mto_partner_name,
      mto_max_limit_per_tx, mto_max_limit_per_month, inward_country_code,
      inward_max_usd_per_tx, inward_max_usd_per_month, regulatory_ref, description,
      active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      country_code=excluded.country_code,
      country_name=excluded.country_name,
      flag_emoji=excluded.flag_emoji,
      currency=excluded.currency,
      mto_partner_name=excluded.mto_partner_name,
      mto_max_limit_per_tx=excluded.mto_max_limit_per_tx,
      mto_max_limit_per_month=excluded.mto_max_limit_per_month,
      inward_country_code=excluded.inward_country_code,
      inward_max_usd_per_tx=excluded.inward_max_usd_per_tx,
      inward_max_usd_per_month=excluded.inward_max_usd_per_month,
      regulatory_ref=excluded.regulatory_ref,
      description=excluded.description,
      active=excluded.active,
      updated_at=excluded.updated_at;`,
    args: [
      lim.id,
      cCode,
      lim.countryName || lim.country_name || cCode,
      lim.flagEmoji || lim.flag_emoji || '🌐',
      lim.currency || 'USD',
      lim.mtoPartnerName || lim.mto_partner_name || '',
      Number(lim.mtoMaxLimitPerTx ?? lim.mto_max_limit_per_tx ?? 0),
      lim.mtoMaxLimitPerMonth !== undefined && lim.mtoMaxLimitPerMonth !== null ? Number(lim.mtoMaxLimitPerMonth) : (lim.mto_max_limit_per_month ? Number(lim.mto_max_limit_per_month) : null),
      lim.inwardCountryCode || lim.inward_country_code || 'MM',
      Number(lim.inwardMaxUsdPerTx ?? lim.inward_max_usd_per_tx ?? 5000),
      Number(lim.inwardMaxUsdPerMonth ?? lim.inward_max_usd_per_month ?? 25000),
      lim.regulatoryRef || lim.regulatory_ref || '',
      lim.description || '',
      lim.active !== false && lim.active !== 0 ? 1 : 0,
      lim.createdAt || lim.created_at || new Date().toISOString(),
      lim.updatedAt || lim.updated_at || new Date().toISOString()
    ]
  });

  return { success: true, id: lim.id };
}

export async function deleteTursoMtoLimit(id: string) {
  if (!id) throw new Error('ID is required to delete MTO limit.');
  const client = initTursoClient();
  await initTursoSchema(client);
  await client.execute({
    sql: 'DELETE FROM mto_compliance_limits WHERE id = ?;',
    args: [id]
  });
  return { success: true, id };
}
