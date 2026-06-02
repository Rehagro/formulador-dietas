"""
Aplica scripts/audit_full_issues.json em src/data/alimentos.json:
preenche nulos e corrige met/lys divergentes com os valores oficiais do NASEM.
Atualiza chaves IN-PLACE (preserva ordem e demais campos).

Uso: PYTHONUTF8=1 py -3.12 scripts/apply_audit_fix.py
"""
import os, json

HERE = os.path.dirname(__file__)
ROOT = os.path.dirname(HERE)
PATH = os.path.join(ROOT, 'src/data/alimentos.json')

db = json.load(open(PATH, encoding='utf-8'))
issues = json.load(open(os.path.join(HERE, 'audit_full_issues.json'), encoding='utf-8'))

n_feeds = 0
n_fields = 0
for a in db:
    fix = issues.get(a['nome'])
    if not fix:
        continue
    n_feeds += 1
    for k, v in fix.items():
        a[k] = v            # chave já existe no schema -> ordem preservada
        n_fields += 1

with open(PATH, 'w', encoding='utf-8') as f:
    json.dump(db, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f'Aplicado: {n_feeds} alimentos, {n_fields} campos atualizados.')
