export interface DespesaCreate {
  valor: number
  data: string
  id_categoria?: number
  nova_categoria?: string
  descricao?: string
}

export interface DespesaResponse {
  id_registro: number
  valor: number
  data: string
  id_categoria: number
  categoria_nome: string
  descricao: string | null
  saldo_atual: number
  valor_reservado: number
  saldo_disponivel: number
}

export interface CategoriaDespesa {
  id_categoria: number
  nome: string
}