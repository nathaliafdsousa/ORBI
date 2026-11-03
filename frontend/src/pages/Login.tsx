import { useEffect, useState, type FormEvent } from 'react'
import { entrar } from '../services/authService'
import { lerAviso, limparAviso, salvarSessao } from '../services/sessao'
import '../styles/RegistrarReceita.css'
import '../styles/CadastroUsuario.css'
import '../styles/sessao.css'

type CampoLogin = 'email' | 'senha'

const IDS: Record<CampoLogin, string> = {
  email: 'login-email',
  senha: 'login-senha',
}

function validar(email: string, senha: string): Partial<Record<CampoLogin, string>> {
  const erros: Partial<Record<CampoLogin, string>> = {}

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!senha) erros.senha = 'Informe a senha.'

  return erros
}

function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [tocados, setTocados] = useState<Partial<Record<CampoLogin, boolean>>>({})

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso] = useState(lerAviso)

  useEffect(() => {
    limparAviso()
  }, [])

  const erros = validar(email, senha)

  function erroVisivel(campo: CampoLogin): string | undefined {
    return tocados[campo] ? erros[campo] : undefined
  }

  function propsCampo(campo: CampoLogin) {
    const mensagem = erroVisivel(campo)

    return {
      id: IDS[campo],
      onBlur: () => setTocados((anterior) => ({ ...anterior, [campo]: true })),
      disabled: enviando,
      'aria-invalid': mensagem ? true : undefined,
      'aria-describedby': mensagem ? `erro-${IDS[campo]}` : undefined,
    }
  }

  function mensagemDoCampo(campo: CampoLogin) {
    const mensagem = erroVisivel(campo)

    return mensagem ? (
      <small className="erro-campo" id={`erro-${IDS[campo]}`}>
        {mensagem}
      </small>
    ) : null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setErro('')
    setTocados({ email: true, senha: true })

    const primeiroComErro = (['email', 'senha'] as CampoLogin[]).find(
      (campo) => erros[campo],
    )

    if (primeiroComErro) {
      document.getElementById(IDS[primeiroComErro])?.focus()
      return
    }

    try {
      setEnviando(true)

      salvarSessao(await entrar(email.trim().toLowerCase(), senha))
      window.location.assign('#/receitas')
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível entrar. Tente novamente.',
      )
      setSenha('')
      setTocados({})
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="cadastro-pagina">
      <aside className="cadastro-lateral">
        <div className="cadastro-apresentacao">
          <span className="cadastro-sobretitulo">QUE BOM TER VOCÊ DE VOLTA</span>

          <h2>Seu dinheiro, em ordem.</h2>

          <p>
            Entre para continuar acompanhando receitas, despesas e metas.
          </p>
        </div>

        <div className="cadastro-previa" aria-hidden="true">
          <div className="previa-cartao">
            <span className="previa-rotulo">Saldo disponível</span>
            <strong className="previa-valor">R$ 2.480,00</strong>
            <div className="previa-barra">
              <span style={{ width: '78%', backgroundColor: '#86a692' }} />
              <span style={{ width: '22%', backgroundColor: '#a58cac' }} />
            </div>
          </div>

          <div className="previa-cartao previa-deslocado">
            <div className="previa-linha">
              <span>Salário</span>
              <b className="previa-entrada">+ R$ 3.200,00</b>
            </div>
            <div className="previa-linha">
              <span>Mercado</span>
              <b className="previa-saida">− R$ 245,90</b>
            </div>
          </div>

          <div className="previa-cartao previa-deslocado-curto">
            <div className="previa-linha">
              <span>Meta · Viagem</span>
              <b>62%</b>
            </div>
            <div className="previa-trilho">
              <span style={{ width: '62%' }} />
            </div>
          </div>

          <small className="previa-aviso">Prévia ilustrativa</small>
        </div>
      </aside>

      <section className="cadastro-conteudo">
        <div className="cadastro-cartao">
          <header>
            <span className="subtitulo">ACESSO</span>

            <h1>Entrar na sua conta</h1>

            <p>Use o e-mail e a senha que você cadastrou.</p>
          </header>

          <form onSubmit={handleSubmit} noValidate>
            <div className="cadastro-etapa">
              <div className="campo">
                <label htmlFor={IDS.email}>E-mail</label>
                <input
                  type="email"
                  maxLength={100}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Ex.: maria@email.com"
                  {...propsCampo('email')}
                />
                {mensagemDoCampo('email')}
              </div>

              <div className="campo">
                <label htmlFor={IDS.senha}>Senha</label>

                <div className="campo-senha">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    placeholder="Sua senha"
                    {...propsCampo('senha')}
                  />

                  <button
                    type="button"
                    className="botao-mostrar"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    aria-pressed={mostrarSenha}
                    disabled={enviando}
                  >
                    {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                {mensagemDoCampo('senha')}
              </div>
            </div>

            {aviso && !erro && (
              <p className="mensagem mensagem-aviso" role="status">
                {aviso}
              </p>
            )}

            {erro && (
              <p className="mensagem mensagem-erro" role="alert">
                {erro}
              </p>
            )}

            <button
              className="botao-registrar"
              type="submit"
              disabled={enviando}
            >
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="cadastro-rodape">
            Ainda não tem conta? <a href="#/cadastro">Criar conta</a>
          </p>
        </div>
      </section>
    </main>
  )
}

export default Login