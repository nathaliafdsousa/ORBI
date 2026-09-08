import { useEffect, useRef, useState, type FormEvent } from 'react'
import { consultarRegistros } from '../services/registroService'
import type { FiltrosHistorico, RegistroHistorico } from '../types/registro'

const CORES = ['#86a692', '#7e9bbc', '#a58cac', '#d2ac72', '#79b9b3', '#cb8c99']
function corCategoria(id: number) {
  return CORES[((id - 1) % CORES.length + CORES.length) % CORES.length]
}
function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}
function dataBrasileira(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export default function HistoricoRegistros() {
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [pedido, setPedido] = useState<{ filtros: FiltrosHistorico }>({ filtros: {} })
  const [registros, setRegistros] = useState<RegistroHistorico[]>([])
  const [categoria, setCategoria] = useState<number | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [validacao, setValidacao] = useState('')
  const requisicao = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    requisicao.current = controller
    consultarRegistros(pedido.filtros, controller.signal)
      .then((dados) => {
        if (!controller.signal.aborted) setRegistros(dados)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setErro(error instanceof Error ? error.message : 'Não foi possível consultar o histórico.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregando(false)
      })
    return () => controller.abort()
  }, [pedido])

  function buscar(filtros: FiltrosHistorico) {
    requisicao.current?.abort()
    setCarregando(true)
    setErro('')
    setValidacao('')
    setRegistros([])
    setCategoria(null)
    setPedido({ filtros })
  }

  function filtrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inicio && fim && inicio > fim) {
      setValidacao('A data inicial deve ser anterior ou igual à data final.')
      return
    }
    buscar({ data_inicial: inicio || undefined, data_final: fim || undefined })
  }

  function limpar() {
    setInicio('')
    setFim('')
    buscar({})
  }

  const categorias = Array.from(
    new Map(registros.map((item) => [item.id_categoria, {
      id: item.id_categoria,
      nome: item.categoria_nome,
    }])).values(),
  ).sort((a, b) => a.id - b.id)
  const listados = categoria === null
    ? registros
    : registros.filter((item) => item.id_categoria === categoria)
  const totalCentavos = listados.reduce(
    (soma, item) => soma + Math.round(Math.abs(item.valor) * 100), 0,
  )
  const temOutroTipo = listados.some((item) => item.tipo.toLowerCase() !== 'receita')
  const periodo = [
    pedido.filtros.data_inicial ? `De ${dataBrasileira(pedido.filtros.data_inicial)}` : '',
    pedido.filtros.data_final ? `até ${dataBrasileira(pedido.filtros.data_final)}` : '',
  ].filter(Boolean).join(' ') || 'Todo o período'

  return (
    <main className="historico-pagina">
      <section className="historico-cartao" aria-labelledby="historico-titulo">
        <header className="historico-cabecalho">
          <div>
            <span className="historico-sobretitulo">CONSULTA</span>
            <h1 id="historico-titulo">Histórico de registros</h1>
            <p>Confira cada movimentação e consulte por período.</p>
          </div>
          <div className="historico-total" aria-live="polite">
            <span>{temOutroTipo ? 'Total movimentado' : 'Total de receitas'}</span>
            <strong>{carregando || erro ? '—' : moeda(totalCentavos / 100)}</strong>
            <small>Dos registros exibidos</small>
          </div>
        </header>

        <form className="historico-filtros" onSubmit={filtrar}>
          <div>
            <label htmlFor="historico-inicio">Data inicial</label>
            <input id="historico-inicio" type="date" value={inicio}
              onChange={(event) => setInicio(event.target.value)} />
          </div>
          <div>
            <label htmlFor="historico-fim">Data final</label>
            <input id="historico-fim" type="date" value={fim}
              onChange={(event) => setFim(event.target.value)} />
          </div>
          <button className="historico-consultar" type="submit" disabled={carregando}>
            {carregando ? 'Consultando…' : 'Consultar'}
          </button>
          <button className="historico-limpar" type="button" onClick={limpar} disabled={carregando}>
            Limpar filtros
          </button>
        </form>
        {validacao && <p className="historico-erro" role="alert">{validacao}</p>}

        {!carregando && !erro && categorias.length > 0 && (
          <div className="historico-categorias" role="group" aria-label="Filtrar por categoria">
            <button type="button" aria-pressed={categoria === null} onClick={() => setCategoria(null)}>
              Todas
            </button>
            {categorias.map((item) => (
              <button key={item.id} type="button" aria-pressed={categoria === item.id}
                onClick={() => setCategoria(item.id)}>
                <span className="historico-ponto" style={{ background: corCategoria(item.id) }} aria-hidden="true" />
                {item.nome}
              </button>
            ))}
          </div>
        )}

        <p className="historico-periodo">{periodo}</p>
        <div role="status" aria-live="polite">
          {carregando && <p className="historico-estado">Carregando registros…</p>}
          {!carregando && !erro && listados.length === 0 && (
            <p className="historico-estado">Nenhum registro encontrado. Cadastre uma receita ou consulte outro período.</p>
          )}
        </div>
        {erro && (
          <div className="historico-erro" role="alert">
            <p>{erro}</p>
            <button type="button" className="historico-limpar" onClick={() => buscar(pedido.filtros)}>
              Tentar novamente
            </button>
          </div>
        )}

        {!carregando && !erro && listados.length > 0 && (
          <>
            <div className="historico-tabela-container" tabIndex={0}
              role="region" aria-label="Tabela de registros; role horizontalmente em telas pequenas">
              <table className="historico-tabela">
                <caption className="historico-sr">Registros individuais do período consultado</caption>
                <thead><tr>
                  <th scope="col">Data</th><th scope="col">Tipo</th>
                  <th scope="col">Categoria</th><th scope="col">Descrição</th>
                  <th scope="col">Valor</th>
                </tr></thead>
                <tbody>
                  {listados.map((item) => (
                    <tr key={item.id_registro}>
                      <td>{dataBrasileira(item.data)}</td>
                      <td><span className={item.tipo.toLowerCase() === 'receita' ? 'historico-receita' : 'historico-tipo'}>
                        {item.tipo}
                      </span></td>
                      <td><span className="historico-categoria">
                        <span className="historico-ponto" style={{ background: corCategoria(item.id_categoria) }} aria-hidden="true" />
                        {item.categoria_nome}
                      </span></td>
                      <td>{item.descricao?.trim() || '—'}</td>
                      <td>{moeda(item.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="historico-contagem">{listados.length} registro(s) encontrado(s)</p>
          </>
        )}
      </section>
    </main>
  )
}
