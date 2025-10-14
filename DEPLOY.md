# 🚀 Deploy na Vercel - Guia Completo

## 📋 Pré-requisitos

1. Conta gratuita na [Vercel](https://vercel.com)
2. Repositório Git (GitHub, GitLab ou Bitbucket)
3. MySQL rodando na Hostinger com as credenciais

---

## 🔧 Configuração Local

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Criar arquivo `.env` na raiz
```bash
cp .env.example .env
```

### 3. Editar `.env` com suas credenciais do MySQL
```env
DB_HOST=45.152.44.1
DB_PORT=3306
DB_USER=seu_usuario_mysql
DB_PASSWORD=sua_senha_mysql
DB_NAME=finances

VITE_API_URL=/api
```

---

## 🌐 Deploy na Vercel

### Opção 1: Deploy via GitHub (Recomendado)

1. **Criar repositório no GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/seu-usuario/seu-repo.git
   git push -u origin main
   ```

2. **Conectar na Vercel**
   - Acesse [vercel.com/new](https://vercel.com/new)
   - Clique em "Import Project"
   - Selecione seu repositório GitHub
   - Clique em "Import"

3. **Configurar Variáveis de Ambiente**
   - Na tela de configuração, vá em "Environment Variables"
   - Adicione uma por uma:
     ```
     DB_HOST = 45.152.44.1
     DB_PORT = 3306
     DB_USER = seu_usuario_mysql
     DB_PASSWORD = sua_senha_mysql
     DB_NAME = finances
     VITE_API_URL = /api
     ```

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde ~2 minutos
   - Seu app estará em: `https://seu-projeto.vercel.app`

### Opção 2: Deploy via CLI

1. **Instalar Vercel CLI**
   ```bash
   pnpm add -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **Configurar variáveis de ambiente**
   ```bash
   vercel env add DB_HOST
   vercel env add DB_PORT
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   vercel env add VITE_API_URL
   ```

5. **Deploy em produção**
   ```bash
   vercel --prod
   ```

---

## 🔄 Deploy Automático

Após o primeiro deploy via GitHub:
- Cada `git push` para `main` → deploy automático
- Pull Requests → preview deploy (URL temporária para testes)

---

## ✅ Checklist Pós-Deploy

- [ ] Acessar a URL do projeto
- [ ] Testar login/registro
- [ ] Criar um cartão
- [ ] Adicionar um item
- [ ] Verificar se os dados estão salvando no MySQL da Hostinger

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to database"
- Verifique se o IP da Vercel está liberado no Hostinger
- Vá em: Painel Hostinger → MySQL → Gerenciar → Conexões Remotas
- Adicione: `0.0.0.0` (permite qualquer IP - necessário para Vercel)

### Erro: "Environment variable not found"
- Verifique se todas as variáveis foram adicionadas no painel da Vercel
- Settings → Environment Variables

### API retornando 404
- Verifique se o `vercel.json` está na raiz do projeto
- Confirme que `VITE_API_URL=/api` está configurado

---

## 📁 Estrutura do Projeto

```
/
├── api/                    # Serverless functions (backend)
│   ├── auth.ts
│   ├── cards.ts
│   ├── invoices.ts
│   ├── items.ts
│   ├── categories.ts
│   └── authors.ts
├── src/                    # Frontend React
├── server/                 # Backend local (dev apenas)
├── vercel.json            # Configuração Vercel
├── .env.example           # Template de variáveis
└── package.json
```

---

## 🎯 Diferenças Local vs Produção

| Ambiente | Backend | Frontend | API URL |
|----------|---------|----------|---------|
| **Local** | Express (port 3001) | Vite (port 5173) | `http://localhost:3001/api` |
| **Vercel** | Serverless Functions | Build estático | `/api` (rewrite) |

---

## 💡 Dicas

1. **Sempre use a pasta `api/` para funções serverless** (Vercel detecta automaticamente)
2. **Variáveis de ambiente devem começar com `VITE_`** para serem acessíveis no frontend
3. **O MySQL da Hostinger continua funcionando** - só o backend mudou de Express → Serverless
4. **Deploy é instantâneo** após o primeiro - Vercel faz cache inteligente
5. **Logs em tempo real**: `vercel logs` ou no painel web

---

## 🚀 Próximos Passos

Após o deploy bem-sucedido:
1. Configure um domínio customizado (opcional)
2. Ative HTTPS automático (já vem ativado)
3. Configure alertas de erro no painel da Vercel
4. Adicione analytics (Vercel Analytics é grátis)

---

## 📞 Suporte

- Documentação Vercel: https://vercel.com/docs
- Documentação Serverless: https://vercel.com/docs/serverless-functions

---

**Pronto! Seu app está no ar 24/7, grátis e com HTTPS! 🎉**
