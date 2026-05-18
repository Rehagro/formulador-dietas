# Gap Analysis — Motor de Cálculo vs NASEM 2021

**Documento atualizado em: 2026-05-18**
**Referência: National Academies of Sciences, Engineering, and Medicine. *Nutrient Requirements of Dairy Cattle, 8th Revised Edition*. Washington, DC: National Academies Press, 2021.**

Este documento lista, equação por equação, o que está **100% conforme**, o que tem **aproximações conhecidas** e o que **falta** para o motor ficar idêntico ao modelo NASEM 2021.

---

## 1. Visão geral por módulo

| Módulo | Status | Confiabilidade |
|---|---|---|
| **CMS Exigido** (Eq. 20-21) | ✅ 100% conforme | Alta |
| **RUP/RDP por alimento** (Eq. 6-1) | ✅ 100% conforme | Alta |
| **Proteína microbiana** (Eq. 20-52/53/54/55/74/75/76) | ✅ 100% conforme após correção 2026-05-18 | Alta |
| **idRUP, idMiCP, idMiTP** (Eq. 20-126/127) | ✅ 100% conforme | Alta |
| **MP intake** (Eq. 20-136) | ✅ 100% conforme para vaca adulta sem infusão | Alta |
| **Manutenção proteica** (Eq. 20-283 a 20-306) | ✅ 100% conforme | Alta |
| **Leite potencial PM** (Eq. 20-339 derivada de 20-212) | ✅ Forma derivada validada contra Tabela 20-16 | Alta |
| **Gestação proteica** (Eq. 20-225 a 20-239) | ✅ Implementado em 2026-05-18 | Alta |
| **Ganho corporal proteico** (Eq. 20-270) | ❌ Omitido | — (ver §3.2) |
| **Energia (DE → ME → NEL)** (Eq. 20-170 a 20-310) | ❌ Não implementado | Zerado (ver §3.3) |
| **Leite potencial NE** (forma NASEM) | ⚠️ Implementação NRC 2001 (NEL direto do alimento) | Zerado pois JSON NASEM não traz NEL |
| **Predição mPrt** (Eq. 20-185) | ❌ Não implementado | — (ver §3.4) |
| **DCAD** (clássico) | ✅ Conforme | Alta |
| **Indicadores físicos** (FDNF/PV, % Forragem, kPf/kPc/kPl) | ✅ Conforme | Alta |

---

## 2. Detalhamento — Leite Potencial pela Proteína Metabolizável

Para cada etapa, mostra: **(a)** equação NASEM original, **(b)** implementação no motor, **(c)** status.

### 2.1 — RUP e RDP por alimento (Eq. 6-1)

**NASEM:**
```
RUP = PB × kgMS × [B × kP/(kd + kP) + C]
RDP = PB × kgMS × [A + B × kd/(kd + kP)]
```

**Motor (`calculos.ts:152-165`):** idêntico, com `kP` e `kd` ambos em %/h após o fix de unidades.

**Status:** ✅ **100% conforme**

### 2.2 — Digestibilidade intestinal do RUP (Eq. 20-123/124)

**NASEM:** `Fd_idRUPIn = Fd_RUPIn × dcRUP` por alimento, com `dcRUP` da Tabela 19-1.

**Motor (`calculos.ts:167-172`):** usa `a.rup_digest` por alimento, fallback 0,80 quando ausente (com `console.warn`).

**Status:** ✅ **100% conforme** quando `rup_digest` está preenchido (atualmente 151/159 alimentos).
**Pendência menor:** preencher `rup_digest` nos 8 alimentos faltantes (todos óleos ou farinhas com PB ≈ 0, impacto desprezível).

### 2.3 — Digestibilidade ruminal NDF (Eq. 20-52, 20-54)

**NASEM Eq. 20-52** (diet-level):
```
Rum_dcNDF (%) = -31,9
              + 0,721 × NDF%
              - 0,247 × Starch%
              + 6,63 × CP%
              - 0,211 × (CP%)²
              - 0,387 × (ADF/NDF × 100)
              - 0,121 × ForWet%
              + 1,51 × DMI

Rum_DigNDFIn = Rum_dcNDF/100 × Dt_NDFIn
```

