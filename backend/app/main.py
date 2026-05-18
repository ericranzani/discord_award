from typing import List
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Discord Awards API")

origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

# Configuração do Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Permite as URLs do Angular
    allow_credentials=True,
    allow_methods=["*"],              # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],              # Permite todos os cabeçalhos
)

# --- ROTAS (ENDPOINTS) ---

@app.get("/")
def read_root():
    return {"message": "API do Discord Awards rodando com sucesso!"}

# Rota para Criar uma Categoria
@app.post("/categorias/", response_model=schemas.Categoria)
def criar_categoria(categoria: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    db_categoria = models.Categoria(nome=categoria.nome, descricao=categoria.descricao)
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria

# Rota para Listar todas as Categorias
@app.get("/categorias/", response_model=List[schemas.Categoria])
def listar_categorias(db: Session = Depends(get_db)):
    return db.query(models.Categoria).all()

# Rota para Adicionar Candidato a uma Categoria
@app.post("/candidatos/", response_model=schemas.Candidato)
def criar_candidato(candidato: schemas.CandidatoCreate, db: Session = Depends(get_db)):
    # Verifica se a categoria existe antes de adicionar o candidato
    db_categoria = db.query(models.Categoria).filter(models.Categoria.id == candidato.categoria_id).first()
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    db_candidato = models.Candidato(nome=candidato.nome, categoria_id=candidato.categoria_id)
    db.add(db_candidato)
    db.commit()
    db.refresh(db_candidato)
    return db_candidato