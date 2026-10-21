export interface UsuarioCreate {
  nome: string
  email: string
  cpf: string
  telefone: string
  data_nascimento: string
  senha: string
  confirmar_senha: string
}

export interface UsuarioResponse {
  id_usuario: number
  id_conta: number
  nome: string
  email: string
}