import { useState } from 'react'
import { excluirRegistro } from '../services/registroService'
import type { RegistroExcluido, RegistroHistorico } from '../types/registro'
import { corCategoria, dataBrasileira, moeda } from '../utils/formatacao'
import Dialogo from './Dialogo'
import '../styles/RegistrarReceita.css'
import '../styles/lancamentos.css'

interface ExcluirLancamentoProps {
  registro: RegistroHistorico
  aoFechar: () => void
  aoExcluir: (resposta: RegistroExcluido) => void
}

export default function ExcluirLancamento({
  registro,
  aoFechar,
  aoExcluir,
}: ExcluirLancamentoProps) {
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  const ehReceita = registro.tipo.trim().toLowerCase() === 'receita'

  async function confirmar() {
    setErro('')

    try {
      setEnviando(true)
      aoExcluir(await excluirRegistro(registro.id_registro))
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível excluir o lançamento.',
      )
      setEnviando(false)
    }
  }

  return (
    <Dialogo
      id="excluir-lancamento"
      titulo={`Excluir ${ehReceita ? 'receita' : 'despesa'}?`}
      aoFechar={aoFechar}
      bloqueado={enviando}
    >
      <p className="dialogo-texto">Esta ação não pode ser desfeita.</p>

      <dl className="dialogo-resumo">
        <div>
          <dt>Valor</dt>
          <dd>{moeda(registro.valor)}</dd>
        </div>
        <div>
          <dt>Categoria</dt>
          <dd>
            <span
              className="historico-ponto"
              style={{ background: corCategoria(registro.id_categoria) }}
              aria-hidden="true"
            />{' '}
            {registro.categoria_nome}
          </dd>
        </div>
        <div>
          <dt>Data</dt>
          <dd>{dataBrasileira(registro.data)}</dd>
        </div>
        {registro.descricao?.trim() && (
          <div>
            <dt>Descrição</dt>
            <dd>{registro.descricao.trim()}</dd>
          </div>
        )}
      </dl>

      <p className="dialogo-texto">
        {ehReceita
          ? 'O valor será retirado do seu saldo.'
          : 'O valor será devolvido ao seu saldo.'}
      </p>

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
          type="button"
          className="dialogo-perigo"
          onClick={() => void confirmar()}
          disabled={enviando}
        >
          {enviando ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </Dialogo>
  )
}