# 🐄 Formulador de Dietas para Vacas Leiteiras — Briefing Completo

## Contexto Geral

Aplicação web para **formulação de dietas de vacas leiteiras** baseada no **NRC 2021**, substituindo uma planilha Excel complexa usada por um nutricionista e seus alunos.

O arquivo Excel original (`Planilha_Formulação_PL.xlsx`) foi completamente analisado. Todos os dados de alimentos e fórmulas foram mapeados.

---

## Stack Recomendada

- **Frontend:** React + TypeScript
- **Estilo:** Tailwind CSS
- **Persistência:** localStorage (sem backend na v1)
- **Exportação:** xlsx (SheetJS) + jsPDF

---

## Estrutura de Abas (v1 = Lactação apenas)

O Excel original tem: Alimentos, Lactação, Pós-parto, Vaca Seca, Pré-parto, Recria, Ração Geral, Ração Aleitamento, Conversão de Rótulo.

**v1 foca em: Lactação**

---

## Banco de Dados de Alimentos

96 alimentos cadastrados no arquivo `alimentos.json` (gerado a partir do Excel).

### Estrutura de cada alimento:
```typescript
interface Alimento {
  nome: string;
  custo: number | null;           // R$/kg MN
  classificacao: string;          // "Energético", "Proteico", "Volumoso", "Mineral", etc.
  tipo: "C" | "F" | "S";        // Concentrado, Forragem, Silagem
  ms: number;                     // Matéria Seca (proporção, ex: 0.88)
  pb: number;                     // Proteína Bruta % MS
  pdr: number | null;             // Proteína Degradável no Rúmen % MS (calculada: pb - pndr)
  pndr: number | null;            // Proteína Não Degradável % MS
  fdn: number | null;             // FDN % MS
  efdn: number | null;            // FDN efetiva % MS
  mn8: number | null;             // FDN partículas > 8mm % MN
  mn19: number | null;            // FDN partículas > 19mm % MN
  fdnf: number | null;            // FDN de forragem % MS
  fda: number | null;             // FDA % MS
  nel: number | null;             // Energia Líquida de Lactação Mcal/kg MS
  ndt: number | null;             // NDT % MS
  ee: number | null;              // Extrato Etéreo (EE/Óleo) % MS
  ee_insat: number | null;        // EE Insaturado % MS
  cinza: number | null;           // Cinzas % MS
  cnf: number | null;             // Carboidratos Não Fibrosos % MS
  amido: number | null;           // Amido % MS
  kd_amido: number | null;        // Taxa de degradação do amido %/h
  met: number | null;             // Metionina % MS
  lys: number | null;             // Lisina % MS
  ca: number | null;              // Cálcio % MS
  p: number | null;               // Fósforo % MS
  mg: number | null;              // Magnésio % MS
  k: number | null;               // Potássio % MS
  s: number | null;               // Enxofre % MS
  na: number | null;              // Sódio % MS
  cl: number | null;              // Cloro % MS
  co: number | null;              // Cobalto mg/kg
  cu: number | null;              // Cobre mg/kg
  mn_min: number | null;          // Manganês mg/kg
  zn: number | null;              // Zinco mg/kg
  se: number | null;              // Selênio mg/kg
  i: number | null;               // Iodo mg/kg
  fe: number | null;              // Ferro mg/kg
  vit_a: number | null;           // Vitamina A UI/kg
  vit_d3: number | null;          // Vitamina D3 UI/kg
  vit_e: number | null;           // Vitamina E UI/kg
  biotina: number | null;         // Biotina mg/kg
  monensina: number | null;       // Monensina mg/kg
  cr: number | null;              // Cromo mg/kg
  levedura: number | null;        // Levedura UFC/kg
  prot_a: number | null;          // Fração Proteína A % CP
  prot_b: number | null;          // Fração Proteína B % CP
  prot_c: number | null;          // Fração Proteína C % CP
  kd_prot: number | null;         // Taxa digestão proteína %/h
  rup_digest: number | null;      // Digestibilidade RUP %
  cp_digest: number | null;       // Digestibilidade CP %
  ndf_digest: number | null;      // Digestibilidade NDF %
  fat_digest: number | null;      // Digestibilidade EE %
  lisina_pct: number | null;      // Lisina % CP
  met_pct: number | null;         // Metionina % CP
}
```

