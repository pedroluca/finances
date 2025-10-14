# 🔄 Desenvolvimento Local vs Produção

## 🖥️ Rodando Localmente (Desenvolvimento)

### Iniciar Backend (Express)
```bash
pnpm dev:server
```
- Roda em: `http://localhost:3001`
- Usa: `server/index.ts` com Express
- Hot reload: ✅ (reinicia ao salvar)

### Iniciar Frontend (React)
```bash
pnpm dev
```
- Roda em: `http://localhost:5173`
- Usa: Vite dev server
- Hot reload: ✅ (atualiza ao salvar)

### Iniciar Ambos (Recomendado)
```bash
pnpm dev:all
```
- Backend + Frontend juntos
- Usa: `concurrently`

### Variáveis de Ambiente Local
```env
# .env (não commitado)
DB_HOST=45.152.44.1
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=finances
VITE_API_URL=http://localhost:3001/api  # ← Aponta para Express local
```

---

## ☁️ Produção (Vercel)

### Como o Backend Funciona
- **Não existe servidor rodando 24/7**
- Cada arquivo em `/api/*.ts` vira uma **Serverless Function**
- Vercel executa só quando alguém faz uma requisição
- Após ~10s inativo, a função "dorme" (economiza recursos)

### Arquitetura Serverless
```
Cliente → /api/cards
           ↓
    Vercel detecta rota /api/*
           ↓
    Executa api/cards.ts
           ↓
    Conecta no MySQL (Hostinger)
           ↓
    Retorna JSON
           ↓
    Função "dorme" até próxima request
```

### Variáveis de Ambiente Produção
```env
# Configuradas no painel da Vercel
DB_HOST=45.152.44.1
DB_PORT=3306
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
DB_NAME=finances
VITE_API_URL=/api  # ← Usa rewrites do Vercel
```

### O que muda?
| Aspecto | Local | Produção |
|---------|-------|----------|
| Backend | Express rodando 24/7 | Serverless functions (on-demand) |
| Porta | 3001 | Não tem porta (HTTP automático) |
| API URL | `http://localhost:3001/api` | `/api` (rewrite) |
| CORS | Precisa configurar | Headers no `vercel.json` |
| Conexão DB | Pool permanente | Conexão por request |
| Hot Reload | ✅ Sim | ❌ Precisa rebuild |

---

## 🔍 Debugging

### Ver logs localmente
```bash
# Backend
pnpm dev:server
# Logs aparecem no terminal

# Frontend
pnpm dev
# Erros aparecem no browser console
```

### Ver logs na Vercel
```bash
# Instalar CLI
pnpm add -g vercel

# Ver logs em tempo real
vercel logs

# Ver logs de uma função específica
vercel logs --follow api/cards.ts
```

Ou pelo painel web:
- Acesse: https://vercel.com/seu-usuario/seu-projeto
- Vá em: **Deployments** → Clique no último deploy → **Runtime Logs**

---

## 🚨 Erros Comuns

### 1. API retorna 404 em produção
**Causa:** VITE_API_URL ainda aponta para localhost

**Solução:**
```bash
# No painel da Vercel, adicione:
VITE_API_URL = /api

# Depois faça redeploy
vercel --prod
```

### 2. Database connection timeout
**Causa:** IP da Vercel não está liberado no Hostinger

**Solução:**
- Hostinger → MySQL → Conexões Remotas
- Adicione: `0.0.0.0` (permite todos os IPs)
- Ou adicione IPs específicos da Vercel (mudam dinamicamente)

### 3. Serverless function timeout (10s)
**Causa:** Query SQL muito lenta

**Solução:**
- Adicione índices nas tabelas
- Otimize queries com JOINs
- Use cache se necessário

### 4. Environment variable not found
**Causa:** Variável não configurada na Vercel

**Solução:**
```bash
# Via CLI
vercel env add NOME_DA_VARIAVEL

# Via Web
Settings → Environment Variables → Add New
```

---

## 💡 Dicas Pro

### 1. Testar build de produção localmente
```bash
# Build do frontend
pnpm build

# Testar o build
pnpm preview
```

### 2. Simular serverless functions localmente
```bash
# Instalar Vercel CLI
pnpm add -g vercel

# Rodar ambiente Vercel local
vercel dev
```
Isso roda as funções serverless localmente, simulando produção!

### 3. Deploy de teste (preview)
```bash
# Deploy sem afetar produção
vercel

# Gera URL tipo: https://seu-projeto-abc123.vercel.app
# Perfeito para testar antes de ir pra produção
```

### 4. Deploy para produção
```bash
vercel --prod
# Atualiza: https://seu-projeto.vercel.app
```

---

## 🎯 Workflow Recomendado

1. **Desenvolver localmente**
   ```bash
   pnpm dev:all
   ```

2. **Testar build**
   ```bash
   pnpm build && pnpm preview
   ```

3. **Commit e push**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push
   ```

4. **Deploy automático** 🚀
   - Vercel detecta o push
   - Roda build
   - Deploy em ~2 minutos
   - URL: https://seu-projeto.vercel.app

---

## 📊 Monitoramento

### Vercel Analytics (Grátis)
- Pageviews
- Tempo de carregamento
- Core Web Vitals

### Como ativar:
1. Painel Vercel → seu projeto
2. Analytics → Enable
3. Reinstale o projeto: `vercel --prod`

---

**Agora você entende a diferença entre local e produção! 🎉**
