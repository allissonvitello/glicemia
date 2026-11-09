#!/usr/bin/env python3
"""Audita a acessibilidade das telas do app no navegador.

Percorre todas as telas (login, ela e modo pais) em tamanho de celular, nos
temas claro e escuro, e verifica:
  * regras WCAG 2.1 A/AA do axe-core (contraste de texto, rótulos, nomes, idioma...);
  * contraste de componentes: borda/fundo de campos e opções >= 3:1 (o axe não mede);
  * alvos de toque >= 44x44px;
  * foco visível ao navegar com Tab;
  * zoom de 200% sem rolagem horizontal.

Não usa o banco de verdade: injeta um login falso e responde às chamadas ao
Supabase com dados de exemplo. Precisa do app rodando (npm run dev).

Uso: python3 auditar.py [--url http://localhost:5173] [--saida pasta] [--telas inicio,formulario]
Sai com código 1 se encontrar problemas.
"""
import argparse
import base64
import json
import re
import sys
import tempfile
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

from playwright.sync_api import sync_playwright

RAIZ = Path(__file__).resolve().parents[4]
APP = RAIZ / 'app'
AXE = APP / 'node_modules/axe-core/axe.min.js'
ALVO_MIN = 44

# ---------------------------------------------------------------- dados falsos

ELA = '00000000-0000-4000-8000-000000000001'


def jwt_falso(sub: str) -> str:
    b = lambda d: base64.urlsafe_b64encode(json.dumps(d).encode()).decode().rstrip('=')
    agora = int(time.time())
    return f"{b({'alg': 'HS256', 'typ': 'JWT'})}.{b({'sub': sub, 'role': 'authenticated', 'exp': agora + 36000})}.assinatura"


def sessao_falsa() -> dict:
    agora = int(time.time())
    return {
        'access_token': jwt_falso(ELA), 'refresh_token': 'falso', 'token_type': 'bearer',
        'expires_in': 36000, 'expires_at': agora + 36000,
        'user': {'id': ELA, 'aud': 'authenticated', 'role': 'authenticated',
                 'email': 'teste@exemplo.invalid', 'app_metadata': {}, 'user_metadata': {}},
    }


def registros_exemplo() -> list:
    agora = datetime.now(timezone.utc)
    modelos = [
        (0, 1, 64, 'antes_refeicao', None, None, None, 'Tomei suco'),
        (0, 3, 215, 'depois_refeicao', 'rapida', 6.5, 60, None),
        (0, 6, 98, 'jejum', None, None, None, None),
        (1, 2, 150, 'antes_dormir', 'lenta', 18, None, 'Dose da noite'),
        (1, 8, None, None, 'rapida', 4, 45, None),
        (2, 4, 182, 'depois_refeicao', None, None, None, None),
        (3, 5, 72, 'madrugada', None, None, None, None),
        (5, 3, 130, 'antes_refeicao', None, None, None, None),
    ]
    linhas = []
    for i, (dia, horas, g, mom, tipo, unid, carb, obs) in enumerate(modelos):
        quando = agora - timedelta(days=dia, hours=horas)
        linhas.append({'id': f'00000000-0000-4000-8000-0000000001{i:02d}', 'data_hora': quando.isoformat(),
                       'glicemia': g, 'momento': mom, 'insulina_tipo': tipo, 'insulina_unidades': unid,
                       'carboidratos': carb, 'observacao': obs})
    return linhas


def ref_do_projeto() -> str:
    env = (APP / '.env.local').read_text(encoding='utf-8')
    return re.search(r'https://([a-z0-9]+)\.supabase\.co', env).group(1)


