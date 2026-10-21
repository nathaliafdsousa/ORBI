// CadastroUsuario.tsx
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { cadastrarUsuario } from '../services/usuarioService'
import {
  CAMPOS,
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

const VALORES_INICIAIS: Valores = {
  nome: '',
  email: '',
  cpf: '',
  telefone: '',
  dataNascimento: '',
  senha: '',
  confirmarSenha: '',
}

const DESTINO_APOS_CADASTRO = '#/receitas'
const ATRASO_REDIRECIONAMENTO_MS = 1800

function CadastroUsuario() {
  const [passo, setPasso] = useState<1 | 2 | 3>(1)
  const [valores, setValores] = useState<Valores>(VALORES_INICIAIS)
  const [tocados, setTocados] = useState<Partial<Record<Campo, boolean>>>({})
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)

  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const temporizador = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (temporizador.current !== null) {
        window.clearTimeout(temporizador.current)
      }
    }
  }, [])

  const bloqueado = enviando || concluido
  const erros = validarCadastro(valores)

  function atualizar(campo: Campo, valor: string) {
    setValores((anterior) => ({ ...anterior, [campo]: valor }))
  }

  function aoDigitar(campo: Campo) {
    return (event: ChangeEvent<HTMLInputElement>) =>
      atualizar(campo, event.target.value)
  }

  function aoSair(campo: Campo) {
    return () => setTocados((anterior) => ({ ...anterior, [campo]: true }))
  }

  function erroVisivel(campo: Campo): string | undefined {
    return tentouEnviar || tocados[campo] ? erros[campo] : undefined
  }

  function propsCampo(campo: Campo) {
    const mensagemErro = erroVisivel(campo)

    return {
      onBlur: aoSair(campo),
      disabled: bloqueado,
      'aria-invalid': mensagemErro ? true : undefined,
      'aria-describedby': mensagemErro ? `erro-${campo}` : undefined,
    }
  }

  function mensagemDoCampo(campo: Campo) {
    const mensagemErro = erroVisivel(campo)

    return mensagemErro ? (
      <small className="erro-campo" id={`erro-${campo}`}>
        {mensagemErro}
      </small>
    ) : null
  }

  function avancarPasso(e: FormEvent) {
    e.preventDefault()
    setErro('')

    if (passo === 1) {
      if (erros.nome || erros.dataNascimento || erros.cpf) {
        setTentouEnviar(true)
        setErro('Preencha os campos corretamente para avançar.')
        return
      }
      setTentouEnviar(false)
      setPasso(2)
    } else if (passo === 2) {
      if (erros.email || erros.telefone) {
        setTentouEnviar(true)
        setErro('Preencha os dados de contato para avançar.')
        return
      }
      setTentouEnviar(false)
      setPasso(3)
    } else {
      handleSubmit()
    }
  }

  async function handleSubmit() {
    setMensagem('')
    setErro('')
    setTentouEnviar(true)

    if (CAMPOS.some((campo) => erros[campo])) {
      setErro('Corrija os campos destacados para continuar.')
      return
    }

    try {
      setEnviando(true)

      const resposta = await cadastrarUsuario({
        nome: valores.nome.replace(/\s+/g, ' ').trim(),
        email: valores.email.trim().toLowerCase(),
        cpf: apenasDigitos(valores.cpf),
        telefone: apenasDigitos(valores.telefone),
        data_nascimento: valores.dataNascimento,
        senha: valores.senha,
        confirmar_senha: valores.confirmarSenha,
      })

      setMensagem(
        `Cadastro realizado com sucesso! Bem-vindo(a), ${resposta.nome}. Redirecionando…`,
      )
      setValores(VALORES_INICIAIS)
      setTocados({})
      setTentouEnviar(false)
      setMostrarSenha(false)
      setConcluido(true)

      temporizador.current = window.setTimeout(() => {
        window.location.hash = DESTINO_APOS_CADASTRO
      }, ATRASO_REDIRECIONAMENTO_MS)
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir o cadastro.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="cadastro-pagina">
      {/* Lateral esquerda sem nenhuma logo */}
      <aside className="cadastro-lateral">
        <div className="cadastro-apresentacao">
          <span className="cadastro-sobretitulo">BEM-VINDO(A) AO ORBI</span>
          <h2>Seu dinheiro, em ordem.</h2>
          <p>
            Registre o que entra e o que sai, acompanhe o histórico e reserve valores para os seus objetivos.
          </p>

          {/* Cartões decorativos estilo protótipo */}
          <div className="preview-cards">
            <div className="card-preview card-saldo">
              <small>Saldo disponível</small>
              <strong>R$ 2.480,00</strong>
              <div className="barra-progresso-saldo" />
            </div>

            <div className="card-preview card-extrato">
              <div className="linha-extrato positivo">
                <span>Salário</span>
                <span>+ R$ 3.200,00</span>
              </div>
              <div className="linha-extrato negativo">
                <span>Mercado</span>
                <span>- R$ 245,90</span>
              </div>
            </div>

            <div className="card-preview card-meta">
              <div className="linha-meta">
                <span>Meta · Viagem</span>
                <strong>62%</strong>
              </div>
              <div className="barra-progresso-meta" />
            </div>
          </div>
        </div>

        <small className="cadastro-nota">Prévia ilustrativa</small>
      </aside>

      {/* Formulário do cadastro em 3 passos */}
      <section className="cadastro-conteudo">
        <div className="cadastro-cartao">
          <header>
            <span className="subtitulo">NOVA CONTA</span>
            <h1>Crie sua conta</h1>
            <p>Leva menos de um minuto. São 3 passos rápidos.</p>

            {/* Stepper / Passos */}
            <div className="stepper">
              <div className={`step-item ${passo === 1 ? 'ativo' : passo > 1 ? 'concluido' : ''}`}>
                <span className="step-num">1</span>
                <span className="step-label">Você</span>
              </div>
              <div className="step-linha" />
              <div className={`step-item ${passo === 2 ? 'ativo' : passo > 2 ? 'concluido' : ''}`}>
                <span className="step-num">2</span>
                <span className="step-label">Contato</span>
              </div>
              <div className="step-linha" />
              <div className={`step-item ${passo === 3 ? 'ativo' : ''}`}>
                <span className="step-num">3</span>
                <span className="step-label">Segurança</span>
              </div>
            </div>
          </header>

          <form onSubmit={avancarPasso} noValidate>
            {/* PASSO 1: VOCÊ */}
            {passo === 1 && (
              <div className="grade-campos">
                <div className="campo campo-inteiro">
                  <label htmlFor="cadastro-nome">Nome completo</label>
                  <input
                    id="cadastro-nome"
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

                <div className="campo">
                  <label htmlFor="cadastro-nascimento">Data de nascimento</label>
                  <input
                    id="cadastro-nascimento"
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
                  <label htmlFor="cadastro-cpf">CPF</label>
                  <input
                    id="cadastro-cpf"
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
            )}

            {/* PASSO 2: CONTATO */}
            {passo === 2 && (
              <div className="grade-campos">
                <div className="campo campo-inteiro">
                  <label htmlFor="cadastro-email">E-mail</label>
                  <input
                    id="cadastro-email"
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

                <div className="campo campo-inteiro">
                  <label htmlFor="cadastro-telefone">Telefone</label>
                  <input
                    id="cadastro-telefone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    value={valores.telefone}
                    onChange={(event) =>
                      atualizar('telefone', mascararTelefone(event.target.value))
                    }
                    placeholder="(00) 00000-0000"
                    {...propsCampo('telefone')}
                  />
                  {mensagemDoCampo('telefone')}
                </div>
              </div>
            )}

            {/* PASSO 3: SEGURANÇA */}
            {passo === 3 && (
              <div className="grade-campos">
                <div className="campo">
                  <label htmlFor="cadastro-senha">Senha</label>
                  <div className="campo-senha">
                    <input
                      id="cadastro-senha"
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
                      disabled={bloqueado}
                    >
                      {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  {mensagemDoCampo('senha')}
                </div>

                <div className="campo">
                  <label htmlFor="cadastro-confirmar">Confirmar senha</label>
                  <input
                    id="cadastro-confirmar"
                    type={mostrarSenha ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={valores.confirmarSenha}
                    onChange={aoDigitar('confirmarSenha')}
                    placeholder="Repita a senha"
                    {...propsCampo('confirmarSenha')}
                  />
                  {mensagemDoCampo('confirmarSenha')}
                </div>

                <ul
                  className="dicas-senha campo-inteiro"
                  aria-label="Requisitos da senha"
                >
                  {REQUISITOS_SENHA.map((requisito) => (
                    <li
                      key={requisito.id}
                      className={requisito.ok(valores.senha) ? 'dica-ok' : ''}
                    >
                      {requisito.texto}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {erro && <p className="mensagem mensagem-erro">{erro}</p>}

            {mensagem && (
              <p className="mensagem mensagem-sucesso" role="status">
                {mensagem}
              </p>
            )}

            <div className="acoes-formulario">
              {passo > 1 && (
                <button
                  type="button"
                  className="botao-voltar"
                  onClick={() => setPasso((p) => (p - 1) as 1 | 2)}
                  disabled={bloqueado}
                >
                  Voltar
                </button>
              )}

              <button
                className="botao-registrar"
                type="submit"
                disabled={bloqueado}
              >
                {concluido
                  ? 'Redirecionando...'
                  : enviando
                    ? 'Cadastrando...'
                    : passo === 3
                      ? 'Criar conta'
                      : 'Continuar'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

export default CadastroUsuario