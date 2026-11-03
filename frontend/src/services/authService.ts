import type { TokenResponse } from '../types/auth'
import type { Sessao } from './sessao'

interface ErroValidacao {
  msg?: string
}

interface RespostaErro {
  detail?: string | ErroValidacao[]
}

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

export async function entrar(email: string, senha: string): Promise<Sessao> {
  let resposta: Response

  try {
    resposta = await fetch(`${urlBase()}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    })
  } catch {
    throw new Error(
      'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    )
  }

  if (!resposta.ok) {
    const erro = (await resposta
      .json()
      .catch(() => null)) as RespostaErro | null

    throw new Error(
      extrairMensagem(erro) || 'Não foi possível entrar. Tente novamente.',
    )
  }

  const dados = (await resposta.json()) as TokenResponse

  return {
    token: dados.access_token,
    id_usuario: dados.id_usuario,
    id_conta: dados.id_conta,
    nome: dados.nome,
    email: dados.email,
    expiraEm: Date.now() + dados.expires_in * 1000,
  }
}