import logging
from datetime import datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from models import Conta, Categoria, Registro, Meta, AporteMeta
from schemas import DespesaCreate, DespesaOut, CategoriaDespesaOut

router = APIRouter(prefix="/despesas", tags=["Despesas"])
logger = logging.getLogger(__name__)
ID_CONTA_TESTE = 2
ZERO = Decimal("0.00")


@router.post("", response_model=DespesaOut, status_code=status.HTTP_201_CREATED)
def registrar_despesa(dados: DespesaCreate, db: Session = Depends(get_db)):
    try:
        # Todas as gravações de saldo e reservas bloqueiam primeiro esta conta.
        conta = (
            db.query(Conta)
            .filter(Conta.id_conta == ID_CONTA_TESTE)
            .with_for_update()
            .first()
        )
        if conta is None:
            raise HTTPException(status_code=404, detail="Conta não encontrada.")

        saldo = conta.saldo if conta.saldo is not None else ZERO
        reservado = (
            db.query(func.sum(AporteMeta.valor))
            .join(Meta, Meta.id_meta == AporteMeta.id_meta)
            .filter(Meta.id_conta == ID_CONTA_TESTE)
            .scalar()
        ) or ZERO
        saldo_disponivel = saldo - reservado
        if dados.valor > saldo_disponivel:
            raise HTTPException(
                status_code=400,
                detail="Saldo disponível insuficiente. Os valores reservados em metas não podem ser utilizados.",
            )
        novo_saldo = saldo - dados.valor

        if dados.id_categoria is not None:
            categoria = (
                db.query(Categoria)
                .filter(
                    Categoria.id_categoria == dados.id_categoria,
                    Categoria.id_conta == ID_CONTA_TESTE,
                )
                .first()
            )
            if categoria is None:
                raise HTTPException(status_code=404, detail="Categoria não encontrada.")
            if categoria.tipo.strip().lower() != "despesa":
                raise HTTPException(
                    status_code=400,
                    detail="Selecione uma categoria do tipo despesa.",
                )
        else:
            # Reutiliza uma categoria do mesmo nome, tipo e conta.
            categoria = (
                db.query(Categoria)
                .filter(
                    Categoria.id_conta == ID_CONTA_TESTE,
                    func.lower(func.trim(Categoria.tipo)) == "despesa",
                    func.lower(func.trim(Categoria.nome)) == dados.nova_categoria.lower(),
                )
                .order_by(Categoria.id_categoria)
                .first()
            )
            if categoria is None:
                categoria = Categoria(
                    id_conta=ID_CONTA_TESTE,
                    nome=dados.nova_categoria,
                    tipo="despesa",
                )
                db.add(categoria)
                db.flush()

        registro = Registro(
            id_conta=ID_CONTA_TESTE,
            id_categoria=categoria.id_categoria,
            valor=dados.valor,
            data=datetime.combine(dados.data, time.min),
            descricao=dados.descricao,
        )
        db.add(registro)
        conta.saldo = novo_saldo
        db.flush()

        # Valida a resposta antes de confirmar a transação.
        resposta = DespesaOut(
            id_registro=registro.id_registro,
            valor=float(dados.valor),
            data=dados.data,
            id_categoria=categoria.id_categoria,
            categoria_nome=categoria.nome,
            descricao=registro.descricao,
            saldo_atual=float(novo_saldo),
            valor_reservado=float(reservado),
            saldo_disponivel=float(novo_saldo - reservado),
        )
        db.commit()
        return resposta

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Erro ao registrar despesa.")
        raise HTTPException(status_code=500, detail="Não foi possível registrar a despesa.")
    except Exception:
        db.rollback()
        raise


@router.get("/categorias", response_model=list[CategoriaDespesaOut])
def listar_categorias_despesa(db: Session = Depends(get_db)):
    conta = db.query(Conta.id_conta).filter(Conta.id_conta == ID_CONTA_TESTE).first()
    if conta is None:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
    categorias = (
        db.query(Categoria)
        .filter(
            Categoria.id_conta == ID_CONTA_TESTE,
            func.lower(func.trim(Categoria.tipo)) == "despesa",
        )
        .order_by(Categoria.nome, Categoria.id_categoria)
        .all()
    )
    return [
        CategoriaDespesaOut(id_categoria=item.id_categoria, nome=item.nome)
        for item in categorias
    ]