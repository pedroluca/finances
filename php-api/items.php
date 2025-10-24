<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


require_once __DIR__ . '/config.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Usa a view invoice_item_details para trazer detalhes completos dos itens
        $invoice_id = isset($_GET['invoice_id']) ? intval($_GET['invoice_id']) : null;
        try {
            if ($invoice_id) {
                $stmt = $pdo->prepare('SELECT * FROM invoice_item_details WHERE invoice_id = :invoice_id');
                $stmt->execute(['invoice_id' => $invoice_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM invoice_item_details');
            }
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($items);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar itens', 'error' => $e->getMessage()]);
        }
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? null;
        if ($action === 'createInstallment') {
            // NOVO: Criação de parcelamento no backend
            $card_id = $input['card_id'] ?? null;
            $description = $input['description'] ?? null;
            $total_amount = $input['total_amount'] ?? null;
            $total_installments = $input['total_installments'] ?? null;
            $author_id = $input['author_id'] ?? null;
            $category_id = $input['category_id'] ?? null;
            $purchase_date = $input['purchase_date'] ?? null;
            $current_installment = $input['current_installment'] ?? 1;
            if (!$card_id || !$description || !$total_amount || !$total_installments || !$author_id || !$purchase_date) {
                echo json_encode(['success' => false, 'message' => 'Campos obrigatórios: card_id, description, total_amount, total_installments, author_id, purchase_date']);
                exit();
            }
            $installment_group_id = strval(time()) . rand(1000,9999);
            $baseDate = new DateTime($purchase_date);
            $created_items = [];
            for ($i = intval($current_installment); $i <= intval($total_installments); $i++) {
                // Calcula mês/ano da parcela
                $addMonths = $i - 1;
                $parcelaDate = clone $baseDate;
                $parcelaDate->modify("+{$addMonths} month");
                $parcelaMonth = intval($parcelaDate->format('n'));
                $parcelaYear = intval($parcelaDate->format('Y'));
                // Buscar ou criar fatura do mês/ano
                $stmt = $pdo->prepare('SELECT * FROM invoices WHERE card_id = :card_id AND reference_month = :month AND reference_year = :year');
                $stmt->execute(['card_id' => $card_id, 'month' => $parcelaMonth, 'year' => $parcelaYear]);
                $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$invoice) {
                    // Calcular datas de fechamento e vencimento (simples: fechamento = dia da compra, vencimento = +7 dias)
                    $closing_date = $parcelaDate->format('Y-m-d');
                    $due_date = $parcelaDate->modify('+7 days')->format('Y-m-d');
                    $stmt = $pdo->prepare('INSERT INTO invoices (card_id, reference_month, reference_year, closing_date, due_date) VALUES (:card_id, :month, :year, :closing_date, :due_date)');
                    $stmt->execute([
                        'card_id' => $card_id,
                        'month' => $parcelaMonth,
                        'year' => $parcelaYear,
                        'closing_date' => $closing_date,
                        'due_date' => $due_date
                    ]);
                    $invoice_id = $pdo->lastInsertId();
                } else {
                    $invoice_id = $invoice['id'];
                }
                // Valor da parcela (arredondamento igual frontend)
                $parcelaValue = round(floatval($total_amount) / intval($total_installments), 2);
                // Criar item
                $stmt = $pdo->prepare('INSERT INTO invoice_items (invoice_id, description, amount, category_id, author_id, is_paid, is_installment, installment_number, total_installments, installment_group_id, purchase_date, notes) VALUES (:invoice_id, :description, :amount, :category_id, :author_id, 0, 1, :installment_number, :total_installments, :installment_group_id, :purchase_date, NULL)');
                $stmt->execute([
                    'invoice_id' => $invoice_id,
                    'description' => $description,
                    'amount' => $parcelaValue,
                    'category_id' => $category_id,
                    'author_id' => $author_id,
                    'installment_number' => $i,
                    'total_installments' => $total_installments,
                    'installment_group_id' => $installment_group_id,
                    'purchase_date' => $parcelaDate->format('Y-m-d')
                ]);
                $item_id = $pdo->lastInsertId();
                $stmt = $pdo->prepare('SELECT * FROM invoice_items WHERE id = :id');
                $stmt->execute(['id' => $item_id]);
                $created_items[] = $stmt->fetch(PDO::FETCH_ASSOC);
            }
            echo json_encode(['success' => true, 'items' => $created_items]);
            exit();
        } elseif ($action === 'togglePaidStatus') {
            $item_id = $input['item_id'] ?? null;
            $user_id = $input['user_id'] ?? null;
            if (!$item_id) {
                echo json_encode(['success' => false, 'message' => 'item_id obrigatório']);
                exit();
            }
            // Buscar status atual
            $stmt = $pdo->prepare('SELECT is_paid FROM invoice_items WHERE id = :id');
            $stmt->execute(['id' => $item_id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$item) {
                echo json_encode(['success' => false, 'message' => 'Item não encontrado']);
                exit();
            }
            $newStatus = $item['is_paid'] ? 0 : 1;
            $stmt = $pdo->prepare('UPDATE invoice_items SET is_paid = :is_paid WHERE id = :id');
            $stmt->execute(['is_paid' => $newStatus, 'id' => $item_id]);
            echo json_encode(['success' => true, 'is_paid' => $newStatus]);
            exit();
        }
        // Fluxo antigo: criar item único
        $invoice_id = $input['invoice_id'] ?? null;
        $description = $input['description'] ?? null;
        $amount = $input['amount'] ?? null;
        $category_id = $input['category_id'] ?? null;
        $author_id = $input['author_id'] ?? null;
        $is_paid = isset($input['is_paid']) ? (bool)$input['is_paid'] : false;
        $is_installment = isset($input['is_installment']) ? (bool)$input['is_installment'] : false;
        $installment_number = $input['installment_number'] ?? null;
        $total_installments = $input['total_installments'] ?? null;
        $installment_group_id = $input['installment_group_id'] ?? null;
        $purchase_date = $input['purchase_date'] ?? null;
        $notes = $input['notes'] ?? null;
        if (!$invoice_id || !$description || !$amount || !$author_id) {
            echo json_encode(['success' => false, 'message' => 'Campos obrigatórios: invoice_id, description, amount, author_id']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO invoice_items (invoice_id, description, amount, category_id, author_id, is_paid, is_installment, installment_number, total_installments, installment_group_id, purchase_date, notes) VALUES (:invoice_id, :description, :amount, :category_id, :author_id, :is_paid, :is_installment, :installment_number, :total_installments, :installment_group_id, :purchase_date, :notes)');
            $stmt->execute([
                'invoice_id' => $invoice_id,
                'description' => $description,
                'amount' => $amount,
                'category_id' => $category_id,
                'author_id' => $author_id,
                'is_paid' => $is_paid,
                'is_installment' => $is_installment,
                'installment_number' => $installment_number,
                'total_installments' => $total_installments,
                'installment_group_id' => $installment_group_id,
                'purchase_date' => $purchase_date,
                'notes' => $notes
            ]);
            $id = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM invoice_items WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($item);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar item', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
