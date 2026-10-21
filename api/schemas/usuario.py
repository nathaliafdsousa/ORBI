import re
from datetime import date
from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, field_validator, model_validator

LIMITE_BYTES_SENHA = 72  # limite do bcrypt
IDADE_MAXIMA = 120


def somente_digitos(valor: str) -> str:
    return re.sub(r"\D", "", valor)


def cpf_valido(cpf: str) -> bool:
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        return False

    for tamanho in (9, 10):
        soma = sum(int(cpf[i]) * (tamanho + 1 - i) for i in range(tamanho))
        digito = (soma * 10) % 11 % 10
        if digito != int(cpf[tamanho]):
            return False

    return True


class UsuarioCreate(BaseModel):
    nome: str
    email: str
    cpf: str
    telefone: str
    data_nascimento: date
    senha: str
    confirmar_senha: str

    @field_validator("nome", mode="before")
    @classmethod
    def limpar_nome(cls, valor):
        if isinstance(valor, str):
            return re.sub(r"\s+", " ", valor).strip()
        return valor

    @field_validator("nome")
    @classmethod
    def validar_nome(cls, valor: str) -> str:
        if len(valor) < 2:
            raise ValueError("O nome deve ter pelo menos 2 caracteres.")
        if len(valor) > 100:
            raise ValueError("O nome deve ter no máximo 100 caracteres.")
        if not re.fullmatch(r"[^\W\d_]+(?:[ '.\-][^\W\d_]+)*\.?", valor):
            raise ValueError(
                "O nome deve conter apenas letras, espaços, hífen e apóstrofo."
            )
        return valor

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor: str) -> str:
        try:
            email = validate_email(valor.strip(), check_deliverability=False).normalized
        except EmailNotValidError:
            raise ValueError("Informe um e-mail válido.")
        email = email.lower()
        if len(email) > 100:
            raise ValueError("O e-mail deve ter no máximo 100 caracteres.")
        return email

    @field_validator("cpf", mode="before")
    @classmethod
    def validar_cpf(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("CPF inválido.")
        cpf = somente_digitos(valor)
        if not cpf_valido(cpf):
            raise ValueError("CPF inválido.")
        return cpf

    @field_validator("telefone", mode="before")
    @classmethod
    def validar_telefone(cls, valor):
        if not isinstance(valor, str):
            raise ValueError("Telefone inválido.")
        telefone = somente_digitos(valor)
        if len(telefone) in (12, 13) and telefone.startswith("55"):
            telefone = telefone[2:]
        if len(telefone) not in (10, 11):
            raise ValueError("Telefone inválido. Informe DDD e número.")
        if not 11 <= int(telefone[:2]) <= 99:
            raise ValueError("DDD do telefone inválido.")
        if len(telefone) == 11 and telefone[2] != "9":
            raise ValueError("Celular deve começar com 9 após o DDD.")
        return telefone

    @field_validator("data_nascimento")
    @classmethod
    def validar_nascimento(cls, valor: date) -> date:
        hoje = date.today()
        if valor > hoje:
            raise ValueError("A data de nascimento não pode estar no futuro.")
        if valor.year < hoje.year - IDADE_MAXIMA:
            raise ValueError("Data de nascimento inválida.")
        return valor

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, valor: str) -> str:
        if len(valor) < 8:
            raise ValueError("A senha deve ter pelo menos 8 caracteres.")
        if len(valor.encode("utf-8")) > LIMITE_BYTES_SENHA:
            raise ValueError("A senha é longa demais (máximo de 72 bytes).")
        if not re.search(r"[A-Za-z]", valor) or not re.search(r"\d", valor):
            raise ValueError("A senha deve conter pelo menos uma letra e um número.")
        return valor

    @model_validator(mode="after")
    def conferir_senhas(self):
        if self.senha != self.confirmar_senha:
            raise ValueError("A confirmação de senha não confere.")
        return self


class UsuarioOut(BaseModel):
    id_usuario: int
    id_conta: int
    nome: str
    email: str