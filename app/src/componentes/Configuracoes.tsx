import { useState, type FormEvent } from 'react'
import { useMetas } from '../metas'
import { METAS_PADRAO } from '../regras'
import type { Metas } from '../tipos'

interface Props {
  aoSalvar: (metas: Metas) => Promise<void>
}

export function Configuracoes({ aoSalvar }: Props) {
  const metas = useMetas()
  const [min, setMin] = useState(String(metas.min))
  const [max, setMax] = useState(String(metas.max))
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  async function salvar(novas: Metas) {
    setSalvando(true)
    try {
      await aoSalvar(novas)
      setMin(String(novas.min))
      setMax(String(novas.max))
      setAviso('Metas salvas.')
    } catch {
      setErro('Não foi possível salvar. Tente de novo.')
    }
    setSalvando(false)
  }

  function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    const nMin = Number(min)
    const nMax = Number(max)
    if (!min || !max || nMin < 40 || nMax > 400 || nMin >= nMax) {
      setErro('O mínimo deve ser menor que o máximo, entre 40 e 400 mg/dL.')
      return
    }
    salvar({ min: nMin, max: nMax })
  }

  return (
    <form className="cartao grupo-config" onSubmit={enviar} noValidate>
      <h2 className="rotulo">Meta de glicemia</h2>
      <p className="ajuda">
        Use a faixa-alvo informada pelo médico. Ela define as cores: abaixo do mínimo fica vermelho
        (baixa), acima do máximo fica amarelo (alta).
      </p>

      <div className="metas-campos">
        <label className="grupo">
          <span className="rotulo">Mínimo</span>
          <span className="entrada-com-unidade">
            <input
              className="entrada"
              inputMode="numeric"
              value={min}
              onChange={(e) => setMin(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
            <span className="unidade">mg/dL</span>
          </span>
        </label>
        <label className="grupo">
          <span className="rotulo">Máximo</span>
          <span className="entrada-com-unidade">
            <input
              className="entrada"
              inputMode="numeric"
              value={max}
              onChange={(e) => setMax(e.target.value.replace(/\D/g, '').slice(0, 3))}
            />
            <span className="unidade">mg/dL</span>
          </span>
        </label>
      </div>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="aviso" role="status">
          {aviso}
        </p>
      )}

      <div className="acoes">
        <button type="submit" className="botao-principal" disabled={salvando}>
          Salvar metas
        </button>
        <button
          type="button"
          className="botao-texto"
          disabled={salvando}
          onClick={() => {
            setErro(null)
            setAviso(null)
            salvar(METAS_PADRAO)
          }}
        >
          Voltar ao padrão ({METAS_PADRAO.min} a {METAS_PADRAO.max})
        </button>
      </div>
    </form>
  )
}