def simular_supabase(contexto, somente_leitura: bool):
    registros = registros_exemplo()
    metas = {'meta_min': 70, 'meta_max': 180}

    def responder(rota):
        req = rota.request
        url = req.url
        if '/rest/v1/rpc/sou_acompanhante' in url:
            return rota.fulfill(json=somente_leitura)
        if req.method != 'GET':
            return rota.fulfill(status=204, body='')
        if '/rest/v1/registros' in url:
            return rota.fulfill(json=registros)
        if '/rest/v1/configuracoes' in url:
            objeto = 'vnd.pgrst.object' in (req.headers.get('accept') or '')
            return rota.fulfill(json=metas if objeto else [metas])
        return rota.fulfill(status=204, body='')

    contexto.route('**/rest/v1/**', responder)
    contexto.route('**/auth/v1/**', lambda rota: rota.fulfill(status=204, body=''))


# ---------------------------------------------------------------- verificações

JS_COMPONENTES = r"""
() => {
  const lum = (c) => {
    const m = c.match(/[\d.]+/g); if (!m) return null;
    const [r, g, b] = m.slice(0, 3).map(Number).map(v => v / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const opaca = (c) => { const m = c.match(/[\d.]+/g); return m && (m.length < 4 || Number(m[3]) > 0.5); };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const fundoDe = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const bg = getComputedStyle(e).backgroundColor;
      if (opaca(bg)) return bg;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  const nome = (el) => (el.getAttribute('aria-label') || el.innerText || el.placeholder || el.className || el.tagName).trim().slice(0, 40);
  const saida = [];
  const sel = 'input:not([type=hidden]), textarea, select, button.opcao, .campo-glicemia';
  const temBorda = (s) => parseFloat(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && opaca(s.borderTopColor);
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const s = getComputedStyle(el);
    // Campo sem borda própria dentro de um rótulo com borda: quem delimita é o rótulo (verificado à parte).
    const rotulo = el.closest('label');
    if (rotulo && rotulo !== el && !temBorda(s) && !opaca(s.backgroundColor) && temBorda(getComputedStyle(rotulo))) continue;
    const fora = fundoDe(el.parentElement);
    const proprio = opaca(s.backgroundColor) ? s.backgroundColor : fora;
    let melhor = razao(proprio, fora);
    if (temBorda(s))
      melhor = Math.max(melhor, razao(s.borderTopColor, fora));
    if (melhor < 3) saida.push({ elemento: nome(el), razao: Math.round(melhor * 100) / 100 });
  }
  return saida;
}
"""

JS_ALVOS = r"""
(min) => {
  const sel = 'button, a[href], input:not([type=hidden]), textarea, select, [role=button], [tabindex]:not([tabindex="-1"])';
  const saida = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    // um campo dentro de um <label> clicável usa a área do rótulo
    const area = el.closest('label') && el.tagName === 'INPUT' ? el.closest('label').getBoundingClientRect() : r;
    if (area.width < min || area.height < min)
      saida.push({ elemento: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 40),
                   tamanho: `${Math.round(area.width)}x${Math.round(area.height)}` });
  }
  return saida;
}
"""

JS_RECORTE = r"""
() => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const caixas = [el.getBoundingClientRect()];
  const pai = el.closest('label, fieldset'); if (pai) caixas.push(pai.getBoundingClientRect());
  const x = Math.min(...caixas.map(c => c.left)) - 8, y = Math.min(...caixas.map(c => c.top)) - 8;
  const x2 = Math.max(...caixas.map(c => c.right)) + 8, y2 = Math.max(...caixas.map(c => c.bottom)) + 8;
  return { x: Math.max(0, x), y: Math.max(0, y), width: x2 - Math.max(0, x), height: y2 - Math.max(0, y),
           nome: (el.getAttribute('aria-label') || el.innerText || el.tagName).trim().slice(0, 40) };
}
"""


def verificar_axe(pg) -> list:
    pg.add_script_tag(path=str(AXE))
    res = pg.evaluate("""async () => {
      const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
      return r.violations.map(v => ({ regra: v.id, impacto: v.impact, ajuda: v.help,
        nos: v.nodes.slice(0, 6).map(n => ({ alvo: n.target.join(' '), resumo: (n.failureSummary || '').split('\\n').slice(1, 2).join(' ').trim() })) }));
    }""")
    return res


