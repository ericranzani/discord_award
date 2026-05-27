import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 1. Tenta buscar a variável de ambiente 'DATABASE_URL' injetada na nuvem.
# Se ela não existir (como no seu PC agora), o Python usa por padrão o SQLite local ("sqlite:///./awards.db").
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./awards.db")

# 2. Configuração dinâmica do Engine
# O 'connect_args' com 'check_same_thread' SÓ pode ser passado se o banco for o SQLite.
# Se for o PostgreSQL do Supabase, esse argumento quebra a conexão. Fizemos uma validação abaixo:
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Conexão de produção (Supabase / PostgreSQL)
    engine = create_engine(SQLALCHEMY_DATABASE_URL)

# SessionLocal. Cada instância dela será uma sessão de banco de dados.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Modelos (tabelas) herdarão dela.
Base = declarative_base()

# Abrir e fechar a conexão
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()