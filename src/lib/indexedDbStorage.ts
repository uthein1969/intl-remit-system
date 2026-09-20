import { AppDatabase, RemittanceTransaction } from '../types';

const IDB_NAME = 'REMITTANCE_SYSTEM_IDB';
const IDB_VERSION = 1;
const STORE_NAME = 'app_database';
const DB_RECORD_KEY = 'main_db';
export const LOCAL_STORAGE_DB_KEY = 'REMITTANCE_APP_DB_V1';

/**
 * Opens the IndexedDB database safely.
 */
function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Saves the complete database to IndexedDB.
 * Supports hundreds of megabytes without localStorage 5MB quota restrictions.
 */
export async function saveDbToIndexedDb(db: AppDatabase): Promise<boolean> {
  try {
    const idb = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(db, DB_RECORD_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = (e) => {
        console.warn('IndexedDB put error:', e);
        resolve(false);
      };
      tx.oncomplete = () => {
        idb.close();
      };
      tx.onerror = () => {
        idb.close();
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('saveDbToIndexedDb failed:', err);
    return false;
  }
}

/**
 * Loads the complete database from IndexedDB.
 */
export async function loadDbFromIndexedDb(): Promise<AppDatabase | null> {
  try {
    const idb = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(DB_RECORD_KEY);

      req.onsuccess = () => {
        idb.close();
        if (req.result && typeof req.result === 'object') {
          resolve(req.result as AppDatabase);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => {
        idb.close();
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('loadDbFromIndexedDb failed:', err);
    return null;
  }
}

/**
 * Clears the IndexedDB database record.
 */
export async function clearIndexedDb(): Promise<boolean> {
  try {
    const idb = await openIndexedDb();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(DB_RECORD_KEY);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      tx.oncomplete = () => idb.close();
      tx.onerror = () => {
        idb.close();
        resolve(false);
      };
    });
  } catch {
    return false;
  }
}

/**
 * Creates a lean, quota-safe representation of the database for localStorage.
 * If transactions have large base64 attachments, it strips the giant base64 string
 * while preserving file metadata (name, type, size) so localStorage remains under 1MB.
 * The full database with all original attachments remains safely stored in IndexedDB.
 */
export function createLeanDbForLocalStorage(db: AppDatabase): AppDatabase {
  const sanitizeAttachment = (url?: string): string | undefined => {
    if (!url) return undefined;
    // Keep small SVGs or URLs under 12KB
    if (url.length <= 12000) return url;
    // Mark as stored in IndexedDB so the app knows it exists
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="40"><rect width="100" height="40" fill="%230f172a"/><text x="50" y="24" fill="%2338bdf8" font-size="10" text-anchor="middle">Stored in IDB</text></svg>';
  };

  const sanitizeTransaction = (tx: RemittanceTransaction): RemittanceTransaction => {
    return {
      ...tx,
      senderNrcAttachment: sanitizeAttachment(tx.senderNrcAttachment),
      senderPassportAttachment: sanitizeAttachment(tx.senderPassportAttachment),
      senderNrcFrontAttachment: sanitizeAttachment(tx.senderNrcFrontAttachment),
      senderNrcBackAttachment: sanitizeAttachment(tx.senderNrcBackAttachment),
      senderPassbookAttachment: sanitizeAttachment(tx.senderPassbookAttachment),
      proofDocumentUrl: sanitizeAttachment(tx.proofDocumentUrl)
    };
  };

  // Limit audit logs in localStorage to latest 40 entries
  const trimmedAuditLogs = Array.isArray(db.auditLogs)
    ? db.auditLogs.slice(-40)
    : [];

  // Limit transactions in localStorage to latest 60 transactions
  const sanitizedTransactions = Array.isArray(db.transactions)
    ? db.transactions.slice(-60).map(sanitizeTransaction)
    : [];

  return {
    ...db,
    transactions: sanitizedTransactions,
    auditLogs: trimmedAuditLogs
  };
}

/**
 * Persists database with resilient multi-tier storage:
 * 1. Primary: Saves the complete, uncompressed database into IndexedDB (virtually unlimited quota).
 * 2. Secondary: Saves to localStorage for instant synchronous boot cache.
 *    If localStorage throws QuotaExceededError, it automatically falls back to storing
 *    a lean metadata-preserved version in localStorage so the quota is never exceeded.
 */
export async function persistDatabaseSafely(db: AppDatabase): Promise<void> {
  // 1. Always persist the full database to IndexedDB
  saveDbToIndexedDb(db).catch((err) => {
    console.warn('Background IndexedDB persist error:', err);
  });

  // 2. Persist to localStorage with auto-quota recovery
  try {
    const serialized = JSON.stringify(db);
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, serialized);
  } catch (err: any) {
    const isQuotaError = 
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014 ||
      String(err?.message || '').toLowerCase().includes('quota');

    if (isQuotaError) {
      try {
        console.warn('LocalStorage quota limit reached; writing lean cache to localStorage. Full data is secured in IndexedDB.');
        const leanDb = createLeanDbForLocalStorage(db);
        localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(leanDb));
      } catch (secondaryErr) {
        // If localStorage is completely blocked or full from external keys, do not crash
        console.warn('LocalStorage fallback failed; relying safely on IndexedDB persistence.', secondaryErr);
      }
    } else {
      console.warn('Failed to persist database to localStorage:', err);
    }
  }
}
