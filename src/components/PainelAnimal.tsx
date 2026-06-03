import { useState } from 'react';
import { Info } from 'lucide-react';
import type { AnimalLactacao, Raca } from '../types';
interface Props {
  animal: AnimalLactacao;
  onChange: (animal: AnimalLactacao) => void;
}

/** Defaults por raça (NASEM 2021 Tabela 6-X e Apêndices) */
const DEFAULTS_RACA: Record<Raca, { peso_bezerro: number; peso_maduro: number }> = {
  Holstein: { peso_bezerro: 45, peso_maduro: 700 },
  Jersey:   { peso_bezerro: 28, peso_maduro: 480 },
  Outra:    { peso_bezerro: 40, peso_maduro: 600 },
};

function CampoTooltip({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <span
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
      onClick={() => setAberto(v => !v)}
      className="relative inline-flex items-center ml-1 cursor-help"
    >
      <Info size={11} className="text-gray-400 hover:text-gray-600 flex-shrink-0" />
      {aberto && (
        <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-gray-800 text-white text-[11px] rounded-lg px-3 py-2 z-[9999] leading-snug shadow-2xl whitespace-pre-line">
          {texto}
        </span>
      )}
    </span>
  );
}

function Campo({
  label, hint, dica, value, onChange, min, max, step,
}: {
  label: string;
  hint?: string;
  dica?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <label className="text-xs font-medium text-gray-500 flex items-center flex-wrap gap-x-1 leading-tight">
        <span>{label}</span>
        {hint && <span className="text-gray-400 font-normal">{hint}</span>}
        {dica && <CampoTooltip texto={dica} />}
      </label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step ?? 0.1}
        onFocus={e => e.target.select()}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
      />
    </div>
  );
}

