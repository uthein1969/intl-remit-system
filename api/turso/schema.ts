import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Turso Database ထဲရှိ Tables အားလုံး၏ Schema နှင့် စာရင်းကို ရယူခြင်း
    const tablesRes = await client.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%';"
    );

    const tables = tablesRes.rows.map((row: any) => row.name);

    return res.status(200).json({
      success: true,
      tables,
      tablesCount: tables.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Turso schema endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}