### Fórmulas derivadas (calcular na hora, não armazenar):
```typescript
// PDR = PB - PNDR
pdr = alimento.pb - alimento.pndr

// PNDR = PB * fracao_pndr (varia por alimento, já armazenada)

// NEl (quando null) = (0.0245 * NDT * 100) - 0.12
nel = (0.0245 * ndt * 100) - 0.12

// CNF = 1 - (FDN + EE + Cinza + PB)
cnf = 1 - (fdn + ee + cinza + pb)

// eFDN = (FDN * mn8) + (FDN * (1 - mn8) * 0.33)  [para concentrados]
// eFDN = FDN  [para forragens/silagens]

// EE Insaturado = EE * fator * (composição_AG) / 100  [fórmula específica por tipo]

// FDNF = FDN se tipo F ou S, 0 se tipo C

// Amido Degradável = (kd_amido / (kd_amido + kPc)) * amido_kg_ms
// onde kPc é a taxa de passagem de concentrado (calculada dinamicamente pela dieta)
```

---

## Dados do Animal — Lactação

```typescript
interface AnimalLactacao {
  ecc: number;          // Escore de Condição Corporal (1 a 5)
  paridade: 0 | 1;     // 0 = novilha (1º parto), 1 = vaca adulta
  peso: number;         // Peso vivo médio, kg
  del: number;          // Dias Em Lactação médio
  leite: number;        // Produção de leite média, kg/d
  gordura: number;      // Gordura do leite, %
  proteina: number;     // Proteína do leite, %
  lactose: number;      // Lactose do leite, %
  precoLeite: number;   // Preço do leite R$/litro (para cálculo de lucro)
}
```

---

## Fórmula Central — CMS Exigida NRC 2021 (Lactação)

```typescript
function calcularCMSExigida(animal: AnimalLactacao): number {
  const { ecc, paridade, peso, del, leite, gordura, proteina, lactose } = animal;
  
  const cms = (
    3.7 +
    (paridade * 5.7) +
    (0.305 * ((0.0929 * gordura) + (0.0547 * proteina) + (0.0395 * lactose)) * leite) +
    (0.022 * peso) +
    ((-0.689 - 1.87 * paridade) * ecc)
  ) * (1 - (0.212 + paridade * 0.136) * Math.exp(-0.053 * del));
  
  return cms; // kg MS/dia
}
```

---

## Estrutura da Dieta

```typescript
interface SlotIngrediente {
  id: string;
  alimentoNome: string | null;    // nome do alimento selecionado
  kgMN: number;                   // kg de Matéria Natural fornecido/dia (INPUT DO USUÁRIO)
  // Todos os outros campos são calculados automaticamente
}

interface Dieta {
  id: string;
  nome: string;                   // ex: "Lote A - Janeiro 2025"
  criadaEm: string;
  animal: AnimalLactacao;
  slots: SlotIngrediente[];       // sempre 16 slots
}
```

---

## Cálculos por Ingrediente (por slot)

Dado um `SlotIngrediente` com `kgMN` preenchido e um `Alimento` selecionado:

```typescript
// kg de MS fornecido
kgMS = kgMN * alimento.ms

// % da dieta em CO (matéria original)
pctCO = kgMS / totalMS_dieta   // calculado após somar todos

// Custo
custo = kgMN * alimento.custo

// Para cada nutriente X (PB, FDN, NEl, etc.):
kgNutriente_X = kgMS * alimento.X   // em kg/dia

// FDN>8 (partículas >8mm) — cálculo diferente para silagem vs forragem:
if (tipo === "S") {
  fdn8 = (((fdn * mn8 * 100) * 0.9465) + 4.5798) / 100 * kgMS
} else if (tipo === "F") {
  fdn8 = fdn * mn8 * kgMS
} else {
  fdn8 = 0
}

// FDN>19 (partículas >19mm):
if (tipo === "S") {
  fdn19 = (((fdn * mn19 * 100) * 1.0083) + 0.4502) / 100 * kgMS
} else if (tipo === "F") {
  fdn19 = fdn * mn19 * kgMS
} else {
  fdn19 = 0
}

// Amido degradável:
amidoDeg = (kd_amido / (kd_amido + kPc)) * kgMS * amido
// kPc = taxa passagem concentrado (ver abaixo)
```

---

## Totais da Dieta

