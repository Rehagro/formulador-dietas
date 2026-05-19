"""
Lê validate_multi_py.json + validate_multi_ts.json e gera tabela comparativa
para os 4 cenários. Foco: confirmar se as 5 divergências de método explicam
o gap em qualquer dieta.
"""
import json, os

HERE = os.path.dirname(__file__)
py = json.load(open(os.path.join(HERE, 'validate_multi_py.json'), encoding='utf-8'))
ts = json.load(open(os.path.join(HERE, 'validate_multi_ts.json'), encoding='utf-8'))

# Heats of combustion (mesmos coef NASEM 2021 Tabela 20-9)
H = {'NDF': 4.20, 'St': 4.23, 'FA': 9.40, 'CP': 5.65, 'rOM': 4.00}


def pct(num, den):
    return f'{(num/den*100):+.1f}%' if den != 0 else 'n/a'


print('=' * 110)
print('VALIDAÇÃO MULTI-CENÁRIO — Motor TS vs NASEM Py (CNM/Guelph)')
print('=' * 110)

for name in py:
    p = py[name]
    t = ts[name]
    d = t['debug']
    print(f'\n## Cenário {name}: {p["description"]}')

    # 1. Composições (esperam-se zeros)
    print('\n  Composições (% MS) — devem bater 100%:')
    for label, kp, kt in [
        ('DMI (kg/d)',  'Dt_DMIn', 'Dt_DMIn'),
        ('CP',  'Dt_CP_pct', 'Dt_CP_pct'),
        ('NDF', 'Dt_NDF_pct', 'Dt_NDF_pct'),
        ('St',  'Dt_St_pct', 'Dt_St_pct'),
        ('CFat','Dt_CFat_pct', 'Dt_CFat_pct'),
    ]:
        vp, vt = p[kp], t[kt]
        if vp and vt:
            print(f'    {label:14s} Py={vp:8.3f}  TS={vt:8.3f}  Δ={vt-vp:+.4f}  ({pct(vt-vp, vp)})')

    # 2. Componentes da DE
    print('\n  Componentes DE (Eq. 20-182) — kg digerido/d:')
    diff_de_parts = []
    for label, kp, kt, h, item in [
        ('NDF',  'Dt_DigNDFIn',  'Dt_DigNDFIn',  H['NDF'], '20-111 vs 20-112'),
        ('St',   'Dt_DigStIn',   'Dt_DigStIn',   H['St'],  'dcSt 92% vs per-feed'),
        ('FA',   'Dt_DigFAIn',   'Dt_DigFAIn',   H['FA'],  'Fd_CFat vs Fd_FA'),
        ('CP_a', 'Dt_DigCPaIn',  None,           H['CP'],  '~match'),
        ('rOM',  'Dt_DigrOMaIn', 'Dt_DigrOMIn',  H['rOM'], 'fórmula simplificada'),
    ]:
        vp = p[kp]
        vt = d[kt] if kt else None
        if vp is None: continue
        diff_de = (vt - vp) * h if vt is not None else None
        if diff_de is not None:
            diff_de_parts.append((label, diff_de))
        delta = f'{vt - vp:+.4f}' if vt is not None else '   ?  '
        dE = f'{diff_de:+.3f} Mcal' if diff_de is not None else ''
        print(f'    {label:5s} Py={vp:.4f}  TS={vt if vt is not None else "?":>8}  Δ={delta:>9}  → Δ DE = {dE}  [{item}]')

    # 3. DE / ME / NEL final
    print('\n  Saídas (Mcal/d e Mcal/kg):')
    # Derive TS Ur_DEout from DE - ME - GasE
    ur_ts = None
    if t.get('An_DEIn_calc') is not None and t.get('An_MEIn_calc') is not None and d.get('An_GasEOut') is not None:
        ur_ts = t['An_DEIn_calc'] - t['An_MEIn_calc'] - d['An_GasEOut']
    rows = [
        ('DE intake (Mcal/d)',   p['An_DEIn'],  t['An_DEIn_calc']),
        ('ME intake (Mcal/d)',   p['An_MEIn'],  t['An_MEIn_calc']),
        ('Ur_DEout (Mcal/d)',    p['Ur_DEout'], ur_ts),
        ('GasE   (Mcal/d)',      p['An_GasEOut'], d.get('An_GasEOut')),
        ('NE densidade Mcal/kg', p['An_NE'],    t['Dt_NEL_Mcal_kg']),
        ('Mlk_Prod_NEalow kg/d', p['Mlk_Prod_NEalow'], t['Mlk_Prod_NEalow']),
        ('Mlk_Prod_MPalow kg/d', p['Mlk_Prod_MPalow'], t['Mlk_Prod_MPalow']),
    ]
    for label, vp, ts_v in rows:
        if vp is None or ts_v is None:
            print(f'    {label:30s} Py={str(vp):>8}  TS={str(ts_v):>8}')
            continue
        print(f'    {label:30s} Py={vp:8.3f}  TS={ts_v:8.3f}  diff={ts_v-vp:+.4f}  ({pct(ts_v-vp, vp)})')

    # 4. Resumo: soma do efeito dos 5 itens
    total_de_diff = sum(x for _, x in diff_de_parts)
    measured_de_diff = t['An_DEIn_calc'] - p['An_DEIn']
    print(f'\n  >>> Resumo DE diff:')
    print(f'    Σ Δ por componente = {total_de_diff:+.3f} Mcal/d')
    print(f'    DE diff observada  = {measured_de_diff:+.3f} Mcal/d')
    print(f'    Resíduo            = {measured_de_diff - total_de_diff:+.4f} Mcal/d')

print('\n' + '=' * 110)
print('CONCLUSÃO: se "Resíduo" ≈ 0 nos 4 cenários → as 5 divergências explicam todo o gap.')
print('=' * 110)
