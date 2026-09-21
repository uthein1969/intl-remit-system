// Client-side API caller for Turso LibSQL operations with direct Web LibSQL fallback
import { 
  tursoWebCheckStatus, 
  tursoWebSyncPush, 
  tursoWebSyncPull 
} from './tursoWebClient';

export interface TursoStatusResponse {
  success: boolean;
  connected: boolean;
  isRemote: boolean;
  url: string;
  error?: string;
  counts: {
    transactions: number;
    customers: number;
    exchangeRates: number;
    auditLogs: number;
    branches?: number;
    users?: number;
    companies?: number;
    currencies?: number;
    countries?: number;
    blacklist?: number;
    purposes?: number;
    operatorProfile?: number;
    systemSettings?: number;
  };
}

async function safeFetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; data?: any; isHtml?: boolean }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await res.json();
      return { ok: res.ok, data, isHtml: false };
    }
    return { ok: false, isHtml: true };
  } catch {
    return { ok: false };
  }
}

export async function fetchTursoStatus(): Promise<TursoStatusResponse> {
  try {
    const { ok, data } = await safeFetchJson('/api/turso/status');
    const totalCount = data?.counts ? (Object.values(data.counts) as any[]).reduce((a: number, b: any) => a + (Number(b) || 0), 0) : 0;
    if (ok && data && data.connected && totalCount > 0 && data.counts?.exchangeRates !== undefined) {
      return data;
    }
    // Direct Web fallback (e.g. for Vercel static deployment or when serverless env lacks token)
    const webStatus = await tursoWebCheckStatus();
    return {
      success: webStatus.connected,
      connected: webStatus.connected,
      isRemote: true,
      url: webStatus.url,
      counts: webStatus.counts || { transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0 }
    };
  } catch {
    const webStatus = await tursoWebCheckStatus().catch(() => null);
    if (webStatus) {
      return {
        success: webStatus.connected,
        connected: webStatus.connected,
        isRemote: true,
        url: webStatus.url,
        counts: webStatus.counts || { transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0 }
      };
    }
    return {
      success: false,
      connected: false,
      isRemote: false,
      url: '',
      error: 'Could not connect to Turso LibSQL database',
      counts: { transactions: 0, customers: 0, exchangeRates: 0, auditLogs: 0 }
    };
  }
}

export async function testTursoConnection(url?: string, token?: string): Promise<{ success: boolean; message: string; isRemote?: boolean; url?: string }> {
  try {
    const { ok, data } = await safeFetchJson('/api/turso/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, token }),
    });
    if (ok && data) {
      return data;
    }
    // Direct Web fallback
    const webStatus = await tursoWebCheckStatus();
    return {
      success: webStatus.connected,
      message: webStatus.connected ? 'Turso connection successful (Direct Web)!' : 'Failed to connect to Turso LibSQL',
      isRemote: true,
      url: webStatus.url,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Turso endpoint',
    };
  }
}

export async function pushDataToTurso(dbData: {
  transactions?: any[];
  exchangeRates?: any[];
  customers?: any[];
  auditLogs?: any[];
  branches?: any[];
  users?: any[];
  companies?: any[];
  currencies?: any[];
  countries?: any[];
  blacklist?: any[];
  purposes?: any[];
  operatorProfile?: any;
  roleMenuPermissions?: any;
  defaultStatusConfig?: any;
}) {
  try {
    const { ok, data } = await safeFetchJson('/api/turso/sync-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbData),
    });
    if (ok && data && data.success) {
      return data;
    }
    // Direct Web fallback
    return await tursoWebSyncPush(dbData);
  } catch (err: any) {
    return await tursoWebSyncPush(dbData);
  }
}

export async function pullDataFromTurso() {
  try {
    const { ok, data } = await safeFetchJson('/api/turso/sync-pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (ok && data && data.success && data.data && Object.keys(data.data).length >= 10) {
      return data;
    }
    // Direct Web fallback
    return await tursoWebSyncPull();
  } catch (err: any) {
    return await tursoWebSyncPull();
  }
}

export async function fetchTursoSchema(): Promise<string> {
  try {
    const { ok, data } = await safeFetchJson('/api/turso/schema');
    if (ok && data?.schemaSql) {
      return data.schemaSql;
    }
    return '';
  } catch {
    return '';
  }
}
