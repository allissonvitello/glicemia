import { METAS_PADRAO } from './regras'
import { supabase } from './supabase'
import type { Metas, NovoRegistro, Registro } from './tipos'

// Dados no Supabase. Quem pode ler ou alterar o quê é decidido pelo banco:
// para ela, estas funções trazem os próprios registros; para os pais, os dela.

// O histórico vai até 90 dias; a folga cobre a "última medição" mais antiga.
const DIAS_CARREGADOS = 120

interface Linha {
  id: string
  data_hora: string
  glicemia: number | null
  momento: Registro['momento']
  insulina_tipo: Registro['insulinaTipo']
  insulina_unidades: number | null
  carboidratos: number | null
  observacao: string | null
}

const COLUNAS =
  'id, data_hora, glicemia, momento, insulina_tipo, insulina_unidades, carboidratos, observacao'

function deLinha(l: Linha): Registro {
  return {
    id: l.id,
    dataHora: l.data_hora,
    glicemia: l.glicemia,
    momento: l.momento,
    insulinaTipo: l.insulina_tipo,
    insulinaUnidades: l.insulina_unidades === null ? null : Number(l.insulina_unidades),
    carboidratos: l.carboidratos,
    observacao: l.observacao,
  }
}

function paraLinha(r: NovoRegistro): Omit<Linha, 'id'> {
  return {
    data_hora: r.dataHora,
    glicemia: r.glicemia,
    momento: r.momento,
    insulina_tipo: r.insulinaTipo,
    insulina_unidades: r.insulinaUnidades,
    carboidratos: r.carboidratos,
    observacao: r.observacao,
  }
}

export async function listarRegistros(): Promise<Registro[]> {
  const desde = new Date()
  desde.setDate(desde.getDate() - DIAS_CARREGADOS)
  const { data, error } = await supabase
    .from('registros')
    .select(COLUNAS)
    .gte('data_hora', desde.toISOString())
    .order('data_hora', { ascending: false })
    // desempate: dois registros no mesmo minuto ficam na ordem em que foram salvos
    .order('criado_em', { ascending: false })
  if (error) throw error
  return (data as Linha[]).map(deLinha)
}

export async function criarRegistro(dados: NovoRegistro): Promise<void> {
  // A dona do registro (paciente_id) é preenchida pelo banco com quem está logado.
  const { error } = await supabase.from('registros').insert(paraLinha(dados))
  if (error) throw error
}

export async function atualizarRegistro(registro: Registro): Promise<void> {
  const { error } = await supabase
    .from('registros')
    .update(paraLinha(registro))
    .eq('id', registro.id)
  if (error) throw error
}

export async function apagarRegistro(id: string): Promise<void> {
  const { error } = await supabase.from('registros').delete().eq('id', id)
  if (error) throw error
}

export async function lerMetas(): Promise<Metas> {
  const { data, error } = await supabase
    .from('configuracoes')
    .select('meta_min, meta_max')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? { min: data.meta_min, max: data.meta_max } : METAS_PADRAO
}

export async function salvarMetas(metas: Metas): Promise<void> {
  const { data } = await supabase.auth.getSession()
  const { error } = await supabase
    .from('configuracoes')
    .upsert({ paciente_id: data.session?.user.id, meta_min: metas.min, meta_max: metas.max })
  if (error) throw error
}

// Verdadeiro para os pais: o app entra no modo somente leitura.
export async function souAcompanhante(): Promise<boolean> {
  const { data, error } = await supabase.rpc('sou_acompanhante')
  if (error) throw error
  return Boolean(data)
}