```typescript
// Somar todos os slots:
totalKgMN = sum(slots.kgMN)
totalKgMS = sum(slots.kgMS)               // = CMS real da dieta

// Para cada nutriente, % na MS:
pctPB  = sum(kgPB)  / totalKgMS
pctFDN = sum(kgFDN) / totalKgMS
// etc.

// Concentrações absolutas (kg/dia):
kgPB_total  = sum(kgPB)
// etc.
```

---

## Taxas de Passagem (calculadas dinamicamente)

```typescript
function calcularTaxasPassagem(slots, animal) {
  const peso = animal.peso;
  const kgMS_forragem = sum(slots where tipo=F or S, kgMS);
  const kgMS_concentrado = sum(slots where tipo=C, kgMS);
  
  const pctF_PV = (kgMS_forragem / peso) * 100;
  const pctC_PV = (kgMS_concentrado / peso) * 100;
  const kgMS_silagem = sum(slots where tipo=S, kgMS);

  // Taxa passagem forragem (kP F) - %/h
  const kPf = (2.365 + (0.214 * pctF_PV) + (0.734 * pctC_PV) + (0.069 * kgMS_silagem)) / 100;

  // Taxa passagem concentrado (kP C) - %/h  
  const kPc = (1.169 + (1.375 * pctF_PV) + (1.721 * pctC_PV)) / 100;

  // Taxa passagem líquido (kP L) - %/h
  const kPl = (4.524 + (0.223 * pctF_PV) + (2.046 * pctC_PV) + (0.344 * kgMS_silagem)) / 100;

  return { kPf, kPc, kPl };
}
```

---

## Indicadores Adicionais da Dieta

```typescript
interface IndicadoresDieta {
  // Físicos
  fdnf_kg_pv: number;           // FDNF total (kg) / peso animal — meta: < 0.9%
  pct_forragem_ms: number;      // % da MS que é forragem+silagem — meta: 40-60%
  fdn8_amido_deg: number;       // FDN>8 / Amido degradável — meta: >= 1
  lis_met: number;              // Lisina total / Metionina total — meta: ~3
  ca_p: number;                 // Ca total / P total — meta: 2:1 a 6:1
  
  // DCAD (mEq/kg MS)
  dcad: number;  // = ((Na/23) + (K/39) - (Cl/35) - (S/32*2)) * 1.000.000 — meta: >150
  
  // Taxas de passagem
  kPf: number;   // Taxa passagem forragem
  kPc: number;   // Taxa passagem concentrado  
  kPl: number;   // Taxa passagem líquido

  // Produção de leite suportada
  leite_potencial_nel: number;    // Calculado pela NEl disponível
  leite_potencial_prot: number;   // Calculado pela proteína disponível
}
```

---

## Faixas de Referência NRC — Lactação

