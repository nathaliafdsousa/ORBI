from sqlalchemy import ( Column,Integer,Numeric,Date,ForeignKey,Identity,CheckConstraint,text,)
from sqlalchemy.orm import relationship
from database import Base


class AporteMeta(Base):
    __tablename__ = "aporte_meta"

    __table_args__ = (
        CheckConstraint(
            "valor > 0",
            name="ck_aporte_valor",
        ),
    )

    id_aporte = Column(
        Integer,
        Identity(),
        primary_key=True,
    )

    id_meta = Column(
        Integer,
        ForeignKey("meta.id_meta"),
        nullable=False,
    )

    valor = Column(
        Numeric(12, 2),
        nullable=False,
    )

    data = Column(
        Date,
        nullable=False,
        server_default=text("CURRENT_DATE"),
    )

    meta = relationship(
        "Meta",
        back_populates="aportes",
    )