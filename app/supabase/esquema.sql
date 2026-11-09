-- Banco do app de glicemia (Supabase / Postgres).
-- Rodar uma vez, num projeto vazio, pelo SQL Editor ou pelo conector.
--
-- Regras (ver PROJETO.md, seção 7):
--   * ela lê, cria, edita e apaga os próprios registros e metas;
--   * os pais (acompanhantes) só leem os dados de quem acompanham;
--   * ninguém mais vê nada. As regras valem no banco, não só nas telas.

-- Quem acompanha quem. Preenchida só pelo painel, nunca pelo app.
create table public.acompanhantes (
  paciente_id uuid not null references auth.users (id) on delete cascade,
  acompanhante_id uuid not null references auth.users (id) on delete cascade,
  primary key (paciente_id, acompanhante_id),
  check (paciente_id <> acompanhante_id)
);

-- Espelha `Registro` de app/src/tipos.ts. Os limites são os mesmos do formulário.
create table public.registros (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data_hora timestamptz not null,
  glicemia integer check (glicemia between 20 and 600),
  momento text check (
    momento in ('jejum', 'antes_refeicao', 'depois_refeicao', 'antes_dormir', 'madrugada')
  ),
  insulina_tipo text check (insulina_tipo in ('lenta', 'rapida')),
  insulina_unidades numeric(5, 2) check (insulina_unidades > 0 and insulina_unidades <= 100),
  carboidratos integer check (carboidratos between 0 and 500),
  observacao text check (char_length(observacao) <= 1000),
  criado_em timestamptz not null default now(),
  -- tipo e quantidade de insulina andam juntos
  check ((insulina_tipo is null) = (insulina_unidades is null)),
  -- um registro tem glicemia, insulina ou as duas
  check (glicemia is not null or insulina_unidades is not null)
);

create index registros_paciente_data on public.registros (paciente_id, data_hora desc);

-- Metas da faixa-alvo, uma linha por paciente.
create table public.configuracoes (
  paciente_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  meta_min integer not null default 70,
  meta_max integer not null default 180,
  check (meta_min >= 40 and meta_max <= 400 and meta_min < meta_max)
);

-- Funções usadas pelas regras. Só leem linhas de `acompanhantes` em que quem
-- está logado é o acompanhante, o que a regra dessa tabela já permite.

-- Verdadeiro se quem está logado acompanha alguém (modo pais, no app).
create function public.sou_acompanhante()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.acompanhantes where acompanhante_id = (select auth.uid())
  );
$$;

-- Verdadeiro se quem está logado acompanha o paciente informado.
create function public.acompanho(paciente uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.acompanhantes
    where paciente_id = paciente and acompanhante_id = (select auth.uid())
  );
$$;

revoke execute on function public.sou_acompanhante() from public, anon;
revoke execute on function public.acompanho(uuid) from public, anon;
grant execute on function public.sou_acompanhante() to authenticated;
grant execute on function public.acompanho(uuid) to authenticated;

-- Regras de acesso. Sem login (anon), nada passa.
alter table public.acompanhantes enable row level security;
alter table public.registros enable row level security;
alter table public.configuracoes enable row level security;

revoke all on public.acompanhantes, public.registros, public.configuracoes from anon;

create policy "ver os próprios vínculos" on public.acompanhantes
  for select to authenticated
  using ((select auth.uid()) in (paciente_id, acompanhante_id));

create policy "ler: dona ou acompanhante" on public.registros
  for select to authenticated
  using (paciente_id = (select auth.uid()) or public.acompanho(paciente_id));

create policy "criar: só a dona" on public.registros
  for insert to authenticated
  with check (paciente_id = (select auth.uid()) and not public.sou_acompanhante());

create policy "editar: só a dona" on public.registros
  for update to authenticated
  using (paciente_id = (select auth.uid()) and not public.sou_acompanhante())
  with check (paciente_id = (select auth.uid()) and not public.sou_acompanhante());

create policy "apagar: só a dona" on public.registros
  for delete to authenticated
  using (paciente_id = (select auth.uid()) and not public.sou_acompanhante());

create policy "ler: dona ou acompanhante" on public.configuracoes
  for select to authenticated
  using (paciente_id = (select auth.uid()) or public.acompanho(paciente_id));

create policy "criar: só a dona" on public.configuracoes
  for insert to authenticated
  with check (paciente_id = (select auth.uid()) and not public.sou_acompanhante());

create policy "editar: só a dona" on public.configuracoes
  for update to authenticated
  using (paciente_id = (select auth.uid()) and not public.sou_acompanhante())
  with check (paciente_id = (select auth.uid()) and not public.sou_acompanhante());
