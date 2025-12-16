# IronDB Stack – Docker Compose (Bare Metal)


## 🏗️ IronDB Stack (Supabase Alternative)

O **IronDB** é uma arquitetura **BaaS (Backend-as-a-Service) autohospedada**, projetada como uma **alternativa direta ao Supabase**, com foco em:

- Controle total da infraestrutura
- Segurança em modo **Bare Metal**
- Processamento assíncrono de alta performance
- Eliminação de gargalos no banco de dados

Diferente de soluções modulares genéricas, o IronDB **desacopla completamente a camada de API da camada de processamento pesado (Workers)**.  
Isso garante que o banco de dados permaneça estável, mesmo sob cargas intensas, enquanto a API continua rápida e previsível.

---

## 🛠️ Stack Tecnológico

### Core Infrastructure

- **Containerização:** Docker & Docker Compose  
  Orquestração pura, sem dependência de Portainer ou Dokploy.
- **Proxy Reverso:** Nginx  
  Serve o frontend estático e faz o roteamento interno da API.
- **Message Broker:** Redis 7  
  Gerenciamento de filas e cache, compartilhado com o n8n.
- **Database:** PostgreSQL 16  
  Instância dedicada para dados de produção, totalmente isolada do n8n.

---

### Backend — *The Brain & Muscle*

- **Runtime:** Node.js (Express)
- **Camada de Segurança:**
  - Helmet (security headers)
  - CORS restrito
  - Express Rate Limit (proteção contra DDoS e brute force)
- **Autenticação:**
  - Passport.js (Google OAuth 2.0)
  - JWT (autenticação stateless)
- **Engine de Filas:** BullMQ (baseado em Redis)
- **Cliente de Banco:** node-postgres (`pg`)  
  Queries parametrizadas, protegendo contra SQL Injection.

---

### Frontend Studio — *The Face*

- **Framework:** React 18 + Vite
- **Estilo:** Tailwind CSS + Lucide React Icons
- **Linguagem:** TypeScript

---

## 🚀 Funcionalidades Principais

### 1. IronDB Studio (Painel Administrativo)

Interface visual para gerenciamento completo do banco de dados, sem necessidade de linha de comando.

#### Editor de Tabelas
- Visualização de schemas e tabelas existentes
- Controle visual de **RLS (Row Level Security)**  
  Ativação/desativação instantânea
- Visualização de dados brutos (Data Grid)

#### SQL Runner
- Editor SQL completo
- Execução de queries arbitrárias
- Métricas de performance:
  - Tempo de execução
  - Quantidade de linhas afetadas

#### Gerenciador de RPC (Remote Procedure Calls)
- Listagem de funções PostgreSQL armazenadas
- Visualização do código-fonte
- Templates para criação de novas funções  
  (Business Logic diretamente no banco)

#### Gestão de Usuários
- Visualização centralizada da tabela `users`
- Identificação do provedor de autenticação  
  (Google vs Email)

---

### 2. Backend API Segura

Camada de API robusta, criada para substituir o papel do **Kong** no Supabase.

- **Autenticação híbrida:** Google OAuth + JWT
- **API Gateway Interno:**
  - `POST /api/query`  
    Execução segura de SQL validado por token
  - `POST /api/enqueue`  
    Entrada para tarefas pesadas (envio imediato ao Redis)
- **Proteção Ativa:**
  - Rate limiting por IP
  - Proteção contra XSS, sniffing e ataques comuns via Helmet

---

### 3. Workers de Alta Performance (Filas)

O principal diferencial da arquitetura: **o banco de dados nunca trava**.

- **Processamento assíncrono:**  
  A API responde imediatamente, o Worker processa em background.
- **BullMQ + Redis:**  
  Preparado para milhões de jobs.
- **Tipos de Jobs suportados:**
  - `bulk_insert` — inserções massivas sem bloquear a API
  - `rpc_trigger` — execução de funções pesadas no banco
- **Resiliência:**  
  Retry automático em caso de falhas.
- **Concorrência controlada:**  
  Evita exaustão do pool de conexões do PostgreSQL.

---

### 4. Integração Nativa com n8n

- **Ecossistema unificado:**  
  n8n executando na mesma rede Docker.
- **Latência mínima:**  
  Comunicação direta com `irondb-api` e `irondb-postgres`.
- **Redis compartilhado:**  
  Uso otimizado da mesma instância para automações e filas.
- **Isolamento total de dados:**
  - `n8n-postgres` → metadados do n8n
  - `irondb-postgres` → dados de produção dos usuários

