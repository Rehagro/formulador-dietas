"""Auditoria completa NASEM 2021 vs nosso motor — Partes 1-5.

Roda nasem_dairy oficial e nosso motor TS no MESMO cenário (A_lact_test demo),
nos 3 modos do seletor Use_DNDF_IV ('Use in vitro NDF digest to estimate energy'
do NASEM Software), e gera AUDITORIA_NASEM.md.

Modos:
  0 = Do not use   → lignina (Eq. 20-112)
  1 = Use for forages → IV nas forragens (Eq. 20-111)
  2 = Use for all → IV em tudo

USO:
  py -3.12 scripts/audit_nasem.py            # gera console + AUDITORIA_NASEM.md
  py -3.12 scripts/audit_nasem.py --mode 1   # roda um modo só
"""
import json, subprocess, sys, os
import pandas as pd
import nasem_dairy as nd

sys.stdout.reconfigure(encoding='utf-8')

# Modo dcNDF (Use_DNDF_IV / ndf_method). Default = 0 (lignina, NASEM Software default).
DCNDF_MODE = 0
if '--mode' in sys.argv:
    DCNDF_MODE = int(sys.argv[sys.argv.index('--mode') + 1])
TS_NDF_METHOD = {0: 'lignin', 1: 'iv_forage', 2: 'iv_all'}[DCNDF_MODE]
NASEM_LABEL = {0: 'Do not use (lignina)', 1: 'Use for forages', 2: 'Use for all'}[DCNDF_MODE]

# ── 1) Rodar nasem_dairy oficial ─────────────────────────────────────────────
user_diet, ai, es, ii = nd.demo('lactating_cow_test')
es['DMIn_eqn'] = 0
es['Use_DNDF_IV'] = DCNDF_MODE
m = nd.nasem(user_diet, ai, es, infusion_input=ii)

def gv(k):
    try:
        v = m.get_value(k)
        return float(v) if v is not None and not isinstance(v, str) else v
    except Exception:
        return None

