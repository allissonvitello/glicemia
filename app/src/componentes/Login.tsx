import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'

// Mensagens do Supabase traduzidas para o que ela precisa saber.
function traduzirErro(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return 'E-mail ou senha incorretos.'
  if (/rate limit|too many/i.test(mensagem))
    return 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.'
  if (/fetch|network/i.test(mensagem)) return 'Sem conexão com a internet. Tente de novo.'
  return 'Não foi possível entrar. Tente de novo.'
}

export function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [modo, setModo] = useState<'entrar' | 'recuperar'>('entrar')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAviso(null)
    if (!email.trim()) {
      setErro('Informe o e-mail.')
      return
    }
    setEnviando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      // Se der certo, o App percebe o login e troca de tela sozinho.
      if (error) setErro(traduzirErro(error.message))
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      })
      if (error) setErro(traduzirErro(error.message))
      else
        setAviso(
          'Se este e-mail estiver cadastrado, chegará um link para criar uma senha nova. Confira também o spam.',
        )
    }
    setEnviando(false)
  }

  function trocarModo(novo: 'entrar' | 'recuperar') {
    setModo(novo)
    setErro(null)
    setAviso(null)
  }

  return (
    <main className="pagina login">
      <header className="login-topo">
        <img src="/icone.svg" alt="" width={56} height={56} />
        <h1>Glicemia</h1>
        <p className="ajuda">
          {modo === 'entrar' ? 'Entre com o seu e-mail e senha.' : 'Vamos enviar um link para o seu e-mail.'}
        </p>
      </header>

      <form className="cartao grupo-config" onSubmit={enviar} noValidate>
        <label className="grupo">
          <span className="rotulo">E-mail</span>
          <input
            className="entrada"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        {modo === 'entrar' && (
          <label className="grupo">
            <span className="rotulo">Senha</span>
            <input
              className="entrada"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
        )}

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
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Aguarde…' : modo === 'entrar' ? 'Entrar' : 'Enviar link'}
          </button>
          <button
            type="button"
            className="botao-texto"
            onClick={() => trocarModo(modo === 'entrar' ? 'recuperar' : 'entrar')}
          >
            {modo === 'entrar' ? 'Esqueci minha senha' : 'Voltar para o login'}
          </button>
        </div>
      </form>
    </main>
  )
}

// Aberta pelo link do e-mail de "esqueci minha senha".
export function NovaSenha({ aoConcluir }: { aoConcluir: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    if (senha.length < 8) {
      setErro('A senha precisa ter pelo menos 8 caracteres.')
      return
    }
    if (senha !== confirmacao) {
      setErro('As duas senhas não são iguais.')
      return
    }
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    setEnviando(false)
    if (error) setErro('Não foi possível trocar a senha. Peça um link novo e tente de novo.')
    else aoConcluir()
  }

  return (
    <main className="pagina login">
      <header className="login-topo">
        <h1>Criar senha nova</h1>
      </header>
      <form className="cartao grupo-config" onSubmit={enviar} noValidate>
        <label className="grupo">
          <span className="rotulo">Senha nova</span>
          <input
            className="entrada"
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        <label className="grupo">
          <span className="rotulo">Repita a senha</span>
          <input
            className="entrada"
            type="password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </label>
        {erro && (
          <p className="erro" role="alert">
            {erro}
          </p>
        )}
        <div className="acoes">
          <button type="submit" className="botao-principal" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar senha'}
          </button>
        </div>
      </form>
    </main>
  )
}