---

## 🛡️ Resumo de Segurança

- **Sem exposição desnecessária:**  
  Banco de dados e API acessíveis apenas na rede interna Docker.
- **SQL Injection Proof:**  
  Uso exclusivo de queries parametrizadas.
- **DDoS Mitigation:**  
  Rate limiting configurado por IP.
- **JWT obrigatório:**  
  Todas as rotas sensíveis exigem token válido.



Este repositório descreve uma **arquitetura limpa e enxuta** para rodar **n8n + IronDB** usando **Docker Compose puro**, sem Dokploy, Portainer ou outras camadas intermediárias.

A ideia é **reduzir complexidade**, manter **controle total via arquivos** e ter **isolamento claro de responsabilidades**.

---

## 🧱 Arquitetura (Iron Stack)

### 1. n8n Stack

Componentes usados apenas para automação:

* **n8n** – Orquestração e automações
* **Postgres (interno)** – Banco exclusivo do n8n
* **Redis (compartilhado)** – Fila usada pelo n8n e pelo IronDB Worker

> ⚠️ O banco do n8n **não guarda dados de usuários** da aplicação.

---

### 2. IronDB Stack (Aplicação)

* **irondb-postgres** – Banco dedicado e isolado para os dados dos usuários
* **irondb-api** – Backend Node.js (API principal)
* **irondb-worker** – Processador de filas (jobs assíncronos)
* **irondb-studio** – Frontend React servido via Nginx

  * Nginx também atua como **reverse proxy** para a API

> 🔐 A API não é exposta publicamente, apenas o Nginx conversa com ela.

---

## 📁 Arquivos Necessários

Este setup funciona com os seguintes arquivos:

* `docker-compose.yml` – Orquestra toda a stack
* `Dockerfile` – Build do frontend React (produção)
* `nginx.conf` – Servidor do frontend + proxy `/api`
* `backend/Dockerfile` – Build do backend Node.js

---

## 🚀 Passo a Passo de Deploy (Sem Dokploy / Portainer)

### 1. Instalar Docker e Docker Compose

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
```

---

### 2. Criar a pasta do projeto

```bash
mkdir irondb-stack
cd irondb-stack
```

---

### 3. Estrutura esperada do projeto

```text
/irondb-stack
├── docker-compose.yml
├── Dockerfile           # Frontend (React)
├── nginx.conf           # Configuração do Nginx
├── package.json         # Dependências do frontend
├── vite.config.ts       # Build tool
├── index.html
├── index.tsx
├── ... (outros arquivos do frontend)
└── backend/
    ├── Dockerfile       # Backend Node.js
    ├── package.json
    ├── server.js        # API
    └── worker.js        # Worker de filas
```

> 📌 Você pode subir os arquivos via **Git (recomendado)** ou criar manualmente com `nano`.

---

### 4. Criar o arquivo `.env`

```bash
nano .env
```

Cole o conteúdo abaixo **ajustando as senhas**:

```ini
DOMAIN_NAME=seu-dominio.com

# N8N
N8N_DB_PASS=senha_super_secreta_n8n
N8N_ENCRYPTION_KEY=gere_uma_chave_aleatoria_aqui

# IronDB (Aplicação)
DB_USER=admin
DB_PASS=senha_super_secreta_app
DB_NAME=minha_app_prod

# Segurança
JWT_SECRET=gere_um_hash_longo_aqui
GOOGLE_CLIENT_ID=seu_id_do_google_cloud
GOOGLE_CLIENT_SECRET=seu_segredo_do_google_cloud
```

---

### 5. Subir tudo

```bash
docker compose up -d --build
```

---

## ✅ O que vai acontecer após o deploy

* **n8n** disponível na porta `5678`
* **IronDB Studio (Frontend)** disponível na porta `80`
* Acesso via:

  * `http://seu-ip`
  * `http://seu-dominio.com`

### Segurança e isolamento

* 🔒 **IronDB API** roda apenas na rede interna do Docker
* 🔁 **Nginx** faz o proxy reverso para `/api`
* ⚙️ **IronDB Worker** processa filas em background via Redis
* 🗄️ **Postgres dedicado** mantém os dados dos usuários isolados do n8n

---

## 🧠 Filosofia do Setup

* Sem painéis mágicos
* Sem dependências externas
* Sem gambiarra
* Infra previsível, versionável e auditável

Tudo controlado por **arquivos**, do jeito que produção séria deve ser.

---

✅ Pronto para escalar, auditar e manter com tranquilidade.
