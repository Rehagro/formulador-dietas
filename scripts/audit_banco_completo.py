"""
Audita TODOS os campos do banco (src/data/alimentos.json) contra o CSV
oficial do nasem_dairy. Reporta qualquer divergência > 1% E > 0,5 pp.

Critério mais rigoroso que o anterior (>10% e >2pp).
"""
import json, pandas as pd, os, nasem_dairy

pkg = os.path.dirname(nasem_dairy.__file__)
fl  = pd.read_csv(os.path.join(pkg, 'data/feed_library/NASEM_feed_library.csv'))
nasem_by_uid = {r['UID']: r for _, r in fl.iterrows()}

ali = json.load(open(r'C:/Users/rasaf/rehagro-cs-engajamento/formulador-dietas/src/data/alimentos.json', encoding='utf-8'))
nasem = json.load(open(r'C:/Users/rasaf/nasem_t191.json', encoding='utf-8'))
nome_to_uid = {v['nome_nasem'].lower().strip(): v['nrc_id']
               for v in nasem.values() if v.get('nome_nasem') and v.get('nrc_id')}

# Pares (chave_banco, coluna_csv, escala_csv) — escala = "% MS" (CSV em %, banco em fração)
#  → multiplica banco por 100 para comparar com CSV. "direto" = mesma escala.
COMPARE = [
    ('ms',           'Fd_DM',     '%'),
    ('pb',           'Fd_CP',     '%'),
    ('fdn',          'Fd_NDF',    '%'),
    ('fda',          'Fd_ADF',    '%'),
    ('amido',        'Fd_St',     '%'),
    ('ee',           'Fd_CFat',   '%'),
    ('cinza',        'Fd_Ash',    '%'),
    ('lignin',       'Fd_Lg',     '%'),
    ('wsc',          'Fd_WSC',    '%'),
    ('prot_a',       'Fd_CPARU',  'direto'),
    ('prot_b',       'Fd_CPBRU',  'direto'),
    ('prot_c',       'Fd_CPCRU',  'direto'),
    ('kd_prot',      'Fd_KdRUP',  'direto'),
    ('rup_digest',   'Fd_dcRUP',  '%'),  # banco em fração, CSV em %
    ('soluble_protein','Fd_CPs_CP','%'),
    ('adip',         'Fd_ADFIP',  '%'),
    ('ndip',         'Fd_NDFIP',  '%'),
    ('ivndfd48',     'Fd_DNDF48_NDF', 'direto'),
    ('de_base',      'Fd_DE_Base','direto'),
    ('ca',           'Fd_Ca',     '%'),
    ('p',            'Fd_P',      '%'),
    ('mg',           'Fd_Mg',     '%'),
    ('k',            'Fd_K',      '%'),
    ('na',           'Fd_Na',     '%'),
    ('cl',           'Fd_Cl',     '%'),
    ('s',            'Fd_S',      '%'),
    ('cu',           'Fd_Cu',     'direto'),
    ('fe',           'Fd_Fe',     'direto'),
    ('mn_min',       'Fd_Mn',     'direto'),
    ('zn',           'Fd_Zn',     'direto'),
    ('mo',           'Fd_Mo',     'direto'),
    ('fa',           'Fd_FA',     '%'),
    ('dc_st',        'Fd_dcSt',   'direto'),
    ('dc_fa',        'Fd_dcFA',   'direto'),
]

outliers = []   # [(nome, [(campo, our, csv, diff), ...])]
sem_match = []

for x in ali:
    if not x.get('fonte_nasem'):
        continue  # M brasileiros — não temos referência
    uid = nome_to_uid.get(x['fonte_nasem'].lower().strip())
    if not uid or uid not in nasem_by_uid:
        sem_match.append(x['nome'])
        continue
    csv_row = nasem_by_uid[uid]
    diffs = []
    for our_key, csv_key, escala in COMPARE:
        ours = x.get(our_key)
        csv  = csv_row.get(csv_key)
        if ours is None or pd.isna(csv) or csv is None:
            continue
        ours_compare = ours * 100 if escala == '%' else ours
        diff = ours_compare - csv
        pct = (diff / csv * 100) if csv != 0 else 0
        if abs(diff) > 0.5 and abs(pct) > 1.0:   # >0,5pp E >1%
            diffs.append((our_key, ours_compare, csv, diff, pct))
    if diffs:
        outliers.append((x['nome'], diffs))

print(f'Banco: {len(ali)} alimentos · 145 NASEM · 14 M brasileiros')
print(f'Sem match NASEM (esperado ≈ 14 brasileiros): {len(sem_match)}')
print()
print(f'>>> Alimentos com divergência > 1% E > 0,5pp vs CSV oficial: {len(outliers)}')
print()
if outliers:
    for nome, diffs in outliers:
        print(f'⚠ {nome}:')
        for c, o, n, d, p in diffs:
            print(f'    {c:18s} banco={o:8.3f}  CSV={n:8.3f}  Δ={d:+7.3f} ({p:+6.1f}%)')
else:
    print('✓ Banco 100% alinhado com CSV oficial (margem 1%).')
