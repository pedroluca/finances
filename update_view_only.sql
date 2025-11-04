-- Script MÍNIMO - Apenas atualiza a VIEW (não apaga dados)
-- Execute apenas este comando:

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
