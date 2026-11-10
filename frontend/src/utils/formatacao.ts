const CORES = ['#86a692', '#7e9bbc', '#a58cac', '#d2ac72', '#79b9b3', '#cb8c99']

export function corCategoria(id: number): string {
  return CORES[(((id - 1) % CORES.length) + CORES.length) % CORES.length]!
}

export function moeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor)
}

export function dataBrasileira(data: string): string {
  const [ano, mes, dia] = data.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

export function hojeLocal(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}