import { useEffect, useRef } from 'react';
import { useRemittance } from '../lib/store';
import { pushDataToTurso } from '../lib/tursoClient';

export function useAutoTursoSync() {
  const { db, currentUser } = useRemittance();
  const dbRef = useRef(db);

  // လက်ရှိ db state ကို အမြဲ reference ယူထားခြင်း (လက်ရှိသွင်းနေဆဲ data များ မထိခိုက်စေရန်)
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  // Push Function
  const triggerPush = async (reason = 'auto-interval') => {
    try {
      const currentData = dbRef.current;
      if (!currentData || !currentData.transactions) return;

      console.log(`[AutoSync] Background Push Triggered (${reason})...`);
      await pushDataToTurso({
        transactions: currentData.transactions,
        exchangeRates: currentData.exchangeRates,
        customers: currentData.customers,
        auditLogs: currentData.auditLogs,
        users: currentData.users,
        branches: currentData.branches
      });
      console.log(`[AutoSync] Background Push Complete (${reason}).`);
    } catch (err) {
      console.warn('[AutoSync] Push failed silently:', err);
    }
  };

  // ၁။ ၁၀ မိနစ်ခြားတစ်ကြိမ် (Interval Push: 10 minutes = 600,000 ms)
  useEffect(() => {
    const TEN_MINUTES = 10 * 60 * 1000;
    const timer = setInterval(() => {
      triggerPush('10-minute-interval');
    }, TEN_MINUTES);

    return () => clearInterval(timer);
  }, []);

  // ၂။ Browser ကို "X" နှိပ်ပြီး ပိတ်သည့်အခါ (Window close / tab unload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentData = dbRef.current;
      if (!currentData) return;

      const payload = JSON.stringify({
        transactions: currentData.transactions,
        exchangeRates: currentData.exchangeRates,
        customers: currentData.customers,
        auditLogs: currentData.auditLogs,
        users: currentData.users,
        branches: currentData.branches
      });

      // Browser ပိတ်သွားသည့်အခါ connection မပြတ်ဘဲ နောက်ကွယ်မှ ပို့နိုင်ရန် sendBeacon အသုံးပြုခြင်း
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/turso/sync-push', blob);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  return { triggerPush };
}