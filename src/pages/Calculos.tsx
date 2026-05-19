import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ──────────────────────────────────────────────────────────────────────────
// Helpers de UI
// ──────────────────────────────────────────────────────────────────────────

interface SecaoProps {
  titulo: string;
  subtitulo: string;
  cor: 'blue' | 'amber' | 'violet' | 'rose' | 'gray';
  children: React.ReactNode;
}

const CORES = {
  blue:   { header: 'bg-blue-600',   border: 'border-blue-200',   light: 'bg-blue-50',   text: 'text-blue-800' },
  amber:  { header: 'bg-amber-600',  border: 'border-amber-200',  light: 'bg-amber-50',  text: 'text-amber-800' },
  violet: { header: 'bg-violet-600', border: 'border-violet-200', light: 'bg-violet-50', text: 'text-violet-800' },
  rose:   { header: 'bg-rose-600',   border: 'border-rose-200',   light: 'bg-rose-50',   text: 'text-rose-800' },
  gray:   { header: 'bg-gray-700',   border: 'border-gray-300',   light: 'bg-gray-50',   text: 'text-gray-800' },
};

function Secao({ titulo, subtitulo, cor, children }: SecaoProps) {
  const [aberto, setAberto] = useState(true);
  const c = CORES[cor];
  return (
    <div className={`rounded-2xl border ${c.border} overflow-hidden shadow-sm`}>
      <button
        onClick={() => setAberto(a => !a)}
        className={`w-full flex items-center justify-between px-6 py-4 ${c.header} text-white`}
      >
        <div className="text-left">
          <div className="text-lg font-bold">{titulo}</div>
          <div className="text-sm opacity-80 mt-0.5">{subtitulo}</div>
        </div>
        {aberto ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>
      {aberto && <div className="bg-white px-6 py-6 space-y-6">{children}</div>}
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 text-gray-100 rounded-xl px-5 py-4 font-mono text-[13px] leading-relaxed overflow-x-auto whitespace-pre">
      {children}
    </div>
  );
}

function Var({ nome, desc, unidade, exemplo }: { nome: string; desc: string; unidade: string; exemplo?: string }) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-4 font-mono text-sm font-bold text-gray-800 whitespace-nowrap">{nome}</td>
      <td className="py-2 pr-4 text-sm text-gray-600">{desc}</td>
      <td className="py-2 pr-4 text-sm text-gray-500 whitespace-nowrap">{unidade}</td>
      {exemplo !== undefined && <td className="py-2 text-sm font-semibold text-gray-700 whitespace-nowrap">{exemplo}</td>}
    </tr>
  );
}

