from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Conta
from routers import receitas, registros
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title= "ORBI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(receitas.router)
app.include_router(registros.router)

@app.get("/")
def raiz():
    return {"message": "Bem-vindo à API ORBI!"}
@app.get("/teste-conexao")
def teste_conexao(db: Session = Depends(get_db)):
    conta = db.query(Conta).first()
    if conta is None:
        return {"conectado": True, "aviso": "conectou, mas não encontrou nenhuma conta"}
    return {"conectado": True, "conta_id": conta.id_conta, "email": conta.email}
 

