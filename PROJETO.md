# Projeto: App de Acompanhamento de Glicemia

> PRD do projeto: documento de premissas construído por entrevista antes do desenvolvimento. Os dados pessoais da usuária real foram retirados para a publicação.

## 1. Visão geral

App web para acompanhamento de glicemia, feito sob medida para **uma pessoa jovem com diabetes tipo 1**, a usuária principal, e para **os familiares** que acompanham as medições.

## 2. Motivação

- **Personalização:** atender exatamente à rotina e às necessidades dela, sem as funcionalidades genéricas dos apps de mercado.
- **Economia:** evitar o custo de assinatura dos apps de diabetes que existem hoje.

## 3. Escopo de uso

- **Uso pessoal/familiar**, não é um produto público nem comercial.
- **Usuária principal:** uma pessoa adulta com diabetes tipo 1. Ela mesma registra e consulta os dados.
- **Acompanhantes:** os pais dela. Só **consultam**: têm acesso ao histórico e aos gráficos, mas não registram nem alteram dados.
- Como só ela registra, não é preciso controlar quem criou ou alterou cada registro.

## 4. Plataformas

- App web que funcione em computadores e celulares.
- Layout **responsivo**, utilizável em qualquer tamanho de tela.

## 5. Contexto clínico

- **Tipo de diabetes:** tipo 1. O corpo não produz insulina, então ela depende de insulina diariamente.
- **Medição:** de dois jeitos, com um aparelho (modelo ainda não identificado, pode ser um glicosímetro ou um sensor contínuo) e também manualmente.
- **Entrada de dados no app:** sempre **manual**. A integração com o aparelho de medição não entra por enquanto.
- **Insulina:** usa. Forma de aplicação (caneta ou bomba) e tipos de insulina: **[A CONFIRMAR]**
- **Metas de glicemia** definidas pelo médico: **[A CONFIRMAR]**

## 6. Funcionalidades

### Prioridade 1: o dia a dia dela

**Registro rápido.** A tela de registro abre pronta para digitar o valor. Só o valor é obrigatório e o resto é opcional, para registrar em poucos segundos.

Cada registro tem:
- **glicemia** em mg/dL;
- **data e hora**, preenchidas automaticamente com o momento atual e editáveis;
- **momento**: jejum, antes de refeição, depois de refeição, antes de dormir ou madrugada. O app sugere um pela hora do dia e ela pode trocar;
- **insulina aplicada** (opcional): tipo (lenta ou rápida) e quantidade em unidades;
- **carboidratos** em gramas (opcional);
- **observação** livre (opcional), como "fiz exercício" ou "estava doente".

Um registro pode ter só a glicemia, só a insulina (ex.: a dose de insulina lenta da noite) ou as duas coisas.

**Tela inicial.** Mostra:
- a última medição, em destaque e com a cor da faixa;
- a lista e o gráfico das medições de hoje;
- a média dos últimos 7 dias e a % das medições dentro da meta.

**Histórico.** Medições dos dias anteriores, com filtro por período.

**Correções.** Ela pode editar e apagar os próprios registros a qualquer momento. O app pede confirmação antes de apagar.

**Faixas de cor**, ajustáveis nas configurações quando o médico informar as metas:
- **baixa:** abaixo de 70 mg/dL (vermelho);
- **na meta:** de 70 a 180 mg/dL (verde);
- **alta:** acima de 180 mg/dL (amarelo).

### Prioridade 2: acompanhamento dos pais

- Histórico das medições.
- Gráficos.
- Somente leitura.

### Ainda a decidir

- Relatório para o médico (PDF ou planilha).
- Lembretes e notificações no celular.

## 7. Dados e privacidade

- Cada pessoa entra com o **próprio login** (e-mail e senha).
- **Ela** pode ler, criar, editar e apagar os registros dela.
- **Os pais** podem apenas ler os registros dela.
- Essas regras ficam **no banco de dados**, e não só nas telas. Assim, mesmo que a tela tenha um erro, os pais não conseguem alterar dados.
- Ninguém fora da família tem acesso. O app não tem cadastro aberto: as contas são criadas manualmente.

## 8. Fora de escopo

- Integração com o aparelho de medição (por enquanto).
- Registro ou alteração de dados pelos pais.
- **Cálculo de dose de insulina.** O app registra o que ela aplicou, mas nunca sugere quanto aplicar. Um erro nesse cálculo pode causar uma hipoglicemia grave, e essa decisão cabe ao médico ou a aparelhos certificados.

## 9. Tecnologia

| Peça | Escolha | Papel |
|---|---|---|
| Telas do app | **React** (com Vite e TypeScript) | O que ela e os pais veem e tocam |
| Instalação no celular | **PWA** | Ícone na tela inicial, abre como um app |
| Login e banco de dados | **Supabase** | Guarda as medições e controla quem pode fazer o quê |
| Hospedagem | **Vercel** | Deixa o app no ar num endereço da internet |
| Gráficos | **Recharts** | Desenha os gráficos de glicemia |

**Custo:** zero. Os planos gratuitos do Supabase e da Vercel sobram para uma família. Um ponto de atenção: o Supabase gratuito pausa o projeto após 7 dias sem uso. Com registros diários isso não acontece, e um projeto pausado pode ser reativado no painel.

## 10. Perguntas em aberto

Perguntas que ficaram para uma próxima versão. Nenhuma delas impediu a primeira.

- Integração com o aparelho de medição: é glicosímetro (dedo) ou sensor contínuo? Ele exporta dados (app, CSV)?
- Forma de aplicação da insulina (caneta ou bomba) e quais insulinas aparecem na rotina.
- Metas de glicemia definidas pelo médico. O app começa com 70 a 180 mg/dL, e a usuária ajusta em **Ajustes**.
- Contagem de carboidratos para o cálculo da dose, que fica fora do escopo do app (ver seção 8).

## 11. Andamento

1. **Etapa 1, o dia a dia dela.** Registro rápido, tela inicial, histórico (filtro de 7, 30 ou 90 dias, média, tempo em cada faixa e gráfico do período) e ajuste das metas. Os dados ficavam só no navegador, para testes.
2. **Etapa 2, banco de dados.** Projeto no Supabase com três tabelas (registros, acompanhantes e configurações), limites de valores e regras de acesso no próprio banco (`app/supabase/esquema.sql`), contas criadas manualmente e cadastro aberto desligado. As regras foram testadas simulando a usuária, um acompanhante, alguém sem vínculo e alguém sem login.
3. **Etapa 3, login e modo acompanhante.** O app passou a guardar os dados no Supabase. Ganhou login, "Sair" e "Esqueci minha senha". Para os acompanhantes, entra no modo somente leitura. Foi feito um teste de ponta a ponta com logins temporários, apagados em seguida.
4. **Acessibilidade.** Foi criada uma skill (`.claude/skills/acessibilidade/`) que confere o contraste das cores nos temas claro e escuro e audita todas as telas com o axe-core e verificações próprias: bordas de campos, alvos de toque de 44px, foco visível e zoom de 200%. A primeira auditoria apontou 236 problemas, e todos foram corrigidos.
5. **Etapa 4, publicação.** Código no GitHub e publicação automática na Vercel. App instalável no celular (PWA), com atualização automática. Foi feito um teste de ponta a ponta no endereço publicado.

**Status:** projeto concluído. Em 09/11/2026 a versão publicada e o banco de dados foram desativados, e o código ficou disponível como portfólio.
