#!/usr/bin/env python3
"""Verifica o contraste WCAG dos pares de cor do app, nos temas claro e escuro.

Lê as variáveis de cor de app/src/index.css (bloco :root e o :root dentro de
@media (prefers-color-scheme: dark)) e confere cada par de pares.json.
Sai com código 1 se algum par falhar.

Uso: python3 contraste.py [--css caminho/index.css] [--pares caminho/pares.json]
"""
import argparse
import json
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[4]  # .claude/skills/acessibilidade/scripts -> projeto
MINIMOS = {'texto': 4.5, 'grande': 3.0, 'componente': 3.0}


def variaveis(bloco: str) -> dict:
    return {m[0]: m[1] for m in re.findall(r'(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;', bloco)}


def ler_temas(css: str) -> dict:
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    escuro_m = re.search(r'@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{(.*?)\}', css, re.S)
    sem_escuro = css.replace(escuro_m.group(0), '') if escuro_m else css
    claro_m = re.search(r':root\s*\{(.*?)\}', sem_escuro, re.S)
    claro = variaveis(claro_m.group(1)) if claro_m else {}
    # o tema escuro herda o que não redefine
    escuro = {**claro, **(variaveis(escuro_m.group(1)) if escuro_m else {})}
    return {'claro': claro, 'escuro': escuro}


def luminancia(hexa: str) -> float:
    h = hexa.lstrip('#')
    if len(h) in (3, 4):
        h = ''.join(c * 2 for c in h[:3])
    canais = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in canais]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def razao(a: str, b: str) -> float:
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--css', default=str(RAIZ / 'app/src/index.css'))
    ap.add_argument('--pares', default=str(Path(__file__).resolve().parents[1] / 'pares.json'))
    args = ap.parse_args()

    temas = ler_temas(Path(args.css).read_text(encoding='utf-8'))
    pares = json.loads(Path(args.pares).read_text(encoding='utf-8'))['pares']
    falhas = 0
    for tema, cores in temas.items():
        print(f'\nTema {tema}')
        for p in pares:
            minimo = MINIMOS[p['tipo']]
            ausentes = [v for v in (p['frente'], p['fundo']) if v not in cores]
            if ausentes:
                falhas += 1
                print(f"  FALHA  {'variável inexistente: ' + ', '.join(ausentes):38} {p['onde']}")
                continue
            r = razao(cores[p['frente']], cores[p['fundo']])
            ok = r >= minimo
            falhas += not ok
            par = f"{p['frente']} sobre {p['fundo']}"
            print(f"  {'ok   ' if ok else 'FALHA'}  {r:5.2f} (mín {minimo})  {par:38} {p['onde']}")
    print(f'\n{falhas} falha(s).' if falhas else '\nTodos os pares passam.')
    return 1 if falhas else 0


if __name__ == '__main__':
    sys.exit(main())