# Catálogo de variáveis a auditar por domínio
DOMINIOS = {
    'PARTE 1 — Composição': [
        # (label NASEM, key NASEM, unidade NASEM)
        ('Dt_DMIn',        'Dt_DMIn',        'kg/d'),
        ('Dt_CPIn',        'Dt_CPIn',        'kg/d'),
        ('Dt_NDFIn',       'Dt_NDFIn',       'kg/d'),
        ('Dt_ADFIn',       'Dt_ADFIn',       'kg/d'),
        ('Dt_CFatIn',      'Dt_CFatIn',      'kg/d'),
        ('Dt_StIn',        'Dt_StIn',        'kg/d'),
        ('Dt_AshIn',       'Dt_AshIn',       'kg/d'),
        ('Dt_LgIn',        'Dt_LgIn',        'kg/d'),
        ('Dt_FAIn',        'Dt_FAIn',        'kg/d'),
        ('Dt_NPNCPIn',     'Dt_NPNCPIn',     'kg/d'),
        ('Dt_NDFIPIn',     'Dt_NDFIPIn',     'kg/d'),
        ('Dt_ADFIPIn',     'Dt_ADFIPIn',     'kg/d'),
        # Percentuais
        ('Dt_CP',          'Dt_CP',          '% MS'),
        ('Dt_NDF',         'Dt_NDF',         '% MS'),
        ('Dt_NDFnf',       'Dt_NDFnf',       '% MS'),
        ('Dt_ADF',         'Dt_ADF',         '% MS'),
        ('Dt_CFat',        'Dt_CFat',        '% MS'),
        ('Dt_St',          'Dt_St',          '% MS'),
        ('Dt_Ash',         'Dt_Ash',         '% MS'),
        ('Dt_Lg',          'Dt_Lg',          '% MS'),
        ('Dt_FA',          'Dt_FA',          '% MS'),
        ('Dt_NFC',         'Dt_NFC',         '% MS'),
        ('Dt_ForNDF',      'Dt_ForNDF',      '% MS'),
        # Minerais % MS
        ('Dt_Ca',          'Dt_Ca',          '% MS'),
        ('Dt_P',           'Dt_P',           '% MS'),
        ('Dt_Mg',          'Dt_Mg',          '% MS'),
        ('Dt_K',           'Dt_K',           '% MS'),
        ('Dt_Na',          'Dt_Na',          '% MS'),
        ('Dt_Cl',          'Dt_Cl',          '% MS'),
        ('Dt_S',           'Dt_S',           '% MS'),
        # Microminerais mg/kg
        ('Dt_Cu',          'Dt_Cu',          'mg/kg'),
        ('Dt_Fe',          'Dt_Fe',          'mg/kg'),
        ('Dt_Mn',          'Dt_Mn',          'mg/kg'),
        ('Dt_Zn',          'Dt_Zn',          'mg/kg'),
        ('Dt_Co',          'Dt_Co',          'mg/kg'),
        ('Dt_Se',          'Dt_Se',          'mg/kg'),
        ('Dt_I',           'Dt_I',           'mg/kg'),
    ],

    'PARTE 2 — Digestibilidade e energia': [
        # Componentes digestíveis (kg/d)
        ('Dt_DigNDFIn',    'Dt_DigNDFIn',    'kg/d'),
        ('Dt_DigStIn',     'Dt_DigStIn',     'kg/d'),
        ('Dt_DigFAIn',     'Dt_DigFAIn',     'kg/d'),
        ('An_DigCPaIn',    'An_DigCPaIn',    'kg/d'),
        ('Dt_DigrOMaIn',   'Dt_DigrOMaIn',   'kg/d'),
        # Coeficientes %
        ('Dt_dcNDF',       'Dt_dcNDF',       '%'),
        ('TT_dcSt',        'TT_dcSt',        '%'),
        ('Dt_dcFA',        'Dt_dcFA',        '%'),
        # Energia (Mcal/d)
        ('An_DEIn',        'An_DEIn',        'Mcal/d'),
        ('An_MEIn',        'An_MEIn',        'Mcal/d'),
        ('An_NEIn',        'An_NEIn',        'Mcal/d'),
        ('Ur_DEout',       'Ur_DEout',       'Mcal/d'),
        ('An_GasEOut',     'An_GasEOut',     'Mcal/d'),
        # Densidades (Mcal/kg)
        ('Dt_DE',          'Dt_DE',          'Mcal/kg'),
        ('Dt_ME',          'Dt_ME',          'Mcal/kg'),
        ('Dt_NE',          'Dt_NE',          'Mcal/kg'),
        # NDT
        ('Dt_TDN',         'Dt_TDN',         '%'),
        ('Dt_TDNIn',       'Dt_TDNIn',       'kg/d'),
    ],

    'PARTE 3 — Proteína microbiana e MP': [
        # RUP/RDP
        ('An_RDPIn',       'An_RDPIn',       'kg/d'),
        ('An_RUPIn',       'An_RUPIn',       'kg/d'),
        ('An_idRUPIn',     'An_idRUPIn',     'kg/d'),
        # Microbial
        ('Du_MiCP_g',      'Du_MiCP_g',      'g/d'),
        ('Du_MiCP',        'Du_MiCP',        'kg/d'),
        ('Du_idMiCP_g',    'Du_idMiCP_g',    'g/d'),
        ('Du_idMiTP_g',    'Du_idMiTP_g',    'g/d'),
        ('Du_MiN_g',       'Du_MiN_g',       'g/d'),
        # MP
        ('An_MPIn',        'An_MPIn',        'kg/d'),
        ('An_MPIn_g',      'An_MPIn_g',      'g/d'),
        # CP endógeno
        ('Fe_CPend',       'Fe_CPend',       'kg/d'),
        ('Fe_CPend_g',     'Fe_CPend_g',     'g/d'),
        ('Scrf_CP_g',      'Scrf_CP_g',      'g/d'),
        # Ureia / N urinário
        ('Ur_Nout_g',      'Ur_Nout_g',      'g/d'),
        ('Ur_CPout_g',     'Ur_CPout_g',     'g/d'),
        # Frações da dieta
        ('Dt_RUPIn',       'Dt_RUPIn',       'kg/d'),
        ('Dt_idRUPIn',     'Dt_idRUPIn',     'kg/d'),
    ],

    'PARTE 5 — Leite Potencial (NEL e MP)': [
        # NEL pathway
        ('An_MEavail_Milk',  'An_MEavail_Milk',  'Mcal/d'),
        ('Trg_NEmilk_Milk',  'Trg_NEmilk_Milk',  'Mcal/kg'),
        ('Mlk_Prod_NEalow',  'Mlk_Prod_NEalow',  'kg/d'),
        # MP pathway
        ('An_MPavail_Milk_Trg','An_MPavail_Milk_Trg','kg/d'),
        ('Mlk_Prod_MPalow',  'Mlk_Prod_MPalow',  'kg/d'),
        # Componentes alvo (TP, Fat, Lact)
        ('Trg_MilkTPp',      'Trg_MilkTPp',      '%'),
        ('Trg_MilkFatp',     'Trg_MilkFatp',     '%'),
        ('Trg_MilkLacp',     'Trg_MilkLacp',     '%'),
    ],

    'PARTE 4 — Mantença, ganho e gestação': [
        # Mantença
        ('An_NEmUse',      'An_NEmUse',      'Mcal/d'),
        ('An_MEmUse',      'An_MEmUse',      'Mcal/d'),
        ('An_MPm_g_Trg',   'An_MPm_g_Trg',   'g/d'),
        # Body composition gain — energia
        ('An_MEgain',      'An_MEgain',      'Mcal/d'),
        ('Frm_NEgain',     'Frm_NEgain',     'Mcal/d'),
        ('Rsrv_NEgain',    'Rsrv_NEgain',    'Mcal/d'),
        # Body composition gain — proteína
        ('Body_MPUse_g_Trg','Body_MPUse_g_Trg','g/d'),
        ('Frm_NPgain_g',   'Frm_NPgain_g',   'g/d'),
        ('Rsrv_NPgain_g',  'Rsrv_NPgain_g',  'g/d'),
        # Gestação
        ('GrUter_BWgain',  'GrUter_BWgain',  'kg/d'),
        ('Gest_NPgain_g',  'Gest_NPgain_g',  'g/d'),
        ('Gest_MEuse',     'Gest_MEuse',     'Mcal/d'),
        ('Gest_MPUse_g_Trg','Gest_MPUse_g_Trg','g/d'),
    ],
}

