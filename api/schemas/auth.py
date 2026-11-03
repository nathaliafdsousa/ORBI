from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, field_validator


class LoginIn(BaseModel):
    email: str
    senha: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, valor: str) -> str:
        try:
            email = validate_email(valor.strip(), check_deliverability=False).normalized
        except EmailNotValidError:
            raise ValueError("Informe um e-mail válido.")
        return email.lower()

    @field_validator("senha")
    @classmethod
    def validar_senha(cls, valor: str) -> str:
        if not valor:
            raise ValueError("Informe a senha.")
        if len(valor) > 128:
            raise ValueError("E-mail ou senha inválidos.")
        return valor


class SessaoOut(BaseModel):
    id_usuario: int
    id_conta: int
    nome: str
    email: str


class TokenOut(SessaoOut):
    access_token: str
    token_type: str = "bearer"
    expires_in: int