import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

type Handler = () => void;

export function useRealtimePayments(loanIds: string[], onNew: Handler) {
  const stable = useCallback(onNew, []);

  useEffect(() => {
    if (loanIds.length === 0) return;

    const channel = supabase
      .channel(`payments-rt-${loanIds.slice(0,3).join('-')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, (payload) => {
        if (loanIds.includes(payload.new?.loan_id)) stable();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [JSON.stringify(loanIds)]);
}

export function useRealtimeLoans(onUpdate: Handler) {
  const stable = useCallback(onUpdate, []);

  useEffect(() => {
    const channel = supabase
      .channel('loans-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'loans' }, () => {
        stable();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
