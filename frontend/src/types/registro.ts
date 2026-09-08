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