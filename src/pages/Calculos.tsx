import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface SecaoProps {
  titulo: string;
  subtitulo: string;
  cor: 'blue' | 'amber' | 'violet';
  children: React.ReactNode;
}

const CORES = {
  blue:   { header: 'bg-blue-600',   badge: 'bg-blue-100 text-blue-700',   border: 'border-blue-200', ring: 'ring-blue-300',   text: 'text-blue-700',   light: 'bg-blue-50'   },
  amber:  { header: 'bg-amber-600',  badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200',ring: 'ring-amber-300',  text: 'text-amber-700', light: 'bg-amber-50'  },
  violet: { header: 'bg-violet-600', badge: 'bg-violet-100 text-violet-700',border: 'border-violet-200',ring: 'ring-violet-300',text: 'text-violet-700',light: 'bg-violet-50' },
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
    <div className="bg-gray-900 text-gray-100 rounded-xl px-5 py-4 font-mono text-sm leading-relaxed overflow-x-auto">
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

function Passo({ n, label, formula, resultado }: { n: number; label: string; formula: string; resultado: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">{n}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        <div className="mt-1 font-mono text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">{formula}</div>
        <div className="mt-1 text-sm font-bold text-gray-900">{resultado}</div>
      </div>
    </div>
  );
}

export default function Calculos() {
  return (
    <div className="max-w-[860px] mx-auto px-4 py-8 space-y-6">

      <div className="mb-2">
        <h1 className="text-2xl font-bold text-gray-800">🔬 Cálculos do Formulador</h1>
        <p className="text-gray-500 text-sm mt-1">
          Explicação detalhada das equações do <strong>NRC 2021</strong> utilizadas no formulador.
          Todas as fórmulas seguem o modelo para vacas em lactação.
        </p>
      </div>

      {/* ── 1. CMS ─────────────────────────────────────────────────────── */}
      <Secao titulo="1. Consumo de Matéria Seca Exigido (CMS)" subtitulo="NRC 2021 — Equação 20-21 (Dt_DMIn_Lact1)" cor="blue">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula?</h3>
          <p className="text-sm text-gray-600">
            Prevê a quantidade máxima de matéria seca que uma vaca em lactação consegue consumir por dia.
            Depende do potencial produtivo (leite, composição), do tamanho do animal, do estado corporal e
            do momento da lactação. É a <strong>capacidade de ingestão esperada</strong> — o valor que
            usamos como referência para ver se a dieta está adequada em volume.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Fórmula</h3>
          <Formula>
            <span className="text-yellow-300">CMS</span>{" "}={" "}
            <span className="text-green-300">Fator Base</span>{" "}×{" "}
            <span className="text-cyan-300">Fator Temporal</span>
            {"\n\n"}
            <span className="text-green-300">Fator Base</span>{" "}={" "}
            3,7 + (P × 5,7) + (0,305 × <span className="text-pink-300">NEL_leite</span> × L){"\n"}
            {"          "}+ (0,022 × PV) + (−0,689 − 1,87 × P) × ECC
            {"\n\n"}
            <span className="text-pink-300">NEL_leite</span>{" "}={" "}
            0,0929 × G + 0,055 × PB + 0,0395 × Lact{"  "}[Mcal/kg]
            {"\n\n"}
            <span className="text-cyan-300">Fator Temporal</span>{" "}={" "}
            1 − (0,212 + P × 0,136) × e^(−0,053 × DEL)
            {"\n\n"}
            <span className="text-gray-400">{"# Limite biológico: CMS ≤ 5% do PV"}</span>
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Variáveis</h3>
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
              <tbody>
                <Var nome="P"         desc="Paridade (0 = primípara, 1 = multípara)"        unidade="adim."     exemplo="1" />
                <Var nome="L"         desc="Produção de leite"                               unidade="kg/d"      exemplo="41" />
                <Var nome="G"         desc="Teor de gordura do leite"                        unidade="%"         exemplo="3,7" />
                <Var nome="PB"        desc="Teor de proteína bruta do leite"                 unidade="%"         exemplo="3,2" />
                <Var nome="Lact"      desc="Teor de lactose do leite"                        unidade="%"         exemplo="4,6" />
                <Var nome="PV"        desc="Peso vivo"                                       unidade="kg"        exemplo="680" />
                <Var nome="ECC"       desc="Escore de condição corporal (1 a 5)"             unidade="pts"       exemplo="3,0" />
                <Var nome="DEL"       desc="Dias em lactação"                                unidade="d"         exemplo="140" />
                <Var nome="NEL_leite" desc="Energia líquida necessária por kg de leite"      unidade="Mcal/kg"   exemplo="≈ 0,70" />
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-800 mb-4">
            <strong>Animal de referência:</strong> PV=680 kg · Leite=41 kg/d · G=3,7% · PB=3,2% · Lact=4,6% · ECC=3,0 · DEL=140 d · P=1 (multípara)
          </div>
          <div className="space-y-3">
            <Passo n={1} label="Calcular NEL por kg de leite"
              formula="0,0929 × 3,7  +  0,055 × 3,2  +  0,0395 × 4,6"
              resultado="= 0,344 + 0,176 + 0,182  =  0,701 Mcal/kg leite" />
            <Passo n={2} label="Calcular o Fator Base"
              formula="3,7 + (1×5,7) + (0,305×0,701×41) + (0,022×680) + (−0,689−1,87)×3"
              resultado="= 3,7 + 5,7 + 8,77 + 14,96 − 7,68  =  25,45 kg" />
            <Passo n={3} label="Calcular o Fator Temporal (efeito da curva de lactação)"
              formula="1 − (0,212 + 1×0,136) × e^(−0,053 × 140)"
              resultado="= 1 − 0,348 × e^(−7,42)  =  1 − 0,348 × 0,0006  ≈  1,000" />
            <Passo n={4} label="CMS final"
              formula="25,45 × 1,000"
              resultado="≈ 25,5 kg MS/d  (limite 5% PV = 34,0 kg → não ativa)" />
          </div>
          <div className="mt-3 rounded-lg bg-blue-100 px-4 py-2 text-sm text-blue-800">
            <strong>Interpretação:</strong> A vaca tem capacidade de consumir ~25,5 kg MS/d com esses parâmetros.
            O Fator Temporal se aproxima de 1,0 pois DEL=140 d (vaca em pico/planalto de lactação).
            Para vacas no início da lactação (ex. DEL=7 d), o fator temporal reduz o CMS previsto em ~20%.
          </div>
        </div>
      </Secao>

      {/* ── 2. Leite pela Energia ─────────────────────────────────────── */}
      <Secao titulo="2. Leite Potencial pela Energia (NEL)" subtitulo="NRC 2021 — Equações 3-14 e manutenção energética" cor="amber">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula?</h3>
          <p className="text-sm text-gray-600">
            Estima o quanto de leite a vaca poderia produzir com base na <strong>energia líquida de lactação (NEL)</strong>
            disponível na dieta. O raciocínio é simples: toda a energia que entrar na vaca precisa ser usada
            primeiro para manutenção (manter o organismo funcionando), e só o que sobrar pode ir para o leite.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Fórmula</h3>
          <Formula>
            <span className="text-gray-400">{"# Energia total da dieta"}</span>
            {"\n"}
            <span className="text-yellow-300">NEL_total</span>{" "}= Σ (NEL_alimento × kg_MS_alimento){"  "}[Mcal/d]
            {"\n\n"}
            <span className="text-gray-400">{"# Energia para manutenção (NRC 2021)"}</span>
            {"\n"}
            <span className="text-cyan-300">NEL_mantença</span>{" "}= 0,08 × PV^0,75{"  "}[Mcal/d]
            {"\n\n"}
            <span className="text-gray-400">{"# NEL disponível para produção de leite"}</span>
            {"\n"}
            <span className="text-green-300">NEL_leite</span>{" "}={" "}
            <span className="text-yellow-300">NEL_total</span>{" "}−{" "}
            <span className="text-cyan-300">NEL_mantença</span>
            {"\n\n"}
            <span className="text-gray-400">{"# Energia por kg de leite (Eq. 20-217, coef. PB)"}</span>
            {"\n"}
            <span className="text-pink-300">NEL_por_kg</span>{" "}= 0,0929×G + 0,055×PB + 0,0395×Lact{"  "}[Mcal/kg]
            {"\n\n"}
            <span className="text-gray-400">{"# Leite potencial"}</span>
            {"\n"}
            <span className="text-yellow-300">Leite_NEL</span>{" "}={" "}
            <span className="text-green-300">NEL_leite</span>{" "}÷{" "}
            <span className="text-pink-300">NEL_por_kg</span>{"  "}[kg/d]
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Variáveis</h3>
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
              <tbody>
                <Var nome="NEL_alimento" desc="Energia líquida de lactação do alimento (do banco de dados)" unidade="Mcal/kg MS" exemplo="varia" />
                <Var nome="PV"           desc="Peso vivo"                                                    unidade="kg"        exemplo="680" />
                <Var nome="G"            desc="Teor de gordura do leite"                                     unidade="%"         exemplo="3,7" />
                <Var nome="PB"           desc="Teor de proteína bruta do leite (usa coef. 0,055)"            unidade="%"         exemplo="3,2" />
                <Var nome="Lact"         desc="Teor de lactose do leite"                                     unidade="%"         exemplo="4,6" />
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-800 mb-4">
            <strong>Animal de referência:</strong> PV=680 kg · G=3,7% · PB=3,2% · Lact=4,6%
            <br/>
            <strong>Dieta:</strong> CMS=25,5 kg/d · NEL dieta=1,72 Mcal/kg MS (valor típico dieta de alta produção)
          </div>
          <div className="space-y-3">
            <Passo n={1} label="NEL total fornecida pela dieta"
              formula="1,72 Mcal/kg × 25,5 kg MS/d"
              resultado="= 43,9 Mcal/d" />
            <Passo n={2} label="NEL para manutenção"
              formula="0,08 × 680^0,75  =  0,08 × 172,8"
              resultado="= 13,8 Mcal/d" />
            <Passo n={3} label="NEL disponível para o leite"
              formula="43,9 − 13,8"
              resultado="= 30,1 Mcal/d" />
            <Passo n={4} label="NEL necessária por kg de leite"
              formula="0,0929×3,7 + 0,055×3,2 + 0,0395×4,6"
              resultado="= 0,344 + 0,176 + 0,182  =  0,701 Mcal/kg" />
            <Passo n={5} label="Leite potencial pela energia"
              formula="30,1 ÷ 0,701"
              resultado="≈ 42,9 kg/d" />
          </div>
          <div className="mt-3 rounded-lg bg-amber-100 px-4 py-2 text-sm text-amber-800">
            <strong>Interpretação:</strong> Com essa dieta, a energia permite produzir ~43 kg de leite/d.
            Se a vaca produz 41 kg na realidade, a dieta está adequada energeticamente (há leve sobra).
            Se o potencial fosse menor que a produção real, a vaca estaria usando reservas corporais.
          </div>
        </div>
      </Secao>

      {/* ── 3. Leite pela PM ──────────────────────────────────────────── */}
      <Secao titulo="3. Leite Potencial pela Proteína Metabolizável (PM)" subtitulo="NRC 2021 — Equações 20-127, 20-135, 20-214, 20-283 a 20-300" cor="violet">

        <div>
          <h3 className="font-semibold text-gray-800 mb-1">O que calcula?</h3>
          <p className="text-sm text-gray-600">
            Estima o quanto de leite a vaca poderia produzir com base na <strong>proteína metabolizável (PM)</strong> —
            a proteína que de fato é absorvida no intestino delgado e disponível para o organismo.
            A PM vem de duas fontes: a <strong>proteína da dieta que "passa" pelo rúmen sem ser degradada</strong> (PNDR
            = proteína não degradável no rúmen) e a <strong>proteína produzida pelos microrganismos ruminais</strong>
            (PBM). Assim como na energia, a PM primeiro atende a manutenção e o restante vai para o leite.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Fórmula completa</h3>
          <Formula>
            <span className="text-gray-400">{"━━ PASSO 1: PM disponível (An_MPIn) ━━━━━━━━━━━━━━━━━━━"}</span>
            {"\n\n"}
            <span className="text-gray-400">{"# PNDR digerida no intestino (digestibilidade = 80%)"}</span>
            {"\n"}
            <span className="text-green-300">PM_RUP</span>{" "}= PNDR × 0,80{"  "}[kg/d]
            {"\n\n"}
            <span className="text-gray-400">{"# PBM: microrganismos produzidos a partir do NDT"}</span>
            {"\n"}
            Du_MiCP = NDT × 0,13{"  "}[kg/d]
            {"\n"}
            <span className="text-green-300">PM_MCP</span>{" "}= Du_MiCP × 0,80 × 0,824{"  "}[kg/d]
            {"\n"}
            <span className="text-gray-400">{"   # ↑ 80% digestível no intestino (Eq. 20-135)"}</span>
            {"\n"}
            <span className="text-gray-400">{"   # ↑ 82,4% é proteína verdadeira (Eq. 20-127)"}</span>
            {"\n\n"}
            <span className="text-yellow-300">PM_total</span>{" "}={" "}
            <span className="text-green-300">PM_RUP</span>{" "}+{" "}
            <span className="text-green-300">PM_MCP</span>
            {"\n\n"}
            <span className="text-gray-400">{"━━ PASSO 2: PM para manutenção (NP) ━━━━━━━━━━━━━━━━━"}</span>
            {"\n\n"}
            <span className="text-gray-400">{"# Esfoliação de pele (Eq. 20-283/284)"}</span>
            {"\n"}
            Esf_NP = 0,20 × PV^0,60 × 0,86 / 1000{"  "}[kg/d]
            {"\n\n"}
            <span className="text-gray-400">{"# Urina endógena (Eq. 20-294/295)"}</span>
            {"\n"}
            Uri_NP = 0,053 × PV × 6,25 / 1000{"  "}[kg/d]
            {"\n\n"}
            <span className="text-gray-400">{"# Proteína fecal metabólica (Eq. 20-300/302)"}</span>
            {"\n"}
            Fec_NP = 0,73 × (12 + 0,12 × FDN%) × CMS / 1000{"  "}[kg/d]
            {"\n\n"}
            <span className="text-cyan-300">PM_mantença</span>{" "}= Esf_NP + Uri_NP + Fec_NP
            {"\n\n"}
            <span className="text-gray-400">{"━━ PASSO 3: Leite potencial ━━━━━━━━━━━━━━━━━━━━━━━━"}</span>
            {"\n\n"}
            PM_leite ={" "}
            <span className="text-yellow-300">PM_total</span>{" "}−{" "}
            <span className="text-cyan-300">PM_mantença</span>
            {"\n\n"}
            <span className="text-gray-400">{"# KlMP = 0,69 (eficiência PM → proteína leite, Eq. 20-214)"}</span>
            {"\n"}
            NP_leite = PM_leite × 0,69{"  "}[kg/d]
            {"\n\n"}
            <span className="text-yellow-300">Leite_PM</span>{" "}= NP_leite ÷ (PB_leite% / 100){"  "}[kg/d]
          </Formula>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Variáveis</h3>
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
              <tbody>
                <Var nome="PNDR"      desc="Proteína não degradável no rúmen (kg/d na dieta)" unidade="kg/d"    exemplo="3,06" />
                <Var nome="NDT"       desc="Nutrientes digestíveis totais (kg/d na dieta)"    unidade="kg/d"    exemplo="16,6" />
                <Var nome="PV"        desc="Peso vivo"                                         unidade="kg"      exemplo="680" />
                <Var nome="FDN%"      desc="Fibra em detergente neutro da dieta total"         unidade="% MS"    exemplo="40%" />
                <Var nome="CMS"       desc="Consumo de matéria seca total da dieta"            unidade="kg/d"    exemplo="25,5" />
                <Var nome="PB_leite%" desc="Teor de proteína bruta do leite"                   unidade="%"       exemplo="3,2" />
                <Var nome="0,80"      desc="Digestibilidade intestinal da PNDR"                unidade="g/g"     exemplo="—" />
                <Var nome="0,13"      desc="Eficiência de síntese microbiana (PBM/NDT)"        unidade="kg/kg"   exemplo="—" />
                <Var nome="0,824"     desc="Fração proteína verdadeira da PBM (Eq. 20-127)"   unidade="g/g"     exemplo="—" />
                <Var nome="0,69"      desc="Eficiência PM→proteína do leite (KlMP, Eq. 20-214)" unidade="g/g"  exemplo="—" />
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-3">Exemplo passo a passo</h3>
          <div className="bg-violet-50 rounded-xl p-4 text-xs text-violet-800 mb-4">
            <strong>Animal:</strong> PV=680 kg · PB leite=3,2%
            <br/>
            <strong>Dieta:</strong> CMS=25,5 kg/d · NDT=65% MS · PNDR=12% MS · FDN=40% MS
            <br/>
            <strong>Calculando:</strong> kgPNDR = 25,5 × 0,12 = 3,06 kg/d · kgNDT = 25,5 × 0,65 = 16,6 kg/d
          </div>
          <div className="space-y-3">
            <Passo n={1}  label="PM da PNDR (proteína bypass digerida)"
              formula="3,06 × 0,80"
              resultado="= 2,448 kg PM/d" />
            <Passo n={2}  label="Proteína microbiana bruta produzida no rúmen"
              formula="16,6 × 0,13"
              resultado="= 2,158 kg PBM/d" />
            <Passo n={3}  label="PM da fração microbiana (digestível e verdadeira)"
              formula="2,158 × 0,80 × 0,824"
              resultado="= 1,423 kg PM/d" />
            <Passo n={4}  label="PM total disponível"
              formula="2,448 + 1,423"
              resultado="= 3,871 kg PM/d" />
            <Passo n={5}  label="Esfoliação de pele (manutenção)"
              formula="0,20 × 680^0,60 × 0,86 / 1000  =  0,172 × 79,8 / 1000"
              resultado="= 0,014 kg NP/d" />
            <Passo n={6}  label="Perdas urinárias endógenas (manutenção)"
              formula="0,053 × 680 × 6,25 / 1000"
              resultado="= 0,225 kg NP/d" />
            <Passo n={7}  label="Proteína fecal metabólica (manutenção)"
              formula="0,73 × (12 + 0,12 × 40) × 25,5 / 1000  =  0,73 × 16,8 × 25,5 / 1000"
              resultado="= 0,313 kg NP/d" />
            <Passo n={8}  label="Total de manutenção proteica"
              formula="0,014 + 0,225 + 0,313"
              resultado="= 0,552 kg NP/d" />
            <Passo n={9}  label="PM disponível para o leite"
              formula="3,871 − 0,552"
              resultado="= 3,319 kg PM/d" />
            <Passo n={10} label="Proteína verdadeira do leite produzida (KlMP = 0,69)"
              formula="3,319 × 0,69"
              resultado="= 2,290 kg NP leite/d" />
            <Passo n={11} label="Leite potencial pela proteína"
              formula="2,290 ÷ (3,2 / 100)"
              resultado="≈ 71,6 kg/d" />
          </div>
          <div className="mt-3 rounded-lg bg-violet-100 px-4 py-2 text-sm text-violet-800">
            <strong>Interpretação:</strong> Com essa dieta, a proteína metabolizável suportaria ~71,6 kg de leite/d.
            Como o leite potencial pela <em>energia</em> é menor (~43 kg/d), a <strong>energia é o fator limitante</strong> —
            a vaca não consegue produzir mais porque falta energia, não proteína. Quando o leite pela PM for
            o menor dos dois, dizemos que a proteína está limitando a produção.
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-2">Resumo: Fator Limitante</h3>
          <p className="text-sm text-gray-600 mb-3">
            O formulador calcula os dois leites potenciais e define como fator limitante o que tiver o menor valor:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="font-bold text-amber-700">Energia limita quando…</div>
              <div className="text-amber-600 mt-1">Leite_NEL &lt; Leite_PM</div>
              <div className="text-gray-500 text-xs mt-1">A dieta tem proteína suficiente, mas falta energia para sintetizar mais leite.</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <div className="font-bold text-violet-700">Proteína limita quando…</div>
              <div className="text-violet-600 mt-1">Leite_PM &lt; Leite_NEL</div>
              <div className="text-gray-500 text-xs mt-1">A dieta tem energia suficiente, mas falta proteína metabolizável para sintetizar mais leite.</div>
            </div>
          </div>
        </div>
      </Secao>

      <div className="text-center text-xs text-gray-400 py-2">
        Referência: NRC (2021) — Nutrient Requirements of Dairy Cattle, 8ª edição. National Academies Press.
      </div>
    </div>
  );
}
