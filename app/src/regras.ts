import type { Metas, Momento, Registro } from './tipos'

// Faixas padrão até o médico informar as metas (ver PROJETO.md, seção 6).
// Ela pode ajustá-las na tela de configurações.
export const METAS_PADRAO: Metas = { min: 70, max: 180 }

export const GLICEMIA_MIN = 20
export const GLICEMIA_MAX = 600

export type Faixa = 'baixa' | 'meta' | 'alta'

export function faixaDe(glicemia: number, metas: Metas): Faixa {
  if (glicemia < metas.min) return 'baixa'
  if (glicemia > metas.max) return 'alta'
  return 'meta'
}

export const NOMES_FAIXA: Record<Faixa, string> = {
  baixa: 'Baixa',
  meta: 'Na meta',
  alta: 'Alta',
}

// Sugestão inicial; ela pode trocar no formulário.
export function sugerirMomento(data: Date): Momento {
  const minutos = data.getHours() * 60 + data.getMinutes()
  if (minutos < 5 * 60) return 'madrugada'
  if (minutos < 9 * 60) return 'jejum'
  if (minutos < 11 * 60) return 'depois_refeicao'
  if (minutos < 13 * 60) return 'antes_refeicao'
  if (minutos < 16 * 60) return 'depois_refeicao'
  if (minutos < 19 * 60) return 'antes_refeicao'
  if (minutos < 22 * 60) return 'depois_refeicao'
  return 'antes_dormir'
}

export function hora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Meia-noite do primeiro dia de um período de `dias` dias terminando hoje.
export function inicioPeriodo(dias: number, agora = new Date()): Date {
  const inicio = new Date(agora)
  inicio.setHours(0, 0, 0, 0)
  inicio.setDate(inicio.getDate() - (dias - 1))
  return inicio
}

export function resumoUltimosDias(
  registros: Registro[],
  dias: number,
  metas: Metas,
  agora = new Date(),
) {
  const inicio = inicioPeriodo(dias, agora)
  const valores = registros
    .filter((r) => r.glicemia !== null && new Date(r.dataHora) >= inicio)
    .map((r) => r.glicemia as number)
  if (valores.length === 0) return null
  const media = valores.reduce((s, v) => s + v, 0) / valores.length
  const percentual = (faixa: Faixa) =>
    Math.round((valores.filter((v) => faixaDe(v, metas) === faixa).length / valores.length) * 100)
  return {
    quantidade: valores.length,
    media: Math.round(media),
    percentualMeta: percentual('meta'),
    percentualBaixa: percentual('baixa'),
    percentualAlta: percentual('alta'),
  }
}