def verificar_foco(pg) -> list:
    """Percorre a tela com Tab e compara a imagem com e sem foco em cada elemento."""
    pg.add_style_tag(content='* { caret-color: transparent !important; transition: none !important; }')
    # O Tab continua de onde o último foco estava; um marcador no topo da página
    # faz a navegação começar do primeiro elemento.
    pg.evaluate("""() => {
      const m = document.createElement('span'); m.tabIndex = -1;
      document.body.prepend(m); scrollTo(0, 0); m.focus();
    }""")
    sem_foco, vistos = [], set()
    for _ in range(60):
        pg.keyboard.press('Tab')
        recorte = pg.evaluate(JS_RECORTE)
        if not recorte:
            break
        chave = pg.evaluate('(() => { const e = document.activeElement; const r = e.getBoundingClientRect(); return e.tagName + (e.innerText||e.getAttribute("aria-label")||"") + Math.round(r.top + scrollY); })()')
        if chave in vistos:
            break
        vistos.add(chave)
        clip = {k: recorte[k] for k in ('x', 'y', 'width', 'height')}
        if clip['width'] <= 0 or clip['height'] <= 0:
            continue
        # Ao entrar num campo com Tab o texto fica selecionado; isso não conta como indicador de foco.
        pg.evaluate("""() => { const e = document.activeElement;
          try { e.setSelectionRange && e.setSelectionRange(e.value.length, e.value.length) } catch {} }""")
        com = pg.screenshot(clip=clip)
        pg.evaluate('window.__foco = document.activeElement; document.activeElement.blur()')
        sem = pg.screenshot(clip=clip)
        pg.evaluate('window.__foco.focus()')
        if com == sem:
            sem_foco.append(recorte['nome'])
    return sem_foco