# Extrai valores NASEM
nasem_vals = {}
for dom, lista in DOMINIOS.items():
    for label, key, unit in lista:
        nasem_vals[label] = (gv(key), unit)

# ── 2) Rodar nosso motor TS via subprocess Node ─────────────────────────────
# Cria fixture mínima com o mesmo cenário e exporta TUDO que o motor TS calcula

ts_runner_path = os.path.join(os.path.dirname(__file__), 'audit_ts_runner.mjs')
ts_result = subprocess.run(
    ['node', '--experimental-strip-types', ts_runner_path, '--ndf', TS_NDF_METHOD],
    capture_output=True, text=True, encoding='utf-8',
    cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
)
if ts_result.returncode != 0:
    print('ERRO ao rodar motor TS:'); print(ts_result.stderr); sys.exit(1)

ts_vals = json.loads(ts_result.stdout)

# ── 3) Compara variável a variável ──────────────────────────────────────────
# Mapeamento "label NASEM" → "key no objeto exportado do motor TS"
# Se vazio, marca como "não-implementado".
TS_MAP = {
    # Parte 1
    'Dt_DMIn':       'totalKgMS',
    'Dt_CPIn':       'kgPB',
    'Dt_NDFIn':      'kgFDN',
    'Dt_ADFIn':      'kgFDA',
    'Dt_CFatIn':     'kgEE',
    'Dt_StIn':       'kgAMIDO',
    'Dt_AshIn':      'kgCinza',
    'Dt_LgIn':       'kgLignin',
    'Dt_FAIn':       'kgFA',
    'Dt_NPNCPIn':    'kgNPN_CP',
    'Dt_CP':         'pb_pct',
    'Dt_NDF':        'fdn_pct',
    'Dt_ADF':        'fda_pct',
    'Dt_CFat':       'ee_pct',
    'Dt_St':         'amido_pct',
    'Dt_Ash':        'cinza_pct',
    'Dt_Lg':         'lignin_pct',
    'Dt_FA':         'fa_pct',
    'Dt_NFC':        'cnf_pct',
    'Dt_ForNDF':     'fdnf_pct',
    'Dt_Ca':         'ca_pct',
    'Dt_P':          'p_pct',
    'Dt_Mg':         'mg_pct',
    'Dt_K':          'k_pct',
    'Dt_Na':         'na_pct',
    'Dt_Cl':         'cl_pct',
    'Dt_S':          's_pct',
    'Dt_Cu':         'cu_ppm',
    'Dt_Fe':         'fe_ppm',
    'Dt_Mn':         'mn_ppm',
    'Dt_Zn':         'zn_ppm',
    'Dt_Co':         'co_ppm',
    # Parte 2
    'Dt_DigNDFIn':   'Dt_DigNDFIn',
    'Dt_DigStIn':    'Dt_DigStIn',
    'Dt_DigFAIn':    'Dt_DigFAIn',
    'An_DigCPaIn':   'An_DigCPaIn',
    'Dt_DigrOMaIn':  'Dt_DigrOMIn',
    'An_DEIn':       'An_DEIn',
    'An_MEIn':       'An_MEIn',
    'An_NEIn':       'An_NEIn',
    'Ur_DEout':      'Ur_DEIn',
    'An_GasEOut':    'An_GasEOut',
    'Dt_DE':         'dt_de',
    'Dt_ME':         'dt_me',
    'Dt_NE':         'nel_mcal_kg',
    'Dt_TDN':        'ndt_pct',
    # Parte 3
    'An_RDPIn':      'An_RDPIn',
    'An_RUPIn':      'An_RUPIn_total',
    'An_idRUPIn':    'An_idRUPIn',
    'Du_MiCP_g':     'Du_MiCP_g',
    'Du_MiCP':       'Du_MiCP',
    'Du_idMiTP_g':   'Du_idMiTP_g',
    'Du_idMiCP_g':   'Du_idMiCP_g',
    'Du_MiN_g':      'Du_MiN_g',
    'An_MPIn':       'An_MPIn',
    'An_MPIn_g':     'An_MPIn_g',
    'Fe_CPend':      'Fe_CPend',
    'Fe_CPend_g':    'Fe_CPend_g',
    'Dt_RUPIn':      'Dt_RUPIn',
    'Dt_idRUPIn':    'Dt_idRUPIn',
    'Dt_NDFnf':      'Dt_NDFnf',
    'TT_dcSt':       'TT_dcSt',
    'Frm_NEgain':    'Frm_NEgain',
    'Rsrv_NEgain':   'Rsrv_NEgain',
    'Frm_NPgain_g':  'Frm_NPgain_g',
    'Rsrv_NPgain_g': 'Rsrv_NPgain_g',
    'Dt_TDNIn':      'Dt_TDNIn',
    'Scrf_CP_g':     'Scrf_CP_g',
    'Ur_Nout_g':     'Ur_N_g',
    # Parte 4
    'An_NEmUse':     'nelMantenca',
    'An_MEmUse':     'An_MEmUse',
    'An_MEgain':     'An_MEgain',
    'GrUter_BWgain': 'GrUter_BWgain',
    'Gest_NPgain_g': 'Gest_NPgain_g',
    'Gest_MEuse':    'Gest_MEuse',
    'Gest_MPUse_g_Trg': 'Gest_MPuse_g',
    'Body_MPUse_g_Trg': 'Body_MPuse_g',
    'An_MPm_g_Trg':  'mp_mantenca_g',
    # Parte 5 — Leite
    'An_MEavail_Milk':   'An_MEavail_Milk',
    'Trg_NEmilk_Milk':   'nel_por_kg_leite',
    'Mlk_Prod_NEalow':   'leite_potencial_nel',
    'An_MPavail_Milk_Trg':'An_MPavailMilk',
    'Mlk_Prod_MPalow':   'leite_potencial_prot',
    'Trg_MilkTPp':       'Trg_MilkTPp',
    'Trg_MilkFatp':      'Trg_MilkFatp',
    'Trg_MilkLacp':      'Trg_MilkLacp',
}

