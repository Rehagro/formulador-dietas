"""
Validação cruzada — roda o motor oficial NASEM 2021 (Python, U. Guelph) com
a dieta do demo lactating_cow_test (4 alimentos), DMIn_eqn=0 (sem rescale),
e grava resultados em validate_nasem_py.json.

Usa Python 3.12 + nasem_dairy==1.0.2.
"""
import json, os, sys
import pandas as pd
import nasem_dairy as nd

# 1) Carrega demo
user_diet, animal_input, equation_selection, infusion_input = nd.demo('lactating_cow_test')

# 2) Garante DMIn_eqn=0 (diet kg vem do usuário, sem rescale)
equation_selection['DMIn_eqn'] = 0

# 3) Executa
out = nd.nasem(user_diet, animal_input, equation_selection,
               infusion_input=infusion_input)

# 4) Extrai variáveis relevantes
def gv(k):
    try:
        v = out.get_value(k)
        return float(v) if v is not None and not isinstance(v, str) else v
    except Exception:
        return None

result = {
    # Inputs (eco)
    'animal_input': {k: (float(v) if isinstance(v, (int, float)) else v)
                     for k, v in animal_input.items()},
    'user_diet': user_diet.to_dict(orient='records'),

    # Intakes
    'Dt_DMIn':         gv('Dt_DMIn'),
    'An_DMIn':         gv('An_DMIn'),
    'Trg_Dt_DMIn':     gv('Trg_Dt_DMIn'),

    # Diet composition (% MS — NASEM expressa em %)
    'Dt_CP_pct':       gv('Dt_CP'),
    'Dt_NDF_pct':      gv('Dt_NDF'),
    'Dt_ADF_pct':      gv('Dt_ADF'),
    'Dt_St_pct':       gv('Dt_St'),
    'Dt_CFat_pct':     gv('Dt_CFat'),
    'Dt_Ash_pct':      gv('Dt_Ash'),

    # Protein partitioning
    'An_RDPIn':        gv('An_RDPIn'),
    'An_RUPIn':        gv('An_RUPIn'),
    'An_idRUPIn':      gv('An_idRUPIn'),

    # Microbial protein
    'Du_MiCP_g':       gv('Du_MiCP_g'),
    'Du_MiCP':         gv('Du_MiCP'),
    'Du_idMiCP_g':     gv('Du_idMiCP_g'),
    'Du_idMiTP_g':     gv('Du_idMiTP_g'),

    # MP supply & uses
    'An_MPIn':         gv('An_MPIn'),
    'An_MPIn_g':       gv('An_MPIn_g'),
    'An_MPm_g_Trg':    gv('An_MPm_g_Trg'),
    'Gest_MPUse_g_Trg':gv('Gest_MPUse_g_Trg'),
    'Body_MPUse_g_Trg':gv('Body_MPUse_g_Trg'),
    'Scrf_MPUse_g_Trg':gv('Scrf_MPUse_g_Trg'),
    'An_MPavail_Milk_Trg': gv('An_MPavail_Milk_Trg'),
    'Mlk_NP_g':        gv('Mlk_NP_g'),

    # Energy
    'An_DEIn':         gv('An_DEIn'),
    'An_MEIn':         gv('An_MEIn'),
    'An_DE':           gv('An_DE'),    # Mcal/kg DM
    'An_ME':           gv('An_ME'),
    'An_NE':           gv('An_NE'),
    'An_NELuse':       gv('An_NELuse'),
    'Trg_NEmilkOut':   gv('Trg_NEmilkOut'),

    # Milk predictions
    'Mlk_Prod':        gv('Mlk_Prod'),
    'Mlk_Prod_comp':   gv('Mlk_Prod_comp'),
    'Mlk_Prod_NEalow': gv('Mlk_Prod_NEalow'),
    'Mlk_Prod_MPalow': gv('Mlk_Prod_MPalow'),

    # Digestibilities
    'Dt_dcNDF':        gv('Dt_dcNDF'),
    'Dt_dcSt':         gv('Dt_dcSt'),

    # Intermediários da cadeia de energia (Eq. 20-182)
    'Dt_DigNDFIn':         gv('Dt_DigNDFIn'),
    'Dt_DigNDFIn_Base':    gv('Dt_DigNDFIn_Base'),
    'Dt_DigStIn':          gv('Dt_DigStIn'),
    'Dt_DigStIn_Base':     gv('Dt_DigStIn_Base'),
    'Dt_DigFAIn':          gv('Dt_DigFAIn'),
    'Dt_DigCPaIn':         gv('Dt_DigCPaIn'),
    'Dt_DigrOMaIn':        gv('Dt_DigrOMaIn'),
    'Fe_CPend':            gv('Fe_CPend'),
    'Ur_DEout':            gv('Ur_DEout'),
    'An_GasEOut':          gv('An_GasEOut'),
    'Dt_DigNDF_pct':       gv('Dt_DigNDF'),      # % MS
    'Dt_DigSt_pct':        gv('Dt_DigSt'),
    'Dt_DigFA_FA_pct':     gv('Dt_DigFA_FA'),
    'Dt_ForNDF_pct':       gv('Dt_ForNDF'),
    'Dt_ForNDF_NDF_pct':   gv('Dt_ForNDF_NDF'),
    'Use_DNDF_IV':         equation_selection.get('Use_DNDF_IV'),
}

out_path = os.path.join(os.path.dirname(__file__), 'validate_nasem_py.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(result, f, indent=2, default=str)

print(f"Wrote {out_path}")
print(f"--- KEY VALUES ---")
for k in ['Dt_DMIn','Dt_CP_pct','Dt_NDF_pct','Dt_St_pct',
          'An_RDPIn','An_RUPIn','Du_MiCP_g','Du_idMiTP_g',
          'An_MPIn_g','An_MPm_g_Trg','Gest_MPUse_g_Trg',
          'Dt_DigNDFIn','Dt_DigStIn','Dt_DigFAIn','Dt_DigCPaIn','Dt_DigrOMaIn',
          'Fe_CPend','Ur_DEout','An_GasEOut',
          'An_DEIn','An_MEIn','An_DE','An_ME','An_NE',
          'Mlk_Prod_NEalow','Mlk_Prod_MPalow']:
    print(f"  {k:24s} = {result[k]}")
