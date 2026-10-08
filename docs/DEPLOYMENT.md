# Deployment

Este guia cobre como deployar o MCP CEP Service em ambientes de produção.

## Pré-requisitos

- Node.js 22.19+ instalado no servidor
- npm 10+
- Acesso outbound a `viacep.com.br` (HTTPS)
- (Opcional) Docker para containerização

## Build para Produção

### 1. Gerar o Bundle

```bash
npm run build
```

Isso cria:
- Bundle otimizado em `.smithery/shttp/`
- Arquivos minificados
- Sem arquivos de desenvolvimento

### 2. Verificar o Build

```bash
# Listar arquivos do build
ls -la .smithery/shttp/

# Esperado:
# - index.js (bundle principal)
# - Outros arquivos de suporte
```

## Deployments Locais

### Iniciar em Produção

```bash
# Não use npm run dev em produção!
# O modo dev usa hot-reload e consome mais recursos

# Compilar
npm run build

# Executar (ajuste a porta conforme necessário)
npm start
```

Se não houver script `npm start`, crie um em `package.json`:

```json
{
  "scripts": {
    "start": "node .smithery/shttp/index.js"
  }
}
```

### Rodando com Process Manager (PM2)

PM2 gerencia o processo e o reinicia em caso de falha.

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o servidor
pm2 start "npm start" --name "cep-service"

# Ver status
pm2 status

# Ver logs
pm2 logs cep-service

# Parar
pm2 stop cep-service

# Reiniciar automático ao rebootar
pm2 startup
pm2 save
```

## Docker

### Dockerfile

Crie um arquivo `Dockerfile` na raiz do projeto:

```dockerfile
FROM node:22.19-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código
COPY . .

# Build
RUN npm run build

# Expor porta
EXPOSE 8081

# Comando de start
CMD ["npm", "start"]
```

### Build da Imagem

```bash
docker build -t cep-service:latest .
```

### Executar Container

```bash
# Porta padrão
docker run -p 8081:8081 cep-service:latest

# Com nome
docker run --name cep-server -p 8081:8081 cep-service:latest

# Com variável de ambiente (se necessário)
docker run -p 8081:8081 -e PORT=3000 cep-service:latest

# Em background
docker run -d --name cep-server -p 8081:8081 cep-service:latest
```

### Ver Logs

```bash
docker logs cep-server

# Follow logs (tail)
docker logs -f cep-server
```

### Parar Container

```bash
docker stop cep-server
docker rm cep-server
```

## Kubernetes

### Manifest Básico

Crie um arquivo `k8s-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cep-service
  labels:
    app: cep-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cep-service
  template:
    metadata:
      labels:
        app: cep-service
    spec:
      containers:
      - name: cep-service
        image: cep-service:latest
        ports:
        - containerPort: 8081
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /mcp
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: cep-service
spec:
  selector:
    app: cep-service
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8081
  type: LoadBalancer
```

### Deploy no Kubernetes

```bash
# Criar namespace (opcional)
kubectl create namespace mcp

# Deploy
kubectl apply -f k8s-deployment.yaml -n mcp

# Ver status
kubectl get pods -n mcp

# Ver logs
kubectl logs -l app=cep-service -n mcp

# Exposição (se não usar LoadBalancer)
kubectl port-forward svc/cep-service 8081:80 -n mcp
```

## Reverse Proxy (nginx)

Use um reverse proxy para:
- Terminar HTTPS
- Load balancing
- Rate limiting
- Cache

### Configuração nginx

```nginx
upstream cep_backend {
  server localhost:8081;
  # Adicione mais se tiver múltiplas instâncias:
  # server localhost:8082;
  # server localhost:8083;
}

server {
  listen 80;
  server_name api.exemplo.com;

  # Redirecionar HTTP → HTTPS
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.exemplo.com;

  # Certificados SSL (use Let's Encrypt)
  ssl_certificate /etc/letsencrypt/live/api.exemplo.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.exemplo.com/privkey.pem;

  # Headers de segurança
  add_header Strict-Transport-Security "max-age=31536000" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;

  # Rate limiting (opcional)
  limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
  limit_req zone=api_limit burst=20 nodelay;

  location /mcp {
    proxy_pass http://cep_backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 10s;
    proxy_send_timeout 10s;
    proxy_read_timeout 10s;
  }
}
```

## Monitoramento

### Health Check com curl

```bash
# Simples
curl http://localhost:8081/mcp

# Com timeout
curl --max-time 5 http://localhost:8081/mcp
```

### Monitoramento com Prometheus (opcional)

Adicione um endpoint de métricas em `src/index.ts` (não incluído no template base).

### Logs com ELK Stack (opcional)

Envie logs para Elasticsearch, Logstash e Kibana para análise centralizada.

## Variáveis de Ambiente

O servidor não usa variáveis de ambiente por padrão, mas pode ser estendido:

```typescript
// Em src/index.ts
const port = process.env.PORT || 8081;
const viacepUrl = process.env.VIACEP_URL || 'https://viacep.com.br/ws';
```

## Performance

### Otimizações Sugeridas

1. **Habilitar gzip no nginx/reverse proxy:**
   ```nginx
   gzip on;
   gzip_types application/json text/plain;
   ```

2. **Aumentar file descriptors (Linux):**
   ```bash
   ulimit -n 65536
   ```

3. **Usar CDN para distribuição (opcional):**
   - Cloudflare, AWS CloudFront, etc.

4. **Rate limiting no reverse proxy:**
   - Limite requisições por IP
   - Proteja contra abuso

## Escalabilidade

### Múltiplas Instâncias

```bash
# Terminal 1
npm start -- --port 8081

# Terminal 2
npm start -- --port 8082

# Terminal 3
npm start -- --port 8083

# Depois, use load balancer (nginx, HAProxy)
```

### Com PM2 Cluster Mode

```bash
pm2 start "npm start" -i max --name "cep-service"
```

Isso usa todos os CPUs disponíveis.

## Backup e Recuperação

O servidor é stateless, portanto:
- **Backup:** Mantenha controle de versão do código (git)
- **Recuperação:** Redeploy a versão anterior em caso de problema

```bash
# Reverter para versão anterior
git checkout <commit-hash>
npm run build
npm start
```

## Segurança

1. **HTTPS:** Sempre use HTTPS em produção
2. **Firewall:** Restrinja acesso se necessário
3. **Rate limiting:** Proteja contra abuso (no reverse proxy)
4. **Validação:** O servidor já valida entrada (Zod)
5. **ViaCEP:** Verifique se há restrições de IP na API externa

## Troubleshooting Deploy

**Porta em uso:**
```bash
lsof -i :8081  # Listar processo na porta
kill -9 <PID>  # Matar processo
```

**Out of memory:**
```bash
# Aumentar heap (Node.js)
NODE_OPTIONS="--max_old_space_size=512" npm start
```

**Timeouts:**
- Aumente os timeouts no reverse proxy
- Verifique conexão com ViaCEP

## Próximos Passos

- Configuração de desenvolvimento? Veja [SETUP.md](./SETUP.md)
- Referência da API? Consulte [API.md](./API.md)
- Problemas? Leia [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
