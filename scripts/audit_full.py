"""
Auditoria COMPLETA: compara cada alimento do banco (src/data/alimentos.json) que
tem `fonte_nasem` contra a feed library oficial do nasem_dairy, campo a campo.

Reporta: (a) campos NULOS no banco que o NASEM tem; (b) divergências de valor.
Emite scripts/audit_full_issues.json com os valores corretos para o passo de fix.

Uso: PYTHONUTF8=1 py -3.12 scripts/audit_full.py
"""
import os, json, pandas as pd, nasem_dairy
from collections import defaultdict

pkg = os.path.dirname(nasem_dairy.__file__)
fl = pd.read_csv(os.path.join(pkg, 'data/feed_library/NASEM_feed_library.csv'))
import re
by_name_ci = {str(r['Fd_Name']).strip().lower(): r for _, r in fl.iterrows()}
by_uid = {str(r['UID']): r for _, r in fl.iterrows()}
def _norm(s): return re.sub(r'[^a-z0-9]', '', str(s).lower())
by_name_norm = {_norm(r['Fd_Name']): r for _, r in fl.iterrows()}

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
db = json.load(open(os.path.join(ROOT, 'src/data/alimentos.json'), encoding='utf-8'))

# mapa fonte_nasem -> uid (via tabela 19-1 parseada)
nome_to_uid = {}
try:
    t191 = json.load(open(r'C:/Users/rasaf/nasem_t191.json', encoding='utf-8'))
    nome_to_uid = {v['nome_nasem'].lower().strip(): v['nrc_id']
                   for v in t191.values() if v.get('nome_nasem') and v.get('nrc_id')}
except Exception as e:
    print('aviso: t191 indisponível:', e)


# Aliases: nomes do nosso fonte_nasem que não batem exatamente com a CSV mas são
# comprovadamente o MESMO alimento (PB/MS/FDN idênticos). Verificado em 2026-06-02.
ALIASES = {
    'apple pomace by-product, wet': 'Apple pomace or byproduct, wet',
    'canola meal, high protein':    'Canola meal',
    'distillers solubles, wet':     'Distillers solubles',
}


def match_row(fonte):
    key = fonte.strip().lower()
    if key in ALIASES:
        return by_name_ci[ALIASES[key].strip().lower()]
    if key in by_name_ci:
        return by_name_ci[key]
    uid = nome_to_uid.get(key)
    if uid and str(uid) in by_uid:
        return by_uid[str(uid)]
    nk = _norm(fonte)
    if nk in by_name_norm:
        return by_name_norm[nk]
    return None


# (our_key, csv_col, kind)  kind: 'pct' (banco fração, csv %), 'direct' (mesma escala)
FIELDS = [
    ('ms','Fd_DM','pct'), ('pb','Fd_CP','pct'), ('fdn','Fd_NDF','pct'),
    ('fda','Fd_ADF','pct'), ('amido','Fd_St','pct'), ('ee','Fd_CFat','pct'),
    ('cinza','Fd_Ash','pct'), ('lignin','Fd_Lg','pct'), ('wsc','Fd_WSC','pct'),
    ('fa','Fd_FA','pct'), ('adip','Fd_ADFIP','pct'), ('ndip','Fd_NDFIP','pct'),
    ('soluble_protein','Fd_CPs_CP','pct'), ('npn_frac','Fd_NPN_CP','pct'),
    ('rup_digest','Fd_dcRUP','pct'),
    ('prot_a','Fd_CPARU','direct'), ('prot_b','Fd_CPBRU','direct'),
    ('prot_c','Fd_CPCRU','direct'), ('kd_prot','Fd_KdRUP','direct'),
    ('dc_st','Fd_dcSt','direct'), ('dc_fa','Fd_dcFA','direct'),
    ('ivndfd48','Fd_DNDF48_NDF','direct'), ('de_base','Fd_DE_Base','direct'),
    ('ca','Fd_Ca','pct'), ('p','Fd_P','pct'), ('mg','Fd_Mg','pct'),
    ('k','Fd_K','pct'), ('s','Fd_S','pct'), ('na','Fd_Na','pct'), ('cl','Fd_Cl','pct'),
    ('co','Fd_Co','direct'), ('cu','Fd_Cu','direct'), ('mn_min','Fd_Mn','direct'),
    ('zn','Fd_Zn','direct'), ('se','Fd_Se','direct'), ('i','Fd_I','direct'),
    ('fe','Fd_Fe','direct'), ('mo','Fd_Mo','direct'), ('cr','Fd_Cr','direct'),
    ('vit_a','Fd_VitA','direct'), ('vit_d3','Fd_VitD','direct'),
    ('vit_e','Fd_VitE','direct'), ('biotina','Fd_Biotin','direct'),
]


