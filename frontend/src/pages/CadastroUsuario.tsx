import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { entrar } from '../services/authService'
import { salvarSessao } from '../services/sessao'
import { cadastrarUsuario } from '../services/usuarioService'
import {
  REQUISITOS_SENHA,
  apenasDigitos,
  dataDeHoje,
  mascararCpf,
  mascararTelefone,
  validarCadastro,
  type Campo,
  type Valores,
} from '../utils/Validacaousuario'
import '../styles/RegistrarReceita.css'
import '../styles/CadastroUsuario.css'
import '../styles/sessao.css'

const VALORES_INICIAIS: Valores = {
  nome: '',
  email: '',
  cpf: '',
  telefone: '',
  dataNascimento: '',
  senha: '',
  confirmarSenha: '',
}

const ETAPAS: { titulo: string; campos: Campo[] }[] = [
  { titulo: 'Você', campos: ['nome', 'dataNascimento', 'cpf'] },
  { titulo: 'Contato', campos: ['email', 'telefone'] },
  { titulo: 'Segurança', campos: ['senha', 'confirmarSenha'] },
]

const IDS: Record<Campo, string> = {
  nome: 'cadastro-nome',
  email: 'cadastro-email',
  cpf: 'cadastro-cpf',
  telefone: 'cadastro-telefone',
  dataNascimento: 'cadastro-nascimento',
  senha: 'cadastro-senha',
  confirmarSenha: 'cadastro-confirmar',
}

const DESTINO_APOS_CADASTRO = '#/receitas'
const ATRASO_REDIRECIONAMENTO_MS = 1800

