import { useState, type FormEvent } from 'react'
import { useMetas } from '../metas'
import { GLICEMIA_MAX, GLICEMIA_MIN, NOMES_FAIXA, faixaDe, sugerirMomento } from '../regras'
import {
  NOMES_INSULINA,
  NOMES_MOMENTO,
  type Momento,
  type NovoRegistro,
  type Registro,
  type TipoInsulina,
} from '../tipos'

interface Props {
  inicial?: Registro
  aoSalvar: (dados: NovoRegistro) => Promise<void>
  aoCancelar: () => void
  aoApagar?: () => Promise<void>
}

// <input type="datetime-local"> usa o formato "AAAA-MM-DDTHH:mm" no horário local.
function paraCampoDataHora(data: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}T${p(data.getHours())}:${p(data.getMinutes())}`
}

function paraNumero(texto: string): number | null {
  const limpo = texto.trim().replace(',', '.')
  if (limpo === '') return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : NaN
}

// Aceita um único separador decimal e até 2 casas, ex.: "6,5".
function limparDecimal(texto: string): string {
  const [inteiro, ...resto] = texto.replace('.', ',').replace(/[^\d,]/g, '').split(',')
  return resto.length ? `${inteiro.slice(0, 3)},${resto.join('').slice(0, 2)}` : inteiro.slice(0, 3)
}

export function FormularioRegistro({ inicial, aoSalvar, aoCancelar, aoApagar }: Props) {
  const metas = useMetas()
  const dataInicial = inicial ? new Date(inicial.dataHora) : new Date()

  const [glicemia, setGlicemia] = useState(inicial?.glicemia?.toString() ?? '')
  const [dataHora, setDataHora] = useState(paraCampoDataHora(dataInicial))
  const [momento, setMomento] = useState<Momento | null>(
    inicial ? inicial.momento : sugerirMomento(dataInicial),
  )
  // Enquanto ela não escolher o momento, ele acompanha a hora informada.
  const [momentoEscolhido, setMomentoEscolhido] = useState(Boolean(inicial))

  const [comInsulina, setComInsulina] = useState(Boolean(inicial?.insulinaTipo))
  const [insulinaTipo, setInsulinaTipo] = useState<TipoInsulina>(inicial?.insulinaTipo ?? 'rapida')
  const [insulinaUnidades, setInsulinaUnidades] = useState(
    inicial?.insulinaUnidades?.toString().replace('.', ',') ?? '',
  )
  const [comCarboidratos, setComCarboidratos] = useState(inicial?.carboidratos != null)
  const [carboidratos, setCarboidratos] = useState(inicial?.carboidratos?.toString() ?? '')
  const [comObservacao, setComObservacao] = useState(Boolean(inicial?.observacao))
  const [observacao, setObservacao] = useState(inicial?.observacao ?? '')

  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const valorGlicemia = paraNumero(glicemia)
  const faixa =
    valorGlicemia !== null && valorGlicemia >= GLICEMIA_MIN && valorGlicemia <= GLICEMIA_MAX
      ? faixaDe(valorGlicemia, metas)
      : null

  function mudarDataHora(valor: string) {
    setDataHora(valor)
    if (!momentoEscolhido && valor) setMomento(sugerirMomento(new Date(valor)))
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)

    const g = paraNumero(glicemia)
    if (g !== null && (Number.isNaN(g) || !Number.isInteger(g) || g < GLICEMIA_MIN || g > GLICEMIA_MAX)) {
      setErro(`A glicemia deve ser um número inteiro entre ${GLICEMIA_MIN} e ${GLICEMIA_MAX} mg/dL.`)
      return
    }

    let unidades: number | null = null
    if (comInsulina) {
      unidades = paraNumero(insulinaUnidades)
      if (unidades === null || Number.isNaN(unidades) || unidades <= 0 || unidades > 100) {
        setErro('Informe a quantidade de insulina em unidades (entre 0,5 e 100).')
        return
      }
    }

    let carbs: number | null = null
    if (comCarboidratos) {
      carbs = paraNumero(carboidratos)
      if (carbs !== null && (Number.isNaN(carbs) || carbs < 0 || carbs > 500)) {
        setErro('Os carboidratos devem estar entre 0 e 500 gramas.')
        return
      }
    }

    if (g === null && unidades === null) {
      setErro('Informe a glicemia ou a insulina aplicada.')
      return
    }

    if (!dataHora) {
      setErro('Informe a data e a hora.')
      return
    }

    setSalvando(true)
    try {
      await aoSalvar({
        dataHora: new Date(dataHora).toISOString(),
        glicemia: g,
        momento,
        insulinaTipo: comInsulina ? insulinaTipo : null,
        insulinaUnidades: unidades,
        carboidratos: carbs,
        observacao: comObservacao && observacao.trim() ? observacao.trim() : null,
      })
    } catch {
      setErro('Não foi possível salvar. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  async function apagar() {
    if (!aoApagar) return
    if (!window.confirm('Apagar este registro? Não dá para desfazer.')) return
    setErro(null)
    setSalvando(true)
    try {
      await aoApagar()
    } catch {
      setErro('Não foi possível apagar. Confira a internet e tente de novo.')
      setSalvando(false)
    }
  }

  return (
    <form className="formulario" onSubmit={enviar} noValidate>
      <header className="topo">
        <button type="button" className="botao-texto" onClick={aoCancelar}>
          Cancelar
        </button>
        <h1>{inicial ? 'Editar registro' : 'Novo registro'}</h1>
        <span className="topo-espaco" />
      </header>

      <label className={`campo-glicemia ${faixa ? `faixa-${faixa}` : ''}`}>
        <span className="rotulo">Glicemia</span>
        <span className="glicemia-entrada">
          <input
            autoFocus={!inicial}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="—"
            value={glicemia}
            onChange={(e) => setGlicemia(e.target.value.replace(/\D/g, '').slice(0, 3))}
            aria-label="Glicemia em mg/dL"
          />
          <span className="unidade">mg/dL</span>
        </span>
        <span className="faixa-texto">{faixa ? NOMES_FAIXA[faixa] : ' '}</span>
      </label>

      <fieldset className="grupo">
        <legend className="rotulo">Momento</legend>
        <div className="opcoes">
          {(Object.keys(NOMES_MOMENTO) as Momento[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`opcao ${momento === m ? 'ativa' : ''}`}
              aria-pressed={momento === m}
              onClick={() => {
                setMomento(momento === m ? null : m)
                setMomentoEscolhido(true)
              }}
            >
              {NOMES_MOMENTO[m]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="grupo">
        <span className="rotulo">Data e hora</span>
        <input
          type="datetime-local"
          className="entrada"
          value={dataHora}
          onChange={(e) => mudarDataHora(e.target.value)}
        />
      </label>

      {comInsulina ? (
        <fieldset className="grupo cartao">
          <legend className="rotulo">Insulina</legend>
          <div className="opcoes">
            {(Object.keys(NOMES_INSULINA) as TipoInsulina[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`opcao ${insulinaTipo === t ? 'ativa' : ''}`}
                aria-pressed={insulinaTipo === t}
                onClick={() => setInsulinaTipo(t)}
              >
                {NOMES_INSULINA[t]}
              </button>
            ))}
          </div>
          <span className="entrada-com-unidade">
            <input
              className="entrada"
              inputMode="decimal"
              placeholder="0"
              value={insulinaUnidades}
              onChange={(e) => setInsulinaUnidades(limparDecimal(e.target.value))}
              aria-label="Unidades de insulina"
            />
            <span className="unidade">unidades</span>
          </span>
          <button type="button" className="botao-texto remover" onClick={() => setComInsulina(false)}>
            Remover insulina
          </button>
        </fieldset>
      ) : null}

      {comCarboidratos ? (
        <fieldset className="grupo cartao">
          <legend className="rotulo">Carboidratos</legend>
          <span className="entrada-com-unidade">
            <input
              className="entrada"
              inputMode="numeric"
              placeholder="0"
              value={carboidratos}
              onChange={(e) => setCarboidratos(e.target.value.replace(/\D/g, ''))}
              aria-label="Carboidratos em gramas"
            />
            <span className="unidade">gramas</span>
          </span>
          <button
            type="button"
            className="botao-texto remover"
            onClick={() => setComCarboidratos(false)}
          >
            Remover carboidratos
          </button>
        </fieldset>
      ) : null}

      {comObservacao ? (
        <fieldset className="grupo cartao">
          <legend className="rotulo">Observação</legend>
          <textarea
            className="entrada"
            rows={3}
            placeholder="Ex.: fiz exercício, estava doente"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
          <button
            type="button"
            className="botao-texto remover"
            onClick={() => setComObservacao(false)}
          >
            Remover observação
          </button>
        </fieldset>
      ) : null}

      {!comInsulina || !comCarboidratos || !comObservacao ? (
        <div className="adicionar">
          {!comInsulina && (
            <button type="button" className="botao-secundario" onClick={() => setComInsulina(true)}>
              + Insulina
            </button>
          )}
          {!comCarboidratos && (
            <button
              type="button"
              className="botao-secundario"
              onClick={() => setComCarboidratos(true)}
            >
              + Carboidratos
            </button>
          )}
          {!comObservacao && (
            <button type="button" className="botao-secundario" onClick={() => setComObservacao(true)}>
              + Observação
            </button>
          )}
        </div>
      ) : null}

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <div className="acoes">
        <button type="submit" className="botao-principal" disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {aoApagar && (
          <button type="button" className="botao-perigo" onClick={apagar} disabled={salvando}>
            Apagar registro
          </button>
        )}
      </div>
    </form>
  )
}
