import type { FiltrosHistorico, RegistroHistorico } from '../types/registro'

export async function consultarRegistros(
  filtros: FiltrosHistorico = {},
  signal?: AbortSignal,
): Promise<RegistroHistorico[]> {
  const parametros = new URLSearchParams()
  if (filtros.data_inicial) parametros.set('data_inicial', filtros.data_inicial)
  if (filtros.data_final) parametros.set('data_final', filtros.data_final)

  const base = import.meta.env.VITE_API_URL
  const resposta = await fetch(`${base}/registros?${parametros.toString()}`, { signal })

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
