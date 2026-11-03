import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from autenticacao import MINUTOS_EXPIRACAO, criar_token, get_id_conta_atual
from database import get_db
from models import Conta, Usuario
from schemas.auth import LoginIn, SessaoOut, TokenOut
from security import gerar_hash_senha, verificar_senha

router = APIRouter(prefix="/auth", tags=["Autenticação"])
logger = logging.getLogger("uvicorn.error")

MSG_CREDENCIAIS_INVALIDAS = "E-mail ou senha inválidos."

# Hash usado quando o e-mail não existe, para que a resposta demore o mesmo
# tempo e não revele se o e-mail está cadastrado.
HASH_FALSO = gerar_hash_senha("senha-falsa-para-igualar-o-tempo-de-resposta")


def _credenciais_invalidas() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=MSG_CREDENCIAIS_INVALIDAS,
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post("/login", response_model=TokenOut)
def login(dados: LoginIn, db: Session = Depends(get_db)):
    try:
        resultado = (
            db.query(Conta, Usuario.nome)
            .outerjoin(Usuario, Usuario.id_usuario == Conta.id_usuario)
            .filter(func.lower(Conta.email) == dados.email)
            .first()
        )
    except SQLAlchemyError:
        logger.exception("Erro de banco ao autenticar.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Não foi possível entrar agora. Tente novamente.",
        )

    hash_salvo = resultado[0].senha if resultado else HASH_FALSO
    senha_confere = verificar_senha(dados.senha, hash_salvo)

    if resultado is None or not senha_confere:
        raise _credenciais_invalidas()

    conta, nome = resultado

    return TokenOut(
        access_token=criar_token(conta.id_conta),
        expires_in=MINUTOS_EXPIRACAO * 60,
        id_usuario=conta.id_usuario,
        id_conta=conta.id_conta,
        nome=nome or conta.email,
        email=conta.email,
    )


@router.get("/me", response_model=SessaoOut)
def sessao_atual(
    id_conta: int = Depends(get_id_conta_atual),
    db: Session = Depends(get_db),
):
    resultado = (
        db.query(Conta, Usuario.nome)
        .outerjoin(Usuario, Usuario.id_usuario == Conta.id_usuario)
        .filter(Conta.id_conta == id_conta)
        .first()
    )

    if resultado is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sessão inválida. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    conta, nome = resultado

    return SessaoOut(
        id_usuario=conta.id_usuario,
        id_conta=conta.id_conta,
        nome=nome or conta.email,
        email=conta.email,
    )