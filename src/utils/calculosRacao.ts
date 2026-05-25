/**
 * Cálculos do Formulador de Ração (mistura de concentrados).
 *
 * Lógica (espelha a aba "Ração Geral" da planilha PL.xlsx, A47:G67):
 *   1. Aluno define quanto cada ingrediente a vaca consome por dia (kg/d).
 *   2. Sistema calcula a fração de cada ingrediente na mistura final, baseada
 *      nas quantidades consumidas.
 *   3. Aluno informa capacidade do misturador (kg da batida).
 *   4. Sistema retorna: quanto pesar de cada ingrediente para aquela batida,
 *      composição nutricional ponderada da mistura, e custo total.
 *
 * A ração resultante pode ser salva como Alimento composto (tipo='C') e usada
 * em qualquer dieta como ingrediente único.
 */

import type { Alimento, IngredienteRacao, OrigemRacao } from '../types';

export interface IngredienteCalculado {
  alimento: Alimento;
  kg_d: number;
  fracao: number;        // 0-1 — proporção na mistura
  kg_batida: number;     // kg deste ingrediente para a batida (= fracao × capacidade)
  custo_batida: number;  // R$ deste ingrediente na batida (= kg_batida × custo)
  pct_custo: number;     // 0-1 — fração do custo total
}

export interface ResultadoRacao {
  ingredientes: IngredienteCalculado[];
  /** Nomes de ingredientes que estavam na receita mas não existem mais no banco
   *  (ex: alimento deletado depois de a ração ter sido salva). UI deve avisar. */
  ingredientes_faltantes: string[];
  /** kg/d consumo total — quanto vaca come dessa ração no total por dia. */
  consumo_total_kg_d: number;
  /** kg total da batida (= capacidade do misturador). */
  kg_batida_total: number;
  /** R$ custo total da batida. */
  custo_total: number;
  /** R$/kg da mistura — preço unitário da ração resultante. */
  custo_por_kg: number;
  /** Composição nutricional ponderada da mistura (mesmos campos de Alimento). */
  composicao: Composicao;
}

/** Subset numérico de Alimento que é ponderado linearmente na mistura. */
export interface Composicao {
  ms: number;
  pb: number;
  fdn: number;
  fda: number;
  amido: number;
  ee: number;
  ee_insat: number;
  cinza: number;
  lignin: number;
  cnf: number;
  ndt: number;
  fa: number;
  // Frações proteicas (Opção C — ponderadas; motor recalcula RUP/RDP via Eq. 6-1)
  prot_a: number; prot_b: number; prot_c: number;
  kd_prot: number;
  rup_digest: number;
  soluble_protein: number;
  adip: number; ndip: number;
  ivndfd48: number;
  de_base: number;
  // Macrominerais
  ca: number; p: number; mg: number; k: number; na: number; cl: number; s: number;
  // Microminerais
  cu: number; fe: number; mn_min: number; zn: number; co: number; se: number; i: number; mo: number;
  // AAs
  met: number; lys: number;
  // Cinética amido
  dc_st: number;
  dc_fa: number;
  npn_frac: number;
}

const CAMPOS_PONDERADOS: (keyof Composicao)[] = [
  'ms','pb','fdn','fda','amido','ee','ee_insat','cinza','lignin','cnf','ndt','fa',
  'prot_a','prot_b','prot_c','kd_prot','rup_digest','soluble_protein','adip','ndip',
  'ivndfd48','de_base',
  'ca','p','mg','k','na','cl','s',
  'cu','fe','mn_min','zn','co','se','i','mo',
  'met','lys',
  'dc_st','dc_fa','npn_frac',
];

function inicializarComposicao(): Composicao {
  return Object.fromEntries(CAMPOS_PONDERADOS.map(k => [k, 0])) as unknown as Composicao;
}

/**
 * Calcula tudo da ração — proporções, kg da batida, composição ponderada, custo.
 *
 * @param ingredientes Receita: lista de {alimento_nome, kg_d}
 * @param alimentos    Banco de alimentos (para lookup)
 * @param capacidade   Capacidade do misturador em kg (= peso da batida)
 */
