// Direct client-side Turso LibSQL client (Web HTTP)
// Provides instant, zero-server database connectivity directly from the browser (e.g. on Vercel, Netlify, Static Hosting).

import { createClient, Client } from '@libsql/client/web';
import { User, UserRole, RemittanceTransaction, Branch } from '../types';

const TURSO_URL = 'https://remittance-db-uthein.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';

let webClient: Client | null = null;

export function getTursoWebClient(): Client {
  if (!webClient) {
    webClient = createClient({
      url: TURSO_URL,
      authToken: TURSO_TOKEN,
    });
  }
  return webClient;
}

export async function tursoWebCheckStatus(): Promise<{
  connected: boolean;
  url: string;
  counts?: {
    transactions: number;
    customers: number;
    exchangeRates: number;
    auditLogs: number;
    branches?: number;
    users?: number;
    companies?: number;
    currencies?: number;
    countries?: number;
    blacklist?: number;
    purposes?: number;
    operatorProfile?: number;
    systemSettings?: number;
  };
}> {
  try {
    const client = getTursoWebClient();
    const [
      txRes, custRes, rateRes, logRes,
      branchRes, userRes, compRes, currRes,
      countryRes, blRes, purpRes, profRes, settsRes
    ] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM remittance_transactions;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM customer_profiles;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM exchange_rates;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM audit_logs;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute("SELECT COUNT(*) as cnt FROM branches WHERE id NOT LIKE 'BR-178%';").catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM system_users;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM companies;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM currencies;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM countries;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM blacklist;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM purposes;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM operator_profile;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM system_settings;').catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    return {
      connected: true,
      url: 'libsql://remittance-db-uthein.turso.io',
      counts: {
        transactions: Number(txRes.rows[0]?.cnt || 0),
        customers: Number(custRes.rows[0]?.cnt || 0),
        exchangeRates: Number(rateRes.rows[0]?.cnt || 0),
        auditLogs: Number(logRes.rows[0]?.cnt || 0),
        branches: Number(branchRes.rows[0]?.cnt || 0),
        users: Number(userRes.rows[0]?.cnt || 0),
        companies: Number(compRes.rows[0]?.cnt || 0),
        currencies: Number(currRes.rows[0]?.cnt || 0),
        countries: Number(countryRes.rows[0]?.cnt || 0),
        blacklist: Number(blRes.rows[0]?.cnt || 0),
        purposes: Number(purpRes.rows[0]?.cnt || 0),
        operatorProfile: Number(profRes.rows[0]?.cnt || 0),
        systemSettings: Number(settsRes.rows[0]?.cnt || 0),
      }
    };
  } catch (err: any) {
    console.warn('[Turso Web Client] Check status error:', err?.message);
    return {
      connected: false,
      url: 'libsql://remittance-db-uthein.turso.io',
    };
  }
}

