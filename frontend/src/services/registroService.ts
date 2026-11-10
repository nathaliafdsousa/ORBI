import { fetchAutenticado } from './sessao'
import type {
  FiltrosHistorico,
  RegistroEdicao,
  RegistroEditado,
  RegistroExcluido,
  RegistroHistorico,
} from '../types/registro'

export async function consultarRegistros(
  filtros: FiltrosHistorico = {},
  signal?: AbortSignal,
): Promise<RegistroHistorico[]> {
  const parametros = new URLSearchParams()
  if (filtros.data_inicial) parametros.set('data_inicial', filtros.data_inicial)
  if (filtros.data_final) parametros.set('data_final', filtros.data_final)

  const base = import.meta.env.VITE_API_URL
  const resposta = await fetchAutenticado(`${base}/registros?${parametros.toString()}`, { signal })

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null)
    throw new Error(
      typeof erro?.detail === 'string'
        ? erro.detail
        : 'Não foi possível consultar o histórico.',
    )
  }
  return resposta.json() as Promise<RegistroHistorico[]>
}

interface ErroValidacao {
  msg?: string
}

function extrairMensagem(erro: { detail?: string | ErroValidacao[] } | null): string {
  const detalhe = erro?.detail

  if (typeof detalhe === 'string') return detalhe

  if (Array.isArray(detalhe)) {
    return detalhe
      .map((item) => item.msg?.replace(/^Value error, /, ''))
      .filter(Boolean)
      .join('; ')
  }

  return ''
}

async function enviarAlteracao<T>(
  caminho: string,
  opcoes: RequestInit,
  mensagemPadrao: string,
): Promise<T> {
  let resposta: Response

  try {
    resposta = await fetchAutenticado(
      `${import.meta.env.VITE_API_URL}${caminho}`,
      opcoes,
    )
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    )
  }

  if (!resposta.ok) {
    const erro = await resposta.json().catch(() => null)
    throw new Error(extrairMensagem(erro) || mensagemPadrao)
  }

  return resposta.json() as Promise<T>
}

export function editarRegistro(
  idRegistro: number,
  dados: RegistroEdicao,
): Promise<RegistroEditado> {
  return enviarAlteracao<RegistroEditado>(
    `/registros/${idRegistro}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    },
    'Não foi possível editar o lançamento.',
  )
}

export function excluirRegistro(idRegistro: number): Promise<RegistroExcluido> {
  return enviarAlteracao<RegistroExcluido>(
    `/registros/${idRegistro}`,
    { method: 'DELETE' },
    'Não foi possível excluir o lançamento.',
  )
}