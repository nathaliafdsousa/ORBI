from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class DespesaCreate(BaseModel):
    valor: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
        description="Valor precisa ser maior que zero",
    )
    data: date
    id_categoria: Optional[int] = None
    nova_categoria: Optional[str] = Field(default=None, max_length=100)
    descricao: Optional[str] = Field(default=None, max_length=255)

    @field_validator("nova_categoria", "descricao", mode="before")
    @classmethod
    def limpar_texto(cls, valor):
        if isinstance(valor, str):
            return valor.strip() or None
        return valor

    @field_validator("data")
    @classmethod
    def validar_data(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError("A data da despesa não pode estar no futuro.")
        return valor

    @model_validator(mode="after")
    def valida_categoria(self):
        if not self.id_categoria and not self.nova_categoria:
            raise ValueError(
                "Informe id_categoria (categoria existente) ou nova_categoria (nome de categoria nova)"
            )
        return self


class CategoriaDespesaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_categoria: int
    nome: str


class DespesaOut(BaseModel):
    id_registro: int
    valor: float
    data: date
    id_categoria: int
    categoria_nome: str
    descricao: Optional[str] = None
    saldo_atual: float
    valor_reservado: float
    saldo_disponivel: float