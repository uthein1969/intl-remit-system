import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const TURSO_FALLBACK_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'https://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || TURSO_FALLBACK_TOKEN
    });

    // Cloud DB မှ Tables (13 ခုလုံး) ကို တစ်ပြိုင်နက် ဖတ်ယူခြင်း
    const [
      txRes, rateRes, custRes, auditRes, userRes, branchRes,
      compRes, currRes, countryRes, blRes, purpRes, profRes, settsRes
    ] = await Promise.all([
      client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC LIMIT 500;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM exchange_rates;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM customer_profiles;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM system_users;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM branches;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM companies;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM currencies;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM countries;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM blacklist;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM purposes;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM operator_profile LIMIT 1;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM system_settings;').catch(() => ({ rows: [] }))
    ]);

    // Branches Data ကို Dynamic Country Detection ဖြင့် Map လုပ်ခြင်း
    const validBranchRows = branchRes.rows.filter((row: any) => {
      const id = String(row.id || '');
      if (id === 'BR-1789788738927') return false;
      return true;
    });

    const branches = validBranchRows.map((row: any) => {
      const bCode = String(row.code || row.id || '');
      const rawCountry = String(row.country_code || row.countryCode || '').toUpperCase();
      const cityStr = String(row.city || '').toLowerCase();
      const idStr = String(row.id || '').toUpperCase();
      const nameStr = String(row.name_en || '').toLowerCase();

      // DB ထဲတွင် country_code ပါလျှင် တိုက်ရိုက်ယူမည်၊ မပါလျှင် စာသားများမှ အလိုအလျောက် ခွဲခြားမည်
      let countryCode = rawCountry;
      if (!countryCode) {
        if (cityStr.includes('singapore') || idStr.includes('SG') || nameStr.includes('peninsula') || nameStr.includes('china town') || nameStr.includes('changi')) {
          countryCode = 'SG';
        } else if (cityStr.includes('bangkok') || cityStr.includes('thailand') || idStr.includes('TH') || nameStr.includes('big c')) {
          countryCode = 'TH';
        } else {
          countryCode = 'MM';
        }
      }

      return {
        id: String(row.id || bCode),
        code: bCode,
        branchCode: bCode,
        countryCode,
        country_code: countryCode,
        city: String(row.city || ''),
        phone: String(row.phone || ''),
        nameEn: String(row.name_en || row.name || ''),
        nameMm: String(row.name_mm || ''),
        managerName: String(row.manager_name || ''),
        status: (row.status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        address: String(row.address || ''),
        createdAt: String(row.created_at || '')
      };
    });

    // Branches Map ထဲမှ Branch ID အလိုက် Country ရှာဖွေနိုင်ရန် Map တည်ဆောက်ခြင်း
    const branchCountryMap = new Map<string, string>();
    branches.forEach((b: any) => {
      branchCountryMap.set(b.id, b.countryCode);
      branchCountryMap.set(b.code, b.countryCode);
    });

    // Users Data ကို Dynamic Country Assignment ဖြင့် Map လုပ်ခြင်း
    const users = userRes.rows.map((row: any) => {
      let branchId = String(row.branch_id || 'BR-001');
      if (branchId === 'BR-1789788738927') {
        branchId = 'BR-001';
      }
      const rawUserCountry = String(row.country_code || row.countryCode || '').toUpperCase();
      const uName = String(row.username || '').toLowerCase();

      let userCountry = rawUserCountry;
      if (!userCountry) {
        if (branchCountryMap.has(branchId)) {
          userCountry = branchCountryMap.get(branchId)!;
        } else if (uName.startsWith('th-') || uName === 'maker_bkk') {
          userCountry = 'TH';
        } else if (uName.startsWith('sg-') || uName === 'tloo') {
          userCountry = 'SG';
        } else {
          userCountry = 'MM';
        }
      }

      return {
        id: String(row.id),
        username: String(row.username).replace(/^@/, ''),
        name: String(row.full_name || row.username),
        fullName: String(row.full_name || row.username),
        email: String(row.email || `${row.username}@remitmyanmar.com`),
        role: String(row.role || 'MAKER'),
        branchId,
        branch_id: branchId,
        countryCode: userCountry,
        country_code: userCountry,
        isActive: Boolean(row.is_active ?? true),
        phone: String(row.phone || ''),
        status: (row.status || (row.is_active === 0 ? 'INACTIVE' : 'ACTIVE')) as 'ACTIVE' | 'INACTIVE',
        password: String(row.password_hash || 'password123'),
        passwordHash: String(row.password_hash || 'password123'),
        createdAt: String(row.created_at || ''),
        lastLogin: String(row.last_login || ''),
        defaultStatusEnabled: row.default_status_enabled !== 0
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        transactions: txRes.rows,
        exchangeRates: rateRes.rows,
        customers: custRes.rows,
        auditLogs: auditRes.rows,
        users,
        branches,
        companies: compRes.rows,
        currencies: currRes.rows,
        countries: countryRes.rows,
        blacklist: blRes.rows,
        purposes: purpRes.rows,
        operatorProfile: profRes.rows[0] || null,
        systemSettings: settsRes.rows
      }
    });
  } catch (err: any) {
    console.error('Turso sync-pull error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}