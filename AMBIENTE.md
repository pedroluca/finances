# 🔧 Configuração de Ambientes

## Desenvolvimento Local

O sistema detecta automaticamente se está rodando em **localhost** ou em **produção (Vercel)**.

### Como funciona:

```typescript
// src/lib/api.ts
export const isProduction = API_URL.includes('vercel') || 
                           API_URL.includes('pedroluca.dev.br');
```

### Rotas automáticas:

**Localhost (Express):**
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/verify`

**Produção (Vercel Serverless):**
- `POST /api/auth?action=login`
- `POST /api/auth?action=register`
- `GET /api/auth?action=verify`

## Configuração do .env

### Para desenvolvimento local (PC):
```properties
VITE_API_URL=http://localhost:3001/api
```

### Para testes mobile na rede local:
```properties
VITE_API_URL=http://192.168.0.24:3001/api
```

### Para produção (Vercel):
A variável é configurada automaticamente nas Environment Variables da Vercel:
```properties
VITE_API_URL=https://finances.pedroluca.dev.br/api
```

## ⚠️ Importante

Após alterar o `.env`, **SEMPRE REINICIE** o servidor de desenvolvimento:

```bash
# Pare o servidor (Ctrl+C)
npm run dev
```

## 🚀 Deploy

Ao fazer deploy na Vercel:
1. As funções serverless em `/api/` serão usadas automaticamente
2. O sistema detecta que está em produção via URL
3. As rotas corretas são aplicadas (com `?action=`)

## 📱 Testes Mobile

Para testar no celular:
1. Trocar `VITE_API_URL` para o IP da rede local
2. Reiniciar o frontend
3. Garantir que o firewall permite conexões na porta 3001
4. Acessar pelo navegador do celular

---

✅ **Status:** Sistema funciona automaticamente em ambos os ambientes!