def csv_to_our(csv_val, kind):
    if pd.isna(csv_val):
        return None
    return round(float(csv_val) / 100, 6) if kind == 'pct' else round(float(csv_val), 5)


def expected_aa(row, aa_col):
    """met/lys do banco = Fd_XX_CP/100 * Fd_CP/100 (kg/kg MS)."""
    aa = row.get(aa_col); cp = row.get('Fd_CP')
    if pd.isna(aa) or pd.isna(cp):
        return None
    return round(float(aa) / 100 * float(cp) / 100, 6)


null_count = defaultdict(int)
diff_count = defaultdict(int)
issues = {}            # nome -> {campo: valor_correto}
sem_match = []

for a in db:
    if not a.get('fonte_nasem'):
        continue
    row = match_row(a['fonte_nasem'])
    if row is None:
        sem_match.append((a['nome'], a['fonte_nasem']))
        continue
    fix = {}
    for our_key, csv_col, kind in FIELDS:
        exp = csv_to_our(row.get(csv_col), kind)
        if exp is None:
            continue
        cur = a.get(our_key)
        if cur is None:
            null_count[our_key] += 1
            fix[our_key] = exp
        else:
            rel = abs(cur - exp) / abs(exp) if exp != 0 else (0 if cur == 0 else 1)
            if abs(cur - exp) > 1e-4 and rel > 0.01:
                diff_count[our_key] += 1
                fix[our_key] = exp
    # met / lys
    for our_key, aa_col in [('met', 'Fd_Met_CP'), ('lys', 'Fd_Lys_CP')]:
        exp = expected_aa(row, aa_col)
        if exp is None:
            continue
        cur = a.get(our_key)
        if cur is None:
            null_count[our_key] += 1
            fix[our_key] = exp
        elif abs(cur - exp) > 1e-5 and (exp == 0 or abs(cur - exp)/abs(exp) > 0.01):
            diff_count[our_key] += 1
            fix[our_key] = exp
    if fix:
        issues[a['nome']] = fix

print(f'Banco: {len(db)} alimentos | com fonte_nasem: {sum(1 for a in db if a.get("fonte_nasem"))}')
print(f'Sem match na CSV NASEM: {len(sem_match)}')
for n, f in sem_match:
    print(f'   - {n}  (fonte_nasem="{f}")')
print()
print('=== CAMPOS NULOS no banco que o NASEM tem (precisam preencher) ===')
for k, v in sorted(null_count.items(), key=lambda x: -x[1]):
    print(f'   {k:18s} {v:4d} alimentos')
print()
print('=== DIVERGÊNCIAS de valor (banco ≠ NASEM, >1%) ===')
if diff_count:
    for k, v in sorted(diff_count.items(), key=lambda x: -x[1]):
        print(f'   {k:18s} {v:4d} alimentos')
else:
    print('   (nenhuma)')
print()
print(f'Total de alimentos com ao menos 1 correção: {len(issues)}')
json.dump(issues, open(os.path.join(HERE, 'audit_full_issues.json'), 'w', encoding='utf-8'),
          indent=2, ensure_ascii=False)
print('Escrito scripts/audit_full_issues.json')
