-- ==================================================
-- SISTEMA DE GERENCIAMENTO DE FATURAS DE CARTÃO
-- Base de dados MySQL
-- ==================================================

-- Criar o banco de dados (execute isso primeiro no seu gerenciador)
CREATE DATABASE IF NOT EXISTS finances CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finances;

-- ==================== TABELAS ====================

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Cartões/Bancos
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT 'Ex: Nubank, Neon',
    card_limit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    closing_day TINYINT NOT NULL COMMENT 'Dia do mês que a fatura fecha (1-31)',
    due_day TINYINT NOT NULL COMMENT 'Dia do mês que a fatura vence (1-31)',
    color VARCHAR(7) DEFAULT '#6366f1' COMMENT 'Cor para identificação visual',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Compartilhamento de Cartões (para múltiplos donos)
CREATE TABLE IF NOT EXISTS card_owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    user_id INT NOT NULL,
    permission ENUM('view', 'edit', 'admin') DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_card_user (card_id, user_id),
    INDEX idx_card_id (card_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Faturas (meses de fatura)
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_id INT NOT NULL,
    reference_month TINYINT NOT NULL COMMENT 'Mês de referência (1-12)',
    reference_year SMALLINT NOT NULL COMMENT 'Ano de referência',
    closing_date DATE NOT NULL COMMENT 'Data de fechamento da fatura',
    due_date DATE NOT NULL COMMENT 'Data de vencimento da fatura',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    paid_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('open', 'closed', 'paid', 'overdue') DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_card_period (card_id, reference_month, reference_year),
    INDEX idx_card_id (card_id),
    INDEX idx_reference_date (reference_year, reference_month),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Categorias
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    icon VARCHAR(10) DEFAULT '📦',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_category (user_id, name),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Autores (pessoas que fazem compras)
CREATE TABLE IF NOT EXISTS authors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_owner BOOLEAN DEFAULT FALSE COMMENT 'Se é o próprio dono do cartão',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_author (user_id, name),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela de Itens da Fatura
CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    category_id INT,
    author_id INT NOT NULL,
    is_paid BOOLEAN DEFAULT FALSE,
    is_installment BOOLEAN DEFAULT FALSE,
    installment_number TINYINT COMMENT 'Número da parcela atual (ex: 1, 2, 3)',
    total_installments TINYINT COMMENT 'Total de parcelas (ex: 12)',
    installment_group_id VARCHAR(36) COMMENT 'UUID para agrupar parcelas da mesma compra',
    purchase_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT,
    INDEX idx_invoice_id (invoice_id),
    INDEX idx_installment_group (installment_group_id),
    INDEX idx_author_id (author_id),
    INDEX idx_category_id (category_id),
    INDEX idx_is_paid (is_paid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==================== TRIGGERS ====================

-- Trigger para atualizar total da fatura após INSERT
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_invoice_total_after_insert
AFTER INSERT ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices 
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id
    ),
    paid_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id AND is_paid = TRUE
    )
    WHERE id = NEW.invoice_id;
END//
DELIMITER ;

-- Trigger para atualizar total da fatura após UPDATE
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_invoice_total_after_update
AFTER UPDATE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices 
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id
    ),
    paid_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = NEW.invoice_id AND is_paid = TRUE
    )
    WHERE id = NEW.invoice_id;
END//
DELIMITER ;

-- Trigger para atualizar total da fatura após DELETE
DELIMITER //
CREATE TRIGGER IF NOT EXISTS update_invoice_total_after_delete
AFTER DELETE ON invoice_items
FOR EACH ROW
BEGIN
    UPDATE invoices 
    SET total_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = OLD.invoice_id
    ),
    paid_amount = (
        SELECT COALESCE(SUM(amount), 0) 
        FROM invoice_items 
        WHERE invoice_id = OLD.invoice_id AND is_paid = TRUE
    )
    WHERE id = OLD.invoice_id;
END//
DELIMITER ;

-- ==================== VIEWS ====================

-- View: Saldo disponível por cartão
-- Considera apenas itens não pagos de todas as faturas
CREATE OR REPLACE VIEW card_available_balance AS
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

-- View: Total mensal de todas as faturas
CREATE OR REPLACE VIEW monthly_totals AS
SELECT 
    i.reference_year,
    i.reference_month,
    COUNT(DISTINCT i.card_id) as total_cards,
    COALESCE(SUM(i.total_amount), 0) as total_amount,
    COALESCE(SUM(i.paid_amount), 0) as paid_amount,
    COALESCE(SUM(i.total_amount - i.paid_amount), 0) as remaining_amount,
    (SELECT user_id FROM cards WHERE id = i.card_id LIMIT 1) as user_id
FROM invoices i
GROUP BY i.reference_year, i.reference_month
ORDER BY i.reference_year DESC, i.reference_month DESC;