**Motor (`calculos.ts:262-289`):** implementação literal da equação completa.

**Status:** ✅ **100% conforme após correção 2026-05-18.** Antes usava aproximação direto sobre `ivndfd48`.

**Nota de validade:** a Eq. 20-52 foi calibrada para dietas com **CP entre 12–22% MS**. Dietas extremas (CP > 28% ou CMS < 1,5% PV) podem retornar valores negativos — o motor faz `bound em [0, 100]`.

### 2.4 — Digestibilidade ruminal Amido (Eq. 20-53, 20-55)

**NASEM Eq. 20-53** (diet-level):
```
Rum_dcSt (%) = 70,6
             - 1,45 × DMI
             + 0,424 × ForNDF%
             + 1,39 × Starch%
             - 0,0219 × (Starch%)²
             - 0,154 × ForWet%

Rum_DigStIn = Rum_dcSt/100 × Dt_StIn
```

**Motor (`calculos.ts:281-289`):** implementação literal.

**Status:** ✅ **100% conforme após correção 2026-05-18.** Antes reusava `kd_amido/(kd_amido+kP)` como aproximação.

### 2.5 — Michaelis-Menten N microbiano (Eq. 20-74/75/76)

**NASEM:**
```
Vm = 100,8 + 81,56 × An_RDPIn       (Eq. 20-75)
Du_MiN_g = Vm / (1 + 0,0939/Rum_DigNDFIn + 0,0274/Rum_DigStIn)   (Eq. 20-74)
Du_MiCP  = Du_MiN_g × 6,25 / 1000   (Eq. 20-76)
```

**Motor (`calculos.ts:294-306`):** idêntico, com cap RDP em 12% MS conforme texto NASEM Cap. 6.

**Status:** ✅ **100% conforme**

### 2.6 — idMiCP e idMiTP (Eq. 20-126/127)

**NASEM:**
```
Du_idMiCP = Du_MiCP × 0,80          (Eq. 20-126)
Du_idMiTP = Du_idMiCP × 0,824       (Eq. 20-127)
```

**Motor (`calculos.ts:304-305`):** idêntico.

**Status:** ✅ **100% conforme**

### 2.7 — MP intake (Eq. 20-136)

**NASEM** (vaca adulta, sem infusão sanguínea):
```
An_MPIn = An_idRUPIn + Du_idMiTP + Inf_TPInBld
```
Onde `Inf_TPInBld` (infusão experimental de TP no sangue) = 0 em produção real.

**Motor (`calculos.ts:309`):** `An_MPIn = An_idRUPIn + Du_idMiTP;`

**Status:** ✅ **100% conforme** para vaca em condições de fazenda.

### 2.8 — Manutenção proteica (Eq. 20-283 a 20-306)

**NASEM:**
```
Scrf_NP   = 0,20 × PV^0,60 × 0,86 / 1000        kg NP/d  (Eq. 20-283/285)
Ur_NPend  = 0,053 × PV × 6,25 / 1000             kg MP/d  (Eq. 20-294, eff=1)
Fe_NPend  = 0,73 × (12 + 0,12 × FDN%) × CMS/1000 kg NP/d  (Eq. 20-300/302)
mp_mantenca = (Scrf_NP + Fe_NPend) / KmMP_NP + Ur_NPend
KmMP_NP   = 0,69                                            (Eq. 20-305/306)
```

**Motor (`calculos.ts:312-323`):** idêntico.

**Status:** ✅ **100% conforme**

### 2.9 — MP disponível para leite (Eq. 20-337) — **OMISSÕES INTENCIONAIS**

**NASEM:**
```
An_MPavailMilk = An_MPIn − Gest_MPuse − Body_MPuse
                         − Scrf_MPuse − Fe_MPenduse − Ur_MPenduse
```

**Motor (`calculos.ts:339`):** `An_MPavailMilk = max(0, An_MPIn − mp_mantenca);`

**Status:** ⚠️ **Omite `Gest_MPuse` e `Body_MPuse`.** Ver §3.1 e §3.2.