```typescript
const REFERENCIAS_LACTACAO = {
  cms:    { label: "CMS",        unidade: "kg/d",      tipo: "calculada" },
  pb:     { label: "PB",         unidade: "% MS",      min: 0.14, max: 0.17 },
  pdr:    { label: "PDR",        unidade: "% MS",      min: 0.10, max: 0.11 },
  pndr:   { label: "PNDR",       unidade: "% MS",      min: 0.04, max: 0.07 },
  fdn:    { label: "FDN",        unidade: "% MS",      min: 0.18 },
  efdn:   { label: "eFDN",       unidade: "% MS",      min: 0.15, max: 0.18 },
  fdnf:   { label: "FDNF",       unidade: "% MS",      min: 0.19 },
  nel:    { label: "NEl",        unidade: "Mcal/kg",   tipo: "calculada" },
  ee:     { label: "EE",         unidade: "% MS",      max: 0.05 },
  ee_insat: { label: "EE Insat", unidade: "% MS",      max: 0.03 },
  cnf:    { label: "CNF",        unidade: "% MS",      min: 0.20, max: 0.45 },
  amido:  { label: "Amido",      unidade: "% MS",      min: 0.20, max: 0.30 },
  amido_deg: { label: "Amido Deg", unidade: "% MS",    min: 0.15, max: 0.20 },
  ca:     { label: "Ca",         unidade: "% MS",      min: 0.006, max: 0.008 },
  p:      { label: "P",          unidade: "% MS",      min: 0.0035, max: 0.0040 },
  mg:     { label: "Mg",         unidade: "% MS",      min: 0.0025, max: 0.0035 },
  k:      { label: "K",          unidade: "% MS",      min: 0.009, max: 0.010 },
  s:      { label: "S",          unidade: "% MS",      min: 0.002, max: 0.0025 },
  na:     { label: "Na",         unidade: "% MS",      min: 0.00022 },  // 0.0022 g/kg
  cl:     { label: "Cl",         unidade: "% MS",      min: 0.0025, max: 0.0030 },
  co:     { label: "Co",         unidade: "mg/kg",     min: 0.2 },
  cu:     { label: "Cu",         unidade: "mg/kg",     min: 10, max: 15 },
  mn_min: { label: "Mn",         unidade: "mg/kg",     min: 30, max: 40 },
  zn:     { label: "Zn",         unidade: "mg/kg",     min: 50, max: 60 },
  se:     { label: "Se",         unidade: "mg/kg",     min: 0.3, max: 0.6 },
  i:      { label: "I",          unidade: "mg/kg",     min: 0.5 },
  fe:     { label: "Fe",         unidade: "mg/kg",     min: 15 },
  vit_a:  { label: "Vit A",      unidade: "UI/kg",     min: 3000, max: 4000 },
  vit_d3: { label: "Vit D3",     unidade: "UI/kg",     min: 1500, max: 2000 },
  vit_e:  { label: "Vit E",      unidade: "UI/kg",     min: 25, max: 30 },  // UI/kg = IU/kg
  biotina:    { label: "Biotina",    unidade: "mg/kg", min: 20, max: 25 },
  monensina:  { label: "Monensina",  unidade: "mg/kg", min: 300, max: 350 },
  cr:         { label: "Cr",         unidade: "mg/kg", min: 5 },
  levedura:   { label: "Levedura",   unidade: "UFC/kg", ref: "1-2 x 10^10" },
  
  // Indicadores
  fdnf_kg_pv:       { label: "FDNF/kg PV",            unidade: "%",    max: 0.009 },
  pct_forragem_ms:  { label: "% Forragem na MS",       unidade: "%",    min: 0.40, max: 0.60 },
  fdn8_amido_deg:   { label: "FDN>8 / Amido Deg",      unidade: "",     min: 1 },
  lis_met:          { label: "Lis / Met",               unidade: "",     ref: "3" },
  ca_p:             { label: "Ca / P",                  unidade: "",     min: 2, max: 6 },
  dcad:             { label: "DCAD",                    unidade: "mEq/kg", min: 150 },
};
```

---

## Layout da Aplicação

### Páginas / Rotas:
1. **`/`** — Formulador (página principal)
2. **`/alimentos`** — Banco de Alimentos (CRUD)
3. **`/dietas`** — Minhas Dietas salvas (lista, renomear, duplicar, excluir)

### Layout da Página Principal (`/`):

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Logo + nav (Formulador | Alimentos | Dietas)   │
├────────────────────────┬────────────────────────────────┤
│  PAINEL DO ANIMAL      │  PAINEL DE RESULTADOS          │
│  (8 campos)            │  (nutrientes com cores)        │
│  CMS exigida destaque  │  Começa compacto, expande      │
├────────────────────────┴────────────────────────────────┤
│  TABELA DE INGREDIENTES (16 slots)                      │
│  Nome | kg MN | kg MS | % MS | [nutrientes calculados] │
│  + linha de TOTAIS                                      │
│  + linha de REFERÊNCIAS                                 │
├─────────────────────────────────────────────────────────┤
│  INDICADORES (FDNF/PV, %forragem, Lis/Met, Ca/P, DCAD) │
│  + Custos (R$/d, R$/kg MS, R$/litro)                   │
│  + Leite potencial (NEl e Proteína)                     │
└─────────────────────────────────────────────────────────┘
```

### Painel de Resultados — Seções expansíveis:
1. **🥛 Produção** (sempre visível): CMS real vs exigida, Leite potencial NEl, Leite potencial Proteína
2. **⚡ Energia & Carboidratos** (expandível): NEl, NDT, CNF, Amido, Amido Deg
3. **🧬 Proteína** (expandível): PB, PDR, PNDR, Met, Lys, Lis/Met
4. **🌾 Fibra** (expandível): FDN, eFDN, FDNF, FDA, FDN>8, %Forragem
5. **🔬 Gordura** (expandível): EE, EE Insat
6. **🧂 Macrominerais** (expandível): Ca, P, Mg, K, S, Na, Cl, Ca/P, DCAD
7. **💊 Microminerais** (expandível): Co, Cu, Mn, Zn, Se, I, Fe
8. **🌟 Vitaminas & Aditivos** (expandível): Vit A, D3, E, Biotina, Monensina, Cr, Levedura

---

## Comportamento das Cores por Nutriente

```typescript
type StatusNutriente = "ok" | "alto" | "baixo" | "critico_alto" | "critico_baixo" | "sem_ref";

