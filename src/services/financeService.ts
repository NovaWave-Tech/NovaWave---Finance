import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { FinanceRecord, FinanceTable } from '../types/database';

export const financeService = {
  async list(table: FinanceTable): Promise<FinanceRecord[]> {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
  async save(table: FinanceTable, record: FinanceRecord, userId: string) {
    if (!isSupabaseConfigured) return record;
    const { data, error } = await supabase.from(table).upsert({ ...record, user_id: userId }).select().single();
    if (error) throw error;
    return data as FinanceRecord;
  },
  async remove(table: FinanceTable, id: string) {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
  },
};
