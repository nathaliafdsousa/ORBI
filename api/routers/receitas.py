from datetime import date, datetime 
from sqlalchemy import func

from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models import Conta, Categoria, Registro
from schemas import ReceitaCreate, ReceitaOut
router = APIRouter(prefix="/receitas", tags=["Receitas"])
 
# Não há login nesta sprint Por isso, todas as operações usam a conta de teste (seed) criada no banco.
ID_CONTA_TESTE = 2
 
 
@router.post("", response_model=ReceitaOut, status_code=status.HTTP_201_CREATED)
def registrar_receita(receita: ReceitaCreate, db: Session = Depends(get_db)):
    conta = db.query(Conta).filter(Conta.id_conta == ID_CONTA_TESTE).first()
    if conta is None:
        raise HTTPException(status_code=404, detail="Conta não encontrada.")
 
    # Cenário 1 do BDD: categoria já existente
    if receita.id_categoria:
        categoria = (
            db.query(Categoria)
            .filter(
                Categoria.id_categoria == receita.id_categoria,
                Categoria.id_conta == ID_CONTA_TESTE,
            )
            .first()
        )
        if categoria is None:
            raise HTTPException(status_code=404, detail="Categoria não encontrada.")
    
    else:
        categoria = Categoria(
            id_conta=ID_CONTA_TESTE, nome=receita.nova_categoria, tipo="receita"
        )
        db.add(categoria)
        db.flush()  
 
    try:
        registro = Registro(
            id_conta=ID_CONTA_TESTE,
            id_categoria=categoria.id_categoria,
            valor=receita.valor,
            data=receita.data,
            descricao=receita.descricao,
        )
        db.add(registro)
 
       
        conta.saldo = (conta.saldo or Decimal("0")) + Decimal(str(receita.valor))
 
        db.commit()
    except Exception as e:
        print(e)
        db.rollback()
        raise HTTPException(status_code=500, detail="Erro ao registrar a receita.")
 
    db.refresh(registro)
    db.refresh(conta)
 
    return ReceitaOut(
        id_registro=registro.id_registro,
        valor=float(registro.valor),
        data=registro.data,
        id_categoria=categoria.id_categoria,
        categoria_nome=categoria.nome,
        descricao=registro.descricao,
        saldo_atual=float(conta.saldo),
    )
    
@router.get("/resumo-mensal")
def consultar_resumo_mensal(db: Session = Depends(get_db)):
    conta = (
        db.query(Conta)
        .filter(Conta.id_conta == ID_CONTA_TESTE)
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
            Registro.id_conta == ID_CONTA_TESTE,
            Categoria.id_conta == ID_CONTA_TESTE,
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