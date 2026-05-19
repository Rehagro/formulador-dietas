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
for _, r in fl.iterrows():
    uid = r['UID']
    if not isinstance(uid, str) or not uid.startswith('NRC16F'):
        continue
    rec = {'nrc_id': uid, 'name': r['Fd_Name']}
    if pd.notna(r.get('Fd_dcSt')):     rec['dc_st']     = float(r['Fd_dcSt'])     # %
    if pd.notna(r.get('Fd_NPN_CP')):   rec['npn_cp']    = float(r['Fd_NPN_CP'])   # % of CP
    if pd.notna(r.get('Fd_dcFA')):     rec['dc_fa']     = float(r['Fd_dcFA'])     # %
    if pd.notna(r.get('Fd_FA')):       rec['fa']        = float(r['Fd_FA'])       # % DM
    out[uid] = rec

dst = r'C:/Users/rasaf/nasem_t191_extra.json'
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(out, f, indent=2)
print(f'Wrote {dst} -> {len(out)} feeds')
print('Sample (Alfalfa meal NRC16F1):', out.get('NRC16F1'))
print('Sample (Urea — NPN=100):',
      next((v for v in out.values() if v['name'].lower()=='urea'), None))