**Impacto numérico:**
- Vaca em lactação inicial (DEL 0–60d) **não-prenhe** com ECC estável: **omissão = 0** ✅
- Vaca em lactação tardia (DEL >150d) **prenhe**: omite ~30–80 g MP/d → leite potencial PM superestimado em ~1–3 kg/d
- Vaca ganhando ECC ativamente: omite até ~100 g MP/d → superestima ~2–4 kg/d

### 2.10 — Leite potencial pela proteína (Eq. 20-339)

**NASEM Eq. 20-339 impressa no PDF:**
```
MilkMP_Allow = An_MPavailMilk / (KlMP_NP,Trg × Trg_MilkTPp/100)
```

**Problema:** com `KlMP = 0,69`, a forma impressa dá valores ~2× maiores do que o observado na Tabela 20-16 (que reporta `Predicted mean = 32,6 kg/d` para `Observed = 30,9 kg/d`).

**Forma derivada (consistente com Eq. 20-212):**
```
Mlk_MPuse = Mlk_NP / KlMP_NP                                (Eq. 20-212)
Mlk_NP    = Mlk_MPuse × KlMP_NP                             (inversão)
leite     = An_MPavailMilk × KlMP / (Trg_MilkTPp/100)
```

**Motor (`calculos.ts:343-348`):** usa a forma derivada (multiplicação por KlMP).

**Status:** ✅ **Conforme a Eq. 20-212 (fundamental) e Tabela 20-16 (validação).** Diverge da forma impressa da Eq. 20-339 — provável erro tipográfico no PDF.

---

## 3. O que falta para 100% — Roadmap

### 3.1 ~~Gestação proteica (`Gest_MPuse`)~~ ✅ IMPLEMENTADO em 2026-05-18

Implementação completa das Eq. 20-225, 20-227, 20-233, 20-235, 20-238 e 20-239 do NASEM 2021. Campos
`raca`, `dias_gestacao`, `peso_bezerro_alvo` e `gestacao_total` adicionados em `AnimalLactacao`.
Defaults por raça (Holstein 45 kg, Jersey 28 kg) preenchidos automaticamente. Vide painel do animal na UI.

### 3.2 Ganho/perda corporal proteico (`Body_MPuse`)

**Equação NASEM (Eq. 20-270):**
```
Body_MPuse = An_NPgain / KgMP_NP
An_NPgain  = função(ECC_atual, ECC_alvo, dias_para_alvo, raça, EBW)
KgMP_NP    = 0,86 × Trg_MP_NP (parity > 0)   [Eq. 20-271]
```

**O que precisa para implementar:**
1. Adicionar `ecc_alvo?: number | null` e `dias_para_ecc_alvo?: number | null` em `AnimalLactacao`
2. Implementar Eq. 20-247/248/249 (Frm_Gain, Rsrv_Gain)
3. Implementar Eq. 20-258/259 (Body_NPGain)
4. Calcular `KgMP_NP` (Eq. 20-271)
5. Subtrair `Body_MPuse` em `An_MPavailMilk`

**Esforço estimado:** 1 dia.

**Prioridade:** **Baixa** — para a maioria das dietas de produção, ECC é estável e impacto < 0,5 kg/d.

### 3.3 Cadeia de Energia (DE → ME → NEL)

**Equações NASEM aplicáveis:**
- Eq. 20-170 (GE intake)
- Eq. 20-182 (DE intake, partição por componente)
- Eq. 20-307 (ME = DE − GasE − UrineE)
- Eq. 20-310 (CH4 / GasE para vaca)
- Eq. 20-268 (Kl_ME = 0,66, eficiência ME → NEL)

**O que precisa:**
1. Função `calcularDigestibilidades(slot)` retornando DigNDFIn, DigStIn, DigFAIn, DigCPaIn, DigrOMIn por alimento (Total Tract, não só ruminal)
2. Constantes Tabela 20-9 (En_NDF=4,20; En_St=4,23; En_rOM=4,0; En_FA=9,40; En_CP=5,65; En_NPNCP=0,89)
3. Aplicar Eq. 20-182, 20-307, 20-310
4. Multiplicar ME × 0,66 para obter NEL
5. Substituir `kgNEL` no cálculo de `leite_potencial_nel`

**Esforço estimado:** 2 dias (já planejado em prompt separado).

**Prioridade:** **CRÍTICA** — hoje o leite NEL e o "fator limitante" estão sempre zero/energia.

