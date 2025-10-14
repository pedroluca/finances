# 🎉 Sistema Pronto! - Gerenciador de Faturas de Cartão

## ✅ O que foi criado

### 1. **Sistema de Autenticação Completo**
- ✅ Login com email e senha
- ✅ Registro de novos usuários
- ✅ Senha criptografada com bcrypt
- ✅ Token de autenticação
- ✅ Proteção de rotas

### 2. **Services (Lógica de Negócio)**
- ✅ `AuthService` - Autenticação, registro, verificação
- ✅ `CardService` - CRUD de cartões, compartilhamento
- ✅ `InvoiceService` - CRUD de faturas, totais mensais
- ✅ `ItemService` - CRUD de itens, parcelamento automático
- ✅ `CategoryService` - CRUD de categorias
- ✅ `AuthorService` - CRUD de autores

### 3. **Store Global (Zustand)**
- ✅ `auth.store.ts` - Estado de autenticação (persistido)
- ✅ `app.store.ts` - Estado da aplicação (cartões, faturas, etc.)

### 4. **Páginas**
- ✅ **Login** - Interface moderna com validação
- ✅ **Register** - Cadastro com verificação de senha
- ✅ **Dashboard** - Página principal com:
  - Cards do usuário
  - Estatísticas (total de cartões, limite, gastos)
  - Seletor de mês/ano
  - Histórico mensal
  - Botão para adicionar novo cartão

### 5. **Banco de Dados MySQL**
- ✅ 8 tabelas completas
- ✅ Triggers automáticos
- ✅ Views otimizadas
- ✅ Procedures para parcelamento

### 6. **Configuração**
- ✅ Tailwind CSS configurado
- ✅ React Router configurado
- ✅ TypeScript completo
- ✅ Variáveis de ambiente (.env)

---

## 🚀 Como Usar

### Passo 1: Configurar o Banco de Dados

1. Acesse o painel da **Hostinger**
2. Vá em "Bancos de Dados MySQL"
3. Crie um novo banco (ex: `finances`)
4. Abra o phpMyAdmin
5. Execute o arquivo `database.sql` completo

### Passo 2: Configurar as Variáveis de Ambiente

Edite o arquivo `.env` com suas credenciais:

```env
# MySQL Database Configuration
VITE_DB_HOST=seu-servidor.mysql.hostinger.com
VITE_DB_PORT=3306
VITE_DB_USER=u123456_seu_usuario
VITE_DB_PASSWORD=sua_senha_segura
VITE_DB_NAME=u123456_finances

# JWT Secret
JWT_SECRET=gere_uma_chave_aleatoria_segura_aqui
```

### Passo 3: Instalar Dependências

```bash
pnpm install
```

### Passo 4: Iniciar o Projeto

```bash
pnpm dev
```

Acesse: `http://localhost:5173`

---

## 📖 Fluxo de Uso do Sistema

### 1. Primeiro Acesso

1. **Abra** `http://localhost:5173`
2. **Clique** em "Criar conta"
3. **Preencha** seus dados:
   - Nome completo
   - Email
   - Senha (mínimo 6 caracteres)
4. **Clique** em "Criar conta"

✨ **O sistema automaticamente:**
- Cria sua conta
- Cria 10 categorias padrão (Alimentação, Transporte, etc.)
- Cria um autor padrão (você)
- Faz login automático

### 2. Adicionar um Cartão

1. No Dashboard, clique em **"Novo Cartão"**
2. Preencha:
   - **Nome**: Ex: "Nubank", "Neon", "C6"
   - **Limite**: Ex: 5000.00
   - **Dia de Fechamento**: Ex: 29 (Nubank fecha dia 29)
   - **Dia de Vencimento**: Ex: 5 (Nubank vence dia 5 do mês seguinte)
   - **Cor**: Escolha uma cor para identificação
3. Clique em **"Salvar"**

### 3. Adicionar Itens na Fatura

1. **Clique no cartão** que deseja gerenciar
2. **Selecione o mês** da fatura
3. **Clique em "Adicionar Item"**
4. Preencha:
   - **Descrição**: Ex: "Netflix", "Mercado", "Gasolina"
   - **Valor**: Ex: 39.90
   - **Autor**: Selecione quem fez a compra
   - **Categoria** (opcional): Ex: "Streaming", "Alimentação"
   - **Data da Compra** (opcional)
   
#### Compra Simples
- Deixe "Parcelado?" desmarcado
- Clique em "Salvar"

#### Compra Parcelada
- Marque "Parcelado?"
- **Informe quantas parcelas**: Ex: 12x
- **Valor TOTAL**: Ex: 1200.00 (o sistema divide automaticamente)
- Clique em "Salvar"

✨ **O sistema automaticamente:**
- Cria as faturas dos próximos meses (se não existirem)
- Divide o valor em parcelas iguais
- Agrupa as parcelas para você visualizar

### 4. Marcar Items como Pagos

#### Pagar Item Individual
- Clique no **checkbox** ao lado do item
- Clique em **"Marcar como Pago"**

#### Pagar Múltiplos Itens
- Selecione vários items (checkboxes)
- Clique em **"Marcar Selecionados como Pagos"**
- O total será calculado automaticamente

#### Ver Total Selecionado
- Selecione os itens
- O sistema mostra o **total dos items selecionados**

