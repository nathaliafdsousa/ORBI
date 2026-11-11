import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import { listarCategoriasDespesa } from '../services/despesaService'
import { listarCategoriasReceita } from '../services/receitaService'
import { editarRegistro } from '../services/registroService'
import type {
  RegistroEdicao,
  RegistroEditado,
  RegistroHistorico,
} from '../types/registro'
import { corCategoria, hojeLocal } from '../utils/formatacao'
import Dialogo from './Dialogo'
import '../styles/RegistrarReceita.css'
import '../styles/registraDespesa.css'
import '../styles/lancamentos.css'

interface EditarLancamentoProps {
  registro: RegistroHistorico
  aoFechar: () => void
  aoSalvar: (resposta: RegistroEditado) => void
}

interface CategoriaItem {
  id_categoria: number
  nome: string
}

type Selecionada = number | 'outra' | null

export default function EditarLancamento({
  registro,
  aoFechar,
  aoSalvar,
}: EditarLancamentoProps) {
  const ehReceita = registro.tipo.trim().toLowerCase() === 'receita'

  const [valor, setValor] = useState(String(registro.valor))
  const [categoria, setCategoria] = useState<Selecionada>(registro.id_categoria)
  const [novaCategoria, setNovaCategoria] = useState('')
  const [data, setData] = useState(registro.data.slice(0, 10))
  const [descricao, setDescricao] = useState(registro.descricao ?? '')

  const [categorias, setCategorias] = useState<CategoriaItem[]>([])
  const [erroCategorias, setErroCategorias] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const carregar = ehReceita ? listarCategoriasReceita : listarCategoriasDespesa

    carregar(controller.signal)
      .then((lista) => {
        if (!controller.signal.aborted) setCategorias(lista)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setErroCategorias('Não foi possível carregar as categorias.')
        }
      })

    return () => controller.abort()
  }, [ehReceita])

  const valorNumerico = Number(valor)
  const alterado =
    valorNumerico !== registro.valor ||
    data !== registro.data.slice(0, 10) ||
    descricao.trim() !== (registro.descricao ?? '').trim() ||
    categoria !== registro.id_categoria

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro('')

    if (categoria === null) {
      setErro('Selecione uma categoria.')
      return
    }

    if (categoria === 'outra' && !novaCategoria.trim()) {
      setErro('Informe o nome da nova categoria.')
      return
    }

    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }

    if (!data) {
      setErro('Informe a data.')
      return
    }

    if (data > hojeLocal()) {
      setErro('A data não pode estar no futuro.')
      return
    }

    const dados: RegistroEdicao = {
      valor: valorNumerico,
      data,
      descricao: descricao.trim() || undefined,
    }

    if (categoria === 'outra') dados.nova_categoria = novaCategoria.trim()
    else dados.id_categoria = categoria

    try {
      setEnviando(true)
      aoSalvar(await editarRegistro(registro.id_registro, dados))
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível editar o lançamento.',
      )
      setEnviando(false)
    }
  }

  return (
    <Dialogo
      id="editar-lancamento"
      titulo={`Editar ${ehReceita ? 'receita' : 'despesa'}`}
      aoFechar={aoFechar}
      bloqueado={enviando}
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="campo">
          <label htmlFor="editar-valor">Valor</label>

          <div className="entrada-valor">
            <span>R$</span>
            <input
              id="editar-valor"
              type="number"
              min="0.01"
              step="0.01"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              disabled={enviando}
            />
          </div>
        </div>

        <fieldset className="campo" disabled={enviando}>
          <legend>Categoria</legend>

          <div className="lista-categorias lista-despesas">
            {categorias.map((item) => (
              <button
                key={item.id_categoria}
                type="button"
                data-cor
                style={
                  {
                    '--cor-categoria': corCategoria(item.id_categoria),
                  } as CSSProperties
                }
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
            <label htmlFor="editar-nova-categoria">Nome da nova categoria</label>
            <input
              id="editar-nova-categoria"
              type="text"
              maxLength={100}
              value={novaCategoria}
              onChange={(event) => setNovaCategoria(event.target.value)}
              placeholder="Ex.: Alimentação"
              disabled={enviando}
            />
          </div>
        )}

        <div className="campo">
          <label htmlFor="editar-data">Data</label>
          <input
            id="editar-data"
            type="date"
            max={hojeLocal()}
            value={data}
            onChange={(event) => setData(event.target.value)}
            disabled={enviando}
          />
        </div>

        <div className="campo">
          <label htmlFor="editar-descricao">
            Descrição <span>(opcional)</span>
          </label>
          <textarea
            id="editar-descricao"
            maxLength={255}
            rows={3}
            value={descricao}
            onChange={(event) => setDescricao(event.target.value)}
            disabled={enviando}
          />
        </div>

        {erro && (
          <p className="mensagem mensagem-erro" role="alert">
            {erro}
          </p>
        )}

        <div className="dialogo-acoes">
          <button
            type="button"
            className="dialogo-cancelar"
            onClick={aoFechar}
            disabled={enviando}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="dialogo-confirmar"
            disabled={enviando || !alterado}
          >
            {enviando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </Dialogo>
  )
}