function getStatus(valor: number, ref: Referencia): StatusNutriente {
  if (!ref.min && !ref.max) return "sem_ref";
  
  const min = ref.min ?? -Infinity;
  const max = ref.max ?? Infinity;
  const tolerance = 0.10; // 10% de tolerância para amarelo
  
  if (valor >= min && valor <= max) return "ok";                          // 🟢
  if (valor < min * (1 - tolerance)) return "critico_baixo";             // 🔴
  if (valor > max * (1 + tolerance)) return "critico_alto";              // 🔴
  if (valor < min) return "baixo";                                        // 🟡
  if (valor > max) return "alto";                                         // 🟡
  return "sem_ref";
}
```

---

## Funcionalidades de Salvamento

```typescript
// localStorage keys:
// "dietas_v1" → Dieta[]
// "alimentos_custom_v1" → Alimento[]  (alimentos adicionados/editados pelo usuário)
// "dieta_ativa_v1" → string (id da dieta em edição)

// Operações:
// - Salvar dieta atual (com nome)
// - Carregar dieta salva
// - Duplicar dieta (novo id, nome "Cópia de X")
// - Excluir dieta
// - Exportar dieta como JSON
// - Exportar dieta como XLSX (SheetJS)
// - Comparar 2 dietas lado a lado
```

---

## Fluxo de Trabalho do Usuário

1. Usuário abre a app → tela do Formulador em branco
2. Preenche os **dados do animal** → CMS exigida aparece instantaneamente
3. Nos slots de ingredientes: **seleciona o alimento** (dropdown/busca) e **digita kg MN**
4. Os resultados atualizam em tempo real a cada keystroke
5. O painel de resultados mostra verde/amarelo/vermelho
6. Usuário ajusta quantidades até ficar equilibrado
7. Salva com nome → aparece em "Minhas Dietas"
8. Pode duplicar para testar variações
9. Exporta para Excel quando quiser

---

## Ordem Pedagógica de Formulação (importante!)

O app deve guiar visualmente nesta ordem:
1. **Primeiro:** CMS — está o consumo real chegando perto do exigido?
2. **Segundo:** Energia (NEl) e Proteína (PB, PDR, PNDR)
3. **Terceiro:** Fibra (FDN, eFDN, FDNF)
4. **Quarto:** Minerais e vitaminas

O painel de resultados deve refletir essa hierarquia visual.

---

## Exportação Excel

O XLSX exportado deve ter:
- Aba "Dieta": dados do animal + tabela de ingredientes + totais
- Aba "Resultados": todos os nutrientes com valor, referência e status
- Aba "Indicadores": FDNF/PV, %forragem, custos, leite potencial

---

## Arquivos do Projeto

- `alimentos.json` — banco de dados completo dos 96 alimentos (gerado do Excel)
- `BRIEFING_PROJETO.md` — este documento

---

## Prioridades de Desenvolvimento

### v1 (agora):
- [x] Banco de alimentos (96 items do JSON)
- [x] Formulador de lactação completo
- [x] Cálculos NRC 2021 em tempo real
- [x] Painel de resultados com cores
- [x] Salvamento localStorage
- [x] Banco de alimentos editável (CRUD)
- [x] Exportação XLSX
- [x] Comparação de 2 dietas

### v2 (futuro):
- [ ] Pós-parto
- [ ] Vaca Seca
- [ ] Pré-parto
- [ ] Recria
- [ ] Ração Geral (NRC 2001)
- [ ] Ração Aleitamento (bezerras)
- [ ] Conversão de Rótulo
- [ ] Análise de partículas Penn State
- [ ] Exportação PDF
- [ ] Contas de usuário / nuvem
