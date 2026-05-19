"""
Lê validate_nasem_py.json (motor oficial Guelph) e validate_nasem_ts.json
(nosso motor), compara campo-a-campo e imprime uma tabela com Δ absoluto e %.
"""
import json, os, sys

HERE = os.path.dirname(__file__)
py = json.load(open(os.path.join(HERE, 'validate_nasem_py.json'), encoding='utf-8'))
ts = json.load(open(os.path.join(HERE, 'validate_nasem_ts.json'), encoding='utf-8'))

# Pares (rótulo, valor_py, valor_ts, unidade)
pairs = [
    ('Diet DMI (kg/d)',                py['Dt_DMIn'],            ts['Dt_DMIn'],              'kg/d'),
    ('DMI predito Eq.20-21 (kg/d)',    None,                     ts['CMS_predita_Eq20_21'], 'kg/d'),  # Guelph com DMIn_eqn=0 não prediz
    ('Proteina Bruta (% MS)',          py['Dt_CP_pct'],          ts['Dt_CP_pct'],           '%'),
    ('FDN dieta (% MS)',               py['Dt_NDF_pct'],         ts['Dt_NDF_pct'],          '%'),
    ('FDA dieta (% MS)',               py['Dt_ADF_pct'],         ts['Dt_ADF_pct'],          '%'),
    ('Amido dieta (% MS)',             py['Dt_St_pct'],          ts['Dt_St_pct'],           '%'),
    ('EE dieta (% MS)',                py['Dt_CFat_pct'],        ts['Dt_CFat_pct'],         '%'),
    ('RDP total (kg/d)',               py['An_RDPIn'],           None,                       'kg/d'),
    ('RUP total (kg/d)',               py['An_RUPIn'],           None,                       'kg/d'),
    ('Microbial CP (g/d)',             py['Du_MiCP_g'],          None,                       'g/d'),
    ('idMiTP (g/d)',                   py['Du_idMiTP_g'],        None,                       'g/d'),
    ('MP supply (g/d)',                py['An_MPIn_g'],          None,                       'g/d'),
    ('MP maintenance (g/d)',           py['An_MPm_g_Trg'],       None,                       'g/d'),
    ('MP gestacao (g/d)',              py['Gest_MPUse_g_Trg'],   None,                       'g/d'),
    ('DE intake (Mcal/d)',             py['An_DEIn'],            ts['An_DEIn_calc'],        'Mcal/d'),
    ('ME intake (Mcal/d)',             py['An_MEIn'],            ts['An_MEIn_calc'],        'Mcal/d'),
    ('DE densidade (Mcal/kg)',         py['An_DE'],              ts['Dt_DE_Mcal_kg'],       'Mcal/kg'),
    ('ME densidade (Mcal/kg)',         py['An_ME'],              ts['Dt_ME_Mcal_kg'],       'Mcal/kg'),
    ('NEL densidade (Mcal/kg)',        py['An_NE'],              ts['Dt_NEL_Mcal_kg'],      'Mcal/kg'),
    ('Leite por NEL (kg/d)',           py['Mlk_Prod_NEalow'],    ts['Mlk_Prod_NEalow_TS'],  'kg/d'),
    ('Leite por MP (kg/d)',            py['Mlk_Prod_MPalow'],    ts['Mlk_Prod_MPalow_TS'],  'kg/d'),
]

def fmt(v):
    if v is None: return '—'
    return f'{v:.4f}' if abs(v) < 100 else f'{v:.2f}'

print('\n=== Validação cruzada: nasem_dairy (Guelph)  vs  Motor TS (Formulador-Dietas) ===')
print('Caso-teste: Holstein primípara 624.8 kg, 100 DEL, 25.06 kg leite, gestação 46 d')
print('Dieta:  Alfalfa meal 8.21 + Canola meal 6.73 + Silagem milho 5.47 + Milho HM 4.11 (kg DM)\n')

print(f'{"Variavel":<32} {"NASEM Py":>12} {"Motor TS":>12} {"diff abs":>10} {"diff %":>8}  Unid')
print('-' * 92)
for label, vpy, vts, unit in pairs:
    if vpy is None or vts is None:
        delta = ''
        pct = ''
    else:
        delta = f'{vts - vpy:+.4f}' if abs(vts - vpy) < 100 else f'{vts - vpy:+.2f}'
        pct = f'{(vts - vpy) / vpy * 100:+.2f}%' if vpy != 0 else 'n/a'
    print(f'{label:<32} {fmt(vpy):>12} {fmt(vts):>12} {delta:>10} {pct:>8}  {unit}')

print('\n=== Fim ===')
