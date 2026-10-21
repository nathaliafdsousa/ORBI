import bcrypt


def gerar_hash_senha(senha: str) -> str:
    """Gera o hash bcrypt (60 caracteres) que será salvo em conta.senha."""
    return bcrypt.hashpw(senha.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_senha(senha: str, hash_salvo: str) -> bool:
    """Compara a senha digitada com o hash salvo. Será usada no login."""
    try:
        return bcrypt.checkpw(senha.encode("utf-8"), hash_salvo.encode("utf-8"))
    except ValueError:
        return Falsee