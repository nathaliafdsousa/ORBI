import {
  useEffect,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react'
import {
  listarCategoriasDespesa,
  registrarDespesa,
} from '../services/despesaService'
import { consultarResumoMetas } from '../services/metaService'
import type { CategoriaDespesa, DespesaCreate } from '../types/despesa'
import type { ResumoMetas } from '../types/meta'
import '../styles/RegistrarReceita.css'
import '../styles/registraDespesa.css'

type CategoriaSelecionada = number | 'outra' | null

// Nova interface para o estado visual das despesas recentes
interface DespesaRecente {
  id: number;
  descricao: string;
  categoriaNome: string;
  valor: number;
  data: string;
  cor: string;
}

const CORES = ['#86a692', '#7e9bbc', '#a58cac', '#d2ac72', '#79b9b3', '#cb8c99']
const COR_DISPONIVEL = '#86a692'
const COR_RESERVADO = '#a58cac'

function corCategoria(id: number): string {
  return CORES[((id - 1) % CORES.length + CORES.length) % CORES.length]!
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

function dataDeHoje(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

function fundoOrbita(resumo: ResumoMetas | null): string {
  if (!resumo) return '#344155'

  const total = Number(resumo.saldo_total)
  if (!Number.isFinite(total) || total <= 0) return '#344155'

  const reservado = Math.min(Math.max(Number(resumo.valor_reservado), 0), total)
  const percentualDisponivel = ((total - reservado) / total) * 100

  return `conic-gradient(${COR_DISPONIVEL} 0% ${percentualDisponivel}%, ${COR_RESERVADO} ${percentualDisponivel}% 100%)`
}

function RegistrarDespesa() {
  const [valor, setValor] = useState('')
  const [categoria, setCategoria] = useState<CategoriaSelecionada>(null)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [data, setData] = useState('')
  const [descricao, setDescricao] = useState('')

  const [categorias, setCategorias] = useState<CategoriaDespesa[]>([])
  const [erroCategorias, setErroCategorias] = useState('')
  const [resumo, setResumo] = useState<ResumoMetas | null>(null)
  const [carregandoResumo, setCarregandoResumo] = useState(true)
  const [erroResumo, setErroResumo] = useState('')
  const [versao, setVersao] = useState(0)

  // Estado para guardar e mostrar as últimas despesas registadas na sessão
  const [ultimasDespesas, setUltimasDespesas] = useState<DespesaRecente[]>([])

  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    listarCategoriasDespesa(controller.signal)
      .then((lista) => {
        if (controller.signal.aborted) return
        setCategorias(lista)
        setErroCategorias('')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErroCategorias('Não foi possível carregar as categorias.')
        }
      })

    consultarResumoMetas(controller.signal)
      .then((resultado) => {
        if (controller.signal.aborted) return
        setResumo(resultado)
        setErroResumo('')
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErroResumo('Não foi possível carregar o saldo.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregandoResumo(false)
      })

    return () => controller.abort()
  }, [versao])

  function recarregar() {
    setCarregandoResumo(true)
    setErroResumo('')
    setVersao((anterior) => anterior + 1)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setMensagem('')
    setErro('')

    if (categoria === null) {
      setErro('Selecione uma categoria.')
      return
    }

    if (categoria === 'outra' && !novaCategoria.trim()) {
      setErro('Informe o nome da nova categoria.')
      return
    }

    const valorNumerico = Number(valor)

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }

    if (data > dataDeHoje()) {
      setErro('A data da despesa não pode estar no futuro.')
      return
    }

    const despesa: DespesaCreate = {
      valor: valorNumerico,
      data,
      descricao: descricao.trim() || undefined,
    }

    if (categoria === 'outra') {
      despesa.nova_categoria = novaCategoria.trim()
    } else {
      despesa.id_categoria = categoria
    }

    try {
      setEnviando(true)

      const resposta = await registrarDespesa(despesa)

      setResumo({
        saldo_total: String(resposta.saldo_atual),
        valor_reservado: String(resposta.valor_reservado),
        saldo_disponivel: String(resposta.saldo_disponivel),
      })
      
      // Criar o objeto visual da despesa para adicionar à lista
      let catNome = novaCategoria.trim()
      let catCor = '#d2ac72' // cor genérica de fallback
      
      if (categoria !== 'outra' && categoria !== null) {
        const cat = categorias.find(c => c.id_categoria === categoria)
        catNome = cat ? cat.nome : 'Despesa'
        catCor = corCategoria(categoria)
      }

      const novaDespesaRecente: DespesaRecente = {
        id: Date.now(), // ID temporário para a key do React
        descricao: descricao.trim(),
        categoriaNome: catNome,
        valor: valorNumerico,
        data: data,
        cor: catCor
      }

      // Adiciona no início da lista e mantém apenas as últimas 4 para não gerar scroll
      setUltimasDespesas(prev => [novaDespesaRecente, ...prev].slice(0, 4))

      setErroResumo('')
      setMensagem('Despesa registrada com sucesso!')

      if (categoria === 'outra') setVersao((anterior) => anterior + 1)

      setValor('')
      setCategoria(null)
      setNovaCategoria('')
      setData('')
      setDescricao('')
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar a despesa.',
      )
    } finally {
      setEnviando(false)
    }
  }

  const disponivel = resumo ? Number(resumo.saldo_disponivel) : null

  return (
    <main className="pagina-receita">
      <section className="cartao-formulario">
        <header>
          <span className="subtitulo">NOVA SAÍDA</span>
          <h1>Registrar despesa</h1>
          <p>
            Registre um gasto e acompanhe quanto ainda resta
            disponível na sua órbita financeira.
          </p>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="campo">
            <label htmlFor="valor-despesa">Valor</label>
            <div className="entrada-valor">
              <span>R$</span>
              <input
                id="valor-despesa"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(event) => setValor(event.target.value)}
                placeholder="0,00"
                disabled={enviando}
                required
              />
            </div>
            {disponivel !== null && Number.isFinite(disponivel) && (
              <small className="nota-campo">
                Disponível para gastar: {formatarMoeda(disponivel)}
              </small>
            )}
          </div>

          <fieldset className="campo" disabled={enviando}>
            <legend>Categoria</legend>
            <div className="lista-categorias lista-despesas">
              {categorias.map((item) => (
                <button
                  key={item.id_categoria}
                  type="button"
                  data-cor
                  style={{ '--cor-categoria': corCategoria(item.id_categoria) } as CSSProperties}
                  aria-pressed={categoria === item.id_categoria}
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
            {erroCategorias && (
              <small className="nota-campo nota-erro">{erroCategorias}</small>
            )}
          </fieldset>

          {categoria === 'outra' && (
            <div className="campo">
              <label htmlFor="nova-categoria-despesa">Nome da nova categoria</label>
              <input
                id="nova-categoria-despesa"
                type="text"
                maxLength={100}
                value={novaCategoria}
                onChange={(event) => setNovaCategoria(event.target.value)}
                placeholder="Ex.: Alimentação"
                disabled={enviando}
                required
              />
            </div>
          )}

          <div className="campo campo-data">
            <label htmlFor="data-despesa">Data</label>
            <input
              id="data-despesa"
              type="date"
              max={dataDeHoje()}
              value={data}
              onChange={(event) => setData(event.target.value)}
              disabled={enviando}
              required
            />
          </div>

          <div className="campo">
            <label htmlFor="descricao-despesa">
              Descrição <span>(opcional)</span>
            </label>
            <textarea
              id="descricao-despesa"
              maxLength={255}
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Ex.: Almoço no restaurante"
              rows={4}
              disabled={enviando}
            />
          </div>

          {erro && <p className="mensagem mensagem-erro">{erro}</p>}
          {mensagem && <p className="mensagem mensagem-sucesso">{mensagem}</p>}

          <button className="botao-registrar" type="submit" disabled={enviando}>
            {enviando ? 'Registrando...' : 'Registrar despesa'}
          </button>
        </form>
      </section>

      <aside className="cartao-saldo" aria-label="Saldo da conta">
        <span className="titulo-saldo">SEU SALDO</span>
        <p className="periodo-orbita">Quanto você pode gastar agora</p>

        <div className="orbita-saldo" style={{ background: fundoOrbita(resumo) }}>
          <div className="conteudo-saldo">
            <span>DISPONÍVEL</span>
            <strong>
              {disponivel !== null && Number.isFinite(disponivel)
                ? formatarMoeda(disponivel)
                : '—'}
            </strong>
          </div>
        </div>

        <div className="estado-orbita" aria-live="polite">
          {carregandoResumo && <p>Carregando saldo…</p>}
          {erroResumo && (
            <div className="erro-orbita">
              <p>{erroResumo}</p>
              <button type="button" onClick={recarregar}>
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {resumo && (
          <ul className="categorias-orbita" aria-label="Composição do saldo">
            {/* O "Saldo total" foi removido daqui */}
            <li>
              <span className="nome-categoria-orbita">
                <span
                  className="cor-categoria-orbita"
                  style={{ backgroundColor: COR_RESERVADO }}
                  aria-hidden="true"
                />
                Reservado em metas
              </span>
              <strong>{formatarMoeda(Number(resumo.valor_reservado))}</strong>
            </li>
            <li>
              <span className="nome-categoria-orbita">
                <span
                  className="cor-categoria-orbita"
                  style={{ backgroundColor: COR_DISPONIVEL }}
                  aria-hidden="true"
                />
                Saldo disponível
              </span>
              <strong>{formatarMoeda(Number(resumo.saldo_disponivel))}</strong>
            </li>
          </ul>
        )}

        {/* --- NOVA SECÇÃO: Últimas Despesas Registadas --- */}
        {ultimasDespesas.length > 0 && (
          <div className="ultimas-despesas-container">
            <hr className="divisor-painel" />
            <h4 className="titulo-secao-despesas">Últimas despesas</h4>
            <ul className="lista-ultimas-despesas">
              {ultimasDespesas.map(despesa => (
                <li key={despesa.id} className="item-ultima-despesa">
                  <div className="info-despesa-recente">
                    <span 
                      className="marcador-cor" 
                      style={{ backgroundColor: despesa.cor }}
                    ></span>
                    <div className="texto-despesa">
                      <span className="categoria-recente">{despesa.categoriaNome}</span>
                      {despesa.descricao && (
                        <span className="descricao-recente">{despesa.descricao}</span>
                      )}
                    </div>
                  </div>
                  <strong className="valor-negativo">- {formatarMoeda(despesa.valor)}</strong>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </main>
  )
}

export default RegistrarDespesa