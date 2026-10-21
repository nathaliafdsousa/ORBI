import type { UsuarioCreate, UsuarioResponse } from '../types/usuario'

interface ErroValidacao {
  msg?: string
}

interface RespostaErro {
  detail?: string | ErroValidacao[]
}

const MENSAGEM_PADRAO = 'Não foi possível concluir o cadastro.'

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

export async function cadastrarUsuario(
  usuario: UsuarioCreate,
): Promise<UsuarioResponse> {
  let resposta: Response

  try {
    resposta = await fetch(`${urlBase()}/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(usuario),
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

    throw new Error(extrairMensagem(erro) || MENSAGEM_PADRAO)
  }

  return resposta.json() as Promise<UsuarioResponse>
}