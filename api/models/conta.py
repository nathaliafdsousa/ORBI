from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Date
from sqlalchemy.orm import relationship
from database import Base

class Conta(Base):
    __tablename__ = "conta"

    id_conta = Column(Integer, primary_key=True, index=True)
    id_usuario = Column(Integer, ForeignKey("usuario.id_usuario"), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    senha = Column(String(200), nullable=False)
    data_criacao = Column(DateTime, nullable=False)
    saldo = Column(Numeric(12, 2), nullable=False, default=0.00)
    
    usuario = relationship("Usuario", back_populates="contas")
    categorias = relationship("Categoria", back_populates="conta")
    registros = relationship("Registro", back_populates="conta")