export function calcularRacao(
  ingredientes: IngredienteRacao[],
  alimentos: Alimento[],
  capacidade: number,
): ResultadoRacao {
  // Resolve cada ingrediente (lookup do alimento + kg_d). Coleta os que
  // não foram encontrados no banco para a UI avisar.
  const faltantes: string[] = [];
  const resolvidos = ingredientes
    .map(ing => {
      const a = alimentos.find(x => x.nome === ing.alimento_nome);
      if (!a) {
        faltantes.push(ing.alimento_nome);
        return null;
      }
      return { alimento: a, kg_d: ing.kg_d };
    })
    .filter((x): x is { alimento: Alimento; kg_d: number } => x !== null && x.kg_d > 0);

  const consumo_total = resolvidos.reduce((s, r) => s + r.kg_d, 0);

  // Sem ingrediente válido → resultado vazio (mas ainda reporta faltantes)
  if (consumo_total <= 0 || capacidade <= 0) {
    return {
      ingredientes: [],
      ingredientes_faltantes: faltantes,
      consumo_total_kg_d: 0,
      kg_batida_total: capacidade,
      custo_total: 0,
      custo_por_kg: 0,
      composicao: inicializarComposicao(),
    };
  }

  // Calcula proporção e kg batida por ingrediente
  let custo_total = 0;
  const ingredientesCalc: IngredienteCalculado[] = resolvidos.map(r => {
    const fracao = r.kg_d / consumo_total;
    const kg_batida = fracao * capacidade;
    const custo_batida = kg_batida * (r.alimento.custo ?? 0);
    custo_total += custo_batida;
    return {
      alimento: r.alimento,
      kg_d: r.kg_d,
      fracao,
      kg_batida,
      custo_batida,
      pct_custo: 0,  // preenchido depois
    };
  });

  // Pct custo (após ter total)
  ingredientesCalc.forEach(ic => {
    ic.pct_custo = custo_total > 0 ? ic.custo_batida / custo_total : 0;
  });

  // Composição ponderada (% MS) — média ponderada por fração na mistura
  const composicao = inicializarComposicao();
  for (const ic of ingredientesCalc) {
    for (const k of CAMPOS_PONDERADOS) {
      const v = (ic.alimento as unknown as Record<string, number | null | undefined>)[k];
      if (v != null && !isNaN(v)) {
        composicao[k] += v * ic.fracao;
      }
    }
  }

  return {
    ingredientes: ingredientesCalc,
    ingredientes_faltantes: faltantes,
    consumo_total_kg_d: consumo_total,
    kg_batida_total: capacidade,
    custo_total,
    custo_por_kg: capacidade > 0 ? custo_total / capacidade : 0,
    composicao,
  };
}

/**
 * Converte uma ração calculada em um Alimento (tipo='C', classificação 'Concentrado')
 * pronto para salvar na biblioteca via DietaContext.adicionarAlimento().
 *
 * Salva também os metadados em `origem_racao` (receita + capacidade) para que o
 * aluno possa reabrir no Formulador e ver a história.
 */
export function racaoParaAlimento(
  resultado: ResultadoRacao,
  meta: { nome: string; fazenda?: string; capacidade_misturador_kg: number; custo_kg?: number },
): Alimento {
  const c = resultado.composicao;
  const origem: OrigemRacao = {
    data_criacao: new Date().toISOString().slice(0, 10),
    fazenda: meta.fazenda,
    capacidade_misturador_kg: meta.capacidade_misturador_kg,
    receita: resultado.ingredientes.map(ic => ({
      alimento_nome: ic.alimento.nome,
      kg_d: ic.kg_d,
    })),
  };

  // Custo: aluno pode sobrescrever; default = custo calculado da batida (R$/kg)
  const custo = meta.custo_kg !== undefined ? meta.custo_kg : resultado.custo_por_kg;

  return {
    nome: meta.nome,
    custo,
    classificacao: 'Concentrado',
    tipo: 'C',
    // Composição ponderada (mesma escala dos campos do banco — fração 0-1 para macro)
    ms: c.ms, pb: c.pb, fdn: c.fdn, fda: c.fda, amido: c.amido,
    ee: c.ee, ee_insat: c.ee_insat,
    cinza: c.cinza, lignin: c.lignin, cnf: c.cnf, ndt: c.ndt, fa: c.fa,
    // Frações proteicas ponderadas (% CP — mesma escala do banco)
    prot_a: c.prot_a, prot_b: c.prot_b, prot_c: c.prot_c,
    kd_prot: c.kd_prot,
    rup_digest: c.rup_digest,
    soluble_protein: c.soluble_protein,
    adip: c.adip, ndip: c.ndip,
    ivndfd48: c.ivndfd48,
    de_base: c.de_base,
    // Minerais ponderados
    ca: c.ca, p: c.p, mg: c.mg, k: c.k, na: c.na, cl: c.cl, s: c.s,
    cu: c.cu, fe: c.fe, mn_min: c.mn_min, zn: c.zn, co: c.co, se: c.se, i: c.i, mo: c.mo,
    // AAs e cinética
    met: c.met, lys: c.lys,
    dc_st: c.dc_st, dc_fa: c.dc_fa, npn_frac: c.npn_frac,
    // Campos que não fazem sentido ponderar (deixar null)
    pdr: null, pndr: null, efdn: null, fdnf: null, nel: null,
    kd_amido: null,
    vit_a: null, vit_d3: null, vit_e: null,
    biotina: null, monensina: null, cr: null, levedura: null,
    cp_digest: null, ndf_digest: null, fat_digest: null,
    lisina_pct: null, met_pct: null,
    // Marca como ração
    origem_racao: origem,
  };
}
