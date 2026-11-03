import logging
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from autenticacao import get_id_conta_atual
from database import get_db
from models import Conta, Meta, AporteMeta
from schemas import MetaCreate, MetaOut, AporteCreate, AporteOut


router = APIRouter(prefix="/metas", tags=["Metas financeiras"])

logger = logging.getLogger(__name__)

ZERO = Decimal("0.00")


def buscar_conta(db: Session, id_conta: int, bloquear: bool = False):
    consulta = db.query(Conta).filter(
        Conta.id_conta == id_conta
    )

    if bloquear:
        consulta = consulta.with_for_update()

    conta = consulta.first()

    if conta is None:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada.",
        )

    return conta


def buscar_meta(db: Session, id_meta: int, id_conta: int):
    meta = (
        db.query(Meta)
        .filter(
            Meta.id_meta == id_meta,
            Meta.id_conta == id_conta,
        )
        .first()
    )

    if meta is None:
        raise HTTPException(
            status_code=404,
            detail="Meta não encontrada.",
        )

    return meta


def calcular_acumulado(db: Session, id_meta: int):
    total = (
        db.query(func.sum(AporteMeta.valor))
        .filter(AporteMeta.id_meta == id_meta)
        .scalar()
    )

    return total if total is not None else ZERO


def calcular_reservado(db: Session, id_conta: int):
    total = (
        db.query(func.sum(AporteMeta.valor))
        .join(Meta, Meta.id_meta == AporteMeta.id_meta)
        .filter(Meta.id_conta == id_conta)
        .scalar()
    )

    return total if total is not None else ZERO


def montar_resposta_meta(db: Session, meta: Meta):
    acumulado = calcular_acumulado(db, meta.id_meta)

    restante = max(
        meta.valor_desejado - acumulado,
        ZERO,
    )

    percentual = (
        acumulado / meta.valor_desejado * Decimal("100")
    ).quantize(Decimal("0.01"))

    return MetaOut(
        id_meta=meta.id_meta,
        id_conta=meta.id_conta,
        nome=meta.nome,
        valor_desejado=meta.valor_desejado,
        data_criacao=meta.data_criacao,
        valor_acumulado=acumulado,
        valor_restante=restante,
        percentual_concluido=percentual,
        concluida=acumulado >= meta.valor_desejado,
    )


@router.post(
    "",
    response_model=MetaOut,
    status_code=status.HTTP_201_CREATED,
)
def criar_meta(
    dados: MetaCreate,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    buscar_conta(db, id_conta)

    try:
        meta = Meta(
            id_conta=id_conta,
            nome=dados.nome,
            valor_desejado=dados.valor_desejado,
        )

        db.add(meta)
        db.flush()
        db.refresh(meta)

        resposta = montar_resposta_meta(db, meta)

        db.commit()
        return resposta

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Erro ao criar meta.")

        raise HTTPException(
            status_code=500,
            detail="Não foi possível criar a meta.",
        )


@router.get("", response_model=list[MetaOut])
def listar_metas(
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    buscar_conta(db, id_conta)

    metas = (
        db.query(Meta)
        .filter(Meta.id_conta == id_conta)
        .order_by(Meta.id_meta.desc())
        .all()
    )

    return [
        montar_resposta_meta(db, meta)
        for meta in metas
    ]


@router.get("/resumo")
def consultar_resumo(
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):

    conta = buscar_conta(db, id_conta, bloquear=True)

    try:
        saldo = conta.saldo if conta.saldo is not None else ZERO
        reservado = calcular_reservado(db, id_conta)

        return {
            "saldo_total": str(saldo),
            "valor_reservado": str(reservado),
            "saldo_disponivel": str(saldo - reservado),
        }

    finally:
       
        db.rollback()


@router.post(
    "/{id_meta}/aportes",
    response_model=MetaOut,
    status_code=status.HTTP_201_CREATED,
)
def registrar_aporte(
    id_meta: int,
    dados: AporteCreate,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    try:
        # Serializa os aportes da conta para evitar que duas requisições reservem o mesmo saldo ao mesmo tempo.
        conta = buscar_conta(db, id_conta, bloquear=True)
        meta = buscar_meta(db, id_meta, id_conta)

        saldo = conta.saldo if conta.saldo is not None else ZERO
        reservado = calcular_reservado(db, id_conta)
        disponivel = saldo - reservado

        if dados.valor > disponivel:
            raise HTTPException(
                status_code=400,
                detail="Saldo disponível insuficiente para este aporte.",
            )

        acumulado = calcular_acumulado(db, id_meta)
        restante = meta.valor_desejado - acumulado

        if restante <= ZERO:
            raise HTTPException(
                status_code=400,
                detail="Esta meta já foi concluída.",
            )

        if dados.valor > restante:
            raise HTTPException(
                status_code=400,
                detail=(
                    "O aporte não pode ultrapassar o valor "
                    "que falta para concluir a meta."
                ),
            )

        aporte = AporteMeta(
            id_meta=meta.id_meta,
            valor=dados.valor,
            data=dados.data,
        )

        db.add(aporte)
        db.flush()

        resposta = montar_resposta_meta(db, meta)

        db.commit()
        return resposta

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Erro ao registrar aporte.")

        raise HTTPException(
            status_code=500,
            detail="Não foi possível registrar o aporte.",
        )


@router.get(
    "/{id_meta}/aportes",
    response_model=list[AporteOut],
)
def listar_aportes(
    id_meta: int,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    buscar_meta(db, id_meta, id_conta)

    return (
        db.query(AporteMeta)
        .filter(AporteMeta.id_meta == id_meta)
        .order_by(
            AporteMeta.data.desc(),
            AporteMeta.id_aporte.desc(),
        )
        .all()
    )