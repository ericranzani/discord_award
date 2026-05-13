# Usa a imagem oficial do Node
FROM node:20

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências
RUN npm install

# Instala o Angular CLI globalmente para facilitar
RUN npm install -g @angular/cli

# Copia o restante do código
COPY . .

# Expõe a porta padrão do Angular
EXPOSE 4200

# Comando para iniciar o servidor com acesso externo
CMD ["ng", "serve", "--host", "0.0.0.0"]