### 5. Adicionar Pessoas (Autores)

Quando você empresta o cartão para alguém:

1. Ao adicionar um item, clique em **"Novo Autor"**
2. Digite o nome (Ex: "Maria", "João", "Duda")
3. O autor é automaticamente criado e vinculado ao item

O sistema separa os gastos por pessoa automaticamente!

### 6. Adicionar Categorias

1. Vá em **"Configurações"** → **"Categorias"**
2. Clique em **"Nova Categoria"**
3. Preencha:
   - Nome
   - Escolha um ícone (emoji)
   - Escolha uma cor
4. Salvar

**Categorias Padrão Criadas:**
- 🍔 Alimentação
- 🚗 Transporte
- 💊 Saúde
- 📚 Educação
- 🎮 Lazer
- 🏠 Moradia
- 📺 Streaming
- 🛒 Compras
- 📄 Contas
- 📦 Outros

### 7. Compartilhar Cartão

Para dividir a gestão com sua esposa/marido:

1. **Abra o cartão**
2. Clique em **"Compartilhar"**
3. Digite o **email da pessoa**
4. Escolha a **permissão**:
   - **View**: Só visualizar
   - **Edit**: Pode adicionar/editar itens
   - **Admin**: Controle total
5. Clique em **"Compartilhar"**

A pessoa receberá acesso imediato!

---

## 📊 Funcionalidades Detalhadas

### Limite Disponível
O sistema calcula automaticamente:
- **Limite do cartão**
- **Menos**: Gastos do mês atual
- **Menos**: Parcelas futuras já cadastradas
- **=** Saldo disponível real

### Total Mensal
- Soma automática de todos os cartões
- Separado por mês
- Mostra quanto foi pago
- Mostra quanto ainda falta pagar

### Parcelamento Inteligente
Exemplo: Compra de R$ 1.200,00 em 12x

O sistema:
1. Cria automaticamente 12 faturas (uma por mês)
2. Divide: R$ 1.200,00 ÷ 12 = R$ 100,00/mês
3. Agrupa todas as parcelas com um ID único
4. Você pode deletar todas de uma vez se quiser

### Status das Faturas
- **Aberta**: Fatura do mês atual
- **Fechada**: Fatura fechada, aguardando pagamento
- **Paga**: Fatura totalmente paga
- **Vencida**: Fatura não paga após o vencimento

---

## 🎨 Interface

### Dashboard
- **Cards dos seus cartões** com:
  - Nome e cor personalizada
  - Limite
  - Dia de fechamento
  - Dia de vencimento
- **Estatísticas** em tempo real
- **Histórico mensal** dos últimos 6 meses
- **Seletor de período** (mês/ano)

### Fatura do Cartão
- **Tabela estilo planilha** (como Google Sheets)
- **Colunas por pessoa** (você, familiares, amigos)
- **Total por pessoa**
- **Total geral da fatura**
- **Checkboxes** para marcar como pago
- **Indicador de parcelas** (1/12, 2/12, etc.)

---

## 🔒 Segurança

### Implementado:
- ✅ Senhas criptografadas (bcrypt)
- ✅ Validação de permissões
- ✅ SQL com prepared statements
- ✅ Token de autenticação
- ✅ Variáveis de ambiente protegidas

### Recomendações:
- ⚠️ Mude o `JWT_SECRET` no `.env`
- ⚠️ Use senha forte no MySQL
- ⚠️ Nunca commiteo `.env` no Git
- ⚠️ Em produção, use HTTPS

---

## 🐛 Troubleshooting

### Erro: "Cannot connect to MySQL"
**Solução:**
1. Verifique as credenciais no `.env`
2. Teste a conexão no phpMyAdmin
3. Verifique se o IP está liberado na Hostinger

### Erro: "Table doesn't exist"
**Solução:**
1. Execute o `database.sql` no phpMyAdmin
2. Verifique se o banco está selecionado

### Erro: "User already exists"
**Solução:**
- Use outro email
- Ou faça login com o email existente

### Página em branco
**Solução:**
1. Abra o console do navegador (F12)
2. Veja os erros
3. Verifique se o `pnpm dev` está rodando

---

## 📝 Próximos Passos (Opcional)

Você pode adicionar no futuro:

- [ ] Página de detalhes do cartão completa
- [ ] Edição de itens
- [ ] Gráficos e relatórios
- [ ] Exportar para Excel/PDF
- [ ] Notificações de vencimento
- [ ] Upload de comprovantes
- [ ] Metas de gastos
- [ ] Comparativo mensal
- [ ] App mobile

---

## 🎯 Resumo do que você tem agora:

✅ **Sistema completo de gerenciamento de faturas**
✅ **Interface moderna e responsiva**
✅ **Banco de dados MySQL configurado**
✅ **Autenticação segura**
✅ **Parcelamento automático**
✅ **Múltiplos usuários**
✅ **Compartilhamento de cartões**
✅ **Categorização de gastos**
✅ **Controle por autor (empréstimos)**
✅ **Totais automáticos**
✅ **Limite disponível em tempo real**

---

## 🆘 Suporte

Se tiver dúvidas:
1. Verifique este README
2. Veja o arquivo `README_SETUP.md`
3. Confira o `STATUS.md`
4. Abra o console do navegador para ver erros

---

**Desenvolvido para facilitar sua vida financeira! 💰**
