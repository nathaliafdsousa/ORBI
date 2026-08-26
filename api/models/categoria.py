from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Date
from sqlalchemy.orm import relationship
from database import Base

class Categoria(Base):
    __tablename__ = "categoria"

    id_categoria = Column(Integer, primary_key=True, index=True,nullable=True)
    id_conta = Column(Integer, ForeignKey("conta.id_conta"), nullable=False)
    nome = Column(String(100), nullable=False)
    tipo = Column(String(50), nullable=False)  
    
    conta = relationship("Conta", back_populates="categorias")
    registros = relationship("Registro", back_populates="categoria")