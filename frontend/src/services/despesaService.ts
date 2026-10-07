import type {
  CategoriaDespesa,
  DespesaCreate,
  DespesaResponse,
} from '../types/despesa'

interface ErroValidacao {
  msg?: string
}

interface RespostaErro {
  detail?: string | ErroValidacao[]
}

const MENSAGEM_PADRAO = 'Não foi possível registrar a despesa.'

function urlBase(): string {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('A URL da API não foi configurada.')
  return base
}

function extrairMensagem(erro: RespostaErro | null): string {
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

export async function registrarDespesa(
  despesa: DespesaCreate,
): Promise<DespesaResponse> {
  let resposta: Response

  try {
    resposta = await fetch(`${urlBase()}/despesas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(despesa),
    })
  } catch {
    throw new Error(
      'Conexão interrompida. Confira no histórico se a despesa foi registrada antes de tentar de novo.',
    )
  }

  if (!resposta.ok) {
    const erro = (await resposta
      .json()
      .catch(() => null)) as RespostaErro | null

    throw new Error(extrairMensagem(erro) || MENSAGEM_PADRAO)
  }

  return resposta.json() as Promise<DespesaResponse>
}

export async function listarCategoriasDespesa(
  signal?: AbortSignal,
): Promise<CategoriaDespesa[]> {
  const resposta = await fetch(`${urlBase()}/despesas/categorias`, {
    signal,
  })

  if (!resposta.ok) {
    throw new Error('Não foi possível carregar as categorias.')
  }

  return resposta.json() as Promise<CategoriaDespesa[]>
}