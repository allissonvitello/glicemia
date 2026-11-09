import { useState } from 'react'
import { useMetas } from '../metas'
import { inicioPeriodo, resumoUltimosDias } from '../regras'
import type { Registro } from '../tipos'
import { GraficoPeriodo } from './GraficoPeriodo'
import { ListaRegistros } from './ListaRegistros'

interface Props {
  registros: Registro[]
  aoEditar?: (registro: Registro) => void
}

const PERIODOS = [7, 30, 90]

function tituloDia(chave: string) {
  const data = new Date(`${chave}T12:00:00`)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })
  if (data.toDateString() === hoje.toDateString()) return `Hoje · ${texto}`
  if (data.toDateString() === ontem.toDateString()) return `Ontem · ${texto}`
  return texto
}

// Chave AAAA-MM-DD no horário local, para agrupar por dia.
function chaveDia(iso: string) {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function Historico({ registros, aoEditar }: Props) {
  const metas = useMetas()
  const [dias, setDias] = useState(7)

  const inicio = inicioPeriodo(dias)
  const doPeriodo = registros.filter((r) => new Date(r.dataHora) >= inicio)
  const resumo = resumoUltimosDias(registros, dias, metas)

  // `registros` já vem do mais recente para o mais antigo.
  const porDia = new Map<string, Registro[]>()
  for (const r of doPeriodo) {
    const chave = chaveDia(r.dataHora)
    porDia.set(chave, [...(porDia.get(chave) ?? []), r])
  }

  return (
    <>
      <div className="opcoes periodos" role="group" aria-label="Período">
        {PERIODOS.map((p) => (
          <button
            key={p}
            type="button"
            className={`opcao ${dias === p ? 'ativa' : ''}`}
            aria-pressed={dias === p}
            onClick={() => setDias(p)}
          >
            {p} dias
          </button>
        ))}
      </div>

      <section className="resumo">
        <div className="cartao">
          <span className="rotulo">Média</span>
          <p className="resumo-valor">
            {resumo ? resumo.media : '—'} <span className="unidade">mg/dL</span>
          </p>
        </div>
        <div className="cartao">
          <span className="rotulo">Medições</span>
          <p className="resumo-valor">{resumo ? resumo.quantidade : 0}</p>
        </div>
      </section>

      {resumo && (
        <section className="cartao">
          <h2 className="rotulo">Tempo em cada faixa</h2>
          <div className="barra-faixas" aria-hidden="true">
            <span className="faixa-baixa" style={{ flexGrow: resumo.percentualBaixa }} />
            <span className="faixa-meta" style={{ flexGrow: resumo.percentualMeta }} />
            <span className="faixa-alta" style={{ flexGrow: resumo.percentualAlta }} />
          </div>
          <ul className="legenda-faixas">
            <li className="faixa-baixa">
              Baixa <strong>{resumo.percentualBaixa}%</strong>
            </li>
            <li className="faixa-meta">
              Na meta <strong>{resumo.percentualMeta}%</strong>
            </li>
            <li className="faixa-alta">
              Alta <strong>{resumo.percentualAlta}%</strong>
            </li>
          </ul>
        </section>
      )}

      <section className="cartao">
        <h2 className="rotulo">Gráfico</h2>
        {resumo ? (
          <GraficoPeriodo registros={doPeriodo} dias={dias} />
        ) : (
          <p className="vazio">Nenhuma medição nos últimos {dias} dias.</p>
        )}
      </section>

      {[...porDia].map(([chave, doDia]) => (
        <section key={chave} className="cartao">
          <h2 className="rotulo">{tituloDia(chave)}</h2>
          <ListaRegistros registros={doDia} aoEditar={aoEditar} />
        </section>
      ))}
    </>
  )
}
