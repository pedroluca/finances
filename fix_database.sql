-- Script para corrigir o banco de dados
-- Execute este script no seu MySQL

-- 1. Corrigir a view card_available_balance
DROP VIEW IF EXISTS card_available_balance;

CREATE VIEW card_available_balance AS
SELECT 
    c.id as card_id,
    c.user_id,
    c.name as card_name,
    c.card_limit,
    c.closing_day,
    c.due_day,
    c.color,
    COALESCE(SUM(CASE 
        WHEN ii.is_paid = FALSE 
        THEN ii.amount
        ELSE 0 
    END), 0) as current_debt,
    c.card_limit - COALESCE(SUM(CASE 
        WHEN ii.is_paid = FALSE
        THEN ii.amount
        ELSE 0 
    END), 0) as available_balance
FROM cards c
LEFT JOIN invoices i ON c.id = i.card_id
LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
WHERE c.active = TRUE
GROUP BY c.id, c.user_id, c.name, c.card_limit, c.closing_day, c.due_day, c.color;

-- 2. Verificar se as tabelas têm as colunas necessárias
-- Se der erro aqui, as colunas já existem (está correto)
-- ALTER TABLE cards ADD COLUMN closing_day INT NOT NULL DEFAULT 5;
-- ALTER TABLE cards ADD COLUMN due_day INT NOT NULL DEFAULT 15;
-- ALTER TABLE cards ADD COLUMN color VARCHAR(7) DEFAULT '#6366f1';

-- 3. Verificar dados inconsistentes
SELECT 
    'Itens sem fatura' as problema,
    COUNT(*) as quantidade
FROM invoice_items ii
LEFT JOIN invoices i ON ii.invoice_id = i.id
WHERE i.id IS NULL

UNION ALL

SELECT 
    'Faturas sem cartão' as problema,
    COUNT(*) as quantidade
FROM invoices i
LEFT JOIN cards c ON i.card_id = c.id
WHERE c.id IS NULL;

-- 4. Listar cartões com limite e débito atual
SELECT 
    card_name,
    card_limit,
    current_debt,
    available_balance
FROM card_available_balance
ORDER BY card_name;
