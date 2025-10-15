<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}


require_once __DIR__ . '/config.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // Usa a view card_available_balance para trazer limite/disponível
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        try {
            if ($user_id) {
                $stmt = $pdo->prepare('SELECT * FROM card_available_balance WHERE user_id = :user_id');
                $stmt->execute(['user_id' => $user_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM card_available_balance');
            }
            $cards = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($cards);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar cartões', 'error' => $e->getMessage()]);
        }
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $user_id = $input['user_id'] ?? null;
        $name = $input['name'] ?? null;
        $card_limit = $input['card_limit'] ?? 0.00;
        $closing_day = $input['closing_day'] ?? null;
        $due_day = $input['due_day'] ?? null;
        $color = $input['color'] ?? '#6366f1';
        if (!$user_id || !$name || !$closing_day || !$due_day) {
            echo json_encode(['success' => false, 'message' => 'Campos obrigatórios: user_id, name, closing_day, due_day']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO cards (user_id, name, card_limit, closing_day, due_day, color) VALUES (:user_id, :name, :card_limit, :closing_day, :due_day, :color)');
            $stmt->execute([
                'user_id' => $user_id,
                'name' => $name,
                'card_limit' => $card_limit,
                'closing_day' => $closing_day,
                'due_day' => $due_day,
                'color' => $color
            ]);
            $id = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM cards WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $card = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($card);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar cartão', 'error' => $e->getMessage()]);
        }
        exit();
    case 'PUT':
        // Atualização de cartão (exemplo simplificado)
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID do cartão é obrigatório']);
            exit();
        }
        $fields = [];
        $params = ['id' => $id];
        foreach (['name', 'card_limit', 'closing_day', 'due_day', 'color', 'active'] as $field) {
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
            $sql = 'UPDATE cards SET ' . implode(', ', $fields) . ' WHERE id = :id';
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $stmt = $pdo->prepare('SELECT * FROM cards WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $card = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($card);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao atualizar cartão', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
