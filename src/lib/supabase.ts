import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppDatabase, SupabaseConfig } from '../types';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(config: SupabaseConfig): SupabaseClient | null {
  if (!config.url || !config.anonKey) {
    return null;
  }
  
  if (!supabaseClient) {
    try {
      supabaseClient = createClient(config.url, config.anonKey);
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return supabaseClient;
}

export function resetSupabaseClient(config: SupabaseConfig): SupabaseClient | null {
  try {
    if (config.url && config.anonKey) {
      supabaseClient = createClient(config.url, config.anonKey);
      return supabaseClient;
    }
  } catch (err) {
    console.error('Error re-initializing Supabase:', err);
  }
  supabaseClient = null;
  return null;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string; isRlsBlocked?: boolean }> {
  try {
    const trimmedUrl = url.trim();
    const trimmedKey = anonKey.trim();

    if (!trimmedUrl || !trimmedKey) {
      return { success: false, message: 'Please enter both Supabase Project URL and Anon API Key.' };
    }
    if (!trimmedUrl.startsWith('https://')) {
      return { success: false, message: 'Supabase URL must start with https:// (e.g. https://your-project.supabase.co)' };
    }
    const client = createClient(trimmedUrl, trimmedKey);
    
    // Test query on branches table
    const { count, error } = await client.from('branches').select('count', { count: 'exact', head: true });
    
    if (error) {
      // 42P01: relation "branches" does not exist yet (Database reachable, but table not yet created)
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Connected to Supabase! (Note: Tables are not created yet. Please execute the SQL DDL script in Supabase SQL Editor).' 
        };
      }
      // 42501: permission denied for table (RLS is active and blocking anon role)
      if (error.code === '42501' || error.message.toLowerCase().includes('permission denied')) {
        return { 
          success: true, 
          isRlsBlocked: true,
          message: 'Connected to Supabase! (Notice: Row-Level Security is active. Please run the Disable RLS script in SQL Editor to permit syncing).' 
        };
      }
      // Invalid JWT or API key
      if (error.message.toLowerCase().includes('jwt') || error.message.toLowerCase().includes('api key') || error.code === 'PGRST301') {
        return { success: false, message: `Authentication failed: ${error.message}. Please verify your anon/public key.` };
      }
      // Other error
      return { success: true, message: `Connected to Supabase endpoint (${error.message || 'Status verified'}).` };
    }

    return { 
      success: true, 
      message: `Supabase database connection established successfully! Found 'branches' table (${count ?? 0} existing records).` 
    };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Connection failed. Please check network connectivity and Supabase project status.' };
  }
}

