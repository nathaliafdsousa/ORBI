from datetime import date, datetime
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
)


class MetaCreate(BaseModel):
    nome: str = Field(min_length=1, max_length=100)

    valor_desejado: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    @field_validator("nome", mode="before")
    @classmethod
    def limpar_nome(cls, valor):
        if isinstance(valor, str):
            return valor.strip()
        return valor


class AporteCreate(BaseModel):
    valor: Decimal = Field(
        gt=0,
        max_digits=12,
        decimal_places=2,
    )

    data: date = Field(default_factory=date.today)

    @field_validator("data")
    @classmethod
    def validar_data(cls, valor: date) -> date:
        if valor > date.today():
            raise ValueError(
                "A data do aporte não pode estar no futuro."
            )
        return valor


class AporteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_aporte: int
    id_meta: int
    valor: Decimal
    data: date


class MetaOut(BaseModel):
    id_meta: int
    id_conta: int
    nome: str
    valor_desejado: Decimal
    data_criacao: datetime

    valor_acumulado: Decimal
    valor_restante: Decimal
    percentual_concluido: Decimal
    concluida: bool