import { createClient } from '@supabase/supabase-js';
import type { Dieta, Alimento } from '../types';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ─── AUTH ───────────────────────────────────────────────

export async function signUp(email: string, senha: string, nome: string) {
  return supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome } }
  });
}

export async function signIn(email: string, senha: string) {
  return supabase.auth.signInWithPassword({ email, password: senha });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ─── DIETAS ─────────────────────────────────────────────

export async function getDietasSupabase(): Promise<Dieta[]> {
  const { data, error } = await supabase
    .from('dietas')
    .select('dados')
    .order('atualizado_em', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(row => row.dados as Dieta);
}

export async function saveDietaSupabase(dieta: Dieta): Promise<void> {
  const user = await getUser();
  if (!user) throw new Error('Não autenticado');

  const { error } = await supabase
    .from('dietas')
    .upsert({
      id: dieta.id,
      user_id: user.id,
      dados: dieta,
      atualizado_em: new Date().toISOString()
    });

  if (error) throw error;
}

export async function deleteDietaSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('dietas')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ─── ALIMENTOS CUSTOM ───────────────────────────────────

export async function getAlimentosCustomSupabase(): Promise<Alimento[]> {
  const { data, error } = await supabase
    .from('alimentos_custom')
    .select('id, dados')
    .order('criado_em', { ascending: true });

  if (error) throw error;
  return (data ?? []).map(row => ({ ...(row.dados as Alimento), id: row.id }));
}

export async function saveAlimentoCustomSupabase(alimento: Alimento): Promise<string> {
  const user = await getUser();
  if (!user) throw new Error('Não autenticado');

  const id = alimento.id ?? crypto.randomUUID();

  const { error } = await supabase
    .from('alimentos_custom')
    .upsert({
      id,
      user_id: user.id,
      dados: { ...alimento, id },
      atualizado_em: new Date().toISOString()
    });

  if (error) throw error;
  return id;
}

export async function deleteAlimentoCustomSupabase(id: string): Promise<void> {
  const { error } = await supabase
    .from('alimentos_custom')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
