# Auditoria NASEM 2021 vs Nosso Motor

**Gerada automaticamente em 2026-05-21 via `py -3.12 scripts/audit_nasem_to_md.py`**

Cenário de teste: `A_lact_test` (demo `lactating_cow_test` do `nasem_dairy` 1.0.2 —
Holstein primípara, 624,8 kg, DIM 100, leite 25 kg/d, fixture do `validate_multi_scenarios.py`).

## Resumo por modo do seletor `Use_DNDF_IV`

Espelha o seletor **"Use in vitro NDF digest to estimate energy"** do NASEM Software:

| Modo | Label NASEM | Nosso `ndf_method` | ✅ Idêntico | ⚠ Pequena | ❌ DIFF |
|---|---|---|---:|---:|---:|
| 0 | Lignina (default NASEM) | `lignin` | 84 | 0 | 0 |
| 1 | IV nas forragens | `iv_forage` | 74 | 9 | 1 |
| 2 | IV em todos | `iv_all` | 74 | 5 | 5 |

**Modo 0 (lignina) é o default do NASEM Software** — é a configuração que o aluno
verá ao comparar nosso app com o software oficial sem mudar nada.

## Modo 0 — Lignina (default NASEM Software) — Detalhe completo

**Resultado: 84 variáveis batem bit-a-bit (Δ < 0,1%). Zero divergências.**

<details><summary>Tabela completa (clique para expandir)</summary>