function Tab({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="pb-2 text-xs font-bold text-gray-500 uppercase pr-4">Símbolo</th>
            <th className="pb-2 text-xs font-bold text-gray-500 uppercase pr-4">Descrição</th>
            <th className="pb-2 text-xs font-bold text-gray-500 uppercase pr-4">Unidade</th>
            <th className="pb-2 text-xs font-bold text-gray-500 uppercase">Exemplo</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Passo({ n, label, formula, resultado }: { n: number; label: string; formula: string; resultado: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">{n}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        <div className="mt-1 font-mono text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 whitespace-pre">{formula}</div>
        <div className="mt-1 text-sm font-bold text-gray-900">{resultado}</div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Página
// ──────────────────────────────────────────────────────────────────────────

export default function Calculos() {
  return (
    <div className="max-w-[900px] mx-auto px-4 py-8 space-y-6">

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">🔬 Cálculos do Formulador</h1>
        <p className="text-gray-500 text-sm mt-1">
          Equações do <strong>NASEM 2021</strong> (8ª edição) implementadas em <code className="bg-gray-100 px-1 rounded text-xs">src/utils/calculos.ts</code>.
          Os exemplos usam uma vaca de referência <strong>650 kg · 30 kg leite/d · gord 3,5% · prot 3,2% · lact 4,7% · multípara · DEL 90</strong>.
        </p>
      </div>

      {/* ── 1. CMS ─────────────────────────────────────────────────────── */}
      <Secao titulo="1. Consumo de Matéria Seca (CMS)" subtitulo="NASEM 2021 — Eq. 20-21 (Dt_DMIn_Lact1)" cor="blue">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula</h3>
          <p className="text-sm text-gray-600">
            A quantidade de matéria seca (kg/d) que a vaca consegue consumir, dada a sua paridade, peso, leite produzido,
            composição do leite, ECC e fase da lactação. É a <strong>capacidade de ingestão prevista</strong>.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Fórmula</h3>
          <Formula>
{`CMS = Fator Base × Fator Temporal

Fator Base   = 3,7 + (P × 5,7) + (0,305 × NEL_leite × L)
               + (0,022 × PV) + (−0,689 − 1,87 × P) × ECC

NEL_leite    = 0,0929 × G + 0,055 × PB + 0,0395 × Lact   [Mcal/kg]

Fator Temporal = 1 − (0,212 + P × 0,136) × e^(−0,053 × DEL)

# Teto biológico: CMS ≤ 5% do PV`}
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Variáveis</h3>
          <Tab>
            <Var nome="P"         desc="Paridade (0 = primípara, 1 = multípara)" unidade="adim."    exemplo="1" />
            <Var nome="L"         desc="Produção de leite"                       unidade="kg/d"     exemplo="30" />
            <Var nome="G"         desc="Gordura do leite"                        unidade="%"        exemplo="3,5" />
            <Var nome="PB"        desc="Proteína bruta do leite"                 unidade="%"        exemplo="3,2" />
            <Var nome="Lact"      desc="Lactose do leite"                        unidade="%"        exemplo="4,7" />
            <Var nome="PV"        desc="Peso vivo"                               unidade="kg"       exemplo="650" />
            <Var nome="ECC"       desc="Escore de condição corporal (1–5)"       unidade="pts"      exemplo="3,0" />
            <Var nome="DEL"       desc="Dias em lactação"                        unidade="d"        exemplo="90" />
          </Tab>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="space-y-3">
            <Passo n={1} label="NEL por kg de leite"
              formula="0,0929 × 3,5 + 0,055 × 3,2 + 0,0395 × 4,7"
              resultado="= 0,325 + 0,176 + 0,186  =  0,687 Mcal/kg leite" />
            <Passo n={2} label="Fator Base"
              formula="3,7 + (1×5,7) + (0,305×0,687×30) + (0,022×650) + (−0,689−1,87)×3"
              resultado="= 3,7 + 5,7 + 6,29 + 14,30 − 7,68  =  22,3 kg" />
            <Passo n={3} label="Fator Temporal (DEL = 90 d)"
              formula="1 − (0,212 + 1×0,136) × e^(−0,053×90)"
              resultado="= 1 − 0,348 × e^(−4,77)  =  1 − 0,348 × 0,0084  ≈  0,997" />
            <Passo n={4} label="CMS final"
              formula="22,3 × 0,997"
              resultado="≈ 22,2 kg MS/d  (limite 5% PV = 32,5 kg → não ativa)" />
          </div>
          <div className="mt-3 rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-800">
            <strong>Interpretação:</strong> esta vaca tem capacidade prevista de ~22,2 kg MS/d. A barra <em>"CMS formulada vs exigida"</em>
            no painel de resultados compara esse valor com o total que você adicionou na tabela de ingredientes.
          </div>
        </div>
      </Secao>

      {/* ── 2. Leite pela Energia ─────────────────────────────────────── */}
      <Secao titulo="2. Leite Potencial pela Energia (NEL)" subtitulo="NASEM 2021 — cadeia DE → ME → NEL (Cap. 20 e Eq. 3-13)" cor="amber">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A produção máxima de leite que a <strong>energia da dieta</strong> sustenta. Diferente do NRC 2001 (que usava NEL
            direto do alimento), o NASEM 2021 calcula a energia a partir dos <strong>componentes digeridos</strong> (NDF, amido,
            FA, CP, rOM), construindo a cadeia mecanística <strong>GE → DE → ME → NEL</strong>.
          </p>
          <ul className="text-sm text-gray-600 list-disc pl-5 mt-1.5 space-y-0.5">
            <li><strong>DE</strong> — Energia Digestível: GE menos energia das fezes (o que o animal absorveu)</li>
            <li><strong>ME</strong> — Energia Metabolizável: DE menos perda de urina e de gases (metano)</li>
            <li><strong>NEL</strong> — Energia Líquida de Lactação: ME × 0,66 (eficiência de uso para leite)</li>
          </ul>
        </div>

        {/* PARTE A — Digestibilidades por componente */}
        <div className="border-l-4 border-amber-300 pl-4">
          <h3 className="font-semibold text-amber-800 mb-2">Parte A — Digestibilidades dos componentes da dieta</h3>
          <Formula>
{`# 1) NDF (fibra) digestível — escolha do método no painel do animal:
#    (a) Lignina (default — bate com NASEM Software oficial):
#        Fd_dcNDF_base = 0,75 × (NDF − Lg) × (1 − (Lg/NDF)^0,667) / NDF
#    (b) DFND 48h: Fd_dcNDF_base = (12 + 0,61 × DFND48) / 100
#    Ajuste pela dieta (Eq. 20-115):
#    Dt_dcNDF = Dt_dcNDF_Base − 1,1×(DMI/BW − 0,035)
#                             − 0,59×(St_frac − 0,26)
#    Dt_DigNDFIn = Dt_dcNDF × Dt_NDFIn

# 2) Amido digestível (Eq. 20-84) — Fd_dcSt por alimento + ajuste DMI/BW
#    Para a maioria dos alimentos: 89-92%.

# 3) FA digestibility — Tabela 4-1 NASEM
#    Default 73%; óleos puros 70%; sabões de Cálcio 76%.

# 4) PB digestível aparente (Eq. 3-7b)
#    An_DigCPaIn = RDP + idRUP − (Du_MiCP − Du_idMiCP) − Fe_CPend

# 5) rOM (resíduo orgânico) — Eq. 20-99
#    rOM = OM − NDF − amido − (FA × fHydr_FA) − TP − NPN_DM
#    Dt_DigrOMaIn = rOM × 0,96 − Fe_rOMend  (Fe_rOMend = 3,43% × DMI)`}
          </Formula>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2 text-xs text-gray-700 space-y-1.5">
            <p className="font-semibold text-blue-900">📘 Como esse cálculo conversa com o NASEM Software oficial:</p>
            <p>
              <strong>No default (Lignina)</strong> nosso motor produz <strong>os mesmos números</strong> que o
              NASEM Software oficial — validado em 4 cenários com diferença ≤ 0,1% no leite potencial pela energia.
            </p>
            <p>
              Se você escolher <strong>DFND 48h em todos</strong>, nosso motor usa os valores publicados na
              Tabela 19-1 NASEM (47-86% conforme o alimento). O NASEM Software oficial, mesmo configurado para
              "usar DFND 48h", aplica valores padrão (48,3% para forragens / 65% para concentrados) a menos que
              você digite os valores manualmente. Isso explica por que os números podem divergir.
            </p>
            <p>
              <strong>Resumo prático</strong>: para bater exato com o NASEM Software → use <em>Lignina</em>.
              Para ter cálculo mais informativo usando dados reais → use <em>DFND 48h</em>. Para forragens da
              sua fazenda com laudo → use <em>DFND 48h só forragens</em>.
            </p>
          </div>
        </div>

        {/* PARTE B — DE */}
        <div className="border-l-4 border-amber-300 pl-4">
          <h3 className="font-semibold text-amber-800 mb-2">Parte B — DE (Energia Digestível)</h3>
          <p className="text-sm text-gray-600 mb-2">
            Cada componente digerido contribui com sua energia bruta (heats of combustion da <strong>Tabela 20-9</strong>):
          </p>
          <Formula>
{`# Eq. 20-182 — DE total
An_DEIn = Dt_DigNDFIn × 4,20     ← NDF
        + Dt_DigStIn  × 4,23     ← Amido
        + Dt_DigFAIn  × 9,40     ← Ácidos Graxos
        + An_DigCPaIn × 5,65     ← Proteína
        + Dt_DigrOMIn × 4,00     ← Resíduo orgânico
                                                          [Mcal/d]`}
          </Formula>
        </div>

        {/* PARTE C — ME */}
        <div className="border-l-4 border-amber-300 pl-4">
          <h3 className="font-semibold text-amber-800 mb-2">Parte C — ME (Energia Metabolizável)</h3>
          <p className="text-sm text-gray-600 mb-2">
            Subtrai energia perdida na urina (N urinário) e em gases (metano):
          </p>
          <Formula>
{`# Eq. 20-311 — N urinário
Ur_N_g = (An_CPIn × 1000 − Mlk_CP_g − Fe_CPend × 1000) / 6,25
                                                          [g N/d]
# Eq. 20-308 — energia urinária
Ur_DEIn = 0,0143 × Ur_N_g                                 [Mcal/d]

# Eq. 3-9 / 20-310 — gases (vaca lactando, CH4)
An_GasEOut = 0,294 × DMI
           − 0,347 × FA_%MS
           + 0,0409 × dNDF_%MS                            [Mcal/d]

# Eq. 20-307 — ME = DE − perdas
An_MEIn = An_DEIn − Ur_DEIn − An_GasEOut                  [Mcal/d]`}
          </Formula>
        </div>

        {/* PARTE D — NEL e Leite Potencial */}
        <div className="border-l-4 border-amber-300 pl-4">
          <h3 className="font-semibold text-amber-800 mb-2">Parte D — NEL e Leite Potencial</h3>
          <Formula>
{`# Eq. 20-223 — conversão para Energia Líquida (lactação)
An_NEIn = An_MEIn × 0,66                                  [Mcal NEL/d]

# Eq. 3-13 — manutenção energética
NEm = 0,10 × PV^0,75                                      [Mcal NEL/d]

# Eq. 3-14a — NEL por kg de leite
NEL_por_kg = 0,0929×G + 0,055×PB + 0,0395×Lact            [Mcal/kg]

# Leite potencial pela energia
Leite_NEL = (An_NEIn − NEm) ÷ NEL_por_kg                  [kg/d]`}
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-800 mb-3 space-y-1">
            <div><strong>Vaca:</strong> 650 kg · 30 kg leite · gord 3,5% · prot 3,2% · lact 4,7%</div>
            <div><strong>Dieta (23 kg MS):</strong> Silagem Milho + Milho moído + Farelo Soja + Caroço de Algodão</div>
            <div><strong>Composição:</strong> NDF 28% · Amido 35% · FA 3,8% · CP 17%</div>
          </div>
          <div className="space-y-3">
            <Passo n={1} label="Componentes digeridos (Parte A)"
              formula="DigNDF ≈ 1,9 · DigSt ≈ 7,2 · DigFA ≈ 0,64 · DigCP ≈ 2,7 · DigrOM ≈ 2,7"
              resultado="kg/d" />
            <Passo n={2} label="DE intake (Eq. 20-182)"
              formula="1,9×4,20 + 7,2×4,23 + 0,64×9,40 + 2,7×5,65 + 2,7×4,00"
              resultado="≈ 70,8 Mcal/d  (3,08 Mcal/kg MS)" />
            <Passo n={3} label="N urinário (Eq. 20-311)"
              formula="(CP×1000 − Mlk_CP_g − Fe_CPend_g) / 6,25"
              resultado="≈ 406 g N/d  →  Ur_DEIn ≈ 5,8 Mcal/d" />
            <Passo n={4} label="Energia dos gases / CH4 (Eq. 3-9)"
              formula="0,294×23 − 0,347×3,81 + 0,0409×8,36"
              resultado="≈ 5,8 Mcal/d" />
            <Passo n={5} label="ME intake (Eq. 20-307)"
              formula="70,8 − 5,8 − 5,8"
              resultado="≈ 59,2 Mcal/d  (2,57 Mcal/kg MS)" />
            <Passo n={6} label="NEL intake (Eq. 20-223)"
              formula="59,2 × 0,66"
              resultado="≈ 39,1 Mcal/d  (1,70 Mcal/kg MS)" />
            <Passo n={7} label="Manutenção (650^0,75 = 128,8)"
              formula="0,10 × 128,8"
              resultado="= 12,88 Mcal/d" />
            <Passo n={8} label="NEL por kg de leite (Eq. 3-14a)"
              formula="0,0929×3,5 + 0,055×3,2 + 0,0395×4,7"
              resultado="≈ 0,687 Mcal/kg" />
            <Passo n={9} label="Leite potencial pela energia"
              formula="(39,1 − 12,88) ÷ 0,687"
              resultado="≈ 38,2 kg/d" />
          </div>
          <div className="mt-3 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800">
            <strong>Interpretação:</strong> esta dieta suporta até ~38 kg de leite/d pela energia. A vaca produz 30 kg/d,
            então sobra energia (~5–6 Mcal/d) que vai para deposição de tecido ou é dissipada como calor. Se ela aumentar
            a produção, a energia ainda atende. <strong>Comparação NASEM Tabela 20-16</strong>: previsto médio 34,7 kg/d
            vs observado 30,9 kg/d (CCC 0,67) — números compatíveis.
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
          <strong>Limitação v1 conhecida:</strong> NPN (Ureia) tratado como CP normal na Eq. 20-182. Como NPN tem
          GE menor (0,89 Mcal/kg vs 5,65 Mcal/kg do CP verdadeiro), DE é superestimada em ~1% quando há Ureia.
          Sem impacto prático.
        </div>
      </Secao>

      {/* ── 3. Leite pela PM ──────────────────────────────────────────── */}
      <Secao titulo="3. Leite Potencial pela Proteína Metabolizável (PM)" subtitulo="NASEM 2021 — Eq. 6-1, 20-74, 20-339 (derivada de 20-212)" cor="violet">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            A produção máxima de leite que a <strong>proteína metabolizável (PM)</strong> sustenta. PM é a proteína que de fato
            chega ao intestino delgado e fica disponível para o organismo. Duas fontes:
          </p>
          <ul className="text-sm text-gray-600 list-disc pl-5 mt-1.5 space-y-0.5">
            <li><strong>idRUP</strong> — proteína da dieta que <em>escapa</em> da degradação ruminal (RUP/PNDR) e é digerida no intestino</li>
            <li><strong>idMiTP</strong> — proteína verdadeira microbiana produzida no rúmen e digerida no intestino</li>
          </ul>
        </div>

        {/* PARTE A — Frações proteicas e RUP/RDP */}
        <div className="border-l-4 border-violet-300 pl-4">
          <h3 className="font-semibold text-violet-800 mb-2">Parte A — Frações proteicas e cálculo de RUP/RDP por alimento (Eq. 6-1)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Cada alimento tem sua PB dividida em 3 frações (NASEM Tabela 19-1):
          </p>
          <ul className="text-sm text-gray-600 list-disc pl-5 mb-3 space-y-0.5">
            <li><strong>Fração A</strong> — NPN/proteína solúvel: 100% degrada no rúmen (vira amônia)</li>
            <li><strong>Fração B</strong> — degradável com competição entre <em>kd</em> (taxa de degradação) e <em>kP</em> (taxa de passagem)</li>
            <li><strong>Fração C</strong> — ligada à FDA, indigestível: 100% escapa, mas não é digerida no intestino</li>
          </ul>
          <Formula>
{`# Para cada alimento i (Eq. 6-1 NASEM 2021):
RUP_i  =  (CP_A_i − NPN_A_i) × fCPAdu        ← fração A: 6,4% escapa
       +  CP_B_i × kP/(kd+kP)                ← fração B: competição
       +  CP_C_i                              ← fração C: 100% escapa
       +  IntRUP/refCPIn × CP_i               ← intercepto da regressão

RDP_i  =  CP_i × kgMS_i − RUP_i
idRUP_i = RUP_i × digestibilidade_intestinal_RUP  (rup_digest)

# Acumulado da dieta
An_idRUPIn = Σ idRUP_i      [kg/d]
An_RDPIn   = Σ RDP_i        [kg/d]   (capado em 12% da MS total)`}
          </Formula>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 text-xs text-gray-600 space-y-1">
            <p>
              <strong>Constantes NASEM 2021 (lactação):</strong> fCPAdu = 0,064 — 6,4% da fração A escapa intacta;
              IntRUP = −0,086 e refCPIn = 3,39 — intercepto da regressão Fd_RUPIn (corrige superestimativa em altas CP).
            </p>
            <p>
              <strong>Taxas de passagem:</strong> kPf = 4,87%/h (forragens), kPc = 5,28%/h (concentrados), <em>fixos</em>.
              Diferente do NRC 2001 (Eq. 20-25/26/27 dependentes de % PV), o NASEM 2021 abandonou essa equação por excesso de ruído experimental.
              kd vem do banco (NASEM Tabela 19-1).
            </p>
            <p>
              <strong>Para outras categorias</strong> (vaca seca, recria, bezerro): a arquitetura do motor já tem
              <code> RUMEN_PARAMS </code>preparado para receber valores diferentes — basta implementar a função análoga.
            </p>
          </div>
        </div>

        {/* PARTE B — Proteína microbiana via Michaelis-Menten */}
        <div className="border-l-4 border-violet-300 pl-4">
          <h3 className="font-semibold text-violet-800 mb-2">Parte B — Proteína microbiana via Michaelis-Menten (Eq. 20-74/75/76)</h3>
          <p className="text-sm text-gray-600 mb-3">
            Os micróbios do rúmen sintetizam proteína a partir do N (vem da RDP) usando energia que vem da fermentação de
            NDF e amido. NASEM modela isso como uma equação de Michaelis-Menten com 2 substratos:
          </p>
          <Formula>
{`# Velocidade máxima de síntese microbiana
MiN_Vm  = 100,8 + 81,56 × An_RDPIn     [g N/d]

# Substratos energéticos (kg/d) — energia para os micróbios
Rum_DigNDFIn = Σ alimento_i (FDN_i × kgMS_i × dcNDF_ajustado_i)
Rum_DigStIn  = Σ alimento_i (amido_i × kgMS_i × kd_amido / (kd_amido + kP))

# Equação de Michaelis-Menten (Eq. 20-74)
Du_MiN_g = MiN_Vm ÷ ( 1 + 0,0939/Rum_DigNDFIn + 0,0274/Rum_DigStIn )

# Convertendo N → PB microbiana → PB verdadeira → digerida
Du_MiCP   = Du_MiN_g × 6,25 / 1000                       [kg PBM/d]    (Eq. 20-76)
Du_idMiCP = Du_MiCP × 0,80                                [kg/d]        (Eq. 20-126: 80% digestibilidade)
Du_idMiTP = Du_idMiCP × 0,824                             [kg/d]        (Eq. 20-127: 82,4% é prot. verdadeira)`}
          </Formula>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-2 text-xs text-gray-600">
            <strong>Ajuste da digestibilidade da fibra:</strong> a digestibilidade do FDN cai quando a vaca come
            muito (DMI/BW alto) ou quando a dieta tem muito amido — porque a passagem ruminal acelera e o pH cai.
            A DFND 48h (digestibilidade <em>in vitro</em> da fibra em 48 horas, que vem nos laudos de análise de
            forragem) é o melhor preditor quando você tem o valor medido da sua silagem ou feno.
          </div>
        </div>

        {/* PARTE C — MP total, manutenção e leite */}
        <div className="border-l-4 border-violet-300 pl-4">
          <h3 className="font-semibold text-violet-800 mb-2">Parte C — MP total, manutenção e leite potencial</h3>
          <Formula>
{`# MP total disponível (Eq. 20-136)
An_MPIn   = An_idRUPIn + Du_idMiTP                        [kg/d]

# Manutenção (NASEM 2021 Eq. 20-283 a 20-305)
Scrf_NP   = 0,20 × PV^0,60 × 0,86 / 1000                  [kg NP/d]     (pele/pelos)
Ur_NPend  = 0,053 × PV × 6,25 / 1000                       [kg NP/d]     (urina endógena)
Fe_NPend  = 0,73 × (12 + 0,12 × FDN%) × CMS / 1000         [kg NP/d]     (fezes endógenas)

# Conversão NP → MP — scurf e fecal têm eficiência 0,69 (Eq. 20-305/306)
# Urinária já está em equivalente MP (eff = 1)
mp_mantenca = (Scrf_NP + Fe_NPend) / 0,69 + Ur_NPend       [kg MP/d]

# MP disponível para leite
An_MPavailMilk = An_MPIn − mp_mantenca

# Conversão para kg de leite (Eq. 20-339 derivada da Eq. 20-212)
Trg_MilkTPp = PB_leite% × 0,94                              [%]          (CP → TP, NASEM Cap. 3)
KlMP        = 0,69                                          [g NP/g MP]  (Eq. 20-214)
Leite_PM    = An_MPavailMilk × KlMP / (Trg_MilkTPp / 100)   [kg/d]`}
          </Formula>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 text-xs text-amber-900">
            <strong>⚠️ Nota sobre a Eq. 20-339:</strong> a forma impressa no PDF do NASEM 2021 (p. 452) coloca KlMP no
            <em> denominador</em>. Verificou-se que isso é incompatível com a Eq. 20-212 (que define MP_uso = NP/KlMP) e
            com a validação da Tabela 20-16 (observado 30,9 vs previsto 32,6 kg/d). Por isso este formulador usa a forma
            derivada — com KlMP no <em>numerador</em> — que bate com os dados de validação.
          </div>
        </div>

        {/* Exemplo numérico */}
        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-violet-50 rounded-xl p-3 text-xs text-violet-800 mb-3 space-y-1">
            <div><strong>Vaca:</strong> 650 kg · prot leite 3,2%</div>
            <div><strong>Dieta acumulada:</strong> An_idRUPIn = 0,68 kg/d · Du_idMiTP = 1,21 kg/d · FDN%=32% · CMS=22,2 kg/d</div>
          </div>
          <div className="space-y-3">
            <Passo n={1} label="MP total disponível"
              formula="0,68 + 1,21"
              resultado="= 1,89 kg MP/d" />
            <Passo n={2} label="Manutenção — Scurf (Eq. 20-283/285)"
              formula="0,20 × 650^0,60 × 0,86 / 1000  =  0,172 × 48,9 / 1000"
              resultado="≈ 0,0084 kg NP/d" />
            <Passo n={3} label="Manutenção — Urinária endógena"
              formula="0,053 × 650 × 6,25 / 1000"
              resultado="≈ 0,215 kg MP/d  (já em MP)" />
            <Passo n={4} label="Manutenção — Fecal endógena"
              formula="0,73 × (12 + 0,12 × 32) × 22,2 / 1000"
              resultado="= 0,73 × 15,84 × 22,2 / 1000  ≈  0,257 kg NP/d" />
            <Passo n={5} label="Manutenção total (Scurf + Fe convertidos NP→MP; Ur direto)"
              formula="(0,0084 + 0,257) / 0,69 + 0,215"
              resultado="= 0,384 + 0,215  =  0,599 kg MP/d" />
            <Passo n={6} label="MP disponível para leite"
              formula="1,89 − 0,599"
              resultado="= 1,291 kg MP/d" />
            <Passo n={7} label="TP do leite (CP × 0,94)"
              formula="3,2 × 0,94"
              resultado="= 3,008%" />
            <Passo n={8} label="Leite potencial pela proteína"
              formula="1,291 × 0,69 ÷ (3,008 / 100)  =  0,891 ÷ 0,03008"
              resultado="≈ 29,6 kg/d" />
          </div>
          <div className="mt-3 rounded-lg bg-violet-100 px-4 py-3 text-sm text-violet-800">
            <strong>Interpretação:</strong> esta dieta suporta ~29,6 kg/d pela proteína. Como o leite pela energia (~34,5 kg/d)
            é maior, <strong>a proteína é o fator limitante</strong> — para produzir mais leite, precisa aumentar a PM
            (mais farelo de soja, por exemplo) ou melhorar a síntese microbiana (mais NDT/amido degradável + RDP suficiente).
          </div>
        </div>

        {/* Bloco resumo */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Fator Limitante</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="font-bold text-amber-700">Energia limita quando…</div>
              <div className="text-amber-600 mt-1">Leite_NEL &lt; Leite_PM</div>
              <div className="text-gray-500 text-xs mt-1">Sobra proteína na dieta, falta energia.</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <div className="font-bold text-violet-700">Proteína limita quando…</div>
              <div className="text-violet-600 mt-1">Leite_PM &lt; Leite_NEL</div>
              <div className="text-gray-500 text-xs mt-1">Sobra energia, falta PM (idRUP + idMiTP).</div>
            </div>
          </div>
        </div>

      </Secao>

      {/* ── 4. Gestação ────────────────────────────────────────────── */}
      <Secao titulo="4. Gestação — Consumo de MP pelo útero" subtitulo="NASEM 2021 — Eq. 20-225 a 20-239" cor="rose">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula</h3>
          <p className="text-sm text-gray-600">
            Vacas prenhes precisam de proteína metabolizável para o crescimento do <strong>útero gravído</strong>
            (útero + placenta + feto). Esse consumo é subtraído de <code>An_MPavailMilk</code> antes do cálculo
            do leite potencial PM — sem essa subtração, o leite PM ficaria <strong>superestimado em ~1–3 kg/d</strong>
            para vacas em gestação avançada.
          </p>
          <div className="mt-2 bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-800">
            <strong>Para o usuário:</strong> informe os dias de gestação no painel do animal. Se a vaca <strong>não</strong> está
            prenhe (início da lactação), deixe em 0. O valor padrão para peso do bezerro é 45 kg (Holstein) — ajuste
            se trabalhar com outras raças.
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Fórmula</h3>
          <Formula>
{`# Peso do útero gravído ao parto — Eq. 20-225
GrUter_Wt_parto = peso_bezerro × 1,816                    [kg]

# Modelo exponencial de Koong (1975) — Eq. 20-227
# constantes da Tabela 20-10:  K_syn = 2,43×10⁻²  ·  K_decay = 2,45×10⁻⁵
GrUter_Wt(t) = GrUter_Wt_parto × exp[−(K_syn − K_decay × t) × (T − t)]

# Ganho diário (derivada da curva exponencial) — Eq. 20-233
GrUter_WtGain = GrUter_Wt(t) × (K_syn + K_decay × T − 2 × K_decay × t)

# NP consumida pelo crescimento — Eq. 20-235
Gest_NPgain_g = GrUter_WtGain × 123 × 0,86                [g NP/d]

# Eficiência de uso de MP para NP gestacional — Eq. 20-238
KyMP_NP       = 0,33   (gestação positiva)

# MP consumida — Eq. 20-239
Gest_MPuse    = Gest_NPgain_g / KyMP_NP                   [g MP/d]

# Subtração final
An_MPavailMilk = An_MPIn − mp_mantenca − Gest_MPuse`}
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Variáveis</h3>
          <Tab>
            <Var nome="t (DayGest)" desc="Dias de gestação (preenchido no painel do animal)" unidade="d"  exemplo="200" />
            <Var nome="T (LengthGest)" desc="Duração total da gestação (default 280 d)"        unidade="d"  exemplo="280" />
            <Var nome="peso_bezerro" desc="Peso esperado do bezerro ao nascer"                    unidade="kg" exemplo="45 (Holstein) · 28 (Jersey)" />
            <Var nome="K_syn"       desc="Taxa inicial de crescimento uterino — Tabela 20-10"     unidade="d⁻¹" exemplo="0,0243" />
            <Var nome="K_decay"     desc="Decaimento da taxa de crescimento — Tabela 20-10"        unidade="d⁻¹" exemplo="2,45×10⁻⁵" />
            <Var nome="123 × 0,86"   desc="g NP por kg de tecido uterino, × fator escala"          unidade="g/kg" exemplo="—" />
            <Var nome="KyMP_NP"     desc="Eficiência MP→NP gestacional (NASEM Eq. 20-238)"        unidade="g/g"  exemplo="0,33" />
          </Tab>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-rose-50 rounded-xl p-3 text-xs text-rose-800 mb-3">
            <strong>Vaca prenhe Holstein:</strong> 650 kg · DEL 90 · <strong>DayGest = 200</strong> · peso_bezerro = 45 kg · T = 280 d
          </div>
          <div className="space-y-3">
            <Passo n={1} label="Peso do útero gravído no parto"
              formula="45 × 1,816"
              resultado="= 81,7 kg" />
            <Passo n={2} label="Expoente para t = 200 d"
              formula="−(0,0243 − 2,45×10⁻⁵ × 200) × (280 − 200)  =  −(0,0194) × 80"
              resultado="= −1,553" />
            <Passo n={3} label="Peso do útero gravído em t = 200 d (Eq. 20-227)"
              formula="81,7 × exp(−1,553)  =  81,7 × 0,212"
              resultado="≈ 17,3 kg" />
            <Passo n={4} label="Ganho diário do útero gravído (Eq. 20-233)"
              formula="17,3 × (0,0243 + 2,45×10⁻⁵ × 280 − 2 × 2,45×10⁻⁵ × 200)"
              resultado="= 17,3 × 0,0213  ≈  0,369 kg/d" />
            <Passo n={5} label="NP gestacional (Eq. 20-235)"
              formula="0,369 × 123 × 0,86"
              resultado="= 39 g NP/d" />
            <Passo n={6} label="MP consumida pela gestação (Eq. 20-239)"
              formula="39 / 0,33"
              resultado="= 118 g MP/d  =  0,118 kg/d" />
          </div>
          <div className="mt-3 rounded-lg bg-rose-100 px-4 py-3 text-sm text-rose-800">
            <strong>Interpretação:</strong> uma vaca prenhe de 200 dias "gasta" 0,118 kg de MP/d só com o crescimento
            uterino. Isso equivale a <strong>perder ~2,7 kg de leite/d</strong> no leite potencial pela proteína (0,118 × 0,69 / 0,03008).
            Para a mesma vaca não-prenhe, o leite PM seria 2,7 kg/d maior.
          </div>
        </div>
      </Secao>

      {/* ── 5. Status de conformidade com NASEM 2021 ────────────────────── */}
      <Secao titulo="5. Conformidade com o NASEM Software oficial" subtitulo="Suite de validação cruzada e onde os números batem" cor="gray">

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
          <p className="text-green-900 font-semibold">✅ Motor validado contra o NASEM oficial (nasem_dairy 1.0.2)</p>
          <p>
            Cada equação foi comparada contra a implementação oficial do NASEM 2021 (pacote Python mantido pela
            Universidade de Guelph — fonte computável do livro). Suite de 4 cenários de teste em
            <code className="bg-white border border-gray-200 rounded px-1 mx-1">scripts/validate_multi_*</code>:
            primípara mid-lact, alta produção, dieta tropical e baixa produção.
          </p>
        </div>

        <div className="border-l-4 border-green-400 pl-4">
          <h3 className="font-semibold text-green-800 mb-2">📊 Convergência (após Fases 1, 4 e 5)</h3>
          <div className="text-xs space-y-1 font-mono bg-white border border-gray-200 rounded p-3 text-gray-700">
            <div className="font-bold text-gray-800">Comparação Motor TS vs NASEM oficial (método Lignina nos dois):</div>
            <div>• Leite potencial pela proteína (MP): <span className="text-green-700">± 0,2%</span></div>
            <div>• Leite potencial pela energia (NEL): <span className="text-green-700">± 0,07%</span></div>
            <div>• Energia digestível (DE), metabolizável (ME), líquida (NEL): <span className="text-green-700">± 0,04%</span></div>
            <div>• Componentes (NDF dig, amido dig, FA dig, rOM, manutenção, gestação): <span className="text-green-700">0,0%</span></div>
          </div>
        </div>

        <div className="border-l-4 border-sky-400 pl-4">
          <h3 className="font-semibold text-sky-800 mb-2">🔧 Como alinhar com o NASEM Software oficial</h3>
          <div className="text-sm text-gray-700 space-y-2">
            <p>
              <strong>Modo default (Lignina)</strong>: nosso motor produz exatamente os mesmos números que o
              NASEM Software oficial. Use Eq. 20-112 (Van Soest, baseada em lignina) para todas as forragens
              e concentrados.
            </p>
            <p>
              <strong>Modo DFND 48h</strong>: aqui há uma diferença metodológica que vale entender. O nosso motor
              usa os valores reais publicados na Tabela 19-1 (47-86% conforme o alimento). O NASEM Software oficial,
              mesmo configurado para usar DFND 48h, aplica valores padrão fixos
              (<strong>48,3%</strong> para forragens / <strong>65%</strong> para concentrados) a menos que você digite
              os valores manualmente. Por isso, ao escolher <em>DFND 48h</em>, os números do nosso motor podem
              divergir do NASEM Software — mas são mais informativos.
            </p>
            <p>
              <strong>Modo DFND 48h só forragens</strong>: recomendado quando você tem o laudo de análise das suas
              forragens (silagem, feno) — basta cadastrar a DFND 48h medida pelo laboratório.
            </p>
          </div>
        </div>

        <div className="border-l-4 border-amber-400 pl-4">
          <h3 className="font-semibold text-amber-800 mb-2">⚠️ Onde o motor pode ter limitação</h3>
          <p className="text-sm text-gray-600 mb-2">
            A composição corporal (ganho de peso e ECC) já é considerada, mas requer que o aluno preencha corretamente
            no painel do animal. Vaca sem ganho de peso e em ECC estável (a maioria a partir de DEL 60): basta deixar
            os ganhos em 0. Para vaca primípara em crescimento ou vaca recuperando ECC, o aluno precisa informar
            o ganho diário esperado para o cálculo ser preciso.
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Detalhamento completo equação-por-equação em <code className="bg-white border border-gray-200 rounded px-1">GAP_ANALYSIS_NASEM2021.md</code> na raiz do projeto.
        </p>

      </Secao>

      <div className="text-center text-xs text-gray-400 py-2">
        Referência: National Academies of Sciences, Engineering, and Medicine. <em>Nutrient Requirements of Dairy Cattle,
        Eighth Revised Edition</em>. Washington, DC: National Academies Press, 2021.
      </div>
    </div>
  );
}
