from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# banco de dados (dentro do container)
SQLALCHEMY_DATABASE_URL = "sqlite:///./awards.db"

# Engine. 
# O connect_args é necessário apenas para o SQLite para permitir múltiplas threads.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

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