```
============================================================================================
AUDITORIA NASEM 2021 — Cenário: A_lact_test (Holstein primipara mid-lact, DMI=24.52 kg/d)
Modo dcNDF: Use_DNDF_IV=0 (Do not use (lignina)) ↔ TS ndf_method='lignin'
============================================================================================

PARTE 1 — Composição
--------------------------------------------------------------------------------------------
Variável                      NASEM             TS       Δ abs       Δ %  Unid    Status
Dt_DMIn                     24.5210        24.5210     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_CPIn                      5.1666         5.1666     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_NDFIn                     8.1017         8.1017     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_ADFIn                     5.6272         5.6272     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_CFatIn                    0.7361         0.7361     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_StIn                      4.9665         4.9665     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_AshIn                     1.7626         1.7626     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_LgIn                      1.4096         1.4096     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_FAIn                      0.5766         0.5766     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_NPNCPIn                   0.0000         0.0000     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_NDFIPIn                        —              —           —         —  kg/d    skip
Dt_ADFIPIn                        —              —           —         —  kg/d    skip
Dt_CP                       21.0700        21.0700     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_NDF                      33.0397        33.0397     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_NDFnf                    30.0038        30.0038     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_ADF                      22.9487        22.9487     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_CFat                      3.0018         3.0018     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_St                       20.2543        20.2543     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_Ash                       7.1880         7.1880     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_Lg                        5.7487         5.7487     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_FA                        2.3514         2.3514     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_NFC                      36.4840        36.4840     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_ForNDF                   23.4845        23.4845     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_Ca                        0.7776         0.7776     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_P                         0.5095         0.5095     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_Mg                        0.3299         0.3299     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_K                         1.4466         1.4466     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_Na                        0.0705         0.0705     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_Cl                        0.3307         0.3307     -0.0000    -0.00%  % MS    ✅ idêntico
Dt_S                         0.3391         0.3391     +0.0000    +0.00%  % MS    ✅ idêntico
Dt_Cu                        6.1995         6.1995     -0.0000    -0.00%  mg/kg   ✅ idêntico
Dt_Fe                      431.1575       431.1575     -0.0000    -0.00%  mg/kg   ✅ idêntico
Dt_Mn                       44.3021        44.3021     +0.0000    +0.00%  mg/kg   ✅ idêntico
Dt_Zn                       35.3384        35.3384     +0.0000    +0.00%  mg/kg   ✅ idêntico
Dt_Co                        0.0000         0.0000     +0.0000    +0.00%  mg/kg   ✅ idêntico
Dt_Se                        0.4319      NOT_IN_TS           —         —  mg/kg   ❌ não-implem
Dt_I                         0.0000      NOT_IN_TS           —         —  mg/kg   ❌ não-implem

PARTE 2 — Digestibilidade e energia
--------------------------------------------------------------------------------------------
Variável                      NASEM             TS       Δ abs       Δ %  Unid    Status
Dt_DigNDFIn                  3.7766         3.7766     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_DigStIn                   4.4334         4.4334     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_DigFAIn                   0.4209         0.4209     +0.0000    +0.00%  kg/d    ✅ idêntico
An_DigCPaIn                  3.9664         3.9664     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_DigrOMaIn                 2.9794         2.9794     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_dcNDF                          —              —           —         —  %       skip
TT_dcSt                     89.2647        89.2647     -0.0000    -0.00%  %       ✅ idêntico
Dt_dcFA                           —              —           —         —  %       skip
An_DEIn                     72.8993        72.8993     +0.0000    +0.00%  Mcal/d  ✅ idêntico
An_MEIn                     59.9759        59.9759     +0.0000    +0.00%  Mcal/d  ✅ idêntico
An_NEIn                     39.5841        39.5841     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Ur_DEout                     5.9002         5.9002     +0.0000    +0.00%  Mcal/d  ✅ idêntico
An_GasEOut                   7.0231         7.0231     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Dt_DE                        2.9729         2.9729     +0.0000    +0.00%  Mcal/kg ✅ idêntico
Dt_ME                     NOT_IN_PY         2.4459           —         —  Mcal/kg ⚠ só TS
Dt_NE                     NOT_IN_PY         1.6143           —         —  Mcal/kg ⚠ só TS
Dt_TDN                      65.6697        65.6697     -0.0000    -0.00%  %       ✅ idêntico
Dt_TDNIn                    16.1029        16.1029     +0.0000    +0.00%  kg/d    ✅ idêntico

PARTE 3 — Proteína microbiana e MP
--------------------------------------------------------------------------------------------
Variável                      NASEM             TS       Δ abs       Δ %  Unid    Status
An_RDPIn                     3.5561         3.5561     +0.0000    +0.00%  kg/d    ✅ idêntico
An_RUPIn                     1.6105         1.6105     +0.0000    +0.00%  kg/d    ✅ idêntico
An_idRUPIn                   1.2123         1.2123     +0.0000    +0.00%  kg/d    ✅ idêntico
Du_MiCP_g                 2052.4052      2052.4053     +0.0001    +0.00%  g/d     ✅ idêntico
Du_MiCP                      2.0524         2.0524     +0.0000    +0.00%  kg/d    ✅ idêntico
Du_idMiCP_g               1641.9242      1641.9242     +0.0001    +0.00%  g/d     ✅ idêntico
Du_idMiTP_g               1352.9455      1352.9456     +0.0000    +0.00%  g/d     ✅ idêntico
Du_MiN_g                   328.3848       328.3848     +0.0000    +0.00%  g/d     ✅ idêntico
An_MPIn                      2.5652         2.5652     +0.0000    +0.00%  kg/d    ✅ idêntico
An_MPIn_g                 2565.2137      2565.2138     +0.0001    +0.00%  g/d     ✅ idêntico
Fe_CPend                     0.3915         0.3915     +0.0000    +0.00%  kg/d    ✅ idêntico
Fe_CPend_g                 391.4719       391.4720     +0.0000    +0.00%  g/d     ✅ idêntico
Scrf_CP_g                    9.5164         9.5164     +0.0000    +0.00%  g/d     ✅ idêntico
Ur_Nout_g                  412.6045       412.6045     +0.0000    +0.00%  g/d     ✅ idêntico
Ur_CPout_g                        —              —           —         —  g/d     skip
Dt_RUPIn                     1.6105         1.6105     +0.0000    +0.00%  kg/d    ✅ idêntico
Dt_idRUPIn                   1.2123         1.2123     +0.0000    +0.00%  kg/d    ✅ idêntico

PARTE 5 — Leite Potencial (NEL e MP)
--------------------------------------------------------------------------------------------
Variável                      NASEM             TS       Δ abs       Δ %  Unid    Status
An_MEavail_Milk             39.2366        39.2366     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Trg_NEmilk_Milk              0.8284         0.8284     +0.0000    +0.00%  Mcal/kg ✅ idêntico
Mlk_Prod_NEalow             31.2612        31.2612     +0.0000    +0.00%  kg/d    ✅ idêntico
An_MPavail_Milk_Trg          1.9046         1.9046     +0.0000    +0.00%  kg/d    ✅ idêntico
Mlk_Prod_MPalow             35.9065        35.9065     +0.0000    +0.00%  kg/d    ✅ idêntico
Trg_MilkTPp                  3.6600         3.6600     +0.0000    +0.00%  %       ✅ idêntico
Trg_MilkFatp                 4.5500         4.5500     +0.0000    +0.00%  %       ✅ idêntico
Trg_MilkLacp                 4.8500         4.8500     +0.0000    +0.00%  %       ✅ idêntico

PARTE 4 — Mantença, ganho e gestação
--------------------------------------------------------------------------------------------
Variável                      NASEM             TS       Δ abs       Δ %  Unid    Status
An_NEmUse                   12.4969        12.4969     +0.0000    +0.00%  Mcal/d  ✅ idêntico
An_MEmUse                   18.9347        18.9347     +0.0000    +0.00%  Mcal/d  ✅ idêntico
An_MPm_g_Trg               632.9903       632.9903     +0.0000    +0.00%  g/d     ✅ idêntico
An_MEgain                    1.7490         1.7490     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Frm_NEgain                   0.6996         0.6996     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Rsrv_NEgain                  0.0000         0.0000     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Body_MPUse_g_Trg            24.9921        24.9921     +0.0000    +0.00%  g/d     ✅ idêntico
Frm_NPgain_g                17.2446        17.2446     +0.0000    +0.00%  g/d     ✅ idêntico
Rsrv_NPgain_g                0.0000         0.0000     +0.0000    +0.00%  g/d     ✅ idêntico
GrUter_BWgain                0.0082         0.0082     +0.0000    +0.00%  kg/d    ✅ idêntico
Gest_NPgain_g                0.8669         0.8669     +0.0000    +0.00%  g/d     ✅ idêntico
Gest_MEuse                   0.0556         0.0556     +0.0000    +0.00%  Mcal/d  ✅ idêntico
Gest_MPUse_g_Trg             2.6271         2.6271     +0.0000    +0.00%  g/d     ✅ idêntico

============================================================================================
RESUMO GLOBAL (Partes 1-4):
  ✅ Idêntico (<0,1% Δ):       84
  ⚠ Pequena diff (0,1-1%):     0
  ❌ DIFF > 1% (corrigir):      0
  ❌ Não-implem no TS:          2
  ⚠ Só em TS (ñ-comparável):   2
============================================================================================

```

