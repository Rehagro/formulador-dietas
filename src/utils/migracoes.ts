import type { Alimento } from '../types';

/**
 * Migração: corrige o bug do `rup_digest` (Digest. intestinal RUP) gravado
 * ~100× menor em alimentos custom criados antes do fix de 2026-06.
 *
 * Causa: em `ModalEdicaoAlimento.handleSalvar`, o campo travado `rup_digest`
 * (∈ CAMPOS_FRACAO) era injetado já em fração e passava por `toStore()`, que o
 * dividia por 100 outra vez (0,70 → 0,007 → …). Como é um campo TRAVADO, ele deve
 * sempre espelhar o template base — então a correção é restaurar o valor do
 * `alimento_base`.
 *
 * Idempotente: só marca como alterado o que de fato diverge do template.
 */
export function migrarRupDigest(
  custom: Alimento[],
  base: Alimento[],
): { corrigidos: Alimento[]; alterados: Alimento[] } {
  const baseByNome = new Map(base.map(b => [b.nome, b]));
  const alterados: Alimento[] = [];

  const corrigidos = custom.map(a => {
    if (!a.alimento_base) return a;                 // sem template → não dá pra restaurar
    const tpl = baseByNome.get(a.alimento_base);
    if (!tpl || tpl.rup_digest == null) return a;   // template ausente/sem o campo

    // Campo travado: deve ser idêntico ao template. Qualquer diferença é o bug.
    const atual = a.rup_digest ?? null;
    if (atual === null || Math.abs(atual - tpl.rup_digest) > 1e-6) {
      const fix = { ...a, rup_digest: tpl.rup_digest };
      alterados.push(fix);
      return fix;
    }
    return a;
  });

  return { corrigidos, alterados };
}
