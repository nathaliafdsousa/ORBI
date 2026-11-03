"""Utilitário temporário: define (com hash bcrypt) a senha de uma conta que já existe.
Serve para a conta de teste antiga conseguir fazer login. Não precisa ir para o Git.

Uso, dentro de C:\\ORBI\\api:
    python definir_senha.py
"""
from getpass import getpass

from sqlalchemy import text

from database import engine
from security import gerar_hash_senha

email = input("E-mail da conta: ").strip().lower()
senha = getpass("Nova senha (mín. 8 caracteres, com letra e número): ")

if len(senha) < 8 or not any(c.isalpha() for c in senha) or not any(c.isdigit() for c in senha):
    raise SystemExit("Senha fraca: use pelo menos 8 caracteres, com letra e número.")

with engine.begin() as conexao:
    resultado = conexao.execute(
        text("UPDATE conta SET senha = :hash WHERE lower(email) = :email"),
        {"hash": gerar_hash_senha(senha), "email": email},
    )

print("Senha atualizada." if resultado.rowcount else "Nenhuma conta encontrada com esse e-mail.")