def verificar_zoom(pg) -> list:
    """Simula zoom de 200% (metade da largura) e procura o que vaza para os lados."""
    tamanho = pg.viewport_size
    pg.set_viewport_size({'width': tamanho['width'] // 2, 'height': tamanho['height'] // 2})
    pg.wait_for_timeout(150)
    vazando = pg.evaluate("""() => {
      if (document.documentElement.scrollWidth <= innerWidth + 1) return [];
      return [...document.querySelectorAll('body *')].filter(e => {
        const r = e.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed';
      }).slice(0, 5).map(e => (e.className || e.tagName).toString().slice(0, 40));
    }""")
    pg.set_viewport_size(tamanho)
    pg.wait_for_timeout(100)
    return vazando


# ---------------------------------------------------------------- telas

def ir_login(pg): pg.wait_for_selector('text=Entre com o seu e-mail')
def ir_recuperar(pg): ir_login(pg); pg.get_by_role('button', name='Esqueci minha senha').click()
def ir_inicio(pg): pg.wait_for_selector('text=Última medição')
def ir_historico(pg): ir_inicio(pg); pg.get_by_role('button', name='Histórico').click()
def ir_ajustes(pg): ir_inicio(pg); pg.get_by_role('button', name='Ajustes').click()


def ir_formulario(pg):
    ir_inicio(pg)
    pg.get_by_role('button', name='+ Registrar').click()
    pg.get_by_label('Glicemia em mg/dL').fill('215')
    for nome in ('+ Insulina', '+ Carboidratos', '+ Observação'):
        pg.get_by_role('button', name=nome).click()


def ir_formulario_erro(pg):
    ir_inicio(pg)
    pg.get_by_role('button', name='+ Registrar').click()
    pg.get_by_role('button', name='Salvar').click()
    pg.wait_for_selector('.erro')


def ir_edicao(pg): ir_inicio(pg); pg.locator('.lista .item').first.click()


# nome: (função que chega na tela, com login?, modo pais?)
TELAS = {
    'login': (ir_login, False, False),
    'recuperar-senha': (ir_recuperar, False, False),
    'inicio': (ir_inicio, True, False),
    'historico': (ir_historico, True, False),
    'ajustes': (ir_ajustes, True, False),
    'formulario': (ir_formulario, True, False),
    'formulario-erro': (ir_formulario_erro, True, False),
    'edicao': (ir_edicao, True, False),
    'pais-inicio': (ir_inicio, True, True),
    'pais-historico': (ir_historico, True, True),
}


def auditar_tela(navegador, url, nome, tema, saida: Path) -> dict:
    ir, logado, pais = TELAS[nome]
    ctx = navegador.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1,
                                color_scheme='dark' if tema == 'escuro' else 'light', locale='pt-BR')
    simular_supabase(ctx, pais)
    if logado:
        chave = f'sb-{ref_do_projeto()}-auth-token'
        ctx.add_init_script(f'localStorage.setItem({json.dumps(chave)}, {json.dumps(json.dumps(sessao_falsa()))})')
    pg = ctx.new_page()
    erros_pagina = []
    pg.on('pageerror', lambda e: erros_pagina.append(str(e)))
    pg.goto(url)
    ir(pg)
    pg.wait_for_timeout(300)
    pg.screenshot(path=str(saida / f'{nome}-{tema}.png'), full_page=True)
    resultado = {
        'axe': verificar_axe(pg),
        'componentes': pg.evaluate(JS_COMPONENTES),
        'alvos': pg.evaluate(JS_ALVOS, ALVO_MIN),
        'zoom': verificar_zoom(pg),
        'foco': verificar_foco(pg),
        'erros_pagina': erros_pagina,
    }
    ctx.close()
    return resultado


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', default='http://localhost:5173')
    ap.add_argument('--saida', default=None, help='pasta para as imagens e o relatorio.json')
    ap.add_argument('--telas', default=','.join(TELAS), help='lista separada por vírgula')
    ap.add_argument('--temas', default='claro,escuro')
    args = ap.parse_args()

    try:
        urllib.request.urlopen(args.url, timeout=3)
    except Exception:
        print(f'O app não respondeu em {args.url}. Inicie com: cd app && npm run dev')
        return 2
    if not AXE.exists():
        print(f'axe-core não encontrado em {AXE}. Rode: cd app && npm install')
        return 2

    saida = Path(args.saida or tempfile.mkdtemp(prefix='auditoria-a11y-'))
    saida.mkdir(parents=True, exist_ok=True)
    relatorio, total = {}, 0
    with sync_playwright() as p:
        navegador = p.chromium.launch()
        for nome in args.telas.split(','):
            for tema in args.temas.split(','):
                r = auditar_tela(navegador, args.url, nome, tema, saida)
                relatorio[f'{nome} ({tema})'] = r
                n = len(r['axe']) + len(r['componentes']) + len(r['alvos']) + len(r['zoom']) + len(r['foco']) + len(r['erros_pagina'])
                total += n
                print(f"\n== {nome} ({tema}): {'ok' if n == 0 else f'{n} problema(s)'}")
                for v in r['axe']:
                    print(f"  [axe {v['impacto']}] {v['regra']}: {v['ajuda']}")
                    for no in v['nos']:
                        print(f"      {no['alvo']}  {no['resumo']}")
                for c in r['componentes']:
                    print(f"  [contraste de componente] {c['elemento']!r}: {c['razao']}:1 (mín 3:1)")
                for a in r['alvos']:
                    print(f"  [alvo de toque] {a['elemento']!r}: {a['tamanho']}px (mín {ALVO_MIN}x{ALVO_MIN})")
                for z in r['zoom']:
                    print(f"  [zoom 200%] vaza para o lado: {z}")
                for f in r['foco']:
                    print(f"  [foco invisível] {f!r}")
                for e in r['erros_pagina']:
                    print(f"  [erro na página] {e}")
        navegador.close()
    (saida / 'relatorio.json').write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\n{'Nenhum problema encontrado.' if total == 0 else f'{total} problema(s) no total.'}")
    print(f'Imagens e relatorio.json em: {saida}')
    return 1 if total else 0


if __name__ == '__main__':
    sys.exit(main())
