import logging
from datetime import date, datetime, time
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from autenticacao import get_id_conta_atual
from database import get_db
from models import Conta, Categoria, Registro
from schemas import CategoriaReceitaOut, ReceitaCreate, ReceitaOut

router = APIRouter(prefix="/receitas", tags=["Receitas"])
logger = logging.getLogger(__name__)
ZERO = Decimal("0.00")
SALDO_MAXIMO = Decimal("9999999999.99")


@router.post("", response_model=ReceitaOut, status_code=status.HTTP_201_CREATED)
def registrar_receita(
    dados: ReceitaCreate,
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    try:
        # Todas as gravações de saldo e reservas bloqueiam primeiro esta conta.
        conta = (
            db.query(Conta)
            .filter(Conta.id_conta == id_conta)
            .with_for_update()
            .first()
        )
        if conta is None:
            raise HTTPException(status_code=404, detail="Conta não encontrada.")

        saldo = conta.saldo if conta.saldo is not None else ZERO
        valor = Decimal(str(dados.valor))
        novo_saldo = saldo + valor
        if novo_saldo > SALDO_MAXIMO:
            raise HTTPException(status_code=400, detail="O saldo ultrapassaria o limite suportado.")

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
            if categoria.tipo.strip().lower() != "receita":
                raise HTTPException(
                    status_code=400,
                    detail="Selecione uma categoria do tipo receita.",
                )
        else:
            # Reutiliza uma categoria do mesmo nome, tipo e conta.
            categoria = (
                db.query(Categoria)
                .filter(
                    Categoria.id_conta == id_conta,
                    func.lower(func.trim(Categoria.tipo)) == "receita",
                    func.lower(func.trim(Categoria.nome)) == dados.nova_categoria.lower(),
                )
                .order_by(Categoria.id_categoria)
                .first()
            )
            if categoria is None:
                categoria = Categoria(
                    id_conta=id_conta,
                    nome=dados.nova_categoria,
                    tipo="receita",
                )
                db.add(categoria)
                db.flush()

        registro = Registro(
            id_conta=id_conta,
            id_categoria=categoria.id_categoria,
            valor=valor,
            data=datetime.combine(dados.data, time.min),
            descricao=dados.descricao,
        )
        db.add(registro)
        conta.saldo = novo_saldo
        db.flush()

        # Valida a resposta antes de confirmar a transação.
        resposta = ReceitaOut(
            id_registro=registro.id_registro,
            valor=float(dados.valor),
            data=dados.data,
            id_categoria=categoria.id_categoria,
            categoria_nome=categoria.nome,
            descricao=registro.descricao,
            saldo_atual=float(novo_saldo),
        )
        db.commit()
        return resposta

    except HTTPException:
        db.rollback()
        raise
    except SQLAlchemyError:
        db.rollback()
        logger.exception("Erro ao registrar receita.")
        raise HTTPException(status_code=500, detail="Não foi possível registrar a receita.")
    except Exception:
        db.rollback()
        raise


@router.get("/resumo-mensal")
def consultar_resumo_mensal(
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    conta = (
        db.query(Conta)
        .filter(Conta.id_conta == id_conta)
        .first()
    )

    if conta is None:
        raise HTTPException(
            status_code=404,
            detail="Conta não encontrada.",
        )

    hoje = date.today()

    inicio_mes = datetime(hoje.year, hoje.month, 1)

    if hoje.month == 12:
        inicio_proximo_mes = datetime(hoje.year + 1, 1, 1)
    else:
        inicio_proximo_mes = datetime(
            hoje.year,
            hoje.month + 1,
            1,
        )

    resultados = (
        db.query(
            Categoria.id_categoria,
            Categoria.nome,
            func.sum(Registro.valor).label("total"),
        )
        .join(
            Registro,
            Registro.id_categoria == Categoria.id_categoria,
        )
        .filter(
            Registro.id_conta == id_conta,
            Categoria.id_conta == id_conta,
            func.lower(Categoria.tipo) == "receita",
            Registro.data >= inicio_mes,
            Registro.data < inicio_proximo_mes,
        )
        .group_by(
            Categoria.id_categoria,
            Categoria.nome,
        )
        .order_by(Categoria.id_categoria)
        .all()
    )

    total_mes = sum(
        (item.total for item in resultados),
        Decimal("0.00"),
    )

    return {
        "ano": hoje.year,
        "mes": hoje.month,
        "total_mes": float(total_mes),
        "categorias": [
            {
                "id_categoria": item.id_categoria,
                "nome": item.nome,
                "total": float(item.total),
            }
            for item in resultados
        ],
    }



@router.get("/categorias", response_model=list[CategoriaReceitaOut])
def listar_categorias_receita(
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    categorias = (
        db.query(Categoria)
        .filter(
            Categoria.id_conta == id_conta,
            func.lower(func.trim(Categoria.tipo)) == "receita",
        )
        .order_by(Categoria.nome, Categoria.id_categoria)
        .all()
    )
    return [
        CategoriaReceitaOut(id_categoria=item.id_categoria, nome=item.nome)
        for item in categorias
    ]