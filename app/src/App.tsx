import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useState } from 'react'
import {
  apagarRegistro,
  atualizarRegistro,
  criarRegistro,
  lerMetas,
  listarRegistros,
  salvarMetas,
  souAcompanhante,
} from './armazenamento'
import { Configuracoes } from './componentes/Configuracoes'
import { FormularioRegistro } from './componentes/FormularioRegistro'
import { Historico } from './componentes/Historico'
import { Inicio } from './componentes/Inicio'
import { Login, NovaSenha } from './componentes/Login'
import { MetasContexto } from './metas'
import { METAS_PADRAO } from './regras'
import { supabase } from './supabase'
import type { Metas, Registro } from './tipos'

type Aba = 'inicio' | 'historico' | 'configuracoes'
type Formulario = { nome: 'novo' } | { nome: 'editar'; registro: Registro }

const ABAS: { aba: Aba; nome: string; soDona?: boolean }[] = [
  { aba: 'inicio', nome: 'Início' },
  { aba: 'historico', nome: 'Histórico' },
  { aba: 'configuracoes', nome: 'Ajustes', soDona: true },
]

export default function App() {
  // undefined: ainda verificando se há alguém logado neste aparelho.
  const [sessao, setSessao] = useState<Session | null | undefined>(undefined)
  const [trocandoSenha, setTrocandoSenha] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessao(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, nova) => {
      setSessao(nova)
      if (evento === 'PASSWORD_RECOVERY') setTrocandoSenha(true)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (sessao === undefined) return <p className="carregando">Carregando…</p>
  if (trocandoSenha) return <NovaSenha aoConcluir={() => setTrocandoSenha(false)} />
  if (!sessao) return <Login />
  return <Painel key={sessao.user.id} />
}

function Painel() {
  const [registros, setRegistros] = useState<Registro[]>([])
  const [metas, setMetas] = useState<Metas>(METAS_PADRAO)
  // null: ainda descobrindo se quem entrou é ela ou um dos pais.
  const [somenteLeitura, setSomenteLeitura] = useState<boolean | null>(null)
  const [erroCarga, setErroCarga] = useState(false)
  const [aba, setAba] = useState<Aba>('inicio')
  const [formulario, setFormulario] = useState<Formulario | null>(null)

  // Nunca lança erro: um registro salvo não deve parecer perdido por falha ao recarregar.
  const recarregar = useCallback(async () => {
    try {
      const [novos, novasMetas, acompanhante] = await Promise.all([
        listarRegistros(),
        lerMetas(),
        souAcompanhante(),
      ])
      setRegistros(novos)
      setMetas(novasMetas)
      setSomenteLeitura(acompanhante)
      setErroCarga(false)
    } catch {
      setErroCarga(true)
    }
  }, [])

  useEffect(() => {
    recarregar()
    // Ao voltar para o app (ex.: os pais reabrindo no celular), busca o que há de novo.
    function aoVoltar() {
      if (document.visibilityState === 'visible') recarregar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    return () => document.removeEventListener('visibilitychange', aoVoltar)
  }, [recarregar])

  function voltar() {
    setFormulario(null)
    window.scrollTo(0, 0)
  }

  function mudarAba(nova: Aba) {
    setAba(nova)
    window.scrollTo(0, 0)
  }

  if (somenteLeitura === null) {
    return erroCarga ? (
      <main className="pagina carregando">
        <p>Não foi possível carregar os dados. Confira a internet.</p>
        <button type="button" className="botao-principal" onClick={recarregar}>
          Tentar de novo
        </button>
        <button type="button" className="botao-texto" onClick={() => supabase.auth.signOut()}>
          Sair
        </button>
      </main>
    ) : (
      <p className="carregando">Carregando…</p>
    )
  }

  const editar = somenteLeitura
    ? undefined
    : (registro: Registro) => setFormulario({ nome: 'editar', registro })

  let conteudo
  if (formulario?.nome === 'novo') {
    conteudo = (
      <FormularioRegistro
        aoCancelar={voltar}
        aoSalvar={async (dados) => {
          await criarRegistro(dados)
          await recarregar()
          voltar()
        }}
      />
    )
  } else if (formulario?.nome === 'editar') {
    const { registro } = formulario
    conteudo = (
      <FormularioRegistro
        key={registro.id}
        inicial={registro}
        aoCancelar={voltar}
        aoSalvar={async (dados) => {
          await atualizarRegistro({ ...dados, id: registro.id })
          await recarregar()
          voltar()
        }}
        aoApagar={async () => {
          await apagarRegistro(registro.id)
          await recarregar()
          voltar()
        }}
      />
    )
  } else {
    conteudo = (
      <main className="pagina">
        <header className="topo">
          <h1>Glicemia</h1>
          <button type="button" className="botao-texto" onClick={() => supabase.auth.signOut()}>
            Sair
          </button>
        </header>
        {somenteLeitura && (
          <p className="faixa-leitura">Você está acompanhando. Só a dona dos dados pode alterá-los.</p>
        )}
        <nav className="abas" aria-label="Seções">
          {ABAS.filter((a) => !(a.soDona && somenteLeitura)).map((a) => (
            <button
              key={a.aba}
              type="button"
              className={`aba ${aba === a.aba ? 'ativa' : ''}`}
              aria-current={aba === a.aba ? 'page' : undefined}
              onClick={() => mudarAba(a.aba)}
            >
              {a.nome}
            </button>
          ))}
        </nav>

        {erroCarga && (
          <p className="erro" role="alert">
            Sem conexão: os dados podem estar desatualizados.{' '}
            <button type="button" className="botao-texto" onClick={recarregar}>
              Tentar de novo
            </button>
          </p>
        )}

        {aba === 'inicio' && <Inicio registros={registros} aoEditar={editar} />}
        {aba === 'historico' && <Historico registros={registros} aoEditar={editar} />}
        {aba === 'configuracoes' && !somenteLeitura && (
          <Configuracoes
            aoSalvar={async (novas) => {
              await salvarMetas(novas)
              setMetas(novas)
            }}
          />
        )}

        {!somenteLeitura && aba !== 'configuracoes' && (
          <button
            type="button"
            className="botao-flutuante"
            onClick={() => setFormulario({ nome: 'novo' })}
          >
            + Registrar
          </button>
        )}
      </main>
    )
  }

  return <MetasContexto.Provider value={metas}>{conteudo}</MetasContexto.Provider>
}
