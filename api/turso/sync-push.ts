import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

const TURSO_FALLBACK_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const url = process.env.TURSO_DATABASE_URL || 'https://remittance-db-uthein.turso.io';
    const authToken = process.env.TURSO_AUTH_TOKEN || TURSO_FALLBACK_TOKEN;

    const client = createClient({
      url,
      authToken
    });

    // Auto-Migrations for columns
    await client.execute("ALTER TABLE branches ADD COLUMN country_code TEXT DEFAULT 'MM';").catch(() => {});
    await client.execute("ALTER TABLE system_users ADD COLUMN country_code TEXT DEFAULT 'MM';").catch(() => {});
    await client.execute("ALTER TABLE system_users ADD COLUMN default_status_enabled INTEGER DEFAULT 1;").catch(() => {});

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const counts = {
      branches: 0,
      users: 0,
      transactions: 0,
      exchangeRates: 0,
      customers: 0,
      companies: 0,
      currencies: 0,
      countries: 0,
      blacklist: 0,
      purposes: 0,
      auditLogs: 0,
      operatorProfile: 0,
      systemSettings: 0,
    };

    // 1. Branches (with conflict pre-resolution on UNIQUE code column)
    const branches = body?.branches || [];
    for (const b of branches) {
      const branchCode = b.code || b.branchCode || b.branch_code || b.id;
      if (!b.id && !branchCode) continue;
      const branchId = b.id || `BR-${branchCode}`;

      const cityStr = String(b.city || '').toLowerCase();
      const idStr = String(branchId).toUpperCase();
      const nameStr = String(b.nameEn || b.name_en || b.name || '').toLowerCase();

      let countryCode = String(b.countryCode || b.country_code || '').toUpperCase();
      if (!countryCode) {
        if (cityStr.includes('singapore') || idStr.includes('SG') || nameStr.includes('peninsula') || nameStr.includes('china town')) {
          countryCode = 'SG';
        } else if (cityStr.includes('bangkok') || cityStr.includes('thailand') || idStr.includes('TH') || nameStr.includes('big c')) {
          countryCode = 'TH';
        } else {
          countryCode = 'MM';
        }
      }

      try {
        // Resolve any conflict on UNIQUE(code) so that all branches sync smoothly
        await client.execute({
          sql: 'DELETE FROM branches WHERE code = ? AND id != ?;',
          args: [branchCode, branchId]
        }).catch(() => {});

        await client.execute({
          sql: `INSERT INTO branches (
            id, code, name_en, name_mm, city, phone, address, manager_name, status, created_at, country_code
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
            branchId,
            branchCode,
            b.nameEn || b.name_en || b.name || 'Branch',
            b.nameMm || b.name_mm || b.nameEn || b.name_en || '',
            b.city || 'Yangon',
            b.phone || '',
            b.address || '',
            b.managerName || b.manager_name || '',
            b.status || 'ACTIVE',
            b.createdAt || b.created_at || new Date().toISOString(),
            countryCode
          ]
        });
        counts.branches++;
      } catch (e) {
        console.warn('[Sync Push] Error saving branch:', branchId, e);
      }
    }

    // 2. Users (system_users)
    const users = body?.users || [];
    for (const u of users) {
      const username = String(u.username || '').trim().replace(/^@/, '');
      if (!username) continue;

      const userId = u.id || `USR-${username}`;
      const branchId = u.branchId || u.branch_id || 'BR-001';
      const role = u.role || 'MAKER';
      const fullName = u.fullName || u.name || u.name_en || username;
      const email = u.email || `${username}@remit.internal`;
      const phone = u.phone || '';
      const status = u.status || 'ACTIVE';
      const isActive = u.status === 'INACTIVE' ? 0 : 1;

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
        // Resolve any conflict on UNIQUE(username) so that users sync without constraint errors
        await client.execute({
          sql: 'DELETE FROM system_users WHERE username = ? AND id != ?;',
          args: [username, userId]
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
            userId,
            username,
            fullName,
            role,
            branchId,
            isActive,
            email,
            u.password || u.password_hash || 'password123',
            phone,
            status,
            u.createdAt || u.created_at || new Date().toISOString(),
            u.lastLogin || u.last_login || null,
            userCountry,
            u.defaultStatusEnabled !== false ? 1 : 0
          ]
        });
        counts.users++;
      } catch (e) {
        console.warn('[Sync Push] Error saving user:', userId, e);
      }
    }

    // 3. Transactions (remittance_transactions)
    const transactions = body?.transactions || [];
    for (const tx of transactions) {
      if (!tx.id) continue;
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
            sender_father_name, sender_occupation, sender_date_of_birth
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
            ?, ?, ?
          )
          ON CONFLICT(id) DO UPDATE SET
            status=excluded.status,
            approved_by=excluded.approved_by,
            approved_at=excluded.approved_at,
            rejected_reason=excluded.rejected_reason,
            proof_document_url=excluded.proof_document_url;`,
          args: [
            tx.id, tx.transactionNo || tx.transaction_no || tx.id, tx.mtcn || tx.id, tx.type || 'OUTWARD', tx.status || 'PENDING',
            tx.senderName || tx.sender_name || '', tx.senderNameMm || tx.sender_name_mm || '', tx.senderNrc || tx.sender_nrc || '', tx.senderPhone || tx.sender_phone || '', tx.senderAddress || tx.sender_address || '', tx.senderPassport || tx.sender_passport || '',
            tx.receiverName || tx.receiver_name || '', tx.receiverNameMm || tx.receiver_name_mm || '', tx.receiverNrc || tx.receiver_nrc || '', tx.receiverPhone || tx.receiver_phone || '', tx.receiverAddress || tx.receiver_address || '', tx.receiverPassport || tx.receiver_passport || '',
            tx.fromCountry || tx.from_country || 'MM', tx.toCountry || tx.to_country || 'TH', tx.sourceCurrency || tx.source_currency || 'MMK', tx.targetCurrency || tx.target_currency || 'THB',
            Number(tx.sendAmount || tx.send_amount) || 0, Number(tx.exchangeRate || tx.exchange_rate) || 1, Number(tx.payoutAmount || tx.payout_amount) || 0, Number(tx.transferFee || tx.transfer_fee) || 0, Number(tx.totalCollected || tx.total_collected) || 0,
            tx.purpose || '', tx.payoutMethod || tx.payout_method || 'CASH_PICKUP', tx.bankName || tx.bank_name || '', tx.bankAccountNo || tx.bank_account_no || '',
            tx.createdBy || tx.created_by || 'Admin', tx.createdAt || tx.created_at || new Date().toISOString(), tx.approvedBy || tx.approved_by || '', tx.approvedAt || tx.approved_at || '', tx.rejectedReason || tx.rejected_reason || '',
            tx.sourceOfFunds || tx.source_of_funds || '', tx.remittanceType || tx.remittance_type || 'BANK_TRANSFER', tx.createdDate || tx.created_date || new Date().toISOString().slice(0, 10),
            tx.senderNrcAttachment || '', tx.senderNrcFrontAttachment || '', tx.senderNrcBackAttachment || '', tx.senderPassportAttachment || '',
            tx.proofDocumentUrl || '', tx.proofDocumentName || '', tx.proofDocCategory || '',
            tx.senderFatherName || '', tx.senderOccupation || '', tx.senderDateOfBirth || ''
          ]
        });
        counts.transactions++;
      } catch (e) {
        console.warn('[Sync Push] Error saving transaction:', tx.id, e);
      }
    }

    // 4. Exchange Rates
    const exchangeRates = body?.exchangeRates || [];
    for (const rate of exchangeRates) {
      if (!rate.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO exchange_rates (
            id, from_currency, to_currency, buy_rate, sell_rate, middle_rate, effective_date, effective_time, updated_by, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            buy_rate=excluded.buy_rate,
            sell_rate=excluded.sell_rate,
            middle_rate=excluded.middle_rate,
            effective_date=excluded.effective_date,
            effective_time=excluded.effective_time,
            updated_at=excluded.updated_at;`,
          args: [
            rate.id, rate.fromCurrency || rate.from_currency, rate.toCurrency || rate.to_currency,
            Number(rate.buyRate || rate.buy_rate) || 0, Number(rate.sellRate || rate.sell_rate) || 0, Number(rate.middleRate || rate.middle_rate) || 0,
            rate.effectiveDate || rate.effective_date || new Date().toISOString().slice(0, 10),
            rate.effectiveTime || rate.effective_time || '09:00',
            rate.updatedBy || rate.updated_by || 'Admin',
            rate.updatedAt || rate.updated_at || new Date().toISOString()
          ]
        });
        counts.exchangeRates++;
      } catch (e) {
        console.warn('[Sync Push] Error saving rate:', rate.id, e);
      }
    }

    // 5. Customers (customer_profiles)
    const customers = body?.customers || [];
    for (const cust of customers) {
      if (!cust.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO customer_profiles (
            id, full_name, full_name_mm, nrc, passport, phone, address, date_of_birth, nationality, occupation, sender_or_receiver, risk_level, created_at, created_date
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            full_name=excluded.full_name,
            phone=excluded.phone,
            address=excluded.address;`,
          args: [
            cust.id, cust.fullName || cust.full_name || '', cust.fullNameMm || cust.full_name_mm || '',
            cust.nrc || '', cust.passport || '', cust.phone || '', cust.address || '',
            cust.dateOfBirth || cust.date_of_birth || '', cust.nationality || 'MM',
            cust.occupation || '', cust.senderOrReceiver || cust.sender_or_receiver || 'SENDER',
            cust.riskLevel || cust.risk_level || 'LOW',
            cust.createdAt || cust.created_at || new Date().toISOString(),
            cust.createdDate || cust.created_date || new Date().toISOString().slice(0, 10)
          ]
        });
        counts.customers++;
      } catch (e) {
        console.warn('[Sync Push] Error saving customer:', cust.id, e);
      }
    }

    // 6. Companies
    const companies = body?.companies || [];
    for (const comp of companies) {
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
        counts.companies++;
      } catch (e) {
        console.warn('[Sync Push] Error saving company:', comp.id, e);
      }
    }

    // 7. Currencies
    const currencies = body?.currencies || [];
    for (const cur of currencies) {
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
            cur.symbol || '', cur.isBaseCurrency ? 1 : 0, cur.decimals || 2, cur.status || 'ACTIVE'
          ]
        });
        counts.currencies++;
      } catch (e) {
        console.warn('[Sync Push] Error saving currency:', cur.id, e);
      }
    }

    // 8. Countries
    const countries = body?.countries || [];
    for (const c of countries) {
      if (!c.id) continue;
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
            c.id, c.code || '', c.nameEn || c.name_en || '', c.nameMm || c.name_mm || '',
            c.dialCode || c.dial_code || '', c.flagEmoji || c.flag_emoji || '',
            c.currencyCode || c.currency_code || 'MMK', c.isDomestic ? 1 : 0, c.status || 'ACTIVE'
          ]
        });
        counts.countries++;
      } catch (e) {
        console.warn('[Sync Push] Error saving country:', c.id, e);
      }
    }

    // 9. Blacklist
    const blacklist = body?.blacklist || [];
    for (const bl of blacklist) {
      if (!bl.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO blacklist (
            id, full_name_en, full_name_mm, nrc_number, passport_number, reason, note, risk_level, added_by, active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            full_name_en=excluded.full_name_en,
            full_name_mm=excluded.full_name_mm,
            reason=excluded.reason,
            risk_level=excluded.risk_level,
            active=excluded.active;`,
          args: [
            bl.id, bl.fullNameEn || bl.full_name_en || bl.nameEn || '', bl.fullNameMm || bl.full_name_mm || bl.nameMm || '',
            bl.nrcNumber || bl.nrc_number || '', bl.passportNumber || bl.passport_number || bl.passbookNumber || '',
            bl.reason || '', bl.note || '', bl.riskLevel || bl.risk_level || 'HIGH',
            bl.addedBy || bl.added_by || 'Admin', bl.active !== false ? 1 : 0, bl.createdAt || bl.created_at || new Date().toISOString()
          ]
        });
        counts.blacklist++;
      } catch (e) {
        console.warn('[Sync Push] Error saving blacklist:', bl.id, e);
      }
    }

    // 10. Purposes
    const purposes = body?.purposes || [];
    for (const p of purposes) {
      if (!p.id) continue;
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
            p.id, p.code || '', p.nameEn || p.name_en || '', p.nameMm || p.name_mm || '',
            p.category || 'PERSONAL', p.requiresDocProof ? 1 : 0, p.maxDailyLimitMMK || null
          ]
        });
        counts.purposes++;
      } catch (e) {
        console.warn('[Sync Push] Error saving purpose:', p.id, e);
      }
    }

    // 11. Audit Logs
    const auditLogs = body?.auditLogs || [];
    for (const log of auditLogs) {
      if (!log.id) continue;
      try {
        await client.execute({
          sql: `INSERT INTO audit_logs (
            id, user_id, username, action, entity, entity_id, timestamp, ip_address, details
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO NOTHING;`,
          args: [
            log.id, log.userId || log.user_id || 'USR-001', log.username || 'admin',
            log.action || 'UPDATE', log.entity || 'SYSTEM', log.entityId || log.entity_id || '',
            log.timestamp || new Date().toISOString(), log.ipAddress || log.ip_address || '127.0.0.1',
            typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')
          ]
        });
        counts.auditLogs++;
      } catch (e) {
        console.warn('[Sync Push] Error saving audit log:', log.id, e);
      }
    }

    // 12. Operator Profile
    if (body?.operatorProfile) {
      const pr = body.operatorProfile;
      try {
        await client.execute({
          sql: `INSERT INTO operator_profile (
            id, company_name_en, company_name_mm, license_no, phone, hotline, address_en, address_mm, email, website, tax_id, updated_at
          ) VALUES ('OP-001', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            pr.companyNameEn || pr.company_name_en || '', pr.companyNameMm || pr.company_name_mm || '',
            pr.licenseNo || pr.license_no || '', pr.phone || '', pr.hotline || '',
            pr.addressEn || pr.address_en || '', pr.addressMm || pr.address_mm || '',
            pr.email || '', pr.website || '', pr.taxId || pr.tax_id || '', new Date().toISOString()
          ]
        });
        counts.operatorProfile = 1;
      } catch (e) {
        console.warn('[Sync Push] Error saving operator profile:', e);
      }
    }

    // 13. System Settings
    if (body?.roleMenuPermissions) {
      try {
        await client.execute({
          sql: `INSERT INTO system_settings (key, value, description, updated_at)
                VALUES ('role_menu_permissions', ?, 'Role menu access rights', datetime('now'))
                ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at;`,
          args: [JSON.stringify(body.roleMenuPermissions)]
        });
        counts.systemSettings++;
      } catch (e) {
        console.warn('[Sync Push] Error saving role_menu_permissions:', e);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Turso Cloud database သို့ အောင်မြင်စွာ sync push ပြုလုပ်ပြီးပါပြီ (Branches: ${counts.branches}, Users: ${counts.users}, Transactions: ${counts.transactions})`,
      counts
    });
  } catch (err: any) {
    console.error('Turso sync-push error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