export default function PainelAnimal({ animal, onChange }: Props) {
  const dias_gest    = animal.dias_gestacao ?? 0;
  const peso_bez     = animal.peso_bezerro_alvo ?? DEFAULTS_RACA[animal.raca ?? 'Holstein'].peso_bezerro;
  const raca         = animal.raca ?? 'Holstein';
  const peso_maduro  = animal.peso_maduro ?? DEFAULTS_RACA[raca].peso_maduro;
  const ganho_frame  = animal.ganho_frame_kg_dia ?? 0;
  const ganho_reserva = animal.ganho_reserva_kg_dia ?? 0;

  const set = <K extends keyof AnimalLactacao>(key: K) => (v: AnimalLactacao[K]) =>
    onChange({ ...animal, [key]: v });

  // Quando muda a raça, atualiza peso_bezerro_alvo E peso_maduro se ainda no default antigo
  function handleRaca(nova: Raca) {
    const oldDef = DEFAULTS_RACA[raca];
    const newDef = DEFAULTS_RACA[nova];
    onChange({
      ...animal,
      raca: nova,
      peso_bezerro_alvo: peso_bez      === oldDef.peso_bezerro ? newDef.peso_bezerro : peso_bez,
      peso_maduro:       peso_maduro   === oldDef.peso_maduro  ? newDef.peso_maduro  : peso_maduro,
    });
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
        🐄 Dados do Animal
      </h2>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <Campo label="Peso vivo"  hint="kg"   value={animal.peso}     min={200} max={900} step={5}    onChange={set('peso')}
          dica="Peso atual da vaca em kg. Impacta CMS, mantença e leite potencial." />
        <Campo label="DEL"        hint="dias" value={animal.del}      min={1}   max={365} step={1}    onChange={set('del')}
          dica="Dias em lactação (0 = parto recente). Impacta o CMS, principalmente nas primeiras semanas." />
        <Campo label="Produção"   hint="kg/d" value={animal.leite}    min={1}   max={80}  step={0.5}  onChange={set('leite')}
          dica="Produção atual de leite (kg/d). Impacta CMS e exigência de proteína." />
        <Campo label="ECC"        hint="1–5"  value={animal.ecc}      min={1}   max={5}   step={0.25} onChange={set('ecc')}
          dica="Escore Condição Corporal (1=magra, 5=obesa). Vaca em lactação normal: 3,0." />
        <Campo label="Gordura"    hint="%"    value={animal.gordura}  min={1}   max={8}   step={0.1}  onChange={set('gordura')}
          dica="% de gordura do leite. Impacta o leite potencial pela energia." />
        <Campo label="Proteína"   hint="%"    value={animal.proteina} min={1}   max={6}   step={0.1}  onChange={set('proteina')}
          dica={"Proteína VERDADEIRA do leite (%, sem NPN). Se o laudo vier em 'Proteína Bruta', " +
                "multiplique por 0,93 antes de digitar. Impacta o leite potencial pela proteína."} />
        <Campo label="Lactose"    hint="%"    value={animal.lactose}  min={1}   max={6}   step={0.1}  onChange={set('lactose')}
          dica="Lactose do leite (%). Normal: 4,6–4,8%. Impacta o leite potencial pela energia." />
        <Campo label="Preço leite" hint="R$/L" value={animal.precoLeite} min={0} max={10} step={0.05} onChange={set('precoLeite')}
          dica="Preço de venda do leite (R$/L). Usado apenas no cálculo de receita." />
      </div>

      <div className="mb-3">
        <label className="text-xs font-medium text-gray-500 block mb-1 flex items-center">
          Paridade
          <CampoTooltip texto="Primíparas = primeira lactação. Multíparas = segunda em diante. Impacta CMS e mantença." />
        </label>
        <div className="flex gap-2">
          {([0, 1] as const).map(p => (
            <button
              key={p}
              onClick={() => onChange({ ...animal, paridade: p })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                animal.paridade === p
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
              }`}
            >
              {p === 0 ? '🐮 Primíparas' : '🐄 Multíparas'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Bloco de Gestação (novo) ─────────────────────────────────────── */}
      <div className="mb-3 border border-amber-100 bg-amber-50/40 rounded-lg p-2.5">
        <div className="text-xs font-bold text-amber-800 mb-2 flex items-center">
          🤰 Gestação
          <CampoTooltip texto={
            "Vaca não prenhe: deixe 'Dias gestação' = 0. " +
            "Em prenhez, reduz o leite potencial pela proteína."
          } />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="text-xs font-medium text-gray-500 block mb-1 flex items-center">
              Raça
              <CampoTooltip texto="Define os defaults de peso do bezerro e peso maduro. Holstein é o padrão." />
            </label>
            <select
              value={raca}
              onChange={e => handleRaca(e.target.value as Raca)}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="Holstein">Holstein</option>
              <option value="Jersey">Jersey</option>
              <option value="Outra">Outra (Gir, Girolando, etc.)</option>
            </select>
          </div>
          <Campo label="Dias gestação" hint="d" value={dias_gest} min={0} max={300} step={1}
            onChange={v => onChange({ ...animal, dias_gestacao: Math.max(0, v) })}
            dica={"Dias desde a concepção (0 = não prenhe). Após 150 dias, reduz o leite potencial pela proteína."} />
          <Campo label="Peso bezerro" hint="kg" value={peso_bez} min={15} max={70} step={1}
            onChange={v => onChange({ ...animal, peso_bezerro_alvo: v })}
            dica={"Peso esperado do bezerro ao nascer (Holstein ≈ 45 kg, Jersey ≈ 28 kg). Impacta exigência de gestação."} />
        </div>
      </div>

      {/* ── Bloco de Composição Corporal ─────────────────────────────────── */}
      <div className="mb-3 border border-rose-100 bg-rose-50/40 rounded-lg p-2.5">
        <div className="text-xs font-bold text-rose-800 mb-2 flex items-center">
          🦴 Composição Corporal
          <CampoTooltip texto={
            "Para vaca adulta em ECC estável, deixe os dois ganhos em 0. " +
            "Ganhos positivos reduzem o leite potencial."
          } />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Campo label="Peso maduro" hint="kg" value={peso_maduro} min={300} max={900} step={10}
            onChange={v => onChange({ ...animal, peso_maduro: v })}
            dica={"Peso adulto da vaca (Holstein ≈ 700 kg, Jersey ≈ 480 kg). " +
                  "Impacta exigência de ganho em primíparas."} />
          <Campo label="Ganho peso" hint="kg/d" value={ganho_frame} min={0} max={1} step={0.05}
            onChange={v => onChange({ ...animal, ganho_frame_kg_dia: Math.max(0, v) })}
            dica={"Multíparas no peso ideal: 0. Primíparas crescendo: 0,1 a 0,3 kg/d. " +
                  "Reduz o leite potencial pela energia e proteína."} />
          <Campo label="Ganho ECC" hint="kg/d" value={ganho_reserva} min={-0.5} max={0.5} step={0.05}
            onChange={v => onChange({ ...animal, ganho_reserva_kg_dia: v })}
            dica={"ECC estável: 0. Início lactação (perdendo): −0,1 a −0,3. " +
                  "Final lactação (recuperando): positivo."} />
        </div>
      </div>

      {/* ── Bloco Pastejo (NASEM 2021 Eq. 20-274 / 20-276) ────────────────── */}
      <div className="mb-3 border border-emerald-100 bg-emerald-50/40 rounded-lg p-2.5">
        <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center">
          🌾 Manejo / Pastejo
          <CampoTooltip texto={
            "Confinamento total: deixe 'Não'. " +
            "Em pastejo, adiciona à mantença o gasto de caminhada até a ordenha e o esforço da topografia."
          } />
        </div>

        <label className="text-xs font-medium text-gray-500 block mb-1">Em pastejo?</label>
        <div className="flex gap-2 mb-2">
          {([false, true] as const).map(p => (
            <button
              key={String(p)}
              onClick={() => onChange({ ...animal, pastejo: p })}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                (animal.pastejo ?? false) === p
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
              }`}
            >
              {p ? '🌱 Sim' : '🏠 Não'}
            </button>
          ))}
        </div>

        {animal.pastejo && (
          <div className="grid grid-cols-3 gap-2">
            <Campo
              label="Distância" hint="km"
              value={animal.dist_pasto_ordenha_km ?? 0.5}
              min={0} max={10} step={0.1}
              onChange={v => onChange({ ...animal, dist_pasto_ordenha_km: Math.max(0, v) })}
              dica="Distância em km de uma ida do pasto até a ordenha. Aumenta o gasto de caminhada." />
            <Campo
              label="Ordenhas/d" hint=""
              value={animal.n_ordenhas_dia ?? 2}
              min={1} max={4} step={1}
              onChange={v => onChange({ ...animal, n_ordenhas_dia: Math.max(1, Math.round(v)) })}
              dica="Nº de ordenhas por dia. Em pastejo, 3x caminha 50% mais que 2x. Em confinamento, não muda nada." />
            <div className="flex flex-col gap-0.5 min-w-0">
              <label className="text-xs font-medium text-gray-500 flex items-center flex-wrap gap-x-1 leading-tight">
                <span>Relevo</span>
                <CampoTooltip texto={
                  "Relevo do pasto: Leve (plano), Moderado (ondulado), Íngreme (montanhoso). " +
                  "Quanto mais íngreme, maior o gasto de energia na subida."
                } />
              </label>
              <select
                value={animal.topografia ?? 'Mild'}
                onChange={e => onChange({ ...animal, topografia: e.target.value as 'Mild' | 'Moderate' | 'Steep' })}
                className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Mild">Leve</option>
                <option value="Moderate">Moderado</option>
                <option value="Steep">Íngreme</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Método de cálculo da digestibilidade da fibra ────────────────── */}
      {/*
        Espelha o seletor "Use in vitro NDF digest to estimate energy" do NASEM
        Software oficial. Mapeamento direto:
          'lignin'    ↔ NASEM "Do not use"        (Use_DNDF_IV=0, Eq. 20-112)
          'iv_forage' ↔ NASEM "Use for forages"   (Use_DNDF_IV=1, Eq. 20-111 só F)
          'iv_all'    ↔ NASEM "Use for all"       (Use_DNDF_IV=2, Eq. 20-111 tudo)
      */}
      <div className="mb-3 border border-sky-100 bg-sky-50/40 rounded-lg p-2.5">
        <label className="text-xs font-bold text-sky-800 mb-1.5 flex items-center">
          🧪 Usar DFND 48h (in vitro) para estimar energia?
          <CampoTooltip texto={
            "Define como a digestibilidade da fibra é calculada. Impacta o leite potencial pela energia.\n" +
            "• Não usar: calcula pela lignina (default).\n" +
            "• Só nas forragens: usa DFND 48h do laudo só em forragens.\n" +
            "• Em todos: usa DFND 48h em todos os alimentos.\n" +
            "Ative quando tiver DFND 48h medido no laudo das suas forragens."
          } />
        </label>
        <select
          value={animal.ndf_method ?? 'lignin'}
          onChange={e => onChange({ ...animal, ndf_method: e.target.value as AnimalLactacao['ndf_method'] })}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <option value="lignin">Não Usar — Calcular pela lignina</option>
          <option value="iv_forage">Sim, só nas forragens</option>
          <option value="iv_all">Sim, em todos os alimentos</option>
        </select>
      </div>
    </div>
  );
}
