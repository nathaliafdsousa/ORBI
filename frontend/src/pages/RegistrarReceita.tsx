import { useState, type FormEvent } from 'react'
import { CATEGORIAS } from '../constants/categorias'
import { registrarReceita } from '../services/receitaService'
import type { ReceitaCreate } from '../types/receita'
import '../styles/registrarReceita.css'

type CategoriaSelecionada = number | 'outra' | null

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function RegistrarReceita() {
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] =
    useState<CategoriaSelecionada>(null)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')

  const [saldoAtual, setSaldoAtual] =
    useState<number | null>(null)
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

    if (!valorNumerico || valorNumerico <= 0) {
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

      const resposta = await registrarReceita(receita)

      setSaldoAtual(resposta.saldo_atual)
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

      <aside className="cartao-saldo">
        <span className="titulo-saldo">
          SUA ÓRBITA
        </span>

        <div className="orbita-saldo">
          <div className="conteudo-saldo">
            <span>SALDO ATUAL</span>

            <strong>
              {saldoAtual === null
                ? '—'
                : formatarMoeda(saldoAtual)}
            </strong>
          </div>
        </div>
      </aside>
    </main>
  )
}

export default RegistrarReceita