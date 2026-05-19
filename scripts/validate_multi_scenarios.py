"""
Roda nasem_dairy em 4 cenários distintos e grava os intermediários da cadeia
de energia para cada um. Também monta os arquivos de input que o motor TS lê.

Saída: validate_multi_py.json + validate_multi_inputs.json
"""
import json, os
import pandas as pd
import nasem_dairy as nd

HERE = os.path.dirname(__file__)
PKG_DIR = os.path.dirname(nd.__file__)
FL = pd.read_csv(os.path.join(PKG_DIR, 'data/feed_library/NASEM_feed_library.csv'))

# 4 cenários de teste
SCENARIOS = {
    'A_lact_test': {
        'description': 'Holstein primipara mid-lact (demo lactating_cow_test)',
        'animal_input': {
            'An_Parity_rl': 1, 'Trg_MilkProd': 25.062, 'An_BW': 624.795, 'An_BCS': 3,
            'An_LactDay': 100, 'Trg_MilkFatp': 4.55, 'Trg_MilkTPp': 3.66, 'Trg_MilkLacp': 4.85,
            'Trg_Dt_DMIn': 24.521, 'An_BW_mature': 700, 'Trg_FrmGain': 0.19,
            'An_GestDay': 46, 'An_GestLength': 280, 'Trg_RsrvGain': 0, 'Fet_BWbrth': 44.1,
            'An_AgeDay': 820.8, 'An_305RHA_MlkTP': 280, 'An_StatePhys': 'Lactating Cow',
            'An_Breed': 'Holstein', 'An_AgeDryFdStart': 14, 'Env_TempCurr': 22,
            'Env_DistParlor': 0, 'Env_TripsParlor': 0, 'Env_Topo': 0,
        },
        'diet_kg_dm': {
            'Alfalfa meal':                8.210156,
            'Canola meal':                 6.732329,
            'Corn silage, typical':        5.473438,
            'Corn grain HM, coarse grind': 4.105078,
        },
        'feed_types': {
            'Alfalfa meal': 'F', 'Canola meal': 'C',
            'Corn silage, typical': 'F', 'Corn grain HM, coarse grind': 'C',
        },
    },

    'B_high_prod': {
        'description': 'Holstein multipara early lact 700 kg, 45 kg leite',
        'animal_input': {
            'An_Parity_rl': 2, 'Trg_MilkProd': 45.0, 'An_BW': 700.0, 'An_BCS': 3.0,
            'An_LactDay': 60, 'Trg_MilkFatp': 4.0, 'Trg_MilkTPp': 3.2, 'Trg_MilkLacp': 4.8,
            'Trg_Dt_DMIn': 26.0, 'An_BW_mature': 700, 'Trg_FrmGain': 0,
            'An_GestDay': 0, 'An_GestLength': 280, 'Trg_RsrvGain': 0, 'Fet_BWbrth': 44.1,
            'An_AgeDay': 1500, 'An_305RHA_MlkTP': 350, 'An_StatePhys': 'Lactating Cow',
            'An_Breed': 'Holstein', 'An_AgeDryFdStart': 14, 'Env_TempCurr': 22,
            'Env_DistParlor': 0, 'Env_TripsParlor': 0, 'Env_Topo': 0,
        },
        'diet_kg_dm': {
            'Corn silage, typical':        9.0,
            'Alfalfa meal':     3.0,
            'Corn grain dry, fine grind':  7.5,
            'Soybean meal, solvent 48CP':  4.0,
            'Soybean hulls':               1.5,
            'Soybean meal, expellers':     1.0,
        },
        'feed_types': {
            'Corn silage, typical': 'F', 'Alfalfa meal': 'F',
            'Corn grain dry, fine grind': 'C', 'Soybean meal, solvent 48CP': 'C',
            'Soybean hulls': 'C', 'Soybean meal, expellers': 'C',
        },
    },

    'C_tropical': {
        'description': 'Holstein multipara mid-lact, dieta tropical (cana + grama + soja)',
        'animal_input': {
            'An_Parity_rl': 2, 'Trg_MilkProd': 25.0, 'An_BW': 600.0, 'An_BCS': 3.0,
            'An_LactDay': 150, 'Trg_MilkFatp': 3.8, 'Trg_MilkTPp': 3.3, 'Trg_MilkLacp': 4.7,
            'Trg_Dt_DMIn': 20.0, 'An_BW_mature': 650, 'Trg_FrmGain': 0,
            'An_GestDay': 80, 'An_GestLength': 280, 'Trg_RsrvGain': 0, 'Fet_BWbrth': 44.1,
            'An_AgeDay': 1700, 'An_305RHA_MlkTP': 280, 'An_StatePhys': 'Lactating Cow',
            'An_Breed': 'Holstein', 'An_AgeDryFdStart': 14, 'Env_TempCurr': 25,
            'Env_DistParlor': 0, 'Env_TripsParlor': 0, 'Env_Topo': 0,
        },
        'diet_kg_dm': {
            'Sugarcane bagasse silage':     5.0,
            'Bermudagrass hay':             3.0,
            'Corn grain dry, coarse grind': 6.5,
            'Soybean meal, solvent 48CP':   4.0,
            'Citrus pulp, dry':           1.5,
        },
        'feed_types': {
            'Sugarcane bagasse silage': 'F', 'Bermudagrass hay': 'F',
            'Corn grain dry, coarse grind': 'C', 'Soybean meal, solvent 48CP': 'C',
            'Citrus pulp, dry': 'C',
        },
    },

    'D_low_prod': {
        'description': 'Holstein multipara late lact 600 kg, 18 kg leite, forrageira',
        'animal_input': {
            'An_Parity_rl': 2, 'Trg_MilkProd': 18.0, 'An_BW': 600.0, 'An_BCS': 3.25,
            'An_LactDay': 250, 'Trg_MilkFatp': 4.2, 'Trg_MilkTPp': 3.5, 'Trg_MilkLacp': 4.85,
            'Trg_Dt_DMIn': 18.0, 'An_BW_mature': 650, 'Trg_FrmGain': 0,
            'An_GestDay': 180, 'An_GestLength': 280, 'Trg_RsrvGain': 0, 'Fet_BWbrth': 44.1,
            'An_AgeDay': 1800, 'An_305RHA_MlkTP': 280, 'An_StatePhys': 'Lactating Cow',
            'An_Breed': 'Holstein', 'An_AgeDryFdStart': 14, 'Env_TempCurr': 22,
            'Env_DistParlor': 0, 'Env_TripsParlor': 0, 'Env_Topo': 0,
        },
        'diet_kg_dm': {
            'Corn silage, typical':         8.0,
            'Grass lg mixt, grass hay, mid':3.0,
            'Corn grain dry, coarse grind': 4.5,
            'Soybean meal, solvent 48CP':   2.5,
        },
        'feed_types': {
            'Corn silage, typical': 'F', 'Grass lg mixt, grass hay, mid': 'F',
            'Corn grain dry, coarse grind': 'C', 'Soybean meal, solvent 48CP': 'C',
        },
    },
}