print('='*92)
print(f'AUDITORIA NASEM 2021 — Cenário: A_lact_test (Holstein primipara mid-lact, DMI={gv("Dt_DMIn"):.2f} kg/d)')
print(f'Modo dcNDF: Use_DNDF_IV={DCNDF_MODE} ({NASEM_LABEL}) ↔ TS ndf_method={TS_NDF_METHOD!r}')
print('='*92)

resumo = {'ok': 0, 'diff_small': 0, 'diff_big': 0, 'missing_ts': 0, 'missing_py': 0}

for dom, lista in DOMINIOS.items():
    print(f'\n{dom}')
    print('-'*92)
    print(f'{"Variável":<20s} {"NASEM":>14s} {"TS":>14s} {"Δ abs":>11s} {"Δ %":>9s}  {"Unid":<7s} Status')
    for label, key, unit in lista:
        py_val, _ = nasem_vals.get(label, (None, unit))
        ts_key = TS_MAP.get(label)
        ts_val = ts_vals.get(ts_key) if ts_key else None
        if py_val is None and ts_val is None:
            print(f'{label:<20s} {"—":>14s} {"—":>14s} {"—":>11s} {"—":>9s}  {unit:<7s} skip')
            continue
        if py_val is None:
            print(f'{label:<20s} {"NOT_IN_PY":>14s} {ts_val:>14.4f} {"—":>11s} {"—":>9s}  {unit:<7s} ⚠ só TS')
            resumo['missing_py'] += 1; continue
        if ts_val is None:
            print(f'{label:<20s} {py_val:>14.4f} {"NOT_IN_TS":>14s} {"—":>11s} {"—":>9s}  {unit:<7s} ❌ não-implem')
            resumo['missing_ts'] += 1; continue
        diff = ts_val - py_val
        pct = (diff / py_val * 100) if py_val != 0 else (0 if diff == 0 else float('inf'))
        if abs(pct) < 0.1 and abs(diff) < 1e-3:
            stat = '✅ idêntico'; resumo['ok'] += 1
        elif abs(pct) < 1.0:
            stat = '⚠ pequena';  resumo['diff_small'] += 1
        else:
            stat = '❌ DIFF';     resumo['diff_big'] += 1
        print(f'{label:<20s} {py_val:>14.4f} {ts_val:>14.4f} {diff:>+11.4f} {pct:>+8.2f}%  {unit:<7s} {stat}')

print('\n' + '='*92)
print('RESUMO GLOBAL (Partes 1-4):')
print(f'  ✅ Idêntico (<0,1% Δ):      {resumo["ok"]:>3d}')
print(f'  ⚠ Pequena diff (0,1-1%):   {resumo["diff_small"]:>3d}')
print(f'  ❌ DIFF > 1% (corrigir):    {resumo["diff_big"]:>3d}')
print(f'  ❌ Não-implem no TS:        {resumo["missing_ts"]:>3d}')
print(f'  ⚠ Só em TS (ñ-comparável): {resumo["missing_py"]:>3d}')
print('='*92)
