from sqlalchemy import (Column,Integer,String,Numeric,DateTime,ForeignKey,Identity,CheckConstraint,text,)
from sqlalchemy.orm import relationship
from database import Base


class Meta(Base):
    __tablename__ = "meta"

    __table_args__ = (
        CheckConstraint(
            "valor_desejado > 0",
            name="ck_meta_valor_desejado",
        ),
        CheckConstraint(
            "LENGTH(TRIM(nome)) > 0",
            name="ck_meta_nome",
        ),
    )

    id_meta = Column(
        Integer,
        Identity(),
        primary_key=True,
    )

    id_conta = Column(
        Integer,
        ForeignKey("conta.id_conta"),
        nullable=False,
    )

    nome = Column(
        String(100),
        nullable=False,
    )

    valor_desejado = Column(
        Numeric(12, 2),
        nullable=False,
    )

    data_criacao = Column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )

    conta = relationship(
        "Conta",
        back_populates="metas",
    )

    aportes = relationship(
        "AporteMeta",
        back_populates="meta",
    )