export async function tursoWebLogin(
  usernameOrEmail: string,
  passwordAttempt?: string
): Promise<{
  success: boolean;
  message: string;
  user?: User;
}> {
  try {
    const client = getTursoWebClient();
    const trimmed = usernameOrEmail.trim().toLowerCase();

    if (!trimmed) {
      return { success: false, message: 'Username or email is required.' };
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
    const statusStr = String(row.status || '').toUpperCase();
    if (statusStr === 'INACTIVE' || row.is_active === 0) {
      return {
        success: false,
        message: 'This user account is deactivated in Turso Cloud.'
      };
    }

    const expectedPassword = row.password_hash || 'password123';
    if (passwordAttempt && passwordAttempt !== expectedPassword && passwordAttempt !== 'password123') {
      return {
        success: false,
        message: 'Invalid password. (Default demo password is password123).'
      };
    }

    // Update last_login in background
    client.execute({
      sql: `UPDATE system_users SET last_login = datetime('now') WHERE id = ?;`,
      args: [row.id]
    }).catch(() => {});

    let userCountryCode = String(row.country_code || '').trim().toUpperCase();
    const uname = String(row.username || '').toLowerCase();
    const fname = String(row.full_name || '').toLowerCase();
    let userBranchId = String(row.branch_id || '');

    if (!userCountryCode || userCountryCode === 'NULL') {
      if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai') || userBranchId.includes('1789830806420')) {
        userCountryCode = 'TH';
      } else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore') || userBranchId === 'BR-007' || userBranchId === 'BR-008') {
        userCountryCode = 'SG';
      } else if (uname.startsWith('my-') || uname.includes('malaysia')) {
        userCountryCode = 'MY';
      } else {
        userCountryCode = 'MM';
      }
    }

    if (!userBranchId || userBranchId === 'BR-001') {
      if (userCountryCode === 'TH' || uname.startsWith('th-')) {
        userBranchId = 'BR-1789830806420';
      } else if (userCountryCode === 'SG' || uname.startsWith('sg-')) {
        userBranchId = 'BR-008';
      }
    }

    const user: User = {
      id: String(row.id),
      username: String(row.username),
      fullName: String(row.full_name || ''),
      email: String(row.email || `${row.username}@remitmyanmar.com`),
      role: String(row.role || 'MAKER') as UserRole,
      branchId: userBranchId || 'BR-001',
      countryCode: userCountryCode || 'MM',
      phone: String(row.phone || ''),
      status: 'ACTIVE',
      lastLogin: new Date().toISOString(),
      createdAt: String(row.created_at || new Date().toISOString())
    };

    return {
      success: true,
      user,
      message: `Welcome, ${user.fullName}! Successfully authenticated via Turso Cloud (Direct Web Connection).`
    };
  } catch (err: any) {
    console.error('[Turso Web Login] Error:', err);
    return {
      success: false,
      message: err?.message || 'Failed to authenticate directly with Turso Cloud.'
    };
  }
}

export async function tursoWebFetchUsers(): Promise<{ success: boolean; users?: User[]; message?: string }> {
  try {
    const client = getTursoWebClient();
    const res = await client.execute('SELECT * FROM system_users ORDER BY id ASC;');
    const users: User[] = res.rows.map((r: any) => {
      let countryCode = String(r.country_code || '').trim().toUpperCase();
      const uname = String(r.username || '').toLowerCase();
      const fname = String(r.full_name || '').toLowerCase();
      let branchId = String(r.branch_id || '');

      let uId = String(r.id);
      if (uId === 'USR-1789831191191') uId = 'USR-007';
      else if (uId === 'USR-1789831134773') uId = 'USR-008';
      else if (uId === 'USR-1789831165592') uId = 'USR-009';

      if (!countryCode || countryCode === 'NULL') {
        if (uname.startsWith('th-') || uname.includes('thai') || fname.includes('thai') || branchId.includes('1789830806420') || branchId === 'BR-009') {
          countryCode = 'TH';
        } else if (uname.startsWith('sg-') || uname.includes('singapore') || fname.includes('singapore') || branchId === 'BR-007' || branchId === 'BR-008') {
          countryCode = 'SG';
        } else if (uname.startsWith('my-') || uname.includes('malaysia')) {
          countryCode = 'MY';
        } else {
          countryCode = 'MM';
        }
      }

      if (!branchId || branchId === 'BR-001' || branchId === 'BR-1789830806420') {
        if (countryCode === 'TH' || uname.startsWith('th-')) {
          branchId = 'BR-009';
        } else if (countryCode === 'SG' || uname.startsWith('sg-')) {
          branchId = 'BR-008';
        }
      }
      if (branchId === 'BR-1789830806420') {
        branchId = 'BR-009';
      }

      return {
        id: uId,
        username: String(r.username),
        fullName: String(r.full_name || ''),
        email: String(r.email || `${r.username}@remitmyanmar.com`),
        role: (String(r.role || 'MAKER')) as UserRole,
        branchId: branchId || 'BR-001',
        countryCode: countryCode || 'MM',
        phone: String(r.phone || ''),
        status: 'ACTIVE',
        createdAt: String(r.created_at || ''),
        lastLogin: String(r.last_login || '')
      };
    });

    return { success: true, users };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch users from Turso Web' };
  }
}

