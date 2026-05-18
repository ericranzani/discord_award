from typing import List
import os
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles
from . import models, schemas
from .database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Discord Awards API")

# --- CONFIGURAÇÃO DE ARQUIVOS ESTÁTICOS ---
# Cria a pasta 'static' dentro do container se ela não existir
UPLOAD_DIR = "static"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Cria a rota /static para servir as imagens publicamente
app.mount("/static", StaticFiles(directory=UPLOAD_DIR), name="static")

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
def criar_candidato_com_foto(
    nome: str = File(...),                    # Recebido como campo de formulário
    categoria_id: int = File(...),            # Recebido como campo de formulário
    file: UploadFile = File(None),            # Arquivo opcional (pode ser None)
    db: Session = Depends(get_db)
):
    # 1. Verifica se a categoria informada existe
    db_categoria = db.query(models.Categoria).filter(models.Categoria.id == categoria_id).first()
    if not db_categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    
    # 2. Cria o candidato inicialmente sem imagem no banco para gerar o ID
    db_candidato = models.Candidato(nome=nome, categoria_id=categoria_id, imagem_url=None)
    db.add(db_candidato)
    db.commit()
    db.refresh(db_candidato)
    
    # 3. Se o usuário enviou uma foto, processamos o salvamento dela
    if file:
        # Pega a extensão do arquivo original (ex: .png, .jpg)
        extensao = os.path.splitext(file.filename)[1]
        # Define o nome usando o ID do candidato recém-criado
        novo_nome_arquivo = f"{db_candidato.id}{extensao}"
        caminho_completo = os.path.join(UPLOAD_DIR, novo_nome_arquivo)
        
        # Salva o arquivo na pasta static/
        with open(caminho_completo, "wb") as buffer:
            buffer.write(file.file.read())
            
        # Atualiza o candidato com a URL da imagem correspondente
        url_publica = f"http://localhost:8000/static/{novo_nome_arquivo}"
        db_candidato.imagem_url = url_publica
        db.commit()
        db.refresh(db_candidato)
        
    return db_candidato