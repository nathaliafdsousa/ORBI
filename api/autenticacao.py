import os
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITMO = "HS256"
MINUTOS_EXPIRACAO = int(os.getenv("TOKEN_EXPIRE_MINUTES", "60"))

if not SECRET_KEY or len(SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY não configurada (ou curta demais). Adicione no api/.env uma linha "
        "SECRET_KEY=<valor> com pelo menos 32 caracteres. Para gerar uma chave: "
        'python -c "import secrets; print(secrets.token_hex(32))"'
    )

esquema_bearer = HTTPBearer(
    auto_error=False,
    description="Cole o access_token retornado por POST /auth/login.",
)


def _nao_autorizado(detalhe: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detalhe,
        headers={"WWW-Authenticate": "Bearer"},
    )


def criar_token(id_conta: int) -> str:
    agora = datetime.now(timezone.utc)
    payload = {
        "sub": str(id_conta),
        "iat": agora,
        "exp": agora + timedelta(minutes=MINUTOS_EXPIRACAO),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITMO)


def get_id_conta_atual(
    credenciais: HTTPAuthorizationCredentials | None = Depends(esquema_bearer),
) -> int:
    """Dependência: devolve o id da conta dona do token ou responde 401."""
    if credenciais is None or not credenciais.credentials:
        raise _nao_autorizado("Faça login para continuar.")

    try:
        payload = jwt.decode(
            credenciais.credentials,
            SECRET_KEY,
            algorithms=[ALGORITMO],
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError:
        raise _nao_autorizado("Sessão expirada. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise _nao_autorizado("Sessão inválida. Faça login novamente.")

    try:
        return int(payload["sub"])
    except (TypeError, ValueError):
        raise _nao_autorizado("Sessão inválida. Faça login novamente.")