import logging
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from database import get_db
from models import Conta, Usuario
from schemas.usuario import UsuarioCreate, UsuarioOut
from security import gerar_hash_senha

router = APIRouter(prefix="/usuarios", tags=["Usuários"])
logger = logging.getLogger("uvicorn.error")

MSG_EMAIL_EM_USO = "Já existe uma conta cadastrada com este e-mail."
MSG_CPF_EM_USO = "Já existe um usuário cadastrado com este CPF."


def _conflito(db: Session, dados: UsuarioCreate) -> str | None:
    if db.query(Conta.id_conta).filter(
        func.lower(Conta.email) == dados.email
    ).first():
        return MSG_EMAIL_EM_USO

    if db.query(Usuario.id_usuario).filter(Usuario.cpf == dados.cpf).first():
        return MSG_CPF_EM_USO

    return None


@router.post("", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def cadastrar_usuario(dados: UsuarioCreate, db: Session = Depends(get_db)):
    try:
        mensagem = _conflito(db, dados)
        if mensagem:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=mensagem)

        usuario = Usuario(
            nome=dados.nome,
            cpf=dados.cpf,
            telefone=dados.telefone,
            data_nascimento=dados.data_nascimento,
        )
        db.add(usuario)
        db.flush()

        conta = Conta(
            id_usuario=usuario.id_usuario,
            email=dados.email,
            senha=gerar_hash_senha(dados.senha),
            data_criacao=datetime.now(),
            saldo=Decimal("0.00"),
        )
        db.add(conta)
        db.commit()

        return UsuarioOut(
            id_usuario=usuario.id_usuario,
            id_conta=conta.id_conta,
            nome=usuario.nome,
            email=conta.email,
        )
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        # Dois cadastros simultâneos com o mesmo e-mail/CPF
        logger.exception("IntegrityError ao cadastrar usuário")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=_conflito(db, dados) or "Já existe um cadastro com estes dados.",
        )
    except SQLAlchemyError:
        logger.exception("Erro de banco ao cadastrar usuário")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível concluir o cadastro. Tente novamente.",
        )