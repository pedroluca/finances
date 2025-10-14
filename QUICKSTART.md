# ⚡ Quick Start - Deploy Vercel

## 📦 O que foi ajustado?

✅ **Criado `/api/` folder** com serverless functions  
✅ **Adicionado `vercel.json`** com configuração de rewrites  
✅ **Instalado `@vercel/node`** para tipos TypeScript  
✅ **Atualizado `.env.example`** com variáveis necessárias  
✅ **Backend funciona local E na Vercel** sem mudanças  

---

## 🚀 Deploy em 5 minutos

### 1. Criar conta Vercel
[vercel.com/signup](https://vercel.com/signup) - Use GitHub login

### 2. Push para GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

### 3. Import no Vercel
1. [vercel.com/new](https://vercel.com/new)
2. Import seu repositório
3. Adicione variáveis de ambiente:
   ```
   DB_HOST = 45.152.44.1
   DB_PORT = 3306
   DB_USER = seu_usuario
   DB_PASSWORD = sua_senha
   DB_NAME = finances
   VITE_API_URL = /api
   ```
4. Deploy!

### 4. Liberar IP no Hostinger
- MySQL → Gerenciar → Conexões Remotas
- Adicionar: `0.0.0.0`

---

## 🔧 Continuar desenvolvendo local

Nada muda! Continue usando:
```bash
pnpm dev:all
```

O projeto funciona **local (Express)** E **produção (Serverless)** simultaneamente!

---

## 📚 Documentação Completa

- 📖 **[DEPLOY.md](./DEPLOY.md)** - Guia completo de deploy
- 🔄 **[LOCAL_VS_PROD.md](./LOCAL_VS_PROD.md)** - Diferenças local vs produção

---

## ✅ Checklist

- [ ] Conta Vercel criada
- [ ] Repositório no GitHub
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] IP liberado no Hostinger MySQL (0.0.0.0)
- [ ] Deploy realizado com sucesso
- [ ] Teste: login, criar cartão, adicionar item

---

## 🆘 Problemas?

**API retorna 404:**  
→ Verifique `VITE_API_URL=/api` na Vercel

**Database timeout:**  
→ Libere `0.0.0.0` no Hostinger

**Build falha:**  
→ Execute `pnpm build` local para ver o erro

---

**Dúvidas? Leia `DEPLOY.md` e `LOCAL_VS_PROD.md`** 🎯
