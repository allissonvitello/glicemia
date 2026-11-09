export type Momento =
  | 'jejum'
  | 'antes_refeicao'
  | 'depois_refeicao'
  | 'antes_dormir'
  | 'madrugada'

export type TipoInsulina = 'lenta' | 'rapida'

export interface Registro {
  id: string
  dataHora: string // ISO 8601
  glicemia: number | null // mg/dL
  momento: Momento | null
  insulinaTipo: TipoInsulina | null
  insulinaUnidades: number | null
  carboidratos: number | null // gramas
  observacao: string | null
}

export type NovoRegistro = Omit<Registro, 'id'>

// Faixa-alvo em mg/dL: abaixo de `min` é baixa, acima de `max` é alta.
export interface Metas {
  min: number
  max: number
}

export const NOMES_MOMENTO: Record<Momento, string> = {
  jejum: 'Jejum',
  antes_refeicao: 'Antes de refeição',
  depois_refeicao: 'Depois de refeição',
  antes_dormir: 'Antes de dormir',
  madrugada: 'Madrugada',
}

export const NOMES_INSULINA: Record<TipoInsulina, string> = {
  lenta: 'Lenta',
  rapida: 'Rápida',
}
