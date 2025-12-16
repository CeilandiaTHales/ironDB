# IronDB Stack – Docker Compose (Bare Metal)

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