# Verifica que todos os alimentos existem na feed library NASEM
def check_feeds():
    all_feeds = set()
    for s in SCENARIOS.values():
        all_feeds.update(s['diet_kg_dm'].keys())
    missing = [f for f in all_feeds if f not in FL['Fd_Name'].values]
    if missing:
        print('!! MISSING FEEDS in NASEM library:', missing)
        return False
    return True

if not check_feeds():
    raise SystemExit(1)


def run_py_scenario(name, scen):
    """Roda nasem_dairy para um cenário e retorna dict de outputs."""
    # Build user_diet DataFrame
    df = pd.DataFrame({
        'Feedstuff': list(scen['diet_kg_dm'].keys()),
        'kg_user':   list(scen['diet_kg_dm'].values()),
    })

    animal_input = dict(scen['animal_input'])
    # Trg_Dt_DMIn deve refletir a soma da dieta
    animal_input['Trg_Dt_DMIn'] = sum(scen['diet_kg_dm'].values())

    equation_selection = {
        'Use_DNDF_IV': 0, 'DMIn_eqn': 0, 'mProd_eqn': 0, 'MiN_eqn': 1,
        'NonMilkCP_ClfLiq': 0, 'Monensin_eqn': 0, 'mPrt_eqn': 0,
        'mFat_eqn': 1, 'RumDevDisc_Clf': 0,
    }

    out = nd.nasem(df, animal_input, equation_selection)

    def gv(k):
        try:
            v = out.get_value(k)
            return float(v) if v is not None and not isinstance(v, str) else v
        except Exception:
            return None

    return {
        'scenario': name,
        'description': scen['description'],
        'Dt_DMIn':         gv('Dt_DMIn'),
        'Dt_CP_pct':       gv('Dt_CP'),
        'Dt_NDF_pct':      gv('Dt_NDF'),
        'Dt_ADF_pct':      gv('Dt_ADF'),
        'Dt_St_pct':       gv('Dt_St'),
        'Dt_CFat_pct':     gv('Dt_CFat'),
        'Dt_Ash_pct':      gv('Dt_Ash'),
        'An_RDPIn':        gv('An_RDPIn'),
        'An_RUPIn':        gv('An_RUPIn'),
        'Du_MiCP_g':       gv('Du_MiCP_g'),
        'Du_idMiTP_g':     gv('Du_idMiTP_g'),
        'An_MPIn_g':       gv('An_MPIn_g'),
        'An_MPm_g_Trg':    gv('An_MPm_g_Trg'),
        'Gest_MPUse_g_Trg':gv('Gest_MPUse_g_Trg'),
        'Body_MPUse_g_Trg':gv('Body_MPUse_g_Trg'),
        # Energy chain components
        'Dt_DigNDFIn':     gv('Dt_DigNDFIn'),
        'Dt_DigStIn':      gv('Dt_DigStIn'),
        'Dt_DigFAIn':      gv('Dt_DigFAIn'),
        'Dt_DigCPaIn':     gv('Dt_DigCPaIn'),
        'Dt_DigrOMaIn':    gv('Dt_DigrOMaIn'),
        'Fe_CPend':        gv('Fe_CPend'),
        'Ur_DEout':        gv('Ur_DEout'),
        'An_GasEOut':      gv('An_GasEOut'),
        # Final
        'An_DEIn':         gv('An_DEIn'),
        'An_MEIn':         gv('An_MEIn'),
        'An_DE':           gv('An_DE'),
        'An_ME':           gv('An_ME'),
        'An_NE':           gv('An_NE'),
        'Mlk_Prod_NEalow': gv('Mlk_Prod_NEalow'),
        'Mlk_Prod_MPalow': gv('Mlk_Prod_MPalow'),
    }


