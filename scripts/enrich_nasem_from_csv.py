"""
Extrai Fd_dcSt, Fd_NPN_CP, Fd_dcFA do NASEM_feed_library.csv (que vem com
nasem_dairy) e produz nasem_t191_extra.json indexado por nrc_id (UID).

Estes 3 campos não estão na Tabela 19-1 impressa do PDF, mas existem no
software oficial. Necessários para:
  - dc_st: Fase 1.4 (dcSt per-feed em vez de 92% fixo)
  - npn_frac: Fase 1.1 (rOM precisa subtrair NPN_DM separado)
  - dc_fa: Fase 1.2 (FA digestibility por classe — Tabela 4-1 NASEM)
"""
import json, os
import pandas as pd
import nasem_dairy

PKG = os.path.dirname(nasem_dairy.__file__)
CSV = os.path.join(PKG, 'data/feed_library/NASEM_feed_library.csv')
fl = pd.read_csv(CSV)

out = {}
# Frações de ácidos graxos insaturados (% do FA total). Soma → fração insaturada.
UNSAT_COLS = ['Fd_C161_FA', 'Fd_C181t_FA', 'Fd_C181c_FA', 'Fd_C182_FA', 'Fd_C183_FA']

# Mapeamento campos CSV → chaves do nasem_t191_extra (e tipo: % ou direto)
# Todos exportados como veem no CSV (% DM ou % CP). O consumidor (rebuild_alimentos)
# decide a conversão final.
CSV_FIELDS = [
    # Composição básica (% DM)
    ('Fd_DM',     'dm'),
    ('Fd_CP',     'cp'),
    ('Fd_NDF',    'ndf'),
    ('Fd_ADF',    'adf'),
    ('Fd_St',     'starch'),
    ('Fd_CFat',   'ee'),
    ('Fd_Ash',    'ash'),
    ('Fd_Lg',     'lignin'),
    ('Fd_WSC',    'wsc'),
    # Frações proteicas (% CP)
    ('Fd_CPARU',  'cpa'),
    ('Fd_CPBRU',  'cpb'),
    ('Fd_CPCRU',  'cpc'),
    ('Fd_KdRUP',  'kd_prot'),
    ('Fd_dcRUP',  'drup'),
    ('Fd_CPs_CP', 'sp'),   # soluble protein % CP
    ('Fd_NDFIP',  'ndip'),
    ('Fd_ADFIP',  'adip'),
    ('Fd_DNDF48_NDF', 'ivndfd48'),
    # Energia
    ('Fd_DE_Base','de_base'),
    # Minerais (% DM)
    ('Fd_Ca',     'ca'),
    ('Fd_P',      'p'),
    ('Fd_Mg',     'mg'),
    ('Fd_K',      'k'),
    ('Fd_Na',     'na'),
    ('Fd_Cl',     'cl'),
    ('Fd_S',      's'),
    # Microminerais (mg/kg DM)
    ('Fd_Cu',     'cu'),
    ('Fd_Fe',     'fe'),
    ('Fd_Mn',     'mn'),
    ('Fd_Zn',     'zn'),
    ('Fd_Mo',     'mo'),
]

for _, r in fl.iterrows():
    uid = r['UID']
    if not isinstance(uid, str) or not uid.startswith('NRC16F'):
        continue
    rec = {'nrc_id': uid, 'name': r['Fd_Name']}

    for csv_col, key in CSV_FIELDS:
        v = r.get(csv_col)
        if pd.notna(v):
            rec[key] = float(v)

    # Campos novos Fase 1 (FA, dcSt, NPN, dcFA)
    if pd.notna(r.get('Fd_dcSt')):     rec['dc_st']     = float(r['Fd_dcSt'])     # %
    if pd.notna(r.get('Fd_NPN_CP')):   rec['npn_cp']    = float(r['Fd_NPN_CP'])   # % of CP
    if pd.notna(r.get('Fd_dcFA')):     rec['dc_fa']     = float(r['Fd_dcFA'])     # %
    if pd.notna(r.get('Fd_FA')):       rec['fa']        = float(r['Fd_FA'])       # % DM

    # EE insaturado (% MS) — soma das frações insaturadas (% do FA) × FA total.
    fa = r.get('Fd_FA')
    if pd.notna(fa) and float(fa) > 0:
        unsat_pct_FA = 0.0
        any_present = False
        for c in UNSAT_COLS:
            v = r.get(c)
            if pd.notna(v):
                unsat_pct_FA += float(v)
                any_present = True
        if any_present:
            rec['ee_insat'] = float(fa) * unsat_pct_FA / 100   # % MS

    out[uid] = rec

dst = r'C:/Users/rasaf/nasem_t191_extra.json'
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)
print(f'Wrote {dst} -> {len(out)} feeds')
print('Sample (Alfalfa meal NRC16F1):', out.get('NRC16F1'))
print('Sample (Urea — NPN=100):',
      next((v for v in out.values() if v['name'].lower()=='urea'), None))
