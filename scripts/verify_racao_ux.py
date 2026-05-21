"""Teste UX do Formulador de Ração via Playwright.

Não substitui um humano, mas captura:
  - Erros de console JS
  - Erros de rede
  - Falhas de renderização (elementos não encontrados)
  - Screenshot de cada passo

Requer login válido — a sessão Supabase precisa existir nos cookies.
Se não autenticar, captura tela de login e reporta BLOCKED.

USO: py -3.12 scripts/verify_racao_ux.py
"""
import sys, os, time
from playwright.sync_api import sync_playwright, expect
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')

OUT = Path(r'C:/Users/rasaf/rehagro-cs-engajamento/formulador-dietas/.verify_screenshots')
OUT.mkdir(exist_ok=True)

URL = 'http://localhost:5174'

erros_console = []
erros_rede = []

def log_console(msg):
    if msg.type in ('error', 'warning'):
        erros_console.append(f'[{msg.type}] {msg.text}')

def log_response(resp):
    if resp.status >= 400:
        erros_rede.append(f'{resp.status} {resp.url}')

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1500, 'height': 900})
    page = ctx.new_page()
    page.on('console', log_console)
    page.on('response', log_response)

    print('=' * 70)
    print('TESTE UX — FORMULADOR DE RAÇÃO')
    print('=' * 70)

    # ── Passo 0: abrir app ────────────────────────────────────────────────
    page.goto(URL, wait_until='networkidle')
    page.screenshot(path=str(OUT / '00_inicial.png'))
    titulo = page.title()
    print(f'\n[0] Página carregada: title={titulo!r}')

    # Detectar se está em tela de login
    if 'login' in page.url.lower() or page.locator('input[type=email]').count() > 0:
        print('   ❌ App requer login. Verificar via login automático ou pular para testes estáticos.')
        # Tenta login se houver credentials salvos
        email_in = page.locator('input[type=email]').first
        if email_in.count() > 0:
            print('   → Tela de login detectada.')
        page.screenshot(path=str(OUT / '00_login.png'))
        # Sem credenciais, parar
        print('\n⚠ Não temos credencial para login. Teste limitado a verificar carregamento.')
        browser.close()
        # Imprime sumário
        print(f'\nErros console: {len(erros_console)}')
        for e in erros_console[:20]: print(f'  {e}')
        print(f'\nErros rede (status >= 400): {len(erros_rede)}')
        for e in erros_rede[:10]: print(f'  {e}')
        sys.exit(2)

    # ── Passo 1: ir para Dieta (já é a inicial /) ─────────────────────────
    print('\n[1] Tela inicial = Dieta')
    page.screenshot(path=str(OUT / '01_dieta_inicial.png'))

    # Verificar botões da Nav
    nav_buttons = page.locator('header nav a').all_inner_texts()
    print(f'   Botões nav: {nav_buttons}')
    assert any('Dieta' in t for t in nav_buttons), f'Botão "Dieta" não encontrado em {nav_buttons}'
    assert any('Ração' in t for t in nav_buttons), f'Botão "Formulador Ração" não encontrado em {nav_buttons}'
    print('   ✅ Botões Dieta e Formulador Ração presentes')

    # ── Passo 2: navegar para /racao direto (sem ingredientes) ────────────
    print('\n[2] Navegar para /racao sem seleção — esperado estado vazio')
    page.goto(f'{URL}/racao', wait_until='networkidle')
    page.screenshot(path=str(OUT / '02_racao_vazia.png'))
    body = page.locator('body').inner_text()
    if 'Para começar' in body and 'aba' in body.lower():
        print('   ✅ Tela de estado vazio renderiza com instruções')
    else:
        print(f'   ⚠ Texto inesperado no estado vazio. Body trecho: {body[:200]!r}')

    # Confirmar botão "Ir para Dieta"
    btn_dieta = page.locator('a:has-text("Ir para Dieta")')
    if btn_dieta.count() > 0:
        print('   ✅ Botão "Ir para Dieta" presente')
    else:
        print('   ❌ Botão "Ir para Dieta" não encontrado')

    # ── Passo 3: voltar para Dieta e procurar checkboxes ──────────────────
    print('\n[3] Voltar para Dieta, procurar checkboxes 🥣')
    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT / '03_dieta_carregada.png'))

    # Procurar tabela de ingredientes
    cb_count = page.locator('input[type=checkbox]').count()
    print(f'   Checkboxes encontrados: {cb_count}')

    # Detectar coluna 🥣
    if page.locator('text=🥣').count() > 0:
        print('   ✅ Coluna 🥣 (header) presente')
    else:
        print('   ⚠ Coluna 🥣 não encontrada — pode ter sido renderizada como código')

    # Toolbar amarela visível?
    if page.locator('text=/Formulador de Ração \\(\\d+\\)/').count() > 0:
        print('   ✅ Botão "Formulador de Ração (N)" presente')
    else:
        # Talvez não tenha ingredientes preenchidos no estado inicial
        print('   ⚠ Botão toolbar não visível (dieta provavelmente vazia)')

    # ── Passo 4: PDF — verificar que botão existe ────────────────────────
    print('\n[4] Verificar UI da tela /racao com ingredientes (via context já)')
    # Para esse teste real precisamos preencher dieta primeiro — complexo via Playwright sem
    # conhecimento dos componentes. Aceitar limitação aqui.
    print('   ⚠ Teste de fluxo completo (selecionar checkbox → click toolbar) requer interação')
    print('     manual com a tabela. Verificação estática feita.')

    # ── Sumário ────────────────────────────────────────────────────────────
    print('\n' + '=' * 70)
    print('SUMÁRIO')
    print('=' * 70)
    print(f'Erros console (errors+warnings): {len(erros_console)}')
    for e in erros_console[:30]: print(f'  {e}')
    print(f'\nErros rede (status >= 400): {len(erros_rede)}')
    for e in erros_rede[:10]: print(f'  {e}')

    browser.close()
    print(f'\nScreenshots em {OUT}')