def feed_to_alimento(name, tipo):
    row = FL[FL['Fd_Name'] == name].iloc[0]
    pb_frac = float(row['Fd_CP'])/100
    def f(col, scale=1.0):
        v = row.get(col)
        return float(v)/scale if pd.notna(v) else None
    return {
        'nome': name, 'tipo': tipo, 'classificacao': 'NASEM', 'custo': None,
        'ms': f('Fd_DM',100), 'pb': pb_frac,
        'fdn': f('Fd_NDF',100), 'fda': f('Fd_ADF',100),
        'amido': f('Fd_St',100), 'ee': f('Fd_CFat',100), 'cinza': f('Fd_Ash',100),
        'lignin': f('Fd_Lg',100),    # necessário para Eq. 20-112
        # Campos novos Fase 1
        'fa':       f('Fd_FA',100),
        'dc_st':    f('Fd_dcSt'),
        'dc_fa':    f('Fd_dcFA'),
        'npn_frac': f('Fd_NPN_CP',100),
        'prot_a': f('Fd_CPARU'), 'prot_b': f('Fd_CPBRU'), 'prot_c': f('Fd_CPCRU'),
        'kd_prot': f('Fd_KdRUP'), 'rup_digest': f('Fd_dcRUP',100),
        'ivndfd48': f('Fd_DNDF48_NDF'), 'de_base': f('Fd_DE_Base'),
        'lys': (float(row['Fd_Lys_CP'])/100*pb_frac) if pd.notna(row['Fd_Lys_CP']) else None,
        'met': (float(row['Fd_Met_CP'])/100*pb_frac) if pd.notna(row['Fd_Met_CP']) else None,
        'ca': f('Fd_Ca',100), 'p': f('Fd_P',100), 'mg': f('Fd_Mg',100), 'k': f('Fd_K',100),
        'na': f('Fd_Na',100), 'cl': f('Fd_Cl',100), 's': f('Fd_S',100),
        'pdr': None, 'pndr': None, 'efdn': None, 'fdnf': None, 'nel': None, 'ndt': None,
        'ee_insat': None, 'cnf': None, 'kd_amido': None,
        'co': None, 'cu': None, 'mn_min': None, 'zn': None, 'se': None, 'i': None, 'fe': None,
        'vit_a': None, 'vit_d3': None, 'vit_e': None, 'biotina': None, 'monensina': None,
        'cr': None, 'levedura': None, 'cp_digest': None, 'ndf_digest': None,
        'fat_digest': None, 'lisina_pct': None, 'met_pct': None,
    }


