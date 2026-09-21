export interface Meta {
  id_meta: number
  id_conta: number
  nome: string
  valor_desejado: string
  data_criacao: string
  valor_acumulado: string
  valor_restante: string
  percentual_concluido: string
  concluida: boolean
}
export interface ResumoMetas {
  saldo_total: string
  valor_reservado: string
  saldo_disponivel: string
}
export interface Aporte {
  id_aporte: number
  id_meta: number
  valor: string
  data: string
}
export interface MetaCreate {
  nome: string
  valor_desejado: string
}
export interface AporteCreate {
  valor: string
}
