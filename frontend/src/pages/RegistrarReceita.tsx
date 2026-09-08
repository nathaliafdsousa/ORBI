import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CATEGORIAS } from '../constants/categorias'
import { consultarResumoMensal, registrarReceita } from '../services/receitaService'
import type { ReceitaCreate, ResumoMensal } from '../types/receita'
import '../styles/RegistrarReceita.css'

type CategoriaSelecionada = number | 'outra' | null

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

const CORES = ['#86a692', '#7e9bbc', '#a58cac', '#d2ac72', '#79b9b3', '#cb8c99']

function corCategoria(id: number): string {
  return CORES[((id - 1) % CORES.length + CORES.length) % CORES.length]!
}

function fundoOrbita(resumo: ResumoMensal | null): string {
  if (!resumo || resumo.total_mes <= 0) return '#344155'

  let acumulado = 0
  const partes = resumo.categorias.map((item) => {
    const inicio = acumulado
    acumulado += (item.total / resumo.total_mes) * 100
    return `${corCategoria(item.id_categoria)} ${inicio}% ${acumulado}%`
  })

  return partes.length ? `conic-gradient(${partes.join(', ')})` : '#344155'
}

function RegistrarReceita() {
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] =
    useState<CategoriaSelecionada>(null)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')

  const [resumo, setResumo] = useState<ResumoMensal | null>(null)
  const [carregandoResumo, setCarregandoResumo] = useState(true)
  const [erroResumo, setErroResumo] = useState('')
  const [versaoResumo, setVersaoResumo] = useState(0)
  const requisicaoResumo = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    requisicaoResumo.current = controller

    consultarResumoMensal(controller.signal)
      .then((resultado) => {
        if (!controller.signal.aborted) setResumo(resultado)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErroResumo('Não foi possível atualizar o resumo mensal.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoResumo(false)
      })

    return () => controller.abort()
  }, [versaoResumo])

  function atualizarResumo() {
    requisicaoResumo.current?.abort()
    setResumo(null)
    setErroResumo('')
    setCarregandoResumo(true)
    setVersaoResumo((anterior) => anterior + 1)
  }
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()

    setMensagem('')
    setErro('')

    if (categoria === null) {
      setErro('Selecione uma categoria.')
      return
    }

    if (
      categoria === 'outra' &&
      !novaCategoria.trim()
    ) {
      setErro('Informe o nome da nova categoria.')
      return
    }

    const valorNumerico = Number(valor)

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }

    const receita: ReceitaCreate = {
      valor: valorNumerico,
      data,
      descricao: descricao.trim() || undefined,
    }

    if (categoria === 'outra') {
      receita.nova_categoria = novaCategoria.trim()
    } else {
      receita.id_categoria = categoria
    }

    try {
      setEnviando(true)

      await registrarReceita(receita)

      atualizarResumo()
      setMensagem('Receita registrada com sucesso!')

      setValor('')
      setCategoria(null)
      setNovaCategoria('')
      setData('')
      setDescricao('')
    } catch (error) {
      const mensagemErro =
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a receita.'

      setErro(mensagemErro)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="pagina-receita">
      <section className="cartao-formulario">
        <header>
          <span className="subtitulo">NOVA ENTRADA</span>

          <h1>Registrar receita</h1>

          <p>
            Adicione uma entrada e veja como ela se encaixa
            na sua órbita financeira.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="valor">Valor</label>

            <div className="entrada-valor">
              <span>R$</span>

              <input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(event) =>
                  setValor(event.target.value)
                }
                placeholder="0,00"
                disabled={enviando}
                required
              />
            </div>
          </div>

          <fieldset className="campo" disabled={enviando}>
            <legend>Categoria</legend>

            <div className="lista-categorias">
              {CATEGORIAS.map((item) => (
                <button
                  key={item.id_categoria}
                  type="button"
                  aria-pressed={
                    categoria === item.id_categoria
                  }
                  onClick={() => {
                    setCategoria(item.id_categoria)
                    setNovaCategoria('')
                  }}
                >
                  {item.nome}
                </button>
              ))}

              <button
                type="button"
                aria-pressed={categoria === 'outra'}
                onClick={() => setCategoria('outra')}
              >
                Outra
              </button>
            </div>
          </fieldset>

          {categoria === 'outra' && (
            <div className="campo">
              <label htmlFor="nova-categoria">
                Nome da nova categoria
              </label>

              <input
                id="nova-categoria"
                type="text"
                maxLength={100}
                value={novaCategoria}
                onChange={(event) =>
                  setNovaCategoria(event.target.value)
                }
                placeholder="Ex.: Freelance"
                disabled={enviando}
                required
              />
            </div>
          )}

          <div className="campo campo-data">
            <label htmlFor="data">Data</label>

            <input
              id="data"
              type="date"
              value={data}
              onChange={(event) =>
                setData(event.target.value)
              }
              disabled={enviando}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="descricao">
              Descrição <span>(opcional)</span>
            </label>

            <textarea
              id="descricao"
              maxLength={255}
              value={descricao}
              onChange={(event) =>
                setDescricao(event.target.value)
              }
              placeholder="Ex.: Pagamento recebido"
              rows={4}
              disabled={enviando}
            />
          </div>

          {erro && (
            <p className="mensagem mensagem-erro">
              {erro}
            </p>
          )}

          {mensagem && (
            <p className="mensagem mensagem-sucesso">
              {mensagem}
            </p>
          )}

          <button
            className="botao-registrar"
            type="submit"
            disabled={enviando}
          >
            {enviando
              ? 'Registrando...'
              : 'Registrar receita'}
          </button>
        </form>
      </section>

      <aside className="cartao-saldo" aria-label="Resumo mensal de receitas">
        <span className="titulo-saldo">SUA ÓRBITA ESTE MÊS</span>

        {resumo && (
          <p className="periodo-orbita">
            {new Intl.DateTimeFormat('pt-BR', {
              month: 'long',
              year: 'numeric',
            }).format(new Date(resumo.ano, resumo.mes - 1, 1))}
          </p>
        )}

        <div className="orbita-saldo" style={{ background: fundoOrbita(resumo) }}>
          <div className="conteudo-saldo">
            <span>RECEITAS NO MÊS</span>
            <strong>{resumo ? formatarMoeda(resumo.total_mes) : '—'}</strong>
          </div>
        </div>

        <div className="estado-orbita" aria-live="polite">
          {carregandoResumo && <p>Carregando resumo…</p>}
          {erroResumo && (
            <div className="erro-orbita">
              <p>{erroResumo}</p>
              <button type="button" onClick={atualizarResumo}>
                Tentar novamente
              </button>
            </div>
          )}
          {resumo && resumo.categorias.length === 0 && (
            <p>Nenhuma receita registrada neste mês.</p>
          )}
        </div>

        {resumo && resumo.categorias.length > 0 && (
          <ul className="categorias-orbita" aria-label="Totais por categoria">
            {resumo.categorias.map((item) => (
              <li key={item.id_categoria}>
                <span className="nome-categoria-orbita">
                  <span
                    className="cor-categoria-orbita"
                    style={{ backgroundColor: corCategoria(item.id_categoria) }}
                    aria-hidden="true"
                  />
                  {item.nome}
                </span>
                <strong>{formatarMoeda(item.total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </main>
  )
}

export default RegistrarReceita