"""
Gera seeds PT-BR para alimentos NASEM ausentes do banco src/data/alimentos.json.

Lê o CSV oficial nasem_dairy, calcula os ausentes (fuzzy match com a função
normalizar() do rebuild_alimentos.mjs), aplica traduções, e escreve em
scripts/seeds_alimentos_faltantes.json — array pronto para append no banco.

Também detecta o caso especial 'Ureia' (existe sem fonte_nasem) e emite
recomendação para conectá-la a 'Urea'.
"""
import json, os, re, sys
import pandas as pd
import nasem_dairy

sys.stdout.reconfigure(encoding='utf-8')

# Mesma normalização do rebuild_alimentos.mjs (linhas 18-25)
def normalizar(s):
    if not s: return ''
    s = s.lower()
    s = re.sub(r'[–—�]', '-', s)
    s = re.sub(r'[/]', ' ', s)
    s = re.sub(r'[,]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

CSV = os.path.join(os.path.dirname(nasem_dairy.__file__),
                   'data/feed_library/NASEM_feed_library.csv')
fl = pd.read_csv(CSV)
fl = fl[fl['UID'].str.startswith('NRC16F', na=False)]

al = json.load(open('src/data/alimentos.json', encoding='utf-8'))
present_norm = {normalizar(a['fonte_nasem']) for a in al if a.get('fonte_nasem')}

# Fuzzy match igual ao rebuild
csv_norm = {normalizar(n): n for n in fl['Fd_Name']}
matched = set()
for n in present_norm:
    if n in csv_norm:
        matched.add(n); continue
    for k in csv_norm:
        if k.startswith(n) or n.startswith(k) or (k in n) or (n in k):
            matched.add(k); break

ausentes_norm = [n for n in csv_norm if n not in matched]
ausentes_df = fl[fl['Fd_Name'].apply(lambda x: normalizar(x) in ausentes_norm)]
# Exclui sais/vitaminas genéricos (não são alimentos no nosso sentido)
ausentes_df = ausentes_df[ausentes_df['Fd_Category'] != 'Vitamin/Mineral']

# ── Mapeamento PT-BR — tradução por nome NASEM EXATO ────────────────────────
# Convenção: tipo='F' para forragens (Fd_Type='Forage'), 'C' para concentrados.
# classificacao: Energético | Proteico | Forrageiro | Aditivo | Outros
TRADUCOES = {
    # Additive
    'Rumen Protected Arg': ('Arginina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected His': ('Histidina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Ile': ('Isoleucina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Leu': ('Leucina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Lys': ('Lisina Protegida do Rúmen, NASEM', 'C', 'Aditivo'),
    'Rumen Protected Met': ('Metionina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Phe': ('Fenilalanina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Thr': ('Treonina Protegida do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Trp': ('Triptofano Protegido do Rúmen', 'C', 'Aditivo'),
    'Rumen Protected Val': ('Valina Protegida do Rúmen', 'C', 'Aditivo'),
    'Urea': None,  # CASO ESPECIAL — 'Ureia' já existe sem fonte_nasem; tratada à parte
    # Animal Protein
    'Poultry byproduct meal': ('Farinha de Subproduto de Aves', 'C', 'Proteico'),
    'Whey, dry': ('Soro de Leite, Seco', 'C', 'Proteico'),
    'Whey, wet': ('Soro de Leite, Úmido', 'C', 'Proteico'),
    # By-Product/Other
    'Apple pomace or byproduct, wet': ('Bagaço ou Subproduto de Maçã, Úmido', 'C', 'Outros'),
    'Bakery byproduct': ('Resíduo de Panificação', 'C', 'Energético'),
    'Bakery byproduct, bread waste': ('Resíduo de Panificação, Pão', 'C', 'Energético'),
    'Bakery byproduct, cereal': ('Resíduo de Panificação, Cereais', 'C', 'Energético'),
    'Bakery byproduct, cookies': ('Resíduo de Panificação, Biscoitos', 'C', 'Energético'),
    'Candy (not chocolate) byproduct': ('Resíduo de Confeitaria (sem chocolate)', 'C', 'Energético'),
    'Candy byproduct, high protein': ('Resíduo de Confeitaria, Alta Proteína', 'C', 'Proteico'),
    'Chocolate byproduct': ('Resíduo de Chocolate', 'C', 'Energético'),
    'DDGS, high fat': ('Grãos de Destilaria com Solúveis, Alta Gordura', 'C', 'Proteico'),
    'DDGS, high protein': ('Grãos de Destilaria com Solúveis, Alta Proteína', 'C', 'Proteico'),
    'DDGS, low fat': ('Grãos de Destilaria com Solúveis, Baixa Gordura', 'C', 'Proteico'),
    'DGS modified': ('Grãos de Destilaria, Modificado', 'C', 'Proteico'),
    'DGS wet': ('Grãos de Destilaria, Úmido', 'C', 'Proteico'),
    'Fruit and vegetable byprod, wet': ('Resíduo de Frutas e Vegetais, Úmido', 'C', 'Outros'),
    'Grain screenings, source unknwn': ('Peneirado de Grãos, Origem Desconhecida', 'C', 'Energético'),
    'Peanut skins': ('Tegumento de Amendoim', 'C', 'Outros'),
    'Potato byproduct': ('Resíduo de Batata', 'C', 'Energético'),
    'Soybean hulls': ('Casca de Soja', 'C', 'Forrageiro'),
    # Calf Liquid Feed
    'Casein': ('Caseína', 'C', 'Proteico'),
    'Milk replacer 20 CP 20 fat': ('Substituto do Leite, 20% PB / 20% Gordura', 'C', 'Outros'),
    'Milk replacer 26 CP 17 fat': ('Substituto do Leite, 26% PB / 17% Gordura', 'C', 'Outros'),
    'Milk replacer 28 CP 17.5 fat': ('Substituto do Leite, 28% PB / 17,5% Gordura', 'C', 'Outros'),
    'Skim milk, fresh': ('Leite Desnatado Fresco', 'C', 'Outros'),
    'Skim milk, powder': ('Leite Desnatado em Pó', 'C', 'Outros'),
    'Whey protein concentrate': ('Concentrado Proteico de Soro de Leite', 'C', 'Proteico'),
    'Whey, delactosed': ('Soro de Leite, Deslactosado', 'C', 'Proteico'),
    'Whey, fresh': ('Soro de Leite Fresco', 'C', 'Outros'),
    'Whey, permeate': ('Permeado de Soro de Leite', 'C', 'Outros'),
    'Whole milk': ('Leite Integral', 'C', 'Outros'),
    # Energy Source
    'Calf grower 14CP (Fed to calves only)': ('Núcleo Crescimento Bezerros, 14% PB', 'C', 'Outros'),
    'Calf grower 16CP (Fed to calves only)': ('Núcleo Crescimento Bezerros, 16% PB', 'C', 'Outros'),
    'Calf starter 18CP high starch (Fed to calves only)': ('Núcleo Inicial Bezerros, 18% PB, Alto Amido', 'C', 'Outros'),
    'Calf starter 18CP low starch (Fed to calves only)': ('Núcleo Inicial Bezerros, 18% PB, Baixo Amido', 'C', 'Outros'),
    'Calf starter 22CP high starch (Fed to calves only)': ('Núcleo Inicial Bezerros, 22% PB, Alto Amido', 'C', 'Outros'),
    'Calf starter 22CP med starch (Fed to calves only)': ('Núcleo Inicial Bezerros, 22% PB, Médio Amido', 'C', 'Outros'),
    'Corn grain HM, coarse grind': ('Grão de Milho Úmido, Moagem Grossa', 'C', 'Energético'),
    'Corn grain HM, fine grind': ('Grão de Milho Úmido, Moagem Fina', 'C', 'Energético'),
    'Corn, ear w husk, stlk, hi fbr': ('Espiga de Milho com Palha e Colmo, Alta Fibra', 'C', 'Energético'),
    'Corn, ear, huks, stlk, low fbr': ('Espiga de Milho com Palha e Colmo, Baixa Fibra', 'C', 'Energético'),
    'Glycerol': ('Glicerol', 'C', 'Energético'),
    'Sorghum grain, dry, ground': ('Grão de Sorgo, Seco, Moído', 'C', 'Energético'),
    'Sorghum grain, steam flaked': ('Grão de Sorgo, Laminado a Vapor', 'C', 'Energético'),
    # Fat Supplement
    'Fat, lard': ('Banha de Porco', 'C', 'Aditivo'),
    'Fat, safflower oil': ('Óleo de Cártamo', 'C', 'Aditivo'),
    'Fat, tallow': ('Sebo Bovino', 'C', 'Aditivo'),
    # Grain Crop Forage
    'Grain sorghum silage, mature': ('Silagem de Sorgo Granífero, Madura', 'F', 'Forrageiro'),
    'Grain sorghum silage, midmtr': ('Silagem de Sorgo Granífero, Meia Maturação', 'F', 'Forrageiro'),
    'Rye annual fresh, immature': ('Centeio Anual Verde, Imaturo', 'F', 'Forrageiro'),
    'Rye annual fresh, mid-maturity': ('Centeio Anual Verde, Meia Maturação', 'F', 'Forrageiro'),
    'Rye annual hay, mid-maturity': ('Feno de Centeio Anual, Meia Maturação', 'F', 'Forrageiro'),
    'Rye annual silage, immature': ('Silagem de Centeio Anual, Imaturo', 'F', 'Forrageiro'),
    'Rye annual silage, mid-maturity': ('Silagem de Centeio Anual, Meia Maturação', 'F', 'Forrageiro'),
    'Sorghum forage silage, immature': ('Silagem de Sorgo Forrageiro, Imaturo', 'F', 'Forrageiro'),
    'Sorghum forage silage, mature': ('Silagem de Sorgo Forrageiro, Maduro', 'F', 'Forrageiro'),
    'Triticale silage, mid-maturity': ('Silagem de Triticale, Meia Maturação', 'F', 'Forrageiro'),
    # Grass/Legume Forage
    'Bermudagrass silage, mid-mtr': ('Silagem de Capim Bermuda, Meia Maturação', 'F', 'Forrageiro'),
    'Cool season grass hay, mature': ('Feno de Gramínea de Estação Fria, Maduro', 'F', 'Forrageiro'),
    'Cool season grass hay, mid-mtr': ('Feno de Gramínea de Estação Fria, Meia Maturação', 'F', 'Forrageiro'),
    'Cool season grass silage': ('Silagem de Gramínea de Estação Fria', 'F', 'Forrageiro'),
    'Grass legume mixt, grass slg': ('Silagem Mista Gramínea-Leguminosa, Predomínio Gramínea', 'F', 'Forrageiro'),
    'Grass lg mixt, grass hay, mid': ('Feno Misto Gramínea-Leguminosa, Predomínio Gramínea, Meia Maturação', 'F', 'Forrageiro'),
    'Grass lg mixt, grass hay, mtr': ('Feno Misto Gramínea-Leguminosa, Predomínio Gramínea, Maduro', 'F', 'Forrageiro'),
    'Grass lg mixt, leg. hay, mtr': ('Feno Misto Gramínea-Leguminosa, Predomínio Leguminosa, Maduro', 'F', 'Forrageiro'),
    'Grass lg mixt, leg., hay, immtr': ('Feno Misto Gramínea-Leguminosa, Predomínio Leguminosa, Imaturo', 'F', 'Forrageiro'),
    'Grass lg mixt, legume slg': ('Silagem Mista Gramínea-Leguminosa, Predomínio Leguminosa', 'F', 'Forrageiro'),
    'Grass lg mixt, mix hay': ('Feno Misto Gramínea-Leguminosa', 'F', 'Forrageiro'),
    'Grass lg mixt, mix silage': ('Silagem Mista Gramínea-Leguminosa', 'F', 'Forrageiro'),
    # Pasture
    'Pasture, grass': ('Pasto, Gramínea', 'F', 'Forrageiro'),
    'Pasture, grass-legume mixture': ('Pasto, Mistura Gramínea-Leguminosa', 'F', 'Forrageiro'),
    'Pasture, legume': ('Pasto, Leguminosa', 'F', 'Forrageiro'),
    # Plant Protein
    'Soybean meal, solvent 48CP': ('Farelo de Soja, Solvente 48% PB', 'C', 'Proteico'),
    # Sugar
    'Sugar': ('Açúcar', 'C', 'Energético'),
}

seeds = []
faltam_traducao = []
for _, r in ausentes_df.iterrows():
    nome_en = r['Fd_Name']
    if nome_en not in TRADUCOES:
        faltam_traducao.append(nome_en)
        continue
    val = TRADUCOES[nome_en]
    if val is None:
        continue  # casos especiais (Ureia)
    nome_pt, tipo, classif = val
    seeds.append({
        'nome': nome_pt,
        'custo': None,
        'classificacao': classif,
        'tipo': tipo,
        'fonte_nasem': nome_en,
        'alimento_base': None,
    })

print(f'Seeds gerados: {len(seeds)}')
if faltam_traducao:
    print(f'\nFALTA tradução para {len(faltam_traducao)}:')
    for n in faltam_traducao: print(f'  - {n}')

# Detecta caso especial Ureia
ureia_existe = any(a['nome'] == 'Ureia' for a in al)
if ureia_existe:
    print('\n⚠️  "Ureia" já existe no banco sem fonte_nasem.')
    print('   Recomendação: conectar fonte_nasem="Urea" no objeto existente.')

dst = 'scripts/seeds_alimentos_faltantes.json'
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(seeds, f, ensure_ascii=False, indent=2)
print(f'\n→ Escrito {dst} com {len(seeds)} seeds')
