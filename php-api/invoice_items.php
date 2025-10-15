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
        // ?invoice_id= para filtrar itens de uma fatura
        $invoice_id = isset($_GET['invoice_id']) ? intval($_GET['invoice_id']) : null;
        try {
            if ($invoice_id) {
                $stmt = $pdo->prepare('SELECT * FROM invoice_items WHERE invoice_id = :invoice_id');
                $stmt->execute(['invoice_id' => $invoice_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM invoice_items');
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
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID do item é obrigatório']);
            exit();
        }
        $fields = [];
        $params = ['id' => $id];
        foreach (['description','amount','category_id','author_id','is_paid','is_installment','installment_number','total_installments','installment_group_id','purchase_date','notes'] as $field) {
            if (isset($input[$field])) {
                $fields[] = "$field = :$field";
                $params[$field] = $input[$field];
            }
        }
        if (empty($fields)) {
            echo json_encode(['success' => false, 'message' => 'Nenhum campo para atualizar']);
            exit();
        }
        try {
            $sql = 'UPDATE invoice_items SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $stmt = $pdo->prepare('SELECT * FROM invoice_items WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($item);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao atualizar item', 'error' => $e->getMessage()]);
        }
        exit();
    case 'DELETE':
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID do item é obrigatório']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('DELETE FROM invoice_items WHERE id = :id');
            $stmt->execute(['id' => $id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao remover item', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
