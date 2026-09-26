import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const TURSO_FALLBACK_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';
    const url = process.env.TURSO_DATABASE_URL || 'https://remittance-db-uthein.turso.io';
    const authToken = process.env.TURSO_AUTH_TOKEN || TURSO_FALLBACK_TOKEN;

    const client = createClient({
      url,
      authToken
    });

    // Cloud Tables (14 Tables) များမှ အရေအတွက်များကို တစ်ပြိုင်နက် ရေတွက်ခြင်း
    const [
      txRes, rateRes, custRes, auditRes,
      branchRes, userRes, compRes, currRes,
      countryRes, blRes, purpRes, profRes, settsRes,
      mtoRes
    ] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM remittance_transactions;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM exchange_rates;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM customer_profiles;').catch(() => ({ rows: [{ cnt: 0 }] })),
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
      client.execute('SELECT COUNT(*) as cnt FROM mto_compliance_limits;').catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const counts = {
      transactions: Number(txRes.rows[0]?.cnt ?? 0),
      exchangeRates: Number(rateRes.rows[0]?.cnt ?? 0),
      customers: Number(custRes.rows[0]?.cnt ?? 0),
      auditLogs: Number(auditRes.rows[0]?.cnt ?? 0),
      branches: Number(branchRes.rows[0]?.cnt ?? 0),
      users: Number(userRes.rows[0]?.cnt ?? 0),
      companies: Number(compRes.rows[0]?.cnt ?? 0),
      currencies: Number(currRes.rows[0]?.cnt ?? 0),
      countries: Number(countryRes.rows[0]?.cnt ?? 0),
      blacklist: Number(blRes.rows[0]?.cnt ?? 0),
      purposes: Number(purpRes.rows[0]?.cnt ?? 0),
      operatorProfile: Number(profRes.rows[0]?.cnt ?? 0),
      systemSettings: Number(settsRes.rows[0]?.cnt ?? 0),
      mtoComplianceLimits: Number(mtoRes.rows[0]?.cnt ?? 0),
    };

    const hasData = Object.values(counts).some(c => c > 0);

    return res.status(200).json({
      success: true,
      connected: Boolean(authToken || hasData),
      tablesCount: 14,
      isRemote: true,
      url,
      timestamp: new Date().toISOString(),
      counts
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, connected: false, error: err?.message || 'Turso status check failed' });
  }
}
