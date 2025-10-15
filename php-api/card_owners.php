<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/config.php';

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        // ?card_id= ou ?user_id=
        $card_id = isset($_GET['card_id']) ? intval($_GET['card_id']) : null;
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        try {
            if ($card_id) {
                $stmt = $pdo->prepare('SELECT * FROM card_owners WHERE card_id = :card_id');
                $stmt->execute(['card_id' => $card_id]);
            } elseif ($user_id) {
                $stmt = $pdo->prepare('SELECT * FROM card_owners WHERE user_id = :user_id');
                $stmt->execute(['user_id' => $user_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM card_owners');
            }
            $owners = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($owners);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar donos', 'error' => $e->getMessage()]);
        }
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $card_id = $input['card_id'] ?? null;
        $user_id = $input['user_id'] ?? null;
        $permission = $input['permission'] ?? 'view';
        if (!$card_id || !$user_id) {
            echo json_encode(['success' => false, 'message' => 'card_id e user_id são obrigatórios']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO card_owners (card_id, user_id, permission) VALUES (:card_id, :user_id, :permission)');
            $stmt->execute([
                'card_id' => $card_id,
                'user_id' => $user_id,
                'permission' => $permission
            ]);
            $id = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM card_owners WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $owner = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($owner);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao adicionar dono', 'error' => $e->getMessage()]);
        }
        exit();
    case 'DELETE':
        // Remove owner by id
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['id'] ?? null;
        if (!$id) {
            echo json_encode(['success' => false, 'message' => 'ID é obrigatório']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('DELETE FROM card_owners WHERE id = :id');
            $stmt->execute(['id' => $id]);
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao remover dono', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
