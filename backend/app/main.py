from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

@app.get("/")
def read_root():
    return {"status": "Docker operando!", "projeto": "Discord Awards"}