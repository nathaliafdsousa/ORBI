from datetime import date
from typing import Optional
from pydantic import BaseModel, Field, model_validator
 
 
class ReceitaCreate(BaseModel):
    valor: float = Field(gt=0, description="Valor precisa ser maior que zero")
    data: date
    id_categoria: Optional[int] = None
    nova_categoria: Optional[str] = None
    descricao: Optional[str] = None
 
    
    @model_validator(mode="after")
    def valida_categoria(self):
        if not self.id_categoria and not self.nova_categoria:
            raise ValueError(
                "Informe id_categoria (categoria existente) ou nova_categoria (nome de categoria nova)"
            )
        return self
 
 
class ReceitaOut(BaseModel):
    id_registro: int
    valor: float
    data: date
    id_categoria: int
    categoria_nome: str
    descricao: Optional[str] = None
    saldo_atual: float
 