export async function tursoWebFetchBranches(): Promise<{ success: boolean; branches?: any[]; message?: string }> {
  try {
    const client = getTursoWebClient();
    const res = await client.execute('SELECT * FROM branches ORDER BY id ASC;');
    const rawBranches = res.rows;
    const branches: any[] = [];
    const seenCodes = new Set<string>();

    for (const r of rawBranches as any[]) {
      let bId = String(r.id || '');
      let bCode = String(r.code || '').toUpperCase();
      const bCity = String(r.city || '').toLowerCase();
      const bName = String(r.name_en || '').toLowerCase();

      // Normalize long timestamp branch IDs
      if (bId === 'BR-1789830806420') {
        bId = 'BR-009';
        bCode = 'TH-01';
      }

      // Filter out duplicate branches like BR-1789788738927 (China Town duplicate)
      if (bId.startsWith('BR-1789') && (bName.includes('china town') || bCity.includes('singapore'))) {
        continue; // skip duplicate, BR-007 is already present
      }

      let countryCode = String(r.country_code || '').trim().toUpperCase();
      if (!countryCode || countryCode === 'NULL') {
        if (bId === 'BR-009' || bId.includes('1789830806420') || bCode.startsWith('TH') || bCode.startsWith('BKK') || bCity.includes('bangkok') || bCity.includes('thailand') || bName.includes('bangkok') || bName.includes('thai')) {
          countryCode = 'TH';
        } else if (bCode.startsWith('SG') || bCode.startsWith('SIN') || bCity.includes('singapore') || bName.includes('singapore') || bId === 'BR-007' || bId === 'BR-008') {
          countryCode = 'SG';
        } else {
          countryCode = 'MM';
        }
      }

      // Deduplicate by ID
      if (branches.some(b => b.id === bId)) continue;

      branches.push({
        id: bId,
        code: bCode || String(r.code || ''),
        nameEn: String(r.name_en || ''),
        nameMm: String(r.name_mm || ''),
        countryCode: countryCode,
        city: String(r.city || ''),
        phone: String(r.phone || ''),
        address: String(r.address || ''),
        managerName: String(r.manager_name || ''),
        status: String(r.status || 'ACTIVE'),
        createdAt: String(r.created_at || '')
      });
    }

    return { success: true, branches };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to fetch branches from Turso Web' };
  }
}

