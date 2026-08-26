import type {
  ReceitaCreate,
  ReceitaResponse,
} from '../types/receita'

interface ErroValidacao {
  msg?: string
}

interface RespostaErro {
  detail?: string | ErroValidacao[]
}

const API_URL = import.meta.env.VITE_API_URL

export async function registrarReceita(
  receita: ReceitaCreate,
): Promise<ReceitaResponse> {
  const resposta = await fetch(`${API_URL}/receitas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(receita),
  })

  if (!resposta.ok) {
    const erro = (await resposta
      .json()
      .catch(() => null)) as RespostaErro | null

    const detalhe = erro?.detail

    const mensagem =
      typeof detalhe === 'string'
        ? detalhe
        : Array.isArray(detalhe)
          ? detalhe
              .map((item) => item.msg)
              .filter(Boolean)
              .join(', ')
          : 'Não foi possível registrar a receita.'

    throw new Error(
      mensagem || 'Não foi possível registrar a receita.',
    )
  }

  return resposta.json() as Promise<ReceitaResponse>
}