import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@libsql/client';

// Raw stream မှ JSON body ကို သေချာစွာ parse လုပ်သည့် helper function
async function getRequestBody(req: VercelRequest): Promise<any> {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL || 'libsql://remittance-db-uthein.turso.io',
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    const body = await getRequestBody(req);

    // Payload ထဲမှ တန်ဖိုးများကို ရှာဖွေခြင်း
    const rawIdentifier =
      body?.username ||
      body?.userId ||
      body?.user_id ||
      body?.id ||
      body?.selectedUser ||
      body?.name;

    const identifier = rawIdentifier ? String(rawIdentifier).trim().replace(/^@/, '') : '';

    if (!identifier) {
      // Body လုံးဝ မပါလာပါက default အဖြစ် ပထမဆုံး admin user ဖြင့် fallback ဝင်ခွင့်ပေးမည်
      const fallbackRes = await client.execute("SELECT * FROM system_users WHERE role = 'ADMIN' LIMIT 1;");
      if (fallbackRes.rows.length > 0) {
        const row: any = fallbackRes.rows[0];
        return res.status(200).json({
          success: true,
          user: {
            id: String(row.id),
            username: String(row.username).replace(/^@/, ''),
            name: String(row.full_name || row.username),
            fullName: String(row.full_name || row.username),
            email: String(row.email || ''),
            role: String(row.role || 'ADMIN'),
            branchId: String(row.branch_id || 'BR-001'),
            isActive: Boolean(row.is_active ?? true),
            phone: String(row.phone || ''),
            status: String(row.status || 'ACTIVE')
          },
          message: 'Fallback login successful'
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Username or User ID is missing in request payload'
      });
    }

    // system_users table တွင် တိုက်ဆိုင်စစ်ဆေးခြင်း
    const userRes = await client.execute({
      sql: 'SELECT * FROM system_users WHERE LOWER(username) = LOWER(?) OR id = ? OR username = ? LIMIT 1;',
      args: [identifier, identifier, `@${identifier}`]
    });

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, error: `User '${identifier}' not found in Turso DB` });
    }

const row: any = userRes.rows[0];
    const branchIdStr = String(row.branch_id || '').toUpperCase();
    const usernameStr = String(row.username || '').toLowerCase();

    let assignedCountry = 'MM';
    let countryName = 'Myanmar';

    if (
      usernameStr.startsWith('th-') ||
      branchIdStr.includes('TH')
    ) {
      assignedCountry = 'TH';
      countryName = 'Thailand';
    } else if (
      usernameStr.startsWith('sg-') ||
      usernameStr === 'tloo' ||
      branchIdStr.includes('007') ||
      branchIdStr.includes('008') ||
      branchIdStr.includes('SG')
    ) {
      assignedCountry = 'SG';
      countryName = 'Singapore';
    }

    const user = {
      id: String(row.id),
      username: String(row.username).replace(/^@/, ''),
      name: String(row.full_name || row.username),
      fullName: String(row.full_name || row.username),
      email: String(row.email || ''),
      role: String(row.role || 'MAKER'),
      branchId: branchIdStr || 'BR-001',
      branch_id: branchIdStr || 'BR-001',
      countryCode: assignedCountry,
      country: countryName,
      country_code: assignedCountry,
      isActive: Boolean(row.is_active ?? true),
      phone: String(row.phone || ''),
      status: String(row.status || 'ACTIVE')
    };

    return res.status(200).json({
      success: true,
      user,
      message: 'Login successful'
    });
  } catch (err: any) {
    console.error('Turso login error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
}