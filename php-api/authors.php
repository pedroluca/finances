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
        // Aceita ?user_id= para filtrar autores de um usuário
        $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : null;
        try {
            if ($user_id) {
                $stmt = $pdo->prepare('SELECT * FROM authors WHERE user_id = :user_id');
                $stmt->execute(['user_id' => $user_id]);
            } else {
                $stmt = $pdo->query('SELECT * FROM authors');
            }
            $authors = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode($authors);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao buscar autores', 'error' => $e->getMessage()]);
        }
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $user_id = $input['user_id'] ?? null;
        $name = $input['name'] ?? null;
        $is_owner = isset($input['is_owner']) ? (bool)$input['is_owner'] : false;
        if (!$user_id || !$name) {
            echo json_encode(['success' => false, 'message' => 'user_id e name são obrigatórios']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('INSERT INTO authors (user_id, name, is_owner) VALUES (:user_id, :name, :is_owner)');
            $stmt->execute([
                'user_id' => $user_id,
                'name' => $name,
                'is_owner' => $is_owner
            ]);
            $id = $pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM authors WHERE id = :id');
            $stmt->execute(['id' => $id]);
            $author = $stmt->fetch(PDO::FETCH_ASSOC);
            echo json_encode($author);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao criar autor', 'error' => $e->getMessage()]);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
