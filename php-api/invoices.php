<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


require_once __DIR__ . '/config.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Usa a view invoice_details para trazer totais, status, nome do cartão, etc.
        $card_id = isset($_GET['card_id']) ? intval($_GET['card_id']) : null;
        try {
            if ($card_id) {
                $stmt = $pdo->prepare('SELECT * FROM invoice_details WHERE card_id = :card_id');
                $stmt->execute(['card_id' => $card_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM invoice_details');
            }
            $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($invoices);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar faturas', 'error' => $e->getMessage()]);
        }
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $card_id = $input['card_id'] ?? null;
        $reference_month = $input['reference_month'] ?? null;
        $reference_year = $input['reference_year'] ?? null;
        $closing_date = $input['closing_date'] ?? null;
        $due_date = $input['due_date'] ?? null;
        if (!$card_id || !$reference_month || !$reference_year || !$closing_date || !$due_date) {
            echo json_encode(['success' => false, 'message' => 'Campos obrigatórios: card_id, reference_month, reference_year, closing_date, due_date']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO invoices (card_id, reference_month, reference_year, closing_date, due_date) VALUES (:card_id, :reference_month, :reference_year, :closing_date, :due_date)');
            $stmt->execute([
                'card_id' => $card_id,
                'reference_month' => $reference_month,
                'reference_year' => $reference_year,
                'closing_date' => $closing_date,
                'due_date' => $due_date
            ]);
            $id = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM invoices WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $invoice = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($invoice);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar fatura', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
