import { useMetas } from '../metas'
import { NOMES_FAIXA, faixaDe, hora, mesmoDia, resumoUltimosDias } from '../regras'
import type { Registro } from '../tipos'
import { GraficoDia } from './GraficoDia'
import { ListaRegistros } from './ListaRegistros'

interface Props {
  registros: Registro[]
  aoEditar?: (registro: Registro) => void
}

function quando(iso: string) {
  const data = new Date(iso)
  const hoje = new Date()
  const ontem = new Date()
  ontem.setDate(hoje.getDate() - 1)
  if (mesmoDia(data, hoje)) return `hoje às ${hora(iso)}`
  if (mesmoDia(data, ontem)) return `ontem às ${hora(iso)}`
  return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function Inicio({ registros, aoEditar }: Props) {
  const metas = useMetas()
  const hoje = registros.filter((r) => mesmoDia(new Date(r.dataHora), new Date()))
  const ultima = registros.find((r) => r.glicemia !== null)
  const resumo = resumoUltimosDias(registros, 7, metas)

  return (
    <>
      <section className={`cartao ultima ${ultima ? `faixa-${faixaDe(ultima.glicemia!, metas)}` : ''}`}>
        <span className="rotulo">Última medição</span>
        {ultima ? (
          <>
            <p className="ultima-valor">
              {ultima.glicemia} <span className="unidade">mg/dL</span>
            </p>
            <p className="ultima-info">
              <span className="selo">{NOMES_FAIXA[faixaDe(ultima.glicemia!, metas)]}</span>
              {quando(ultima.dataHora)}
            </p>
          </>
        ) : (
          <p className="vazio">Nenhuma medição ainda.</p>
        )}
      </section>

      <section className="resumo">
        <div className="cartao">
          <span className="rotulo">Média 7 dias</span>
          <p className="resumo-valor">
            {resumo ? resumo.media : '—'} <span className="unidade">mg/dL</span>
          </p>
        </div>
        <div className="cartao">
          <span className="rotulo">Na meta (7 dias)</span>
          <p className="resumo-valor">{resumo ? `${resumo.percentualMeta}%` : '—'}</p>
        </div>
      </section>

      <section className="cartao">
        <h2 className="rotulo">Hoje</h2>
        <GraficoDia registros={hoje} />
        {hoje.length === 0 ? (
          <p className="vazio">Nada registrado hoje.</p>
        ) : (
          <ListaRegistros registros={hoje} aoEditar={aoEditar} />
        )}
      </section>
    </>
  )
}
