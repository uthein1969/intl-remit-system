import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

const CONFIGURED_TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMTczMTQsImlkIjoiMDFhMDhmYTYtZTYwMS03MzQ2LTk5YTYtYjAxNGNiZDU5YTI4Iiwia2lkIjoidU1rSk9uS0Rqcl9wRkNWOEtEQ3dDUFFtM2FacHlBTjNOVmZkaE9UeFV1OCIsInJpZCI6IjE3OTZkMDNiLTA4OGItNGZhMC04Yjk0LTAwZjliYWI1YjI3ZSJ9.1cgPOor1F3S55DoxEQ9IzWxvmxkxcy8Bq2EvMjmz6j5SzONju6fFIGKImCSB6vQjdnJbSTNQpYO8JzwHWUV6Cg';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN || CONFIGURED_TURSO_TOKEN,
    });

    if (req.method === 'POST') {
      const b = req.body || {};
      const branchCode = b.code || b.branchCode || b.id;
      if (!branchCode) {
        return res.status(400).json({ success: false, error: 'Branch code is required' });
      }

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

      return res.status(200).json({ success: true, message: 'Branch saved to Turso' });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) {
        return res.status(400).json({ success: false, error: 'Branch ID is required' });
      }
      await client.execute({
        sql: 'DELETE FROM branches WHERE id = ?;',
        args: [id]
      });
      return res.status(200).json({ success: true, message: 'Branch deleted from Turso' });
    }

    // Default: GET
    const branchRes = await client.execute("SELECT * FROM branches WHERE id != 'BR-1789788738927';");
    const branches = branchRes.rows.map((row: any) => ({
      id: String(row.id),
      code: String(row.code),
      nameEn: String(row.name_en || ''),
      nameMm: String(row.name_mm || ''),
      countryCode: String(row.country_code || (String(row.code).startsWith('TH') ? 'TH' : String(row.code).startsWith('SG') ? 'SG' : 'MM')),
      city: String(row.city || ''),
      phone: String(row.phone || ''),
      address: String(row.address || ''),
      managerName: String(row.manager_name || ''),
      status: String(row.status || 'ACTIVE'),
      createdAt: String(row.created_at || '')
    }));

    return res.status(200).json({
      success: true,
      branches
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