# Run all
py_outputs = {}
ts_inputs = {}
for name, scen in SCENARIOS.items():
    print(f'=== Running NASEM Py for {name}: {scen["description"]} ===')
    py_outputs[name] = run_py_scenario(name, scen)
    # Build TS inputs (alimentos + slots + animal)
    alimentos = [feed_to_alimento(fn, scen['feed_types'][fn])
                 for fn in scen['diet_kg_dm']]
    slots = []
    for fn, kgDM in scen['diet_kg_dm'].items():
        a = next(x for x in alimentos if x['nome'] == fn)
        slots.append({
            'id': f'slot-{fn}',
            'alimentoNome': fn,
            'kgMN': kgDM / a['ms'],
        })
    # Animal — convert NASEM to our schema
    ai = scen['animal_input']
    animal_ts = {
        'ecc': ai['An_BCS'],
        'paridade': 0 if ai['An_Parity_rl'] == 1 else 1,
        'peso': ai['An_BW'],
        'del': ai['An_LactDay'],
        'leite': ai['Trg_MilkProd'],
        'gordura': ai['Trg_MilkFatp'],
        'proteina': ai['Trg_MilkTPp'] / 0.94,
        'lactose': ai['Trg_MilkLacp'],
        'precoLeite': 0,
        'raca': 'Holstein',
        'dias_gestacao': ai['An_GestDay'],
        'peso_bezerro_alvo': ai['Fet_BWbrth'],
        'gestacao_total': ai['An_GestLength'],
        # Fase 5 — composição corporal
        'peso_maduro': ai['An_BW_mature'],
        'ganho_frame_kg_dia': ai['Trg_FrmGain'],
        'ganho_reserva_kg_dia': ai['Trg_RsrvGain'],
    }
    ts_inputs[name] = {
        'description': scen['description'],
        'alimentos': alimentos,
        'slots': slots,
        'animal': animal_ts,
    }

with open(os.path.join(HERE, 'validate_multi_py.json'), 'w', encoding='utf-8') as f:
    json.dump(py_outputs, f, indent=2, default=str)
with open(os.path.join(HERE, 'validate_multi_inputs.json'), 'w', encoding='utf-8') as f:
    json.dump(ts_inputs, f, indent=2, default=str)
print('\nWrote validate_multi_py.json and validate_multi_inputs.json')
print(f'Scenarios: {list(py_outputs.keys())}')