-- View: Detalhes de faturas com informações do cartão
CREATE OR REPLACE VIEW invoice_details AS
SELECT 
    i.*,
    c.name as card_name,
    c.color as card_color,
    c.user_id,
    (i.total_amount - i.paid_amount) as remaining_amount
FROM invoices i
INNER JOIN cards c ON i.card_id = c.id;

-- View: Itens de fatura com detalhes
CREATE OR REPLACE VIEW invoice_item_details AS
SELECT 
    ii.*,
    i.reference_month,
    i.reference_year,
    i.card_id,
    c.name as card_name,
    cat.name as category_name,
    cat.icon as category_icon,
    cat.color as category_color,
    a.name as author_name
FROM invoice_items ii
INNER JOIN invoices i ON ii.invoice_id = i.id
INNER JOIN cards c ON i.card_id = c.id
LEFT JOIN categories cat ON ii.category_id = cat.id
INNER JOIN authors a ON ii.author_id = a.id;

-- ==================== DADOS INICIAIS ====================
-- Categorias padrão serão criadas via aplicação quando o usuário se registrar

-- ==================== PROCEDURES ÚTEIS ====================

-- Procedure para criar uma nova fatura automaticamente
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS create_invoice_for_card(
    IN p_card_id INT,
    IN p_reference_month TINYINT,
    IN p_reference_year SMALLINT
)
BEGIN
    DECLARE v_closing_day TINYINT;
    DECLARE v_due_day TINYINT;
    DECLARE v_closing_date DATE;
    DECLARE v_due_date DATE;
    
    -- Buscar dias de fechamento e vencimento do cartão
    SELECT closing_day, due_day INTO v_closing_day, v_due_day
    FROM cards WHERE id = p_card_id;
    
    -- Calcular datas de fechamento e vencimento
    SET v_closing_date = DATE(CONCAT(p_reference_year, '-', LPAD(p_reference_month, 2, '0'), '-', LPAD(v_closing_day, 2, '0')));
    
    -- Data de vencimento é no mês seguinte
    IF p_reference_month = 12 THEN
        SET v_due_date = DATE(CONCAT(p_reference_year + 1, '-01-', LPAD(v_due_day, 2, '0')));
    ELSE
        SET v_due_date = DATE(CONCAT(p_reference_year, '-', LPAD(p_reference_month + 1, 2, '0'), '-', LPAD(v_due_day, 2, '0')));
    END IF;
    
    -- Inserir fatura se não existir
    INSERT IGNORE INTO invoices (card_id, reference_month, reference_year, closing_date, due_date, status)
    VALUES (p_card_id, p_reference_month, p_reference_year, v_closing_date, v_due_date, 'open');
END//
DELIMITER ;

-- Procedure para criar parcelas automaticamente
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS create_installment_items(
    IN p_card_id INT,
    IN p_description VARCHAR(500),
    IN p_total_amount DECIMAL(10,2),
    IN p_total_installments TINYINT,
    IN p_author_id INT,
    IN p_category_id INT,
    IN p_purchase_date DATE,
    IN p_start_month TINYINT,
    IN p_start_year SMALLINT
)
BEGIN
    DECLARE v_installment_amount DECIMAL(10,2);
    DECLARE v_installment_group_id VARCHAR(36);
    DECLARE v_current_month TINYINT;
    DECLARE v_current_year SMALLINT;
    DECLARE v_counter TINYINT DEFAULT 1;
    DECLARE v_invoice_id INT;
    
    -- Calcular valor da parcela
    SET v_installment_amount = p_total_amount / p_total_installments;
    
    -- Gerar ID único para o grupo de parcelas
    SET v_installment_group_id = UUID();
    
    SET v_current_month = p_start_month;
    SET v_current_year = p_start_year;
    
    WHILE v_counter <= p_total_installments DO
        -- Criar fatura se não existir
        CALL create_invoice_for_card(p_card_id, v_current_month, v_current_year);
        
        -- Buscar ID da fatura
        SELECT id INTO v_invoice_id FROM invoices 
        WHERE card_id = p_card_id 
        AND reference_month = v_current_month 
        AND reference_year = v_current_year;
        
        -- Inserir item
        INSERT INTO invoice_items (
            invoice_id, description, amount, category_id, author_id,
            is_installment, installment_number, total_installments,
            installment_group_id, purchase_date
        ) VALUES (
            v_invoice_id, 
            CONCAT(p_description, ' (', v_counter, '/', p_total_installments, ')'),
            v_installment_amount,
            p_category_id,
            p_author_id,
            TRUE,
            v_counter,
            p_total_installments,
            v_installment_group_id,
            p_purchase_date
        );
        
        -- Avançar para o próximo mês
        IF v_current_month = 12 THEN
            SET v_current_month = 1;
            SET v_current_year = v_current_year + 1;
        ELSE
            SET v_current_month = v_current_month + 1;
        END IF;
        
        SET v_counter = v_counter + 1;
    END WHILE;
END//
DELIMITER ;

-- ==================== FIM ====================
