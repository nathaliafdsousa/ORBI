export type Campo =
  | 'nome'
  | 'email'
  | 'cpf'
  | 'telefone'
  | 'dataNascimento'
  | 'senha'
  | 'confirmarSenha'

export type Valores = Record<Campo, string>
export type Erros = Partial<Record<Campo, string>>

export const CAMPOS: Campo[] = [
  'nome',
  'email',
  'cpf',
  'telefone',
  'dataNascimento',
  'senha',
  'confirmarSenha',
]

const IDADE_MAXIMA = 120
const LIMITE_BYTES_SENHA = 72

export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function mascararCpf(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)

  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function mascararTelefone(valor: string): string {
  const d = apenasDigitos(valor).slice(0, 11)

  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

export function dataDeHoje(): string {
  const agora = new Date()
  const mes = String(agora.getMonth() + 1).padStart(2, '0')
  const dia = String(agora.getDate()).padStart(2, '0')
  return `${agora.getFullYear()}-${mes}-${dia}`
}

function cpfValido(cpf: string): boolean {
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  for (const tamanho of [9, 10]) {
    let soma = 0
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i)
    }
    if (((soma * 10) % 11) % 10 !== Number(cpf[tamanho])) return false
  }

  return true
}

export const REQUISITOS_SENHA = [
  { id: 'tamanho', texto: 'Pelo menos 8 caracteres', ok: (s: string) => s.length >= 8 },
  { id: 'letra', texto: 'Pelo menos uma letra', ok: (s: string) => /[A-Za-z]/.test(s) },
  { id: 'numero', texto: 'Pelo menos um número', ok: (s: string) => /\d/.test(s) },
] as const

export function validarCadastro(v: Valores): Erros {
  const erros: Erros = {}

  const nome = v.nome.replace(/\s+/g, ' ').trim()
  if (nome.length < 2) {
    erros.nome = 'Informe seu nome (mínimo de 2 caracteres).'
  } else if (nome.length > 100) {
    erros.nome = 'O nome deve ter no máximo 100 caracteres.'
  } else if (!/^\p{L}+(?:[ '.-]\p{L}+)*\.?$/u.test(nome)) {
    erros.nome = 'Use apenas letras, espaços, hífen e apóstrofo.'
  }

  const email = v.email.trim()
  if (email.length > 100) {
    erros.email = 'O e-mail deve ter no máximo 100 caracteres.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!cpfValido(apenasDigitos(v.cpf))) {
    erros.cpf = 'CPF inválido.'
  }

  const telefone = apenasDigitos(v.telefone)
  if (telefone.length !== 10 && telefone.length !== 11) {
    erros.telefone = 'Informe o DDD e o número.'
  } else if (Number(telefone.slice(0, 2)) < 11) {
    erros.telefone = 'DDD inválido.'
  } else if (telefone.length === 11 && telefone[2] !== '9') {
    erros.telefone = 'Celular deve começar com 9 após o DDD.'
  }

  if (!v.dataNascimento) {
    erros.dataNascimento = 'Informe sua data de nascimento.'
  } else if (v.dataNascimento > dataDeHoje()) {
    erros.dataNascimento = 'A data não pode estar no futuro.'
  } else if (
    Number(v.dataNascimento.slice(0, 4)) <
    new Date().getFullYear() - IDADE_MAXIMA
  ) {
    erros.dataNascimento = 'Data de nascimento inválida.'
  }

  if (new TextEncoder().encode(v.senha).length > LIMITE_BYTES_SENHA) {
    erros.senha = 'A senha é longa demais.'
  } else {
    const faltando = REQUISITOS_SENHA.find((r) => !r.ok(v.senha))
    if (faltando) erros.senha = faltando.texto.replace('Pelo menos', 'A senha precisa ter pelo menos') + '.'
  }

  if (!v.confirmarSenha) {
    erros.confirmarSenha = 'Confirme a senha.'
  } else if (v.confirmarSenha !== v.senha) {
    erros.confirmarSenha = 'As senhas não conferem.'
  }

  return erros
}