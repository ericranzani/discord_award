from typing import List
import os, threading, time, shutil
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, Boolean                     
from sqlalchemy.orm import Session              
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
    allow_origins=["*"],            # Permite as URLs do Angular
    allow_credentials=True,
    allow_methods=["*"],              # Permite todos os métodos (GET, POST, etc.)
    allow_headers=["*"],              # Permite todos os cabeçalhos
)

# --- ROTAS (ENDPOINTS) ---

@app.get("/")
def read_root():
    return {"message": "API do Discord Awards rodando com sucesso!"}


# Função que roda em segundo plano limpando o banco a cada 24 horas
def rotina_limpeza_24h():
    while True:
        # 86400 segundos = 24 horas
        # Dica para testes rápidos: mude para 30 (30 segundos) para ver a mágica acontecer!
        time.sleep(86400) 
        
        print("[Limpeza Automática] Iniciando faxina diária no sistema...")
        try:
            db = next(get_db())
            
            # 1. Limpeza do Banco de Dados (Respeitando as chaves estrangeiras)
            db.query(models.Voto).delete()
            db.query(models.Candidato).delete()
            db.query(models.Categoria).delete()
            
            config = db.query(models.CONFIG_STATUS).first()
            if config:
                config.votacao_encerrada = False
            
            db.commit()
            print("[Limpeza Automática] Dados do banco resetados.")

            # 2. Limpeza das Imagens na Pasta Static
            # UPLOAD_DIR é a constante "static" definida no começo do seu main.py
            if os.path.exists(UPLOAD_DIR):
                for item in os.listdir(UPLOAD_DIR):
                    caminho_item = os.path.join(UPLOAD_DIR, item)
                    try:
                        if os.path.isfile(caminho_item) or os.path.islink(caminho_item):
                            os.unlink(caminho_item) # Deleta o arquivo de imagem
                        elif os.path.isdir(caminho_item):
                            shutil.rmtree(caminho_item) # Deleta subpastas se houver
                    except Exception as fail:
                        print(f" Não foi possível deletar {caminho_item}: {fail}")
                        
                print("[Limpeza Automática] Pasta de imagens estáticas esvaziada.")
            print("[Limpeza Automática] Faxina completa concluída com sucesso!")
            
        except Exception as e:
            print(f"[Limpeza Automática] Erro crítico durante a faxina: {e}")

# Inicializa o status no banco se estiver vazio
@app.on_event("startup")
def inicializar_status():
    db = next(get_db())
    status = db.query(models.CONFIG_STATUS).first()
    if not status:
        novo_status = models.CONFIG_STATUS(votacao_encerrada=False)
        db.add(novo_status)
        db.commit()

    # Inicia a thread de limpeza em background
    thread_limpeza = threading.Thread(target=rotina_limpeza_24h, daemon=True)
    thread_limpeza.start()
    print("[Sistema] Rotina de limpeza agendada para rodar a cada 24 horas.")

# Rota para obter o status atual da votação
@app.get("/status-votacao/")
def obter_status(db: Session = Depends(get_db)):
    config = db.query(models.CONFIG_STATUS).first()
    return {"votacao_encerrada": config.votacao_encerrada if config else False}

# Rota para o Admin alterar o status da votação
@app.post("/status-votacao/alternar/")
def alternar_status(db: Session = Depends(get_db)):
    config = db.query(models.CONFIG_STATUS).first()
    if config:
        config.votacao_encerrada = not config.votacao_encerrada
        db.commit()
        db.refresh(config)
        return {"votacao_encerrada": config.votacao_encerrada}
    return {"detail": "Configuração não encontrada"}

# Rota para Criar uma Categoria
@app.post("/categorias/", response_model=schemas.Categoria)
def criar_categoria(categoria: schemas.CategoriaCreate, db: Session = Depends(get_db)):
    db_categoria = models.Categoria(nome=categoria.nome, descricao=categoria.descricao)
    db.add(db_categoria)
    db.commit()
    db.refresh(db_categoria)
    return db_categoria

# Rota para Listar todas as Categorias
@app.get("/categorias/")
def listar_categorias(db: Session = Depends(get_db)):
    categorias = db.query(models.Categoria).all()
    config = db.query(models.CONFIG_STATUS).first()
    voador_encerrado = config.votacao_encerrada if config else False

    resposta = []
    for cat in categorias:
        dados_cat = {
            "id": cat.id,
            "nome": cat.nome,
            "descricao": cat.descricao,
            "candidatos": [
                {"id": c.id, "nome": c.nome, "imagem_url": c.imagem_url} for c in cat.candidatos
            ],
            "vencedor": None,
            "votacao_encerrada": voador_encerrado
        }

        # Se a votação acabou, calcula quem teve mais votos nesta categoria
        if voador_encerrado:
            mais_votado = db.query(
                models.Voto.candidato_id,
                func.count(models.Voto.id).label("total")
            ).filter(models.Voto.categoria_id == cat.id)\
             .group_by(models.Voto.candidato_id)\
             .order_by(func.count(models.Voto.id).desc()).first()

            if mais_votado:
                cand_vencedor = db.query(models.Candidato).filter(models.Candidato.id == mais_votado.candidato_id).first()
                if cand_vencedor:
                    dados_cat["vencedor"] = {
                        "id": cand_vencedor.id,
                        "nome": cand_vencedor.nome,
                        "imagem_url": cand_vencedor.imagem_url,
                        "votos": mais_votado.total
                    }
        resposta.append(dados_cat)
    
    return resposta

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

# Rota para registrar um voto
@app.post("/votos/", response_model=schemas.Voto)
def registrar_voto(voto: schemas.VotoCreate, db: Session = Depends(get_db)):
    # 1. Verifica se esse votante já votou nessa categoria específica
    voto_existente = db.query(models.Voto).filter(
        models.Voto.categoria_id == voto.categoria_id,
        models.Voto.votante_id == voto.votante_id
    ).first()
    
    if voto_existente:
        raise HTTPException(status_code=400, detail="Você já votou nesta categoria!")
        
    # 2. Se não votou, registra o voto
    db_voto = models.Voto(
        categoria_id=voto.categoria_id,
        candidato_id=voto.candidato_id,
        votante_id=voto.votante_id
    )
    db.add(db_voto)
    db.commit()
    db.refresh(db_voto)
    return db_voto

# Rota para obter os resultados (quantidade de votos por candidato)
@app.get("/resultados/")
def obter_resultados(db: Session = Depends(get_db)):
    
    # Agrupa os votos por candidato e conta
    resultados = db.query(
        models.Voto.categoria_id,
        models.Voto.candidato_id,
        func.count(models.Voto.id).label("total_votos")
    ).group_by(models.Voto.categoria_id, models.Voto.candidato_id).all()
    
    # Formata a resposta para facilitar a leitura no Angular
    return [
        {
            "categoria_id": r.categoria_id,
            "candidato_id": r.candidato_id,
            "votos": r.total_votos
        } for r in resultados
    ]
