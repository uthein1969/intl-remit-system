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
      const user = req.body || {};
      const username = String(user.username || '').trim().replace(/^@/, '');
      if (!username) {
        return res.status(400).json({ success: false, error: 'Username is required' });
      }

      const branchId = user.branchId || 'BR-001';
      let countryCode = user.countryCode;
      if (!countryCode) {
        if (branchId.startsWith('BR-009') || username.startsWith('th-') || username.includes('bkk')) countryCode = 'TH';
        else if (branchId.startsWith('BR-007') || branchId.startsWith('BR-008') || branchId.startsWith('BR-010') || username.startsWith('sg-')) countryCode = 'SG';
        else countryCode = 'MM';
      }

      // Pre-resolve username conflicts with other IDs
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

      return res.status(200).json({ success: true, message: 'User saved to Turso' });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || req.body?.id || '');
      if (!id) {
        return res.status(400).json({ success: false, error: 'User ID is required' });
      }
      await client.execute({
        sql: 'DELETE FROM system_users WHERE id = ?;',
        args: [id]
      });
      return res.status(200).json({ success: true, message: 'User deleted from Turso' });
    }

    // Default: GET
    const userRes = await client.execute('SELECT * FROM system_users;');
    const users = userRes.rows.map((row: any) => ({
      id: String(row.id),
      username: String(row.username),
      name: String(row.full_name || row.username),
      fullName: String(row.full_name || row.username),
      email: String(row.email || ''),
      role: String(row.role || 'MAKER'),
      branchId: String(row.branch_id || 'BR-001'),
      countryCode: String(row.country_code || (String(row.branch_id).startsWith('BR-009') ? 'TH' : 'MM')),
      isActive: Boolean(row.is_active ?? true),
      phone: String(row.phone || ''),
      status: String(row.status || 'ACTIVE'),
      createdAt: String(row.created_at || ''),
      lastLogin: String(row.last_login || '')
    }));

    return res.status(200).json({
      success: true,
      users
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
