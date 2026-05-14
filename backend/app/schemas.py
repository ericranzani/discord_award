from pydantic import BaseModel
from typing import List, Optional

# --- SCHEMAS PARA CANDIDATOS ---

class CandidatoBase(BaseModel):
    nome: str

class CandidatoCreate(CandidatoBase):
    pass  # Usado para criar um candidato (recebe apenas o nome)

class Candidato(CandidatoBase):
    id: int
    categoria_id: int

    class Config:
        from_attributes = True # Permite que o Pydantic leia modelos do SQLAlchemy

# --- SCHEMAS PARA CATEGORIAS ---

class CategoriaBase(BaseModel):
    nome: str
    descricao: Optional[str] = None

class CategoriaCreate(CategoriaBase):
    pass # Usado ao criar uma nova categoria

class Categoria(CategoriaBase):
    id: int
    candidatos: List[Candidato] = [] # Inclui a lista de candidatos ao buscar a categoria

    class Config:
        from_attributes = True