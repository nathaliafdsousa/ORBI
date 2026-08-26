from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Date
from sqlalchemy.orm import relationship
from database import Base

class Registro(Base):
    __tablename__ = "registro"

    id_registro = Column(Integer, primary_key=True, index=True)
    id_conta = Column(Integer, ForeignKey("conta.id_conta"), nullable=False)
    id_categoria = Column(Integer, ForeignKey("categoria.id_categoria"), nullable=False)
    valor = Column(Numeric(12, 2), nullable=False)
    data = Column(DateTime, nullable=False)
    descricao = Column(String(255), nullable=True)

    conta = relationship("Conta", back_populates="registros")
    categoria = relationship("Categoria", back_populates="registros")