export const SUPABASE_SQL_DDL = `-- =========================================================================
-- REMITTANCE MANAGEMENT SYSTEM (ပြည်တွင်း ပြည်ပ ငွေလွှဲစနစ်)
-- SUPABASE POSTGRESQL DATABASE SCHEMA & MIGRATION SCRIPT
-- =========================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    city TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    manager_name TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT DEFAULT 'password123',
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MAKER', 'CHECKER', 'AUDITOR')),
    branch_id TEXT REFERENCES public.branches(id),
    phone TEXT,
    status TEXT DEFAULT 'ACTIVE',
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure password column exists if table was previously created
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'password123';

-- 3. Companies Table (Partner Banks, Agents, FinTechs)
CREATE TABLE IF NOT EXISTS public.companies (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    country_code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('BANK', 'AGENT', 'FINTECH', 'MONEY_CHANGER')),
    swift_code TEXT,
    license_no TEXT,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Currencies Table
CREATE TABLE IF NOT EXISTS public.currencies (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    symbol TEXT NOT NULL,
    is_base_currency BOOLEAN DEFAULT FALSE,
    decimals INTEGER DEFAULT 2,
    status TEXT DEFAULT 'ACTIVE'
);

-- 5. Countries Table
CREATE TABLE IF NOT EXISTS public.countries (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    dial_code TEXT,
    flag_emoji TEXT,
    currency_code TEXT,
    is_domestic BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'ACTIVE'
);

-- 6. Exchange Rates Table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id TEXT PRIMARY KEY,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    buy_rate NUMERIC(15,4) NOT NULL,
    sell_rate NUMERIC(15,4) NOT NULL,
    transfer_rate NUMERIC(15,4) NOT NULL,
    effective_date DATE NOT NULL,
    effective_time TEXT,
    updated_by TEXT,
    note TEXT
);

-- 7. Blacklist & Compliance Table (Myanmar NRC & Passport Screening)
CREATE TABLE IF NOT EXISTS public.blacklist (
    id TEXT PRIMARY KEY,
    full_name_en TEXT NOT NULL,
    full_name_mm TEXT NOT NULL,
    nrc_number TEXT NOT NULL,
    passport_number TEXT NOT NULL,
    passbook_number TEXT,
    reason TEXT NOT NULL,
    note TEXT NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'WATCHLIST')),
    added_by TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Remittance Purposes Table
CREATE TABLE IF NOT EXISTS public.purposes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name_en TEXT NOT NULL,
    name_mm TEXT NOT NULL,
    category TEXT NOT NULL,
    requires_doc_proof BOOLEAN DEFAULT FALSE,
    max_daily_limit_mmk NUMERIC(15,2)
);

-- 9. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    customer_code TEXT UNIQUE NOT NULL,
    full_name_en TEXT NOT NULL,
    full_name_mm TEXT,
    nrc_number TEXT NOT NULL,
    passbook_number TEXT,
    passport_number TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    customer_type TEXT NOT NULL CHECK (customer_type IN ('SENDER', 'RECEIVER', 'BOTH')),
    risk_rating TEXT DEFAULT 'LOW',
    total_transactions INTEGER DEFAULT 0,
    total_volume_mmk NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Remittance Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    transaction_no TEXT UNIQUE NOT NULL,
    mtcn TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('OUTWARD', 'INWARD')),
    scope TEXT NOT NULL CHECK (scope IN ('DOMESTIC', 'INTERNATIONAL')),
    status TEXT NOT NULL,
    
    sender_name TEXT NOT NULL,
    sender_name_mm TEXT,
    sender_nrc TEXT NOT NULL,
    sender_nrc_attachment TEXT,
    sender_nrc_front_attachment TEXT,
    sender_nrc_back_attachment TEXT,
    sender_father_name TEXT,
    sender_occupation TEXT,
    sender_date_of_birth TEXT,
    sender_passport TEXT,
    sender_passport_attachment TEXT,
    sender_passport_attachment_name TEXT,
    sender_passport_attachment_type TEXT,
    sender_passport_attachment_size TEXT,
    sender_passbook TEXT,
    sender_passbook_attachment TEXT,
    sender_passbook_attachment_name TEXT,
    sender_passbook_attachment_type TEXT,
    sender_passbook_attachment_size TEXT,
    sender_phone TEXT NOT NULL,
    sender_address TEXT,
    sender_country_code TEXT NOT NULL,
    
    receiver_name TEXT NOT NULL,
    receiver_name_mm TEXT,
    receiver_nrc TEXT NOT NULL,
    receiver_passport TEXT,
    receiver_passbook TEXT,
    receiver_phone TEXT NOT NULL,
    receiver_address TEXT,
    receiver_country_code TEXT NOT NULL,
    
    source_currency TEXT NOT NULL,
    target_currency TEXT NOT NULL,
    send_amount NUMERIC(15,2) NOT NULL,
    exchange_rate NUMERIC(15,4) NOT NULL,
    receive_amount NUMERIC(15,2) NOT NULL,
    service_fee NUMERIC(15,2) DEFAULT 0,
    commission_fee NUMERIC(15,2) DEFAULT 0,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    total_payable_amount NUMERIC(15,2) NOT NULL,
    
    payout_method TEXT NOT NULL,
    payout_bank_name TEXT,
    payout_account_number TEXT,
    
    sending_branch_id TEXT REFERENCES public.branches(id),
    payout_branch_id TEXT REFERENCES public.branches(id),
    partner_company_id TEXT REFERENCES public.companies(id),
    
    purpose_id TEXT REFERENCES public.purposes(id),
    purpose_name TEXT,
    sender_note TEXT,
    proof_document_name TEXT,
    proof_document_url TEXT,
    proof_doc_category TEXT,
    
    blacklist_checked BOOLEAN DEFAULT FALSE,
    blacklist_alert TEXT,
    
    creator_user_id TEXT REFERENCES public.users(id),
    creator_name TEXT,
    approver_user_id TEXT REFERENCES public.users(id),
    approver_name TEXT,
    approval_note TEXT,
    rejection_reason TEXT,
    
    created_date TIMESTAMPTZ DEFAULT NOW(),
    approved_date TIMESTAMPTZ,
    paid_out_date TIMESTAMPTZ
);

-- 11. Audit Logs Table (Immutable History)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT NOT NULL,
    previous_value TEXT,
    new_value TEXT
);

-- Create Indexes for High-Speed Compliance & Search
CREATE INDEX IF NOT EXISTS idx_transactions_mtcn ON public.transactions(mtcn);
CREATE INDEX IF NOT EXISTS idx_transactions_sender_nrc ON public.transactions(sender_nrc);
CREATE INDEX IF NOT EXISTS idx_transactions_receiver_nrc ON public.transactions(receiver_nrc);
CREATE INDEX IF NOT EXISTS idx_blacklist_nrc ON public.blacklist(nrc_number);
CREATE INDEX IF NOT EXISTS idx_blacklist_passbook ON public.blacklist(passbook_number);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON public.audit_logs(timestamp DESC);

-- Enable open read/write access for application integration (Disabling RLS)
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Ensure sender passport attachment columns exist if transactions table was already created
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_size TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_size TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_front_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_back_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_document_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_doc_category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_father_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_occupation TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_date_of_birth TEXT;
`;

export const SUPABASE_DISABLE_RLS_SQL = `-- Run this in Supabase SQL Editor if you encounter "permission denied" or RLS errors, or to add attachment columns:
ALTER TABLE public.branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.currencies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blacklist DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purposes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- Ensure sender NRC, passport & proof document columns exist in transactions table
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passport_attachment_size TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_type TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_passbook_attachment_size TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_front_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_nrc_back_attachment TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_document_url TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS proof_doc_category TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_father_name TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_occupation TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS sender_date_of_birth TEXT;`;

export const SUPABASE_SCHEMA_SQL = SUPABASE_SQL_DDL;

export async function uploadPassportToSupabase(
  config: SupabaseConfig,
  file: File,
  prefix: string = 'inward_passports'
): Promise<{ success: boolean; url?: string; storagePath?: string; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, error: 'Supabase client not connected' };
  }

  try {
    // Attempt passports bucket first, then passbooks as fallback
    const bucketsToTry = ['passports', 'passbooks'];
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${prefix}/${timestamp}_${sanitizedName}`;

    let lastError: string = '';
    for (const bucket of bucketsToTry) {
      const { data, error } = await client.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = client.storage
          .from(bucket)
          .getPublicUrl(data.path);

        return {
          success: true,
          url: publicUrlData.publicUrl,
          storagePath: data.path,
        };
      } else if (error) {
        lastError = error.message;
      }
    }

    return { success: false, error: lastError || 'Storage upload failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Storage upload failed' };
  }
}

// Backward compatibility alias
export const uploadPassbookToSupabase = uploadPassportToSupabase;
