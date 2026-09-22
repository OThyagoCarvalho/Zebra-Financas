# 🦓 Curso Completo: Implantação da Evolution API v2 no Google Cloud (GCP)
> **Guia definitivo passo a passo: Do zero ao pareamento via WhatsApp e Webhooks, incluindo troubleshooting de todos os erros comuns de infraestrutura, Baileys e Docker.**

---

## 📑 Sumário
1. [Visão Geral e Arquitetura](#1-visão-geral-e-arquitetura)
2. [Fase 1: Provisionamento da Máquina Virtual no Google Cloud (Always Free)](#2-fase-1-provisionamento-da-máquina-virtual-no-google-cloud-always-free)
3. [Fase 2: Preparação do Sistema Operacional e Memória SWAP](#3-fase-2-preparação-do-sistema-operacional-e-memória-swap)
4. [Fase 3: Instalação do Docker e Docker Compose](#4-fase-3-instalação-do-docker-e-docker-compose)
5. [Fase 4: Configuração e Subida da Evolution API v2](#5-fase-4-configuração-e-subida-da-evolution-api-v2)
6. [Fase 5: Criação da Instância e Conexão ao WhatsApp](#6-fase-5-criação-da-instância-e-conexão-ao-whatsapp)
   - [Método A: Pareamento por Código (Pairing Code - 8 dígitos)](#método-a-pareamento-por-código-pairing-code---8-dígitos)
   - [Método B: Pareamento por QR Code (Manager Web)](#método-b-pareamento-por-qr-code-manager-web)
7. [Fase 6: Integração Bidirecional via Webhooks](#7-fase-6-integração-bidirecional-via-webhooks)
8. [Fase 7: Guia de Resolução de Problemas (Troubleshooting & War Stories)](#8-fase-7-guia-de-resolução-de-problemas-troubleshooting--war-stories)
9. [Comandos de Manutenção e Diagnóstico Rápido](#9-comandos-de-manutenção-e-diagnóstico-rápido)

---

## 1. Visão Geral e Arquitetura

A **Evolution API v2** é uma plataforma de código aberto para automação de mensagens de WhatsApp baseada na biblioteca **Baileys** (que emula o protocolo do WhatsApp Web via WebSocket).

### A Infraestrutura Gratuita no GCP:
* **Provedor:** Google Cloud Platform (Compute Engine).
* **Tipo de Máquina:** `e2-micro` (2 vCPUs compartilhadas, 1 GB de memória RAM).
* **Custo:** R$ 0,00 (coberto pelo programa *Always Free* nas regiões qualificadas dos EUA).
* **O Desafio do 1 GB de RAM:** O Node.js + Baileys + PostgreSQL consomem juntos entre 600 MB e 900 MB de RAM. Sem memória auxiliar virtual (**SWAP**), o Linux ativa o *Out of Memory Killer* (OOM Killer) e derruba os contêineres silenciosamente (Exit Code 137). A criação de 2 GB de SWAP é **obrigatória**.

---

## 2. Fase 1: Provisionamento da Máquina Virtual no Google Cloud (Always Free)

### Passo 1: Criar a Instância de VM
1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/).
2. No menu lateral, navegue até **Compute Engine** > **Instâncias de VM** > **Criar Instância**.
3. Preencha os campos exatamente desta forma:
   - **Nome da Instância:** `evolution-api`
   - **Região:** Escolha uma das regiões do nível gratuito: `us-central1` (Iowa), `us-east1` (Carolina do Sul) ou `us-west1` (Oregon).
   - **Série:** `E2`
   - **Tipo de Máquina:** `e2-micro` (2 vCPUs, 1 GB de memória).
   - **Disco de Inicialização:** Clique em *Alterar*:
     - **Sistema Operacional:** `Ubuntu`
     - **Versão:** `Ubuntu 24.04 LTS` ou `Ubuntu 22.04 LTS`
     - **Tipo de Disco:** `Disco persistente padrão` (*Standard persistent disk*)
     - **Tamanho:** `30 GB` (o limite gratuito do GCP é 30 GB somados).
   - **Firewall:** Marque as caixas **Permitir tráfego HTTP** e **Permitir tráfego HTTPS**.

### Passo 2: Liberar a Porta 8080 no Firewall do GCP
Por padrão, o GCP bloqueia todas as portas de entrada, exceto 22 (SSH), 80 (HTTP) e 443 (HTTPS). A Evolution API roda na porta `8080`.

1. No menu lateral do GCP, pesquise por **Rede VPC** > **Firewall**.
2. Clique em **Criar Regra de Firewall**:
   - **Nome:** `allow-evolution-8080`
   - **Rede:** `default`
   - **Direção do tráfego:** `Entrada` (*Ingress*)
   - **Ação em caso de correspondência:** `Permitir` (*Allow*)
   - **Destinos:** `Todas as instâncias da rede`
   - **Intervalos de IPv4 de origem:** `0.0.0.0/0` (permite conexões públicas)
   - **Protocolos e portas:** Marque **TCP** e digite `8080`.
3. Clique em **Criar**.

---

## 3. Fase 2: Preparação do Sistema Operacional e Memória SWAP

Conecte-se à VM clicando no botão **SSH** ao lado da sua máquina no painel do GCP.

### Passo 1: Criar e Ativar 2 GB de Memória SWAP
Execute o bloco de comandos abaixo:

```bash
# Aloca um arquivo de 2 Gigabytes no disco
sudo fallocate -l 2G /swapfile

# Define permissões restritas (somente o root pode ler/gravar por segurança)
sudo chmod 600 /swapfile

# Formata o arquivo como área de troca (swap)
sudo mkswap /swapfile

# Ativa o arquivo de swap no sistema operacional
sudo swapon /swapfile

# Torna o swap permanente adicionando ao /etc/fstab (não desativa ao reiniciar a VM)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> **Explicação:** O comando `swapon` instrui o kernel do Linux a usar esses 2 GB de disco como memória RAM estendida quando a memória física de 1 GB estiver cheia, impedindo que o Node.js trave.

Para confirmar que o swap está ativo, rode:
```bash
free -h
```
*(Você verá a linha `Swap: 2.0Gi` ativa).*

---

## 4. Fase 3: Instalação do Docker e Docker Compose

Atualize o sistema e instale a versão oficial estável do Docker:

```bash
# Atualiza os repositórios de pacotes
sudo apt update && sudo apt upgrade -y

# Instala o Docker usando o script oficial automatizado
curl -fsSL https://get.docker.com | sudo sh

# Adiciona o seu usuário ao grupo do Docker para não precisar digitar 'sudo' o tempo todo
sudo usermod -aG docker $USER

# Aplica a permissão imediatamente na sessão atual
newgrp docker
```

Verifique a instalação:
```bash
docker --version
docker compose version
```

---

## 5. Fase 4: Configuração e Subida da Evolution API v2

### Cuidado com Imagens Obsoletas!
* ❌ **`atendai/evolution-api`**: Descontinuada e antiga. Não use.
* ❌ **`evoapicloud/evolution-api:v2.2.3`**: Possui um bug no Baileys que quebra o handshake WebSocket nos servidores modernos do WhatsApp, retornando `{"count": 0}` ao tentar gerar o QR Code ou Pairing Code.
* ✅ **`evoapicloud/evolution-api:v2.3.7`**: Versão estável com Baileys atualizado e suporte a reconexão automática.

### Criando a pasta e o `docker-compose.yml`

```bash
mkdir -p ~/evolution && cd ~/evolution
```

Crie o arquivo `docker-compose.yml` substituindo `SEU_IP_EXTERNO_AQUI` pelo IP público da sua VM no GCP (ex: `35.254.34.237`):

```bash
cat << 'EOF' > docker-compose.yml
services:
  evolution-api:
    image: evoapicloud/evolution-api:v2.3.7
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      # IMPORTANTE: Use o IP externo da VM ou seu domínio público com a porta.
      # NUNCA use 'localhost', senão o painel web tenta conectar no computador do usuário!
      - SERVER_URL=http://SEU_IP_EXTERNO_AQUI:8080
      - AUTHENTICATION_API_KEY=zebra_evolution_secret_2026
      
      # Banco de dados PostgreSQL (Obrigatório na v2)
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres:evolution_pass_2026@postgres:5432/evolution?schema=public
      
      # Otimizações de Memória para Máquinas de 1 GB de RAM
      # Desativa o sincronismo de todo o histórico antigo de mensagens para não estourar a RAM
      - DATABASE_SAVE_DATA_HISTORIC=false
      - DATABASE_SAVE_DATA_CHATS=false
      - DATABASE_SAVE_DATA_CONTACTS=false
      - DATABASE_SAVE_DATA_MESSAGES=true
      
      # Cache Local em Memória
      - CACHE_REDIS_ENABLED=false
      - CACHE_LOCAL_ENABLED=true
      
      # WebSockets e CORS para acesso pelo navegador
      - WEBSOCKET_ENABLED=true
      - CORS_ORIGIN=*
      - CORS_METHODS=POST,GET,PUT,DELETE
      - CORS_CREDENTIALS=true
    depends_on:
      - postgres
    volumes:
      - evolution_instances:/evolution/instances

  postgres:
    image: postgres:15-alpine
    container_name: evolution_postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: evolution_pass_2026
      POSTGRES_DB: evolution
    volumes:
      - evolution_db:/var/lib/postgresql/data

volumes:
  evolution_db:
  evolution_instances:
EOF
```

Suba os contêineres em segundo plano:
```bash
docker compose up -d
```

Aguarde cerca de **15 segundos** para que o banco PostgreSQL seja inicializado e as tabelas sejam criadas automaticamente.

Teste se a API está no ar:
```bash
curl -s http://localhost:8080/ | grep -o '"status":200'
```
Se retornar `"status":200`, a API está online e pronta!

---

## 6. Fase 5: Criação da Instância e Conexão ao WhatsApp

Na Evolution API v2, toda conexão com o WhatsApp opera sob uma **Instância** (que recebe um nome, ex: `zebra`).

### Passo 1: Criar a Instância

Execute no terminal da VM:

```bash
curl -X POST \
  -H "apikey: zebra_evolution_secret_2026" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"zebra","integration":"WHATSAPP-BAILEYS","qrcode":true}' \
  http://localhost:8080/instance/create
```

> **Nota:** Se retornar `This name "zebra" is already in use`, significa que a instância já foi criada. Prossiga diretamente para o pareamento.

---

### Método A: Pareamento por Código (Pairing Code - 8 dígitos)
*Ideal para conectar sem precisar de câmera ou quando estiver usando o próprio celular onde está o WhatsApp.*

1. Solicite o código de 8 dígitos informando seu número completo com DDI (55) e DDD:
   ```bash
   curl -H "apikey: zebra_evolution_secret_2026" \
     "http://localhost:8080/instance/connect/zebra?number=5511932199076"
   ```

2. A API retornará uma resposta JSON com o campo `pairingCode`:
   ```json
   {
     "pairingCode": "B4K9-2L1X",
     "code": "...",
     "count": 1
   }
   ```

3. No seu WhatsApp no smartphone:
   - Abra o **WhatsApp** > Toque nos **3 pontinhos** (ou *Configurações* no iOS).
   - Toque em **Aparelhos Conectados** > **Conectar um aparelho**.
   - Na parte inferior da tela, toque em **"Conectar com número de telefone"** (*Link with phone number*).
   - Digite o código de 8 dígitos (`B4K9-2L1X`).
   - O pareamento será concluído em 3 a 5 segundos!

---

### Método B: Pareamento por QR Code (Manager Web)

1. Abra o navegador no seu computador e acesse:
   ```text
   http://SEU_IP_EXTERNO:8080/manager
   ```
   *(Atenção: Use `http://` e NÃO `https://`).*
2. Digite a sua API Key Global: `zebra_evolution_secret_2026`.
3. Você verá a instância `zebra`.
4. Clique no botão amarelo **Get QR Code**.
5. No celular, abra **Aparelhos Conectados** > **Conectar um aparelho** e escaneie o código.

---

### Como conferir se conectou com sucesso:
Execute no terminal:
```bash
curl -s -H "apikey: zebra_evolution_secret_2026" \
  http://localhost:8080/instance/connectionState/zebra
```
A resposta **deve ser**:
```json
{
  "instance": {
    "instanceName": "zebra",
    "state": "open"
  }
}
```
*(Se o `state` for `"open"`, seu WhatsApp está online e conectado!)*

---

## 7. Fase 6: Integração Bidirecional via Webhooks

Para que sua aplicação (Next.js / Node / Python / Vercel) receba mensagens enviadas no WhatsApp e envie respostas automáticas:

### 1. Configurar o Webhook de Entrada (WhatsApp -> Seu App)

Dispare este comando na VM apontando para a rota da sua aplicação:

```bash
curl -X POST \
  -H "apikey: zebra_evolution_secret_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "webhook": {
      "enabled": true,
      "url": "https://zebrafinancas.vercel.app/api/webhook/whatsapp",
      "headers": {
        "Content-Type": "application/json"
      },
      "byEvents": false,
      "base64": false,
      "events": [
        "MESSAGES_UPSERT"
      ]
    }
  }' \
  http://localhost:8080/webhook/set/zebra
```

> **O Evento `MESSAGES_UPSERT`:** É o evento disparado pela Evolution sempre que uma nova mensagem de texto é recebida em qualquer conversa.

---

### 2. Formato do Payload que seu Webhook receberá
No seu backend (Next.js App Router, por exemplo), o payload chega em `req.json()` com a seguinte estrutura:

```typescript
{
  "event": "messages.upsert",
  "instance": "zebra",
  "data": {
    "key": {
      "remoteJid": "5511932199076@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB0..."
    },
    "pushName": "Thyago",
    "message": {
      "conversation": "Almoço 45 no débito"
    }
  }
}
```

---

### 3. Enviar Mensagem de Saída (Seu App -> WhatsApp)
Quando seu backend terminar de processar o lançamento financeiro, ele envia a resposta chamando o endpoint `/message/sendText`:

```bash
curl -X POST \
  -H "apikey: zebra_evolution_secret_2026" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "5511932199076",
    "text": "✅ *Despesa Registrada com Sucesso!*\n\n💰 Valor: R$ 45,00\n🏷️ Categoria: Alimentação\n💳 Forma: Débito"
  }' \
  http://35.254.34.237:8080/message/sendText/zebra
```

---

## 8. Fase 7: Guia de Resolução de Problemas (Troubleshooting & War Stories)

Abaixo estão todos os problemas reais enfrentados e suas soluções definitivas:

---

### 🔴 Problema 1: O Navegador dá `ERR_CONNECTION_REFUSED` ao abrir `https://35.254.34.237:8080`
* **Causa:** O contêiner da Evolution roda internamente em HTTP puro (sem certificado SSL). Quando você digita `https://`, o navegador tenta negociar TLS na porta 8080 e a conexão é imediatamente rejeitada.
* **Solução:** Acesse estritamente com **`http://`** (`http://35.254.34.237:8080/manager`).

---

### 🔴 Problema 2: No Manager web dá `ERR_CONNECTION_REFUSED` ao clicar nos botões e erro 403
* **Causa:** No arquivo `docker-compose.yml`, a variável de ambiente estava como `SERVER_URL=http://localhost:8080`. O painel Manager é renderizado no navegador do usuário. Ao clicar em qualquer ação, o JavaScript do painel lia `SERVER_URL` e tentava fazer requisições para `http://localhost:8080` (que é o computador pessoal do usuário, e não a VM do Google Cloud).
* **Solução:** No `docker-compose.yml`, aponte `SERVER_URL` obrigatoriamente para o IP público da VM:
  ```yaml
  - SERVER_URL=http://35.254.34.237:8080
  ```

---

### 🔴 Problema 3: O QR Code não carrega e a API retorna `{"count": 0}`
* **Causa:** 
  1. A imagem `evoapicloud/evolution-api:v2.2.3` utilizava uma versão do Baileys com timeout e incompatibilidade com as mudanças recentes do protocolo do WhatsApp Web.
  2. A instância ficava presa no status interno `state: connecting`.
* **Solução:**
  1. No `docker-compose.yml`, atualize a imagem para `evoapicloud/evolution-api:v2.3.7`.
  2. Limpe os volumes com `sudo docker compose down -v`. O parâmetro `-v` é essencial para apagar a sessão PostgreSQL e os arquivos de cache travados.
  3. Suba com `sudo docker compose up -d` e recrie a instância.

---

### 🔴 Problema 4: `This name "zebra" is already in use`
* **Causa:** Tentativa de chamar `/instance/create` com o nome de uma instância que já existe no banco de dados.
* **Solução:** Não chame `/create` novamente. Chame diretamente o endpoint de conexão (`/instance/connect/zebra?number=...`) ou delete a instância anterior com:
  ```bash
  curl -X DELETE -H "apikey: zebra_evolution_secret_2026" http://localhost:8080/instance/delete/zebra
  ```

---

### 🔴 Problema 5: Loop Infinito do Bot (Bot respondendo a si mesmo)
* **Causa:** Quando o bot envia uma mensagem para o próprio número da instância, a Evolution API gera um novo evento `MESSAGES_UPSERT`. Se o backend não verificar a mensagem, ele processa o próprio recibo como um novo lançamento financeiro, gerando um loop infinito.
* **Solução:** Adicione uma trava no webhook:
  ```typescript
  // Ignora mensagens enviadas pelo próprio bot
  if (
    messageText.startsWith("🦓") ||
    messageText.startsWith("✅") ||
    messageText.startsWith("🚫")
  ) {
    return NextResponse.json({ ok: true, note: "Mensagem do bot ignorada" });
  }
  ```

---

### 🔴 Problema 6: Queda Repentina do Docker / PostgreSQL (OOM Crash)
* **Causa:** A VM `e2-micro` possui apenas 1 GB de RAM. Durante picos de I/O ou upload de mídias, o Linux mata o contêiner com `Exit Code 137`.
* **Solução:** Configure 2 GB de SWAP (Fase 2) e configure as variáveis de ambiente para desativar histórico pesado:
  ```yaml
  - DATABASE_SAVE_DATA_HISTORIC=false
  - DATABASE_SAVE_DATA_CHATS=false
  - DATABASE_SAVE_DATA_CONTACTS=false
  - CACHE_LOCAL_ENABLED=true
  ```

---

## 9. Comandos de Manutenção e Diagnóstico Rápido

Guarde estes comandos no seu dia a dia para suporte rápido:

```bash
# Ver os logs em tempo real da Evolution API
sudo docker logs evolution_api -f --tail 100

# Ver o consumo de CPU e Memória RAM dos contêineres
docker stats

# Verificar se o PostgreSQL está saudável
sudo docker exec -it evolution_postgres pg_isready -U postgres

# Reiniciar a Evolution API sem perder os dados de pareamento
sudo docker compose restart evolution-api

# Desconectar / Deslogar o WhatsApp da instância
curl -X POST -H "apikey: zebra_evolution_secret_2026" http://localhost:8080/instance/logout/zebra

# Reiniciar uma instância do WhatsApp internamente
curl -X POST -H "apikey: zebra_evolution_secret_2026" http://localhost:8080/instance/restart/zebra
```

---

## 🎯 Conclusão

Com esta arquitetura:
1. Sua VM opera 100% dentro do **Nível Gratuito Permanente do Google Cloud (Always Free)**.
2. Os contêineres possuem estabilidade com a proteção de 2 GB de memória SWAP.
3. A Evolution API v2.3.7 opera de forma resiliente, conectando em segundos via Pairing Code ou QR Code.
4. Os Webhooks garantem automação financeira instantânea diretamente no WhatsApp!
