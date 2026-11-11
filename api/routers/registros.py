import logging
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from autenticacao import get_id_conta_atual
from database import get_db
from models import AporteMeta, Categoria, Conta, Meta, Registro
from schemas import RegistroEditadoOut, RegistroExcluidoOut, RegistroUpdate

router = APIRouter(prefix="/registros", tags=["Histórico de Registros"])
logger = logging.getLogger(__name__)
ZERO = Decimal("0.00")
SALDO_MAXIMO = Decimal("9999999999.99")


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
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    if data_inicial and data_final and data_inicial > data_final:
        raise HTTPException(
            status_code=400,
            detail="A data inicial deve ser anterior ou igual à data final.",
        )

    conta = (
        db.query(Conta)
        .filter(Conta.id_conta == id_conta)
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
            Registro.id_conta == id_conta,
            Categoria.id_conta == id_conta,
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


# ---------------------------------------------------------------------------
# Edição e exclusão de lançamentos (receitas e despesas)
# O saldo fica gravado na conta, então toda alteração corrige o saldo na mesma
# transação, com a conta bloqueada, e respeita o valor reservado em metas.
# ---------------------------------------------------------------------------


def _efeito_no_saldo(tipo: str, valor: Decimal) -> Decimal:
    return valor if tipo == "receita" else -valor


def _carregar_lancamento(db: Session, id_conta: int, id_registro: int):
    conta = (
        db.query(Conta)
        .filter(Conta.id_conta == id_conta)
        .with_for_update()
        .first()
    )
    if conta is None:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")

    encontrado = (
        db.query(Registro, Categoria)
        .join(Categoria, Categoria.id_categoria == Registro.id_categoria)
        .filter(
            Registro.id_registro == id_registro,
            Registro.id_conta == id_conta,
        )
        .first()
    )
    if encontrado is None:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado.")

    registro, categoria = encontrado
    tipo = categoria.tipo.strip().lower()
    if tipo not in ("receita", "despesa"):
        raise HTTPException(status_code=400, detail="Tipo de lançamento inválido.")

    reservado = (
        db.query(func.sum(AporteMeta.valor))
        .join(Meta, Meta.id_meta == AporteMeta.id_meta)
        .filter(Meta.id_conta == id_conta)
        .scalar()
    ) or ZERO
    saldo = conta.saldo if conta.saldo is not None else ZERO

    return conta, registro, tipo, saldo, reservado


def _validar_novo_saldo(tipo: str, operacao: str, novo_saldo: Decimal, reservado: Decimal):
    if novo_saldo > SALDO_MAXIMO:
        raise HTTPException(
            status_code=400, detail="O saldo ultrapassaria o limite suportado."
        )

    if novo_saldo < reservado:
        if tipo == "despesa":
            detalhe = (
                "Saldo disponível insuficiente. "
                "Os valores reservados em metas não podem ser utilizados."
            )
        elif operacao == "excluir":
            detalhe = (
                "Não é possível excluir esta receita: o saldo ficaria "
                "menor que o valor reservado em metas."
            )
        else:
            detalhe = (
                "Não é possível alterar esta receita: o saldo ficaria "
                "menor que o valor reservado em metas."
            )
        raise HTTPException(status_code=400, detail=detalhe)


def _resolver_categoria(db: Session, id_conta: int, tipo: str, dados: RegistroUpdate):
    if dados.id_categoria is not None:
        categoria = (
            db.query(Categoria)
            .filter(
                Categoria.id_categoria == dados.id_categoria,
                Categoria.id_conta == id_conta,
            )
            .first()
        )
        if categoria is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")
        if categoria.tipo.strip().lower() != tipo:
            raise HTTPException(
                status_code=400,
                detail=f"Selecione uma categoria do tipo {tipo}.",
            )
        return categoria

    categoria = (
        db.query(Categoria)
        .filter(
            Categoria.id_conta == id_conta,
            func.lower(func.trim(Categoria.tipo)) == tipo,
            func.lower(func.trim(Categoria.nome)) == dados.nova_categoria.lower(),
        )
        .order_by(Categoria.id_categoria)
        .first()
    )
    if categoria is None:
        categoria = Categoria(id_conta=id_conta, nome=dados.nova_categoria, tipo=tipo)
        db.add(categoria)
        db.flush()
    return categoria


@router.put("/{id_registro}", response_model=RegistroEditadoOut)
def editar_registro(
    id_registro: int,
    dados: RegistroUpdate,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    try:
        conta, registro, tipo, saldo, reservado = _carregar_lancamento(
            db, id_conta, id_registro
        )
        categoria = _resolver_categoria(db, id_conta, tipo, dados)

        novo_saldo = (
            saldo
            - _efeito_no_saldo(tipo, registro.valor)
            + _efeito_no_saldo(tipo, dados.valor)
        )
        _validar_novo_saldo(tipo, "editar", novo_saldo, reservado)

        registro.valor = dados.valor
        registro.id_categoria = categoria.id_categoria
        registro.descricao = dados.descricao

        data_atual = (
            registro.data.date()
            if isinstance(registro.data, datetime)
            else registro.data
        )
        if dados.data != data_atual:
            registro.data = datetime.combine(dados.data, time.min)

        conta.saldo = novo_saldo
        db.flush()

        resposta = RegistroEditadoOut(
            id_registro=registro.id_registro,
            valor=float(dados.valor),
            tipo=tipo,
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
        logger.exception("Erro ao editar lançamento.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível editar o lançamento.",
        )
    except Exception:
        db.rollback()
        raise


@router.delete("/{id_registro}", response_model=RegistroExcluidoOut)
def excluir_registro(
    id_registro: int,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    try:
        conta, registro, tipo, saldo, reservado = _carregar_lancamento(
            db, id_conta, id_registro
        )

        novo_saldo = saldo - _efeito_no_saldo(tipo, registro.valor)
        _validar_novo_saldo(tipo, "excluir", novo_saldo, reservado)

        db.delete(registro)
        conta.saldo = novo_saldo
        db.flush()

        resposta = RegistroExcluidoOut(
            id_registro=id_registro,
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
        logger.exception("Erro ao excluir lançamento.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível excluir o lançamento.",
        )
    except Exception:
        db.rollback()
        raise

