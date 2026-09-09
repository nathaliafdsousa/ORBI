from datetime import date, datetime, time 
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Registro, Conta, Categoria

router = APIRouter(prefix="/registros", tags=["Histórico de Registros"])

ID_CONTA_TESTE = 2

class RegistroHistoricoOut(BaseModel):
    id_registro: int
    valor: float
    tipo: str
    id_categoria: int
    categoria_nome: str
    data: date
    descricao: str | None = None
    

@router.get("", response_model=list[RegistroHistoricoOut])
def consultar_registros(
    data_inicial: date | None = None,
    data_final: date | None = None,
    db: Session = Depends(get_db),
):
    if data_inicial and data_final and data_inicial > data_final:
        raise HTTPException(
            status_code=400,
            detail="A data inicial deve ser anterior ou igual à data final.",
        )

    conta = (
        db.query(Conta)
        .filter(Conta.id_conta == ID_CONTA_TESTE)
        .first()
    )

    if conta is None:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    consulta = (
        db.query(
            Registro.id_registro,
            Registro.valor,
            Registro.data,
            Registro.descricao,
            Categoria.id_categoria,
            Categoria.nome.label("categoria_nome"),
            Categoria.tipo,
        )
        .join(
            Categoria,
            Categoria.id_categoria == Registro.id_categoria,
        )
        .filter(
            Registro.id_conta == ID_CONTA_TESTE,
            Categoria.id_conta == ID_CONTA_TESTE,
        )
    )

    if data_inicial is not None:
        consulta = consulta.filter(
            Registro.data >= datetime.combine(data_inicial, time.min)
        )

    if data_final is not None:
        consulta = consulta.filter(
            Registro.data <= datetime.combine(data_final, time.max)
        )

    registros = (
        consulta
        .order_by(Registro.data.desc(), Registro.id_registro.desc())
        .all()
    )

    return [
        RegistroHistoricoOut(
            id_registro=item.id_registro,
            valor=float(item.valor),
            tipo=item.tipo,
            id_categoria=item.id_categoria,
            categoria_nome=item.categoria_nome,
            data=(
                item.data.date()
                if isinstance(item.data, datetime)
                else item.data
            ),
            descricao=item.descricao,
        )
        for item in registros
    ]

