FROM python:3.12-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia o requirements primeiro para aproveitar o cache do Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia todo o conteúdo da pasta 'backend' para o '/app' do container
COPY . .

# Comando para rodar o FastAPI apontando para o módulo 'app.main'
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]