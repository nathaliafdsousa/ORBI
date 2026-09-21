import type { Meta, ResumoMetas, Aporte, MetaCreate, AporteCreate } from '../types/meta'

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (!base) throw new Error('A URL da API não foi configurada.')
  let resposta: Response
  try {
    resposta = await fetch(`${base}${caminho}`, opcoes)
  } catch (erro) {
    if (opcoes.signal?.aborted) throw erro
    throw new Error(
      opcoes.method === 'POST'
        ? 'Conexão interrompida. Atualize e confira se a operação foi registrada antes de repetir.'
        : 'Não foi possível conectar à API.',
    )
  }
  if (!resposta.ok) {
    const corpo: { detail?: string | { msg?: string }[] } | null =
      await resposta.json().catch(() => null)
    const detalhe = corpo?.detail
    const mensagem = typeof detalhe === 'string'
      ? detalhe
      : Array.isArray(detalhe)
        ? detalhe.map((item) => item.msg).filter(Boolean).join('; ')
        : ''
    throw new Error(mensagem || 'Não foi possível concluir a operação.')
  }
  return resposta.json() as Promise<T>
}
export function listarMetas(signal?: AbortSignal) {
  return requisitar<Meta[]>('/metas', { signal })
}
export function consultarResumoMetas(signal?: AbortSignal) {
  return requisitar<ResumoMetas>('/metas/resumo', { signal })
}
export function listarAportes(id: number, signal?: AbortSignal) {
  return requisitar<Aporte[]>(`/metas/${id}/aportes`, { signal })
}
export function criarMeta(dados: MetaCreate) {
  return requisitar<Meta>('/metas', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
}
export function registrarAporte(id: number, dados: AporteCreate) {
  return requisitar<Meta>(`/metas/${id}/aportes`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  })
}
