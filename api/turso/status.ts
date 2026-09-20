import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN
    });

    // Cloud Tables များမှ အရေအတွက်များကို တစ်ပြိုင်နက် ရေတွက်ခြင်း
    const [uCount, bCount, txCount, cCount, aCount] = await Promise.all([
      client.execute('SELECT COUNT(*) as cnt FROM system_users;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM branches;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM remittance_transactions;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM customer_profiles;').catch(() => ({ rows: [{ cnt: 0 }] })),
      client.execute('SELECT COUNT(*) as cnt FROM audit_logs;').catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const counts = {
      users: Number(uCount.rows[0]?.cnt ?? 0),
      branches: Number(bCount.rows[0]?.cnt ?? 0),
      transactions: Number(txCount.rows[0]?.cnt ?? 0),
      customers: Number(cCount.rows[0]?.cnt ?? 0),
      auditRecords: Number(aCount.rows[0]?.cnt ?? 0),
    };

    return res.status(200).json({
      connected: true,
      tablesCount: 10,
      timestamp: new Date().toISOString(),
      counts
    });
  } catch (err: any) {
    return res.status(500).json({ connected: false, error: err.message });
  }
}