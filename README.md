# 🏆 Discord Awards - Sistema de Votação Anual

Uma aplicação web full-stack desenvolvida para automatizar e gerenciar votações anuais de comunidades do Discord. O sistema adota uma abordagem dinâmica baseada em enquetes por sessão e conta com um painel administrativo oculto para controle do evento e revelação dos vencedores em tempo real ("Modo Oscar").

## 🚀 Tecnologias Utilizadas

### Backend
* **Python (FastAPI):** API assíncrona, leve e de alta performance.
* **SQLAlchemy:** ORM para mapeamento e persistência de dados.
* **SQLite:** Banco de dados relacional local.
* **Threading:** Gerenciamento de rotinas concorrentes em background.

### Frontend
* **Angular 22+:** Framework modular utilizando componentes standalone e controle de fluxo moderno (`@if`, `@for`).
* **HTML5 / CSS3:** Interface responsiva customizada com a identidade visual dark do Discord.

### Infraestrutura
* **Docker & Docker Compose:** Containerização de todo o ambiente de desenvolvimento (Backend, Frontend e volumes estáticos).

## 🛠️ Arquitetura e Recursos

* **Criação Unificada (Form Data):** Upload de candidatos vinculando imagem (binário) e metadados em uma única chamada HTTP.
* **Votação por Sessão Aberta:** Bloqueio de múltiplos votos por categoria utilizando identificadores únicos persistidos em `LocalStorage`.
* **Modo Oscar:** Bloqueio global dos resultados em tempo real. Os votos são computados secretamente e revelados apenas quando o Administrador ativa a chave de encerramento.
* **Rotina de Limpeza Automatizada:** Thread interna rodando em background que limpa as tabelas do banco de dados a cada 24 horas para preservação de armazenamento.

## 📦 Como Executar o Projeto

Certifique-se de ter o **Docker** e o **Docker Compose** instalados na sua máquina.

1. Clone o repositório:
   ```bash
   git clone [https://github.com/seu-usuario/discord-awards.git](https://github.com/seu-usuario/discord-awards.git)
   cd discord-awards

2. Suba a aplicação utilizando o Docker Compose:
   ```bash
   docker-compose up --build

3. Acesse os serviços nos endereços locais:
   ```bash
   . Frontend (Angular): http://localhost:4200
   . Backend API (FastAPI): http://localhost:8000
   . Documentação Swagger: http://localhost:8000/docs