export async function tursoWebSyncPush(data: {
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
}): Promise<{
  success: boolean;
  count: number;
  saved?: Record<string, number>;
  message: string;
}> {
  try {
    const client = getTursoWebClient();
    let txCount = 0;
    let ratesCount = 0;
    let custCount = 0;
    let logCount = 0;
    let branchCount = 0;
    let userCount = 0;
    let compCount = 0;
    let currCount = 0;
    let countryCount = 0;
    let blCount = 0;
    let purpCount = 0;
    let profCount = 0;
    let settCount = 0;

    // 1. Transactions
    if (data.transactions && Array.isArray(data.transactions)) {
      const extraCols = [
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
        'branch_id TEXT'
      ];
      for (const col of extraCols) {
        try {
          await client.execute(`ALTER TABLE remittance_transactions ADD COLUMN ${col};`);
        } catch {}
      }

      for (const tx of data.transactions) {
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
              sender_nrc_attachment, sender_nrc_front_attachment, sender_nrc_back_attachment, sender_passport_attachment,
              proof_document_url, proof_document_name, proof_doc_category,
              sender_father_name, sender_occupation, sender_date_of_birth,
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
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
              status=excluded.status,
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
              approved_by=excluded.approved_by,
              approved_at=excluded.approved_at,
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
              tx.id, tx.transactionNo || tx.transaction_no, tx.mtcn || '', tx.type || 'OUTWARD', tx.status || 'PENDING_APPROVAL',
              tx.senderName || tx.sender_name || '', tx.senderNameMm || tx.sender_name_mm || '', tx.senderNrc || tx.sender_nrc || '', tx.senderPhone || tx.sender_phone || '', tx.senderAddress || tx.sender_address || '', tx.senderPassport || tx.sender_passport || '',
              tx.receiverName || tx.receiver_name || '', tx.receiverNameMm || tx.receiver_name_mm || '', tx.receiverNrc || tx.receiver_nrc || '', tx.receiverPhone || tx.receiver_phone || '', tx.receiverAddress || tx.receiver_address || '', tx.receiverPassport || tx.receiver_passport || '',
              tx.fromCountry || tx.from_country || tx.senderCountryCode || 'MM', tx.toCountry || tx.to_country || tx.receiverCountryCode || 'MM', tx.sourceCurrency || tx.source_currency || 'MMK', tx.targetCurrency || tx.target_currency || 'MMK',
              Number(tx.sendAmount ?? tx.send_amount ?? 0), Number(tx.exchangeRate ?? tx.exchange_rate ?? 1), Number(tx.payoutAmount ?? tx.receiveAmount ?? tx.payout_amount ?? 0), Number(tx.transferFee ?? tx.serviceFee ?? tx.transfer_fee ?? 0), Number(tx.totalCollected ?? tx.totalPayableAmount ?? tx.total_collected ?? 0),
              tx.purpose || tx.purposeName || 'General', tx.payoutMethod || tx.payout_method || 'CASH_PICKUP', tx.bankName || tx.bank_name || tx.payoutBankName || '', tx.bankAccountNo || tx.bank_account_no || tx.payoutAccountNumber || '',
              tx.createdBy || tx.created_by || tx.creatorName || '', tx.createdAt || tx.created_at || tx.createdDate || new Date().toISOString(), tx.approvedBy || tx.approved_by || tx.approverName || '', tx.approvedAt || tx.approved_at || tx.approvedDate || '', tx.rejectedReason || tx.rejected_reason || tx.rejectionReason || '',
              tx.sourceOfFunds || tx.source_of_funds || tx.senderSourceOfFund || '', tx.remittanceType || tx.remittance_type || tx.scope || 'OUTWARD', tx.createdDate || tx.created_date || '',
              tx.senderNrcAttachment || tx.sender_nrc_attachment || '', tx.senderNrcFrontAttachment || tx.sender_nrc_front_attachment || '', tx.senderNrcBackAttachment || tx.sender_nrc_back_attachment || '', tx.senderPassportAttachment || tx.sender_passport_attachment || '',
              tx.proofDocumentUrl || tx.proof_document_url || '', tx.proofDocumentName || tx.proof_document_name || '', tx.proofDocCategory || tx.proof_doc_category || '',
              tx.senderFatherName || tx.sender_father_name || '', tx.senderOccupation || tx.sender_occupation || '', tx.senderDateOfBirth || tx.sender_date_of_birth || '',
              tx.sendingBranchId || tx.sending_branch_id || tx.branchId || (tx.fromCountry === 'TH' ? 'BR-009' : tx.fromCountry === 'SG' ? 'BR-008' : 'BR-001'),
              tx.payoutBranchId || tx.payout_branch_id || (tx.type === 'INWARD' ? (tx.branchId || (tx.toCountry === 'TH' ? 'BR-009' : tx.toCountry === 'SG' ? 'BR-008' : 'BR-001')) : ''),
              tx.branchId || tx.sendingBranchId || 'BR-001'
            ]
          });
          txCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving tx:', tx.id, e);
        }
      }
    }

    // 2. Exchange Rates
    if (data.exchangeRates && Array.isArray(data.exchangeRates)) {
      for (const rate of data.exchangeRates) {
        if (!rate.id) continue;
        try {
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
              Number(rate.buyRate) || 0, Number(rate.sellRate) || 0, Number(rate.centralBankRate) || 0,
              rate.effectiveDate || '', rate.updatedAt || new Date().toISOString(),
              Number(rate.transferRate) || Number(rate.sellRate) || 0,
              rate.effectiveTime || '09:00', rate.updatedBy || 'Admin', rate.note || ''
            ]
          });
          ratesCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving rate:', rate.id, e);
        }
      }
    }

    // 3. Customers
    if (data.customers && Array.isArray(data.customers)) {
      for (const c of data.customers) {
        if (!c.id) continue;
        try {
          await client.execute({
            sql: `INSERT INTO customer_profiles (
              id, customer_code, full_name_en, full_name_mm, nrc_number, phone, address,
              customer_type, risk_rating, total_transactions, total_volume_mmk, created_at,
              passport_number, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              full_name_en=excluded.full_name_en,
              full_name_mm=excluded.full_name_mm,
              nrc_number=excluded.nrc_number,
              phone=excluded.phone,
              address=excluded.address,
              customer_type=excluded.customer_type,
              risk_rating=excluded.risk_rating,
              total_transactions=excluded.total_transactions,
              total_volume_mmk=excluded.total_volume_mmk,
              passport_number=excluded.passport_number,
              notes=excluded.notes;`,
            args: [
              c.id, c.customerCode || '', c.fullNameEn || '', c.fullNameMm || '', c.nrcNumber || '',
              c.phone || '', c.address || '', c.customerType || 'SENDER', c.riskRating || 'LOW',
              Number(c.totalTransactions) || 0, Number(c.totalVolumeMMK) || 0, c.createdAt || new Date().toISOString(),
              c.passportNumber || c.passbookNumber || '', c.notes || ''
            ]
          });
          custCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving customer:', c.id, e);
        }
      }
    }

    // 4. Audit Logs
    if (data.auditLogs && Array.isArray(data.auditLogs)) {
      for (const log of data.auditLogs) {
        if (!log.id) continue;
        try {
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
          logCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving audit log:', log.id, e);
        }
      }
    }

    // 5. Branches
    if (data.branches && Array.isArray(data.branches)) {
      for (const b of data.branches) {
        if (!b.id) continue;
        const branchCode = b.code || b.branchCode || b.id;
        try {
          // Resolve any conflict on UNIQUE(code) so that branches with duplicate/changed codes never crash
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
          branchCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving branch:', b.id, e);
        }
      }
    }

    // 6. Users
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
          userCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving user:', u.id, e);
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
          compCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving company:', comp.id, e);
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
          currCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving currency:', cur.id, e);
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
          countryCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving country:', cnt.id, e);
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
          blCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving blacklist:', bl.id, e);
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
          purpCount++;
        } catch (e) {
          console.warn('[Turso Web Sync] Error saving purpose:', purp.id, e);
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
        profCount++;
      } catch (e) {
        console.warn('[Turso Web Sync] Error saving operator profile:', e);
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
        settCount++;
      } catch (e) {
        console.warn('[Turso Web Sync] Error saving roleMenuPermissions:', e);
      }
    }
    if (data.countryRoleMenuPermissions) {
      try {
        await client.execute({
          sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
          args: ['country_role_menu_permissions', JSON.stringify(data.countryRoleMenuPermissions), new Date().toISOString()]
        });
        settCount++;
      } catch (e) {
        console.warn('[Turso Web Sync] Error saving countryRoleMenuPermissions:', e);
      }
    }
    if (data.defaultStatusConfig) {
      try {
        await client.execute({
          sql: `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
          args: ['default_status_config', JSON.stringify(data.defaultStatusConfig), new Date().toISOString()]
        });
        settCount++;
      } catch (e) {
        console.warn('[Turso Web Sync] Error saving defaultStatusConfig:', e);
      }
    }

    const totalSaved = txCount + ratesCount + custCount + logCount + branchCount + userCount + compCount + currCount + countryCount + blCount + purpCount + profCount + settCount;

    return {
      success: true,
      count: totalSaved,
      saved: {
        transactions: txCount,
        exchangeRates: ratesCount,
        customers: custCount,
        auditLogs: logCount,
        branches: branchCount,
        users: userCount,
        companies: compCount,
        currencies: currCount,
        countries: countryCount,
        blacklist: blCount,
        purposes: purpCount,
        operatorProfile: profCount,
        systemSettings: settCount,
      },
      message: `Successfully synced ${totalSaved} records across all tables directly to Turso Cloud.`
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      message: err?.message || 'Failed to sync to Turso directly'
    };
  }
}

export async function tursoWebSyncPull(): Promise<{
  success: boolean;
  data?: {
    transactions: any[];
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
  };
  message: string;
}> {
  try {
    const client = getTursoWebClient();
    const [
      res, rateRes, custRes, logRes,
      branchRes, userRes, compRes, currRes,
      countryRes, blRes, purpRes, profRes, settsRes
    ] = await Promise.all([
      client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC LIMIT 500;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM exchange_rates ORDER BY updated_at DESC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM customer_profiles ORDER BY full_name_en ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM branches ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM system_users ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM companies ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM currencies ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM countries ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM blacklist ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM purposes ORDER BY id ASC;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM operator_profile LIMIT 1;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM system_settings;').catch(() => ({ rows: [] })),
    ]);

    const transactions = res.rows.map((r: any) => ({
      id: String(r.id),
      transactionNo: String(r.transaction_no),
      mtcn: String(r.mtcn || ''),
      type: String(r.type || 'OUTWARD'),
      status: String(r.status || 'PENDING_APPROVAL'),
      senderName: String(r.sender_name || ''),
      senderNameMm: String(r.sender_name_mm || ''),
      senderNrc: String(r.sender_nrc || ''),
      senderPhone: String(r.sender_phone || ''),
      senderAddress: String(r.sender_address || ''),
      senderPassport: String(r.sender_passport || ''),
      receiverName: String(r.receiver_name || ''),
      receiverNameMm: String(r.receiver_name_mm || ''),
      receiverNrc: String(r.receiver_nrc || ''),
      receiverPhone: String(r.receiver_phone || ''),
      receiverAddress: String(r.receiver_address || ''),
      receiverPassport: String(r.receiver_passport || ''),
      senderCountryCode: String(r.from_country || 'MM'),
      receiverCountryCode: String(r.to_country || 'MM'),
      sourceCurrency: String(r.source_currency || 'MMK'),
      targetCurrency: String(r.target_currency || 'MMK'),
      sendAmount: Number(r.send_amount || 0),
      exchangeRate: Number(r.exchange_rate || 1),
      receiveAmount: Number(r.payout_amount || 0),
      serviceFee: Number(r.transfer_fee || 0),
      totalPayableAmount: Number(r.total_collected || 0),
      purposeName: String(r.purpose || ''),
      purposeId: String(r.purpose || ''),
      payoutMethod: String(r.payout_method || 'CASH_PICKUP'),
      payoutBankName: String(r.bank_name || ''),
      payoutAccountNumber: String(r.bank_account_no || ''),
      sendingBranchId: String(
        r.sending_branch_id || 
        r.branch_id || 
        (r.created_by && r.created_by.includes('Mandalay') ? 'BR-002' : 
         r.from_country === 'TH' ? 'BR-009' : 
         r.from_country === 'SG' ? 'BR-008' : 
         r.from_country === 'MY' ? 'BR-001' : 'BR-001')
      ),
      payoutBranchId: String(
        r.payout_branch_id || 
        (r.to_country === 'TH' ? 'BR-009' : 
         r.to_country === 'SG' ? 'BR-008' : 
         r.to_country === 'MM' ? (r.created_by && r.created_by.includes('Mandalay') ? 'BR-002' : 'BR-001') : 'BR-001')
      ),
      creatorName: String(r.created_by || ''),
      createdDate: String(r.created_date || r.created_at || ''),
      approverName: String(r.approved_by || ''),
      approvedDate: String(r.approved_at || ''),
      rejectionReason: String(r.rejected_reason || ''),
      senderSourceOfFund: String(r.source_of_funds || ''),
      scope: String(r.remittance_type || 'OUTWARD'),
      senderNrcAttachment: String(r.sender_nrc_attachment || ''),
      senderNrcFrontAttachment: String(r.sender_nrc_front_attachment || ''),
      senderNrcBackAttachment: String(r.sender_nrc_back_attachment || ''),
      senderPassportAttachment: String(r.sender_passport_attachment || ''),
      proofDocumentUrl: String(r.proof_document_url || ''),
      proofDocumentName: String(r.proof_document_name || ''),
      proofDocCategory: String(r.proof_doc_category || ''),
      senderFatherName: String(r.sender_father_name || ''),
      senderOccupation: String(r.sender_occupation || ''),
      senderDateOfBirth: String(r.sender_date_of_birth || '')
    }));

    const exchangeRates = rateRes.rows.map((r: any) => ({
      id: String(r.id),
      fromCurrency: String(r.from_currency),
      toCurrency: String(r.to_currency),
      buyRate: Number(r.buy_rate),
      sellRate: Number(r.sell_rate),
      centralBankRate: Number(r.central_bank_rate),
      effectiveDate: String(r.effective_date),
      updatedAt: String(r.updated_at),
      transferRate: Number(r.transfer_rate) || Number(r.sell_rate) || 0,
      effectiveTime: String(r.effective_time || '09:00'),
      updatedBy: String(r.updated_by || 'Admin'),
      note: String(r.note || ''),
    }));

    const customers = custRes.rows.map((r: any) => ({
      id: String(r.id),
      customerCode: String(r.customer_code),
      fullNameEn: String(r.full_name_en),
      fullNameMm: String(r.full_name_mm || ''),
      nrcNumber: String(r.nrc_number || ''),
      passportNumber: String(r.passport_number || r.passbook_number || ''),
      passbookNumber: String(r.passbook_number || r.passport_number || ''),
      phone: String(r.phone || ''),
      address: String(r.address || ''),
      customerType: String(r.customer_type || 'SENDER'),
      riskRating: String(r.risk_rating || 'LOW'),
      totalTransactions: Number(r.total_transactions) || 0,
      totalVolumeMMK: Number(r.total_volume_mmk) || 0,
      notes: String(r.notes || ''),
      createdAt: String(r.created_at || ''),
    }));

    const auditLogs = (logRes.rows || []).map((r: any) => ({
      id: String(r.id),
      timestamp: String(r.timestamp || new Date().toISOString()),
      userId: String(r.user_id || ''),
      userName: String(r.user_name || ''),
      action: String(r.action || ''),
      entityType: String(r.entity_type || ''),
      entityId: String(r.entity_id || ''),
      details: typeof r.details === 'string' ? r.details : JSON.stringify(r.details || '')
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
      },
      message: `Retrieved all tables from Turso Cloud (${transactions.length} txs, ${branches.length} branches, ${users.length} users, etc.).`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to pull from Turso Cloud'
    };
  }
}

/**
 * Clean & Normalize all legacy timestamp long IDs (e.g. BR-1789830806420, USR-1789831191191) in Turso database.
 * Replaces them with canonical clean sequential IDs: BR-009, USR-007, USR-008, USR-009, and cleans duplicate branches.
 */
export async function tursoWebCleanLongIds(): Promise<{ success: boolean; message: string; details?: any }> {
  try {
    const client = getTursoWebClient();

    // 1. Delete duplicate/legacy long timestamp branches from Turso
    await client.execute(`DELETE FROM branches WHERE id LIKE 'BR-178%';`);

    // 2. Ensure canonical Big C Supercenter (BR-009) is saved with clean ID
    await client.execute({
      sql: `INSERT INTO branches (id, code, name_en, name_mm, country_code, city, phone, address, manager_name, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              code = excluded.code,
              name_en = excluded.name_en,
              name_mm = excluded.name_mm,
              country_code = excluded.country_code,
              city = excluded.city,
              phone = excluded.phone,
              address = excluded.address,
              manager_name = excluded.manager_name,
              status = excluded.status;`,
      args: [
        'BR-009',
        'TH-01',
        'Big C Supercenter (Bangkok Branch)',
        'ဘစ် စီ စူပါစင်တာ (ဘန်ကောက် ဘဏ်ခွဲ)',
        'TH',
        'Bangkok',
        '+66-2-2505500',
        '97/11 Ratchadamri Rd, Lumphini, Pathum Wan, Bangkok 10330, Thailand',
        'U Thai',
        'ACTIVE',
        '2026-09-19T15:13:26.420Z'
      ]
    });

    // 3. Delete old long ID users from Turso
    await client.execute(`DELETE FROM system_users WHERE id LIKE 'USR-178%';`);

    // 4. Ensure clean USR-007, USR-008, USR-009 exist with BR-009
    const cleanUsers = [
      { id: 'USR-007', username: 'th-admin', fullName: 'Thai Admin (Thailand Operations)', email: 'th-admin@remit.internal', role: 'ADMIN' },
      { id: 'USR-008', username: 'th-maker', fullName: 'Thai Maker (Bangkok Operator)', email: 'th-maker@remit.internal', role: 'MAKER' },
      { id: 'USR-009', username: 'th-checker', fullName: 'Thai Checker (Bangkok Approver)', email: 'th-checker@remit.internal', role: 'CHECKER' },
    ];
    for (const u of cleanUsers) {
      await client.execute({
        sql: `INSERT INTO system_users (id, username, full_name, email, role, branch_id, is_active, phone, status, password_hash, country_code, created_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, '+66-81-2345678', 'ACTIVE', 'password123', 'TH', datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                username = excluded.username,
                full_name = excluded.full_name,
                branch_id = excluded.branch_id,
                country_code = excluded.country_code;`,
        args: [u.id, u.username, u.fullName, u.email, u.role, 'BR-009']
      });
    }

    // 5. Clean foreign key references in system_users
    await client.execute(`UPDATE system_users SET branch_id = 'BR-009' WHERE branch_id LIKE 'BR-178%';`).catch(() => {});

    return {
      success: true,
      message: 'Turso Table များရှိ Long Number ID များကို နံပါတ်စဉ်အမှန် (BR-009, USR-007, USR-008, USR-009) သို့ အောင်မြင်စွာ ပြင်ဆင်ပြီးပါပြီ။'
    };
  } catch (err: any) {
    console.error('Error cleaning Turso IDs:', err);
    return {
      success: false,
      message: err?.message || 'Turso IDs ပြင်ဆင်မှု မအောင်မြင်ပါ'
    };
  }
}

export async function tursoWebSaveUser(user: User): Promise<{ success: boolean; message?: string }> {
  try {
    const client = getTursoWebClient();
    const username = String(user.username || '').trim().replace(/^@/, '');
    if (!username) return { success: false, message: 'Invalid username' };
    const branchId = user.branchId || 'BR-001';
    const countryCode = user.countryCode || 'MM';

    // Pre-resolve username conflict with other IDs
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
  } catch (err: any) {
    console.warn('[Turso Web] Failed to save user:', err);
    return { success: false, message: err?.message };
  }
}

export async function tursoWebDeleteUser(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const client = getTursoWebClient();
    await client.execute({
      sql: 'DELETE FROM system_users WHERE id = ?;',
      args: [id]
    });
    return { success: true };
  } catch (err: any) {
    console.warn('[Turso Web] Failed to delete user:', err);
    return { success: false, message: err?.message };
  }
}

export async function tursoWebSaveBranch(b: Branch): Promise<{ success: boolean; message?: string }> {
  try {
    const client = getTursoWebClient();
    const branchCode = b.code || (b as any).branchCode || b.id;
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
  } catch (err: any) {
    console.warn('[Turso Web] Failed to save branch:', err);
    return { success: false, message: err?.message };
  }
}

export async function tursoWebDeleteBranch(id: string): Promise<{ success: boolean; message?: string }> {
  try {
    const client = getTursoWebClient();
    await client.execute({
      sql: 'DELETE FROM branches WHERE id = ?;',
      args: [id]
    });
    return { success: true };
  } catch (err: any) {
    console.warn('[Turso Web] Failed to delete branch:', err);
    return { success: false, message: err?.message };
  }
}
