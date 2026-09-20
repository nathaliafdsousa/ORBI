import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { Meta, ResumoMetas, Aporte } from '../types/meta'
import {
  listarMetas, consultarResumoMetas, criarMeta, registrarAporte, listarAportes,
} from '../services/metaService'
import '../styles/metasFinanceiras.css'

function moeda(valor: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor))
}
function centavos(valor: string) {
  const [inteiro = '0', decimal = ''] = valor.split('.')
  const sinal = inteiro.startsWith('-') ? -1 : 1
  return Number(inteiro) * 100 + sinal * Number(decimal.padEnd(2, '0').slice(0, 2))
}
function validarValor(valor: string) {
  return /^\d{1,10}(\.\d{1,2})?$/.test(valor) && centavos(valor) > 0
}
function mensagemErro(erro: unknown) {
  return erro instanceof Error ? erro.message : 'Não foi possível concluir a operação.'
}
function dataFormatada(data: string) {
  return data.slice(0, 10).split('-').reverse().join('/')
}

function HistoricoAportes({ id, versao }: { id: number; versao: number }) {
  const [estado, setEstado] = useState<{ dados: Aporte[]; erro: string; carregando: boolean }>({
    dados: [], erro: '', carregando: true,
  })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    const controle = new AbortController()
    listarAportes(id, controle.signal)
      .then((dados) => {
        if (!controle.signal.aborted) setEstado({ dados, erro: '', carregando: false })
      })
      .catch((erro: unknown) => {
        if (!controle.signal.aborted) setEstado({ dados: [], erro: mensagemErro(erro), carregando: false })
      })
    return () => controle.abort()
  }, [id, versao, tentativa])
  return (
    <div className="metas-historico">
      <h3>Histórico de aportes</h3>
      {estado.carregando && <p role="status">Carregando aportes…</p>}
      {estado.erro && <div role="alert"><p>{estado.erro}</p>
        <button type="button" onClick={() => {
          setEstado({ dados: [], erro: '', carregando: true })
          setTentativa((valor) => valor + 1)
        }}>Tentar novamente</button></div>}
      {!estado.carregando && !estado.erro && (
        estado.dados.length === 0 ? <p>Nenhum aporte registrado.</p> :
          <ul>{estado.dados.map((aporte) => <li key={aporte.id_aporte}>
            <time dateTime={aporte.data}>{dataFormatada(aporte.data)}</time>
            <strong>{moeda(aporte.valor)}</strong>
          </li>)}</ul>
      )}
    </div>
  )
}

function CartaoMeta({ meta, disponivel, bloqueado, aoDestinar, versao }: {
  meta: Meta; disponivel: string; bloqueado: boolean; versao: number
  aoDestinar: (id: number, valor: string) => Promise<boolean>
}) {
  const [aberta, setAberta] = useState(false)
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState('')
  const [historico, setHistorico] = useState(false)
  const percentual = Math.max(0, Math.min(100, Number(meta.percentual_concluido)))
  const limite = Math.max(0, Math.min(centavos(disponivel), centavos(meta.valor_restante)))
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')
    if (!validarValor(valor)) {
      setErro('Informe um valor maior que zero, com até duas casas decimais.')
      return
    }
    if (centavos(valor) > limite) {
      setErro('O valor deve respeitar o saldo disponível e o que falta para a meta.')
      return
    }
    if (await aoDestinar(meta.id_meta, valor)) setValor('')
  }
  return (
    <article className="metas-cartao">
      <button className="metas-expandir" type="button" aria-expanded={aberta}
        aria-controls={`meta-painel-${meta.id_meta}`} onClick={() => setAberta(!aberta)}>
        <span className="metas-anel" aria-hidden="true"
          style={{ background: `conic-gradient(#86a692 ${percentual}%, #e5ebf1 0)` }}>
          <span>{percentual.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
        </span>
        <span className="metas-descricao">
          <strong>{meta.nome}</strong>
          <span>{moeda(meta.valor_acumulado)} de {moeda(meta.valor_desejado)} · faltam {moeda(meta.valor_restante)}</span>
          <span className={meta.concluida ? 'metas-concluida' : 'metas-percentual'}>
            {meta.concluida ? 'Meta concluída' : `${percentual.toLocaleString('pt-BR')}% concluído`}
          </span>
        </span>
        <span className="metas-mais" aria-hidden="true">{aberta ? '−' : '+'}</span>
      </button>
      {aberta && <div className="metas-painel" id={`meta-painel-${meta.id_meta}`}>
        {!meta.concluida && <form onSubmit={enviar} className="metas-aporte">
          <div><label htmlFor={`aporte-${meta.id_meta}`}>Valor a destinar (R$)</label>
            <input id={`aporte-${meta.id_meta}`} type="number" min="0.01" step="0.01"
              max={(limite / 100).toFixed(2)} placeholder="0,00" value={valor}
              onChange={(event) => setValor(event.target.value)} required disabled={bloqueado || limite === 0} />
          </div>
          <button className="metas-primario" disabled={bloqueado || limite === 0} type="submit">Destinar</button>
          <p className="metas-ajuda">O aporte será registrado com a data de hoje. Você pode destinar até {moeda((limite / 100).toFixed(2))}.</p>
          {erro && <p className="metas-erro" role="alert">{erro}</p>}
        </form>}
        <button className="metas-link" type="button" aria-expanded={historico}
          onClick={() => setHistorico(!historico)}>{historico ? 'Ocultar aportes' : 'Ver histórico de aportes'}</button>
        {historico && <HistoricoAportes key={versao} id={meta.id_meta} versao={versao} />}
      </div>}
    </article>
  )
}