function IconeCheck() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CadastroUsuario() {
  const [etapa, setEtapa] = useState(0)
  const [valores, setValores] = useState<Valores>(VALORES_INICIAIS)
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({})
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [nomeCadastrado, setNomeCadastrado] = useState('')
  const [erro, setErro] = useState('')

  const temporizador = useRef<number | null>(null)
  const destino = useRef('#/login')
  const primeiraRenderizacao = useRef(true)

  const ultimaEtapa = ETAPAS.length - 1
  const erros = validarCadastro(valores)

  useEffect(() => {
    return () => {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current)
      }
    }
  }, [])

  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false
      return
    }

    const primeiro = ETAPAS[etapa]?.campos[0]
    if (primeiro) document.getElementById(IDS[primeiro])?.focus()
  }, [etapa])

  function atualizar(campo: Campo, valor: string) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }))
  }

  function aoDigitar(campo: Campo) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      atualizar(campo, event.target.value)
  }

  function erroVisivel(campo: Campo): string | undefined {
    return tocados[campo] ? erros[campo] : undefined
  }

  function propsCampo(campo: Campo) {
    const mensagem = erroVisivel(campo)

    return {
      id: IDS[campo],
      onBlur: () => setTocados((anterior) => ({ ...anterior, [campo]: true })),
      disabled: enviando,
      'aria-invalid': mensagem ? true : undefined,
      'aria-describedby': mensagem ? `erro-${campo}` : undefined,
    }
  }

  function mensagemDoCampo(campo: Campo) {
    const mensagem = erroVisivel(campo)

    return mensagem ? (
      <small className="erro-campo" id={`erro-${campo}`}>
        {mensagem}
      </small>
    ) : null
  }

  function marcarComoTocados(campos: Campo[]) {
    setTocados((anterior) => {
      const proximo = { ...anterior }
      campos.forEach((campo) => {
        proximo[campo] = true
      })
      return proximo
    })
  }

  function etapaValida(indice: number): boolean {
    const campos = ETAPAS[indice]?.campos ?? []
    marcarComoTocados(campos)

    const primeiroComErro = campos.find((campo) => erros[campo])
    if (primeiroComErro) {
      document.getElementById(IDS[primeiroComErro])?.focus()
      return false
    }

    return true
  }

  function avancar() {
    setErro('')
    if (etapaValida(etapa)) setEtapa((atual) => atual + 1)
  }

  function voltar() {
    setErro('')
    setEtapa((atual) => Math.max(0, atual - 1))
  }

  function irParaOApp() {
    window.location.assign(destino.current)
  }

  async function enviar() {
    const etapaComErro = ETAPAS.findIndex((item) =>
      item.campos.some((campo) => erros[campo]),
    )

    if (etapaComErro !== -1) {
      marcarComoTocados(ETAPAS.flatMap((item) => item.campos))
      setEtapa(etapaComErro)
      setErro('Corrija os campos destacados para continuar.')
      return
    }

    try {
      setEnviando(true)
      setErro('')

      const resposta = await cadastrarUsuario({
        nome: valores.nome.replace(/\s+/g, ' ').trim(),
        email: valores.email.trim().toLowerCase(),
        cpf: apenasDigitos(valores.cpf),
        telefone: apenasDigitos(valores.telefone),
        data_nascimento: valores.dataNascimento,
        senha: valores.senha,
        confirmar_senha: valores.confirmarSenha,
      })

      // Entra automaticamente com a conta recém-criada. Se falhar, a pessoa
      // segue para a tela de login e entra manualmente.
      try {
        salvarSessao(
          await entrar(valores.email.trim().toLowerCase(), valores.senha),
        )
        destino.current = DESTINO_APOS_CADASTRO
      } catch {
        destino.current = '#/login'
      }

      setNomeCadastrado(resposta.nome)
      setValores(VALORES_INICIAIS)
      setTocados({})
      setMostrarSenha(false)
      setConcluido(true)

      temporizador.current = window.setTimeout(
        irParaOApp,
        ATRASO_REDIRECIONAMENTO_MS,
      )
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o cadastro.'

      if (/e-?mail/i.test(mensagem)) setEtapa(1)
      else if (/cpf/i.test(mensagem)) setEtapa(0)

      setErro(mensagem)
    } finally {
      setEnviando(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (etapa < ultimaEtapa) avancar()
    else void enviar()
  }

  return (
    <main className="cadastro-pagina">
      <aside className="cadastro-lateral">
        <div className="cadastro-apresentacao">
          <span className="cadastro-sobretitulo">BEM-VINDO(A) AO ORBI</span>

          <h2>Seu dinheiro, em ordem.</h2>

          <p>
            Registre o que entra e o que sai, acompanhe o histórico e reserve
            valores para os seus objetivos.
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
          {concluido ? (
            <div className="cadastro-sucesso" role="status">
              <span className="cadastro-selo">
                <IconeCheck />
              </span>

              <h1>Conta criada!</h1>

              <p>
                Bem-vindo(a), {nomeCadastrado}. Estamos levando você para o seu
                painel…
              </p>

              <button
                className="botao-registrar"
                type="button"
                onClick={irParaOApp}
              >
                Ir agora
              </button>
            </div>
          ) : (
            <>
              <header>
                <span className="subtitulo">NOVA CONTA</span>

                <h1>Crie sua conta</h1>

                <p>Leva menos de um minuto. São {ETAPAS.length} passos rápidos.</p>
              </header>

              <ol className="cadastro-etapas" aria-label="Etapas do cadastro">
                {ETAPAS.map((item, indice) => (
                  <li
                    key={item.titulo}
                    className={
                      indice === etapa
                        ? 'etapa-atual'
                        : indice < etapa
                          ? 'etapa-feita'
                          : ''
                    }
                    aria-current={indice === etapa ? 'step' : undefined}
                  >
                    <span className="etapa-numero">
                      {indice < etapa ? <IconeCheck /> : indice + 1}
                    </span>
                    <span className="etapa-nome">{item.titulo}</span>
                  </li>
                ))}
              </ol>

              <form onSubmit={handleSubmit} noValidate>
                <div className="cadastro-etapa" key={etapa}>
                  {etapa === 0 && (
                    <>
                      <div className="campo">
                        <label htmlFor={IDS.nome}>Nome completo</label>
                        <input
                          type="text"
                          maxLength={100}
                          autoComplete="name"
                          value={valores.nome}
                          onChange={aoDigitar('nome')}
                          placeholder="Ex.: Maria da Silva"
                          {...propsCampo('nome')}
                        />
                        {mensagemDoCampo('nome')}
                      </div>

                      <div className="cadastro-dupla">
                        <div className="campo">
                          <label htmlFor={IDS.dataNascimento}>
                            Data de nascimento
                          </label>
                          <input
                            type="date"
                            max={dataDeHoje()}
                            autoComplete="bday"
                            value={valores.dataNascimento}
                            onChange={aoDigitar('dataNascimento')}
                            {...propsCampo('dataNascimento')}
                          />
                          {mensagemDoCampo('dataNascimento')}
                        </div>

                        <div className="campo">
                          <label htmlFor={IDS.cpf}>CPF</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            value={valores.cpf}
                            onChange={(event) =>
                              atualizar('cpf', mascararCpf(event.target.value))
                            }
                            placeholder="000.000.000-00"
                            {...propsCampo('cpf')}
                          />
                          {mensagemDoCampo('cpf')}
                        </div>
                      </div>
                    </>
                  )}

                  {etapa === 1 && (
                    <>
                      <div className="campo">
                        <label htmlFor={IDS.email}>E-mail</label>
                        <input
                          type="email"
                          maxLength={100}
                          autoComplete="email"
                          value={valores.email}
                          onChange={aoDigitar('email')}
                          placeholder="Ex.: maria@email.com"
                          {...propsCampo('email')}
                        />
                        {mensagemDoCampo('email')}
                      </div>

                      <div className="campo">
                        <label htmlFor={IDS.telefone}>Telefone</label>
                        <input
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel-national"
                          value={valores.telefone}
                          onChange={(event) =>
                            atualizar(
                              'telefone',
                              mascararTelefone(event.target.value),
                            )
                          }
                          placeholder="(00) 00000-0000"
                          {...propsCampo('telefone')}
                        />
                        {mensagemDoCampo('telefone')}
                      </div>
                    </>
                  )}

                  {etapa === 2 && (
                    <>
                      <div className="campo">
                        <label htmlFor={IDS.senha}>Senha</label>

                        <div className="campo-senha">
                          <input
                            type={mostrarSenha ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={valores.senha}
                            onChange={aoDigitar('senha')}
                            placeholder="Mínimo de 8 caracteres"
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

                      <ul className="dicas-senha" aria-label="Requisitos da senha">
                        {REQUISITOS_SENHA.map((requisito) => (
                          <li
                            key={requisito.id}
                            className={
                              requisito.ok(valores.senha) ? 'dica-ok' : ''
                            }
                          >
                            {requisito.texto}
                          </li>
                        ))}
                      </ul>

                      <div className="campo">
                        <label htmlFor={IDS.confirmarSenha}>
                          Confirmar senha
                        </label>
                        <input
                          type={mostrarSenha ? 'text' : 'password'}
                          autoComplete="new-password"
                          value={valores.confirmarSenha}
                          onChange={aoDigitar('confirmarSenha')}
                          placeholder="Repita a senha"
                          {...propsCampo('confirmarSenha')}
                        />
                        {mensagemDoCampo('confirmarSenha')}
                      </div>
                    </>
                  )}
                </div>

                {erro && (
                  <p className="mensagem mensagem-erro" role="alert">
                    {erro}
                  </p>
                )}

                <div className="cadastro-acoes">
                  {etapa > 0 && (
                    <button
                      type="button"
                      className="botao-voltar"
                      onClick={voltar}
                      disabled={enviando}
                    >
                      Voltar
                    </button>
                  )}

                  <button
                    className="botao-registrar"
                    type="submit"
                    disabled={enviando}
                  >
                    {etapa < ultimaEtapa
                      ? 'Continuar'
                      : enviando
                        ? 'Criando conta...'
                        : 'Criar conta'}
                  </button>
                </div>
              </form>

              <p className="cadastro-rodape">
                Já tem conta? <a href="#/login">Entrar</a>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  )
}

export default CadastroUsuario