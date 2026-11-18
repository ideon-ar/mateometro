import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

export const supabase = configured
  ? createClient(url, key, { auth: { persistSession: false } })
  : null;

// Llama a una función RPC y tira un Error con mensaje legible si falla
export async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message || 'Algo salió mal');
  return data;
}
