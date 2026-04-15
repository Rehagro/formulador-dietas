import type { Dieta, Alimento } from '../types';

const DIETAS_KEY = 'dietas_v1';
const ALIMENTOS_CUSTOM_KEY = 'alimentos_custom_v1';
const DIETA_ATIVA_KEY = 'dieta_ativa_v1';

export function getDietas(): Dieta[] {
  try {
    return JSON.parse(localStorage.getItem(DIETAS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveDietas(dietas: Dieta[]): void {
  localStorage.setItem(DIETAS_KEY, JSON.stringify(dietas));
}

export function getDietaAtiva(): string | null {
  return localStorage.getItem(DIETA_ATIVA_KEY);
}

export function setDietaAtiva(id: string | null): void {
  if (id) localStorage.setItem(DIETA_ATIVA_KEY, id);
  else localStorage.removeItem(DIETA_ATIVA_KEY);
}

export function getAlimentosCustom(): Alimento[] {
  try {
    return JSON.parse(localStorage.getItem(ALIMENTOS_CUSTOM_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveAlimentosCustom(alimentos: Alimento[]): void {
  localStorage.setItem(ALIMENTOS_CUSTOM_KEY, JSON.stringify(alimentos));
}

export function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