</details>

## Modos 1 e 2 — Diferenças intencionais (IVNDFD48)

Nos modos com IV (`Use_DNDF_IV` = 1 ou 2), aparecem pequenas divergências em
`Dt_DigNDFIn` e cascata (ME, NE, leite NEL). **Não é bug**: o `nasem_dairy` oficial
usa um **default genérico** (48,3% para forragens / 65% para concentrados — `nutrient_intakes.py:24-36`),
enquanto nosso motor usa o **valor `Fd_DNDF48_NDF` real per-feed do CSV NASEM** (mais preciso).

O motor TS continua mais informativo. Para o aluno que tem o valor de DFND 48h
do laudo de uma silagem específica, nosso motor incorpora; o NASEM oficial assume
48,3% para qualquer forragem genérica.

## Parte 6 — Indicadores compostos não-NASEM

Estes valores aparecem na UI mas **não vêm direto do NASEM 2021** — são heurísticas
práticas (NRC 2001 / Rehagro / literatura adicional). Cada um carrega campo `fonte`
em `src/utils/referencias.ts`.

| Indicador | Fórmula | Fonte |
|---|---|---|
| **eFDN** | NRC 2001 — forragens contam 100%; concentrados 33% (ou via `mn8` PSPS) | NRC 2001 + Rehagro |
| **FDNF/PV** | kgFDNF / animal.peso (kg fibra forrageira por kg peso vivo) | Empírico Rehagro |
| **FDN>8 / Amido deg** | Só calcula se aluno preencher `mn8` (PSPS Penn State) | NRC 2001 |
| **Lis/Met** | kgLYS / kgMET — razão aminoacídica | NASEM Cap. 6 indireto |
| **Ca/P** | kgCA / kgP — razão mineral | NRC 2001 |
| **DCAD** | ((Na/23) + (K/39) − (Cl/35) − (S/16)) × 1e6 — Eq. tradicional | NASEM Cap. 7 |

## Parte 7 — Features NASEM não-implementadas (intencional)

O motor TS foca em **vaca em lactação Holstein/Jersey**. As seguintes features do
NASEM 2021 não são cobertas — todas declaradas explicitamente para que o aluno
saiba quando o motor não se aplica:

| Feature NASEM | Status | Justificativa |
|---|---|---|
| Calf equations (bezerros, < 4 meses) | ❌ não-implementado | Próxima fase do roadmap (PLANO_DESENVOLVIMENTO.md) |
| Recria/heifer growth (Cap. 11) | ❌ não-implementado | Fase futura — `BODY_PARAMS` já preparado |
| Vaca seca / transição (close-up, far-off) | ❌ não-implementado | Fase futura — `RUMEN_PARAMS` por categoria preparado |
| Heat stress (Cap. 16, `Env_TempCurr`) | ❌ não-implementado | Brasil sem extremos críticos — `Env_TempCurr` default 22°C no nasem_dairy |
| Topografia (`Env_Topo`, `Env_DistParlor`, `Env_TripsParlor`) | ❌ não-implementado | Confinamento típico — ignorado |
| Aminoácidos individuais além de Lys/Met | ❌ não-implementado | NASEM tem 10 AAs; nosso motor exibe só Lys e Met (mais críticos) |
| Infusão (`Inf_*`) | ❌ não-implementado | Experimental — uso em pesquisa, não em formulação prática |
| Monensina detalhada (`Monensin_eqn`, redução de gás) | ⚠ parcial | Banco tem `monensina` mg/kg, motor exibe na UI; ajuste de gás (−5%) não aplicado |
| Equações de mPrt (proteína do leite predita) | ❌ não-implementado | Usa NP/CP fixo do animal input |

## Como rodar

```bash
npm run audit-nasem            # regenera este arquivo a partir dos 3 modos
py -3.12 scripts/audit_nasem.py --mode 0   # detalhe modo único no console
```

## Arquivos relacionados

- `scripts/audit_nasem.py` — extrator NASEM (chama subprocess Node).
- `scripts/audit_ts_runner.mjs` — extrator do motor TS (lê de `validate_multi_inputs.json`).
- `scripts/audit_nasem_to_md.py` — gera este arquivo.
- `src/utils/calculos.ts:debug` — bloco que expõe intermediários para auditoria.