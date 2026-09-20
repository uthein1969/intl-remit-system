import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    // Cloud DB မှ Tables များကို တစ်ပြိုင်နက် ဖတ်ယူခြင်း
    const [txRes, rateRes, custRes, auditRes, userRes, branchRes] = await Promise.all([
      client.execute('SELECT * FROM remittance_transactions ORDER BY created_at DESC LIMIT 500;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM exchange_rates;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM customer_profiles;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM system_users;').catch(() => ({ rows: [] })),
      client.execute('SELECT * FROM branches;').catch(() => ({ rows: [] }))
    ]);

    // Branches Data ကို Dynamic Country Detection ဖြင့် Map လုပ်ခြင်း
    const branches = branchRes.rows.map((row: any) => {
      const bCode = String(row.code || row.id || '');
      const rawCountry = String(row.country_code || row.countryCode || '').toUpperCase();
      const cityStr = String(row.city || '').toLowerCase();
      const idStr = String(row.id || '').toUpperCase();
      const nameStr = String(row.name_en || '').toLowerCase();

      // DB ထဲတွင် country_code ပါလျှင် တိုက်ရိုက်ယူမည်၊ မပါလျှင် စာသားများမှ အလိုအလျောက် ခွဲခြားမည်
      let countryCode = rawCountry;
      if (!countryCode) {
        if (cityStr.includes('singapore') || idStr.includes('SG') || nameStr.includes('peninsula') || nameStr.includes('china town')) {
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
        status: String(row.status || 'ACTIVE'),
        address: String(row.address || '')
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
      const branchId = String(row.branch_id || 'BR-001');
      const rawUserCountry = String(row.country_code || row.countryCode || '').toUpperCase();
      const uName = String(row.username || '').toLowerCase();

      let userCountry = rawUserCountry;
      if (!userCountry) {
        if (branchCountryMap.has(branchId)) {
          userCountry = branchCountryMap.get(branchId)!;
        } else if (uName.startsWith('th-')) {
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
        email: String(row.email || ''),
        role: String(row.role || 'MAKER'),
        branchId,
        branch_id: branchId,
        countryCode: userCountry,
        country_code: userCountry,
        isActive: Boolean(row.is_active ?? true),
        phone: String(row.phone || ''),
        status: String(row.status || 'ACTIVE')
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
        branches
      }
    });
  } catch (err: any) {
    console.error('Turso sync-pull error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}