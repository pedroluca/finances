# Sistema de Gerenciamento de Faturas de Cartão 💳

Sistema completo para gerenciar faturas de cartões de crédito, similar ao Google Sheets mas com melhor integração e funcionalidades específicas para controle financeiro.

## 🚀 Funcionalidades

- ✅ **Gerenciamento de Cartões**: Adicione cartões com limite, dia de fechamento e vencimento
- 📅 **Faturas Mensais**: Criação automática de faturas por mês
- 💰 **Itens de Fatura**: Adicione compras com valor, categoria e autor
- 👥 **Múltiplos Autores**: Registre quem fez cada compra (você, familiares, amigos)
- 🔄 **Parcelamento Automático**: Cadastre compras parceladas automaticamente
- ✔️ **Marcar como Pago**: Marque itens individuais ou múltiplos como pagos
- 📊 **Limite Disponível**: Visualize o limite disponível considerando mês atual e parcelados
- 📈 **Resumo Mensal**: Veja o total mensal de todas as faturas
- 🤝 **Compartilhamento**: Compartilhe cartões com outros usuários (ex: esposa)
- 🔒 **Sistema de Login**: Autenticação segura com bcrypt

## 📋 Pré-requisitos

- Node.js 18+ e pnpm
- MySQL 5.7+ ou MariaDB 10.3+
- Acesso ao painel da Hostinger (ou qualquer gerenciador MySQL)

## 🗄️ Configuração do Banco de Dados

### Passo 1: Criar o Banco de Dados

1. Acesse o painel da Hostinger
2. Vá em "Bancos de Dados MySQL"
3. Clique em "Criar uma Nova Base de Dados MySQL"
4. Preencha:
   - **Nome da base de dados**: `finances` (ou seu prefixo + finances)
   - **Nome do usuário**: escolha um usuário
   - **Senha**: gere uma senha segura

### Passo 2: Executar o SQL

1. Após criar o banco, clique em "Gerenciar" ou "phpMyAdmin"
2. Selecione o banco de dados criado
3. Vá na aba "SQL"
4. Copie todo o conteúdo do arquivo `database.sql`
5. Cole no campo de texto e clique em "Executar"

Isso criará todas as tabelas, triggers, views e procedures necessárias.

### Passo 3: Configurar as Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas credenciais:
   ```env
   # MySQL Database Configuration
   VITE_DB_HOST=seu-host.mysql.hostinger.com
   VITE_DB_PORT=3306
   VITE_DB_USER=u428622816_seu_usuario
   VITE_DB_PASSWORD=sua_senha_segura
   VITE_DB_NAME=u428622816_finances
   
   # JWT Secret
   JWT_SECRET=sua_chave_secreta_muito_segura_mude_isso
   ```

**⚠️ IMPORTANTE**: 
- Nunca compartilhe o arquivo `.env`
- Mude o `JWT_SECRET` para uma string aleatória e segura
- O `.env` já está no `.gitignore`

## 🛠️ Instalação

```bash
# Instalar dependências
pnpm install

# Iniciar o servidor de desenvolvimento
pnpm dev
```

## 📱 Uso do Sistema

### 1. Primeiro Acesso

1. Acesse `http://localhost:5173`
2. Clique em "Criar Conta"
3. Preencha seus dados e crie sua conta
4. Faça login

### 2. Adicionar um Cartão

1. No dashboard, clique em "Novo Cartão"
2. Preencha:
   - **Nome**: Ex: "Nubank", "Neon"
   - **Limite**: Ex: 5000.00
   - **Dia de Fechamento**: Ex: 29 (para Nubank)
   - **Dia de Vencimento**: Ex: 5 (para Nubank)
   - **Cor**: Escolha uma cor para identificação visual

### 3. Adicionar Itens na Fatura

1. Selecione um cartão
2. Escolha o mês da fatura
3. Clique em "Adicionar Item"
4. Preencha:
   - **Descrição**: Ex: "Netflix"
   - **Valor**: Ex: 39.90
   - **Autor**: Selecione ou crie (ex: "Pedro", "Duda")
   - **Categoria**: Opcional (ex: "Streaming", "Alimentação")
   - **Parcelado?**: Se sim, informe quantas parcelas

### 4. Compras Parceladas

Quando você marca uma compra como parcelada:
- O sistema cria automaticamente as faturas dos próximos meses (se não existirem)
- Cada parcela é registrada no mês correspondente
- Exemplo: Compra de R$ 1.200,00 em 12x cria 12 itens de R$ 100,00

### 5. Marcar como Pago

- Selecione um ou mais itens (checkbox)
- Clique em "Marcar como Pago"
- O valor pago será atualizado automaticamente

### 6. Compartilhar Cartão

1. Vá em "Configurações do Cartão"
2. Clique em "Compartilhar"
3. Digite o email do usuário
4. Escolha a permissão:
   - **View**: Apenas visualizar
   - **Edit**: Pode adicionar/editar itens
   - **Admin**: Controle total

## 🏗️ Estrutura do Projeto

```
finances/
├── database.sql              # Script SQL completo
├── .env                      # Configurações (NÃO COMMITAR)
├── .env.example             # Exemplo de configurações
├── src/
│   ├── lib/
│   │   └── db.ts            # Conexão com MySQL
│   ├── types/
│   │   └── database.ts      # Tipos TypeScript
│   ├── services/            # Lógica de negócio
│   ├── components/          # Componentes React
│   └── pages/               # Páginas da aplicação
└── README.md
```

## 🔒 Segurança

- ✅ Senhas criptografadas com bcrypt
- ✅ Conexão direta com MySQL (sem API exposta)
- ✅ Variáveis de ambiente para credenciais
- ✅ SQL com prepared statements (proteção contra SQL Injection)
- ✅ Validação de permissões por usuário

## 📊 Funcionalidades da Planilha (Google Sheets)

Baseado nas imagens fornecidas, o sistema replica:

- ✅ Múltiplas abas (faturas) por cartão
- ✅ Separação por pessoa (Pedro, Duda, Alda, Outros)
- ✅ Total por pessoa
- ✅ Total da fatura
- ✅ Checkbox para marcar como pago
- ✅ Cálculo automático de totais
- ✅ Histórico de faturas (Novembro, Dezembro, etc.)

## 🆘 Troubleshooting

### Erro de Conexão com o Banco

```
Error: connect ECONNREFUSED
```

**Solução**: Verifique se:
- As credenciais no `.env` estão corretas
- O servidor MySQL está acessível
- O firewall não está bloqueando a conexão
- O IP está autorizado no painel da Hostinger

### Erro de Permissão

```
Error: Access denied for user
```

**Solução**: 
- Verifique usuário e senha no `.env`
- Certifique-se que o usuário tem permissões no banco

### Tabelas não encontradas

**Solução**: Execute novamente o script `database.sql` no phpMyAdmin

## 📝 TODO / Próximas Funcionalidades

- [ ] Exportar para Excel/PDF
- [ ] Gráficos e relatórios
- [ ] Notificações de vencimento
- [ ] App mobile
- [ ] Importação de extratos bancários
- [ ] Metas de gastos por categoria
- [ ] Comparativo mensal

## 🤝 Suporte

Para dúvidas ou problemas, abra uma issue ou entre em contato.

## 📄 Licença

MIT License - Livre para uso pessoal e comercial

---

**Desenvolvido com ❤️ para facilitar o controle financeiro pessoal**