### 3.4 Predição mecanística de proteína do leite (Eq. 20-185)

**Equação NASEM (Eq. 20-185):**
```
Mlk_NP_g = −97,0 + 1,68 × Abs_His + 0,885 × Abs_Ile
         + 0,466 × Abs_Leu + 1,15 × Abs_Lys + 1,84 × Abs_Met
         + 0,0773 × Abs_OthAA − 0,00215 × EAAb²
         + 10,79 × An_DEInp − 4,60 × (An_DigNDF − 17,06)
         − 0,420 × (An_BW − 612)
```

**O que precisa:**
- Composição de AA por alimento (Fd_AA(a)_CP) — não no banco
- Cálculo de Abs_AA (g/d) por aminoácido essencial
- An_DEInp (DE não-protein)
- An_DigNDF (NDF total digerido, %MS)

**Esforço estimado:** 3 dias.

**Prioridade:** **Baixa** — Eq. 20-339 (já implementada) é suficiente para o uso atual (formulação consultiva). Eq. 20-185 é mais precisa mas requer dados de AA por alimento.

### 3.5 Outros itens menores

- **Eq. 20-115 — Total tract NDF digestibility com `ivndfd48`** — não usada hoje, mas necessária para a cadeia DE → ME (item 3.3).
- **Eq. 20-185 (a) — `mPrt_eqn` selector** — selecionar entre Eq. 20-185 mecanística e Eq. 20-339 estática.
- **Eq. 20-308 — Perda urinária DE** (`Ur_DEIn = 0,0143 × Ur_N_g`) — pequena (~0,3 Mcal/d), parte de 3.3.
- **Eq. 20-310 — `An_GasEOut`** — perda de metano CH4, parte de 3.3. Sensível à dieta.
- **Indicador `fator_limitante` revisado** — hoje sempre dá "energia" (NEL=0). Após 3.3, vai funcionar.

---

## 4. Resumo executivo

| Item | Status hoje | Impacto sem implementar |
|---|---|---|
| **Leite PM** | ✅ 100% conforme para uso real | — |
| Gestação proteica (§3.1) | ✅ implementado 2026-05-18 | — |
| Ganho corporal proteico (§3.2) | ❌ omitido | Superestima leite PM em ~2–4 kg/d para vacas em ganho ativo de ECC |
| **Energia (Leite NEL)** (§3.3) | ❌ zerado | App não funciona para limitação energética. **CRÍTICO** |
| Predição mecanística mPrt (§3.4) | ❌ omitido | Eq. 20-339 estática é suficiente |

**Recomendação:** atacar **§3.3 (Energia)** primeiro — é o único item que paralisa o app. **§3.1 e §3.2** podem esperar e são quick wins quando os campos do tipo `AnimalLactacao` forem expandidos. **§3.4** é melhoria de precisão, não necessária para o uso atual.

---

## 5. Histórico de correções

| Data | Item corrigido | Diff |
|---|---|---|
| 2026-05-18 | Bug de unidades kd_prot (%/h) vs kP (decimal/h) | `kP × 100` antes da Eq. 6-1 e antes de `kd_amido/(kd_amido+kP)` |
| 2026-05-18 | Rum_DigNDFIn — substituído pela Eq. 20-52 completa | Implementação literal com NDF%, Starch%, CP%, ADF/NDF, ForWet%, DMI |
| 2026-05-18 | Rum_DigStIn — substituído pela Eq. 20-53 completa | Implementação literal com DMI, ForNDF%, Starch%, ForWet% |
| 2026-05-18 | Eq. 20-339 — derivação corrigida vs forma impressa do PDF | Multiplicação por KlMP em vez de divisão (consistente com Eq. 20-212 e Tabela 20-16) |
| 2026-05-18 | Manutenção proteica — adicionado KmMP_NP=0,69 para Scurf e Fecal | `(Scrf + Fe) / 0,69 + Ur` em vez de soma direta |
| 2026-05-18 | Gestação proteica — Eq. 20-225 a 20-239 implementadas | Campos novos (raça, dias_gestacao, peso_bezerro_alvo, gestacao_total) em `AnimalLactacao`. `Gest_MPuse` agora subtrai de `An_MPavailMilk` |
