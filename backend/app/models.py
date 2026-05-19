from xmlrpc.client import Boolean
from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base


class CONFIG_STATUS(Base):
    __tablename__ = "config_status"

    id = Column(Integer, primary_key=True, index=True)
    votacao_encerrada = Column(Boolean, default=False)

class Categoria(Base):
    __tablename__ = "categorias"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    descricao = Column(String, nullable=True)

    # Relacionamento: Uma categoria pode ter vários candidatos
    candidatos = relationship("Candidato", back_populates="categoria", cascade="all, delete-orphan")

class Candidato(Base):
    __tablename__ = "candidatos"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    categoria_id = Column(Integer, ForeignKey("categorias.id"))
    imagem_url = Column(String, nullable=True)

    # Relacionamento: O candidato pertence a uma categoria
    categoria = relationship("Categoria", back_populates="candidatos")

class Voto(Base):
    __tablename__ = "votos"

    id = Column(Integer, primary_key=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    candidato_id = Column(Integer, ForeignKey("candidatos.id"), nullable=False)
    votante_id = Column(String, nullable=False)