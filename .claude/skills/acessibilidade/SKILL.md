---
name: acessibilidade
description: Valida e corrige a acessibilidade do app de glicemia (app/) — contraste de cores WCAG nos temas claro e escuro, bordas de campos, alvos de toque, foco visível, rótulos, leitores de tela e zoom de 200%. Use SEMPRE que criar ou alterar qualquer tela, componente React, cor, variável CSS ou estilo em app/src, antes de dizer que a mudança está pronta — mesmo que o pedido não mencione acessibilidade — e também quando o autor reclamar de algo difícil de ler, de enxergar ou de tocar, ou pedir para verificar contraste ou acessibilidade.
---

# Acessibilidade do app de glicemia

Quem usa o app é uma jovem com diabetes tipo 1, quase sempre no celular, com pressa, às vezes com pouca luz ou em hipoglicemia, quando a visão embaça e a coordenação piora. Os pais acompanham pelos próprios celulares. Um número que não se lê, um campo que não aparece ou um botão difícil de acertar atrapalha uma decisão de saúde. Por isso a acessibilidade aqui é critério de pronto, como compilar sem erro.

O autor do projeto não programa: os relatos para ele devem ser em linguagem simples (ver "Como relatar").

## Regras do projeto

Valem para os dois temas (claro e escuro), porque o app segue o tema do celular.

- **Contraste de texto**: 4,5:1; texto grande (≥ 24px, ou ≥ 18,7px em negrito): 3:1.
- **Contraste de componentes**: bordas de campos e opções, ícones, pontos e barras de gráficos e contorno de foco: 3:1 contra o que está ao redor. Use `--borda-campo` para campos e `--linha` só para divisórias decorativas.
- **Cor nunca sozinha**: a faixa da glicemia sempre vem com texto ("Baixa", "Na meta", "Alta"). Daltonismo vermelho-verde é comum, e as faixas usam justamente vermelho e verde.
- **Alvos de toque** de pelo menos 44×44px, inclusive botões de texto como "Cancelar", "Sair" e "Remover…".
- **Foco visível** em tudo que se alcança com Tab. Se um campo não tem contorno próprio, o contêiner mostra o foco (`:focus-within`).
- **Rótulos**: todo campo tem `<label>` ou `aria-label`; botões têm nome legível; gráficos são `role="img"` com `aria-label` que diz o que mostram.
- **Mensagens**: erros com `role="alert"` e confirmações com `role="status"`, para leitores de tela anunciarem.
- **Zoom de 200%**: nada pode vazar para os lados nem exigir rolagem horizontal; grades e linhas de botões devem quebrar (`flex-wrap`, `auto-fit`).
- **Cores só por variáveis** de `app/src/index.css`, definidas nos dois temas. Cor fixa no meio do CSS escapa da verificação.

## Fluxo

1. **Cores**: `python3 .claude/skills/acessibilidade/scripts/contraste.py`
   - Confere cada par de `pares.json` nos dois temas, sem navegador e em menos de um segundo.
   - Se você criou uma combinação nova de cor (texto X sobre fundo Y), acrescente o par em `pares.json` antes de rodar.
2. **Telas**: com o app rodando (`cd app && npm run dev`, com Node ≥ 20, ex.: `PATH=~/.nvm/versions/node/v24.22.1/bin:$PATH`), rode `python3 .claude/skills/acessibilidade/scripts/auditar.py --saida <pasta temporária>`.
   - Percorre todas as telas, inclusive o modo pais, nos dois temas, e roda o axe-core e as verificações próprias (componentes, alvos de toque, foco e zoom).
   - Não toca no banco: injeta um login falso e responde ao Supabase com dados de exemplo.
   - Para olhar só algumas telas: `--telas formulario,inicio --temas claro`.
   - Ao criar uma tela nova, acrescente-a em `TELAS` no script, com uma função que chega até ela.
3. **Corrija** e repita até os dois scripts terminarem sem falhas.
   - Prefira ajustar a variável de cor (vale para o app todo) a remendar um elemento.
   - Ao escurecer ou clarear uma cor de faixa, confira que vermelho, verde e âmbar continuam distinguíveis entre si.
4. **Olhe as imagens** que a auditoria salva (`<tela>-<tema>.png`). O script mede, mas não julga se ficou bonito ou equilibrado.
5. **Relate** ao autor (abaixo).

### Leitura dos resultados

- `[axe …] color-contrast`: texto com pouco contraste. A mensagem traz as duas cores e o mínimo exigido.
- `[contraste de componente]`: campo ou opção cuja borda e fundo se confundem com o redor.
- `[alvo de toque]`: largura × altura menores que 44px.
- `[foco invisível]`: ao chegar no elemento com Tab, nada muda na tela.
- `[zoom 200%]`: classes dos elementos que vazam para o lado.
- `[axe …] aria-*` / `label` / `button-name`: problemas para leitores de tela.

Um falso alarme deve ser corrigido no script, e não ignorado. Exemplo: um campo sem borda própria dentro de um cartão com borda já é tratado assim.

## Como relatar

Escreva para quem não programa:
- o que estava ruim, em termos de uso ("as bordas dos campos quase não apareciam");
- o que mudou ("agora têm contorno visível");
- e que as verificações passam.

Números de contraste só entre parênteses, se ajudarem. Mostre antes e depois quando a mudança for visual. Diga com franqueza o que não foi verificado: leitor de tela de verdade, celular real e luz do sol a máquina não testa. Nesses casos, sugira o autor conferir no celular.