export default function MetasFinanceiras() {
  const [dados, setDados] = useState<{ metas: Meta[]; resumo: ResumoMetas } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [erroConsulta, setErroConsulta] = useState('')
  const [erroAcao, setErroAcao] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [nome, setNome] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [versao, setVersao] = useState(0)
  const ativo = useRef(false)
  const gravando = useRef(false)
  const consulta = useRef<AbortController | null>(null)

  const carregar = useCallback(async () => {
    consulta.current?.abort()
    const controle = new AbortController()
    consulta.current = controle
    setCarregando(true)
    setErroConsulta('')
    try {
      const [metas, resumo] = await Promise.all([
        listarMetas(controle.signal), consultarResumoMetas(controle.signal),
      ])
      if (ativo.current && !controle.signal.aborted) {
        setDados({ metas, resumo })
        setVersao((valor) => valor + 1)
      }
    } catch (erro) {
      if (ativo.current && !controle.signal.aborted) {
        setErroConsulta(`${mensagemErro(erro)} Atualize os dados para continuar.`)
      }
    } finally {
      if (ativo.current && !controle.signal.aborted) setCarregando(false)
    }
  }, [])

  useEffect(() => {
    ativo.current = true
    void carregar()
    return () => { ativo.current = false; consulta.current?.abort() }
  }, [carregar])

  async function destinar(id: number, valor: string) {
    if (gravando.current) return false
    gravando.current = true
    setOcupado(true); setErroAcao(''); setSucesso('')
    try {
      await registrarAporte(id, { valor })
      if (ativo.current) {
        setSucesso('Aporte registrado com sucesso!')
        await carregar()
      }
      return true
    } catch (erro) {
      if (ativo.current) setErroAcao(mensagemErro(erro))
      return false
    } finally {
      gravando.current = false
      if (ativo.current) setOcupado(false)
    }
  }

  async function cadastrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (gravando.current) return
    setErroAcao(''); setSucesso('')
    if (!nome.trim() || !validarValor(objetivo)) {
      setErroAcao('Preencha o nome e um valor desejado maior que zero, com até duas casas decimais.')
      return
    }
    gravando.current = true; setOcupado(true)
    try {
      await criarMeta({ nome: nome.trim(), valor_desejado: objetivo })
      if (ativo.current) {
        setNome(''); setObjetivo('')
        setSucesso('Meta criada com sucesso!')
        await carregar()
      }
    } catch (erro) {
      if (ativo.current) setErroAcao(mensagemErro(erro))
    } finally {
      gravando.current = false
      if (ativo.current) setOcupado(false)
    }
  }

  const bloqueado = ocupado || carregando || !!erroConsulta || !dados
  return (
    <main className="metas-pagina">
      <header className="metas-cabecalho"><div>
        <span className="metas-sobretitulo">SEUS OBJETIVOS</span>
        <h1>Metas financeiras</h1>
        <p>Reserve parte do seu saldo e acompanhe cada conquista.</p>
      </div><button className="metas-link" type="button" disabled={ocupado || carregando}
        onClick={() => void carregar()}>Atualizar dados</button></header>

      <div className="metas-resumo">
        <div><span>Saldo total</span><strong>{dados ? moeda(dados.resumo.saldo_total) : '—'}</strong></div>
        <div><span>Reservado em metas</span><strong>{dados ? moeda(dados.resumo.valor_reservado) : '—'}</strong></div>
        <div><span>Saldo disponível</span><strong>{dados ? moeda(dados.resumo.saldo_disponivel) : '—'}</strong></div>
      </div>
      <p className="metas-nota">Reservar para uma meta não é uma despesa: o saldo total permanece igual.</p>

      {carregando && <p role="status" className="metas-aviso">Atualizando metas…</p>}
      {erroConsulta && <p role="alert" className="metas-erro">{erroConsulta} Os valores anteriores podem estar desatualizados.</p>}
      {erroAcao && <p role="alert" className="metas-erro">{erroAcao}</p>}
      {sucesso && <p role="status" className="metas-sucesso">{sucesso}</p>}
      {ocupado && <p role="status" className="metas-aviso">Salvando, aguarde…</p>}

      <section className="metas-lista" aria-label="Suas metas">
        {dados?.metas.map((meta) => <CartaoMeta key={meta.id_meta} meta={meta}
          disponivel={dados.resumo.saldo_disponivel} bloqueado={bloqueado}
          aoDestinar={destinar} versao={versao} />)}
        {dados && dados.metas.length === 0 && <p className="metas-vazio">Você ainda não tem metas. Crie seu primeiro objetivo abaixo.</p>}
      </section>

      <section className="metas-nova" aria-labelledby="nova-meta-titulo">
        <h2 id="nova-meta-titulo">NOVA META</h2>
        <form onSubmit={cadastrar}>
          <div><label htmlFor="meta-nome">Nome da meta</label>
            <input id="meta-nome" value={nome} onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Viagem para o Nordeste" maxLength={100} required disabled={bloqueado} /></div>
          <div><label htmlFor="meta-objetivo">Valor desejado (R$)</label>
            <input id="meta-objetivo" type="number" min="0.01" max="9999999999.99" step="0.01"
              value={objetivo} onChange={(event) => setObjetivo(event.target.value)}
              placeholder="0,00" required disabled={bloqueado} /></div>
          <button type="submit" className="metas-primario" disabled={bloqueado}>Criar meta</button>
        </form>
      </section>
    </main>
  )
}
