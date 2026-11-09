import { useMetas } from '../metas'
import { faixaDe, hora } from '../regras'
import { NOMES_INSULINA, NOMES_MOMENTO, type Metas, type Registro } from '../tipos'

interface Props {
  registros: Registro[]
  // Sem `aoEditar` (modo pais), os itens não abrem a edição.
  aoEditar?: (registro: Registro) => void
}

function detalhes(r: Registro): string {
  const partes: string[] = []
  if (r.momento) partes.push(NOMES_MOMENTO[r.momento])
  if (r.insulinaTipo && r.insulinaUnidades !== null)
    partes.push(`${NOMES_INSULINA[r.insulinaTipo]} ${String(r.insulinaUnidades).replace('.', ',')} U`)
  if (r.carboidratos !== null) partes.push(`${r.carboidratos} g carb.`)
  return partes.join(' · ')
}

function ConteudoItem({ r, metas }: { r: Registro; metas: Metas }) {
  return (
    <>
      <span className="item-hora">{hora(r.dataHora)}</span>
      <span className="item-corpo">
        <span className="item-detalhes">{detalhes(r) || 'Registro'}</span>
        {r.observacao && <span className="item-obs">{r.observacao}</span>}
      </span>
      {r.glicemia !== null ? (
        <span className={`item-valor faixa-${faixaDe(r.glicemia, metas)}`}>{r.glicemia}</span>
      ) : (
        <span className="item-valor">—</span>
      )}
    </>
  )
}

export function ListaRegistros({ registros, aoEditar }: Props) {
  const metas = useMetas()

  return (
    <ul className="lista">
      {registros.map((r) => (
        <li key={r.id}>
          {aoEditar ? (
            <button type="button" className="item" onClick={() => aoEditar(r)}>
              <ConteudoItem r={r} metas={metas} />
            </button>
          ) : (
            <div className="item">
              <ConteudoItem r={r} metas={metas} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
