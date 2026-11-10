export interface RegistroHistorico {
  id_registro: number
  valor: number
  tipo: string
  id_categoria: number
  categoria_nome: string
  data: string
  descricao: string | null
}

export interface FiltrosHistorico {
  data_inicial?: string
  data_final?: string
}

export interface RegistroEdicao {
  valor: number
  data: string
  id_categoria?: number
  nova_categoria?: string
  descricao?: string
}

export interface RegistroEditado {
  id_registro: number
  valor: number
  tipo: string
  data: string
  id_categoria: number
  categoria_nome: string
  descricao: string | null
  saldo_atual: number
  valor_reservado: number
  saldo_disponivel: number
}

export interface RegistroExcluido {
  id_registro: number
  saldo_atual: number
  valor_reservado: number
  saldo_disponivel: number
}