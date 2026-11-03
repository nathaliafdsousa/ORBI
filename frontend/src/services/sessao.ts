export interface Sessao {
  token: string
  id_usuario: number
  id_conta: number
  nome: string
  email: string
  expiraEm: number
}

const CHAVE_SESSAO = 'orbi:sessao'
const CHAVE_AVISO = 'orbi:aviso'

function sessaoValida(valor: unknown): valor is Sessao {
  if (typeof valor !== 'object' || valor === null) return false

  const s = valor as Record<string, unknown>

  return (
    typeof s.token === 'string' &&
    s.token.length > 0 &&
    typeof s.nome === 'string' &&
    typeof s.email === 'string' &&
    typeof s.id_conta === 'number' &&
    typeof s.id_usuario === 'number' &&
    typeof s.expiraEm === 'number'
  )
}

function removerSessao(): void {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* armazenamento indisponível */
  }
}

/** Sessão guardada só nesta aba: fechar a aba encerra o acesso. */
export function obterSessao(): Sessao | null {
  try {
    const bruto = sessionStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return null

    const dados: unknown = JSON.parse(bruto)
    if (!sessaoValida(dados)) return null

    if (Date.now() >= dados.expiraEm) {
      removerSessao()
      return null
    }

    return dados
  } catch {
    return null
  }
}

export function salvarSessao(sessao: Sessao): void {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao))
  } catch {
    /* armazenamento indisponível */
  }
}

export function encerrarSessao(aviso?: string): void {
  removerSessao()

  try {
    if (aviso) sessionStorage.setItem(CHAVE_AVISO, aviso)
    else sessionStorage.removeItem(CHAVE_AVISO)
  } catch {
    /* armazenamento indisponível */
  }
}

export function lerAviso(): string {
  try {
    return sessionStorage.getItem(CHAVE_AVISO) ?? ''
  } catch {
    return ''
  }
}

export function limparAviso(): void {
  try {
    sessionStorage.removeItem(CHAVE_AVISO)
  } catch {
    /* armazenamento indisponível */
  }
}

/**
 * Igual ao fetch, mas envia o token da sessão. Se a API responder 401
 * (sessão expirada ou inválida), encerra a sessão e leva para o login.
 */
export async function fetchAutenticado(
  entrada: RequestInfo | URL,
  opcoes: RequestInit = {},
): Promise<Response> {
  const sessao = obterSessao()
  const headers = new Headers(opcoes.headers)

  if (sessao) headers.set('Authorization', `Bearer ${sessao.token}`)

  const resposta = await fetch(entrada, { ...opcoes, headers })

  if (resposta.status === 401) {
    encerrarSessao('Sua sessão expirou. Entre novamente.')
    window.location.assign('#/login')
  }

  return resposta
}