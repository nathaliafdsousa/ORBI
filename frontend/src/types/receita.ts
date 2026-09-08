export interface ReceitaCreate {
  valor: number
  data: string
  id_categoria?: number
  nova_categoria?: string
  descricao?: string
}

export interface ReceitaResponse {
  id_registro: number
  valor: number
  data: string
  id_categoria: number
  categoria_nome: string
  descricao: string | null
  saldo_atual: number
}

export interface CategoriaOpcao {
  id_categoria: number
  nome: string
}

export interface ResumoCategoria {
  id_categoria: number
  nome: string
  total: number
}

export interface ResumoMensal {
  ano: number
  mes: number
  total_mes: number
  categorias: ResumoCategoria[]
}