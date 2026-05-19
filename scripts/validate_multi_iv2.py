"""
Validação cruzada usando Use_DNDF_IV=2 no NASEM Py (mesmo método do nosso
motor com ndf_method='iv_all'). Salva intermediários da cadeia de energia
para diagnóstico granular do gap residual em NEL.
"""
import json, os, sys, pandas as pd
sys.path.insert(0, os.path.dirname(__file__))
from validate_multi_scenarios import SCENARIOS
import nasem_dairy as nd

EQ = {
    'Use_DNDF_IV': 2,   # IVNDFD48 para tudo — comparação justa com motor TS
    'DMIn_eqn': 0,
    'mProd_eqn': 0,
    'MiN_eqn': 1,
    'NonMilkCP_ClfLiq': 0,
    'Monensin_eqn': 0,
    'mPrt_eqn': 0,
    'mFat_eqn': 1,
    'RumDevDisc_Clf': 0,
}

KEYS = [
    'Dt_DMIn', 'Dt_CP', 'Dt_NDF', 'Dt_St', 'Dt_FA',
    'Dt_DigNDFIn', 'Dt_DigStIn', 'Dt_DigFAIn', 'Dt_DigCPaIn', 'Dt_DigrOMaIn',
    'Fe_CPend', 'Fe_rOMend', 'Ur_DEout', 'Ur_Nout_g',
    'An_GasEOut', 'An_DigNDF', 'Dt_FAIn',
    'An_DEIn', 'An_MEIn', 'An_NE',
    'An_MEmUse', 'An_MEgain', 'Gest_MEuse',
    'Mlk_Prod_NEalow', 'Mlk_Prod_MPalow',
]

results = {}
for name, scen in SCENARIOS.items():
    df = pd.DataFrame({'Feedstuff': list(scen['diet_kg_dm'].keys()),
                       'kg_user':   list(scen['diet_kg_dm'].values())})
    ai = dict(scen['animal_input']); ai['Trg_Dt_DMIn'] = sum(scen['diet_kg_dm'].values())
    out = nd.nasem(df, ai, EQ)
    rec = {}
    for k in KEYS:
        try:
            v = out.get_value(k)
            rec[k] = float(v) if v is not None and not isinstance(v, str) else None
        except Exception:
            rec[k] = None
    results[name] = rec
    print(f"{name}: DE={rec['An_DEIn']:.2f}  GasE={rec['An_GasEOut']:.2f}  "
          f"DigFA={rec['Dt_DigFAIn']:.3f}  Mlk_NE={rec['Mlk_Prod_NEalow']:.2f}")

dst = os.path.join(os.path.dirname(__file__), 'validate_multi_py_IV2_full.json')
with open(dst, 'w') as f:
    json.dump(results, f, indent=2)
print(f'\nWrote {dst}')
