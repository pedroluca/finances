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
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        if (!$email || !$password) {
            echo json_encode(['success' => false, 'message' => 'Email e senha são obrigatórios']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('SELECT id, email, name, password_hash FROM users WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && password_verify($password, $user['password_hash'])) {
                echo json_encode([
                    'success' => true,
                    'user' => [
                        'id' => $user['id'],
                        'email' => $user['email'],
                        'name' => $user['name']
                    ],
                    'token' => 'fake-jwt-token'
                ]);
                exit();
            } else {
                echo json_encode(['success' => false, 'message' => 'Email ou senha incorretos']);
                exit();
            }
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao consultar usuário', 'error' => $e->getMessage()]);
            exit();
        }
    case 'register':
        $input = json_decode(file_get_contents('php://input'), true);
        $name = $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        if (!$name || !$email || !$password) {
            echo json_encode(['success' => false, 'message' => 'Nome, email e senha são obrigatórios']);
            exit();
        }
        try {
            $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
            $stmt->execute(['email' => $email]);
            if ($stmt->fetch()) {
                echo json_encode(['success' => false, 'message' => 'Email já cadastrado']);
                exit();
            }
            $password_hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO users (name, email, password_hash) VALUES (:name, :email, :password_hash)');
            $stmt->execute([
                'name' => $name,
                'email' => $email,
                'password_hash' => $password_hash
            ]);
            $id = $pdo->lastInsertId();
            echo json_encode(['success' => true, 'message' => 'Usuário registrado', 'user_id' => $id]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Erro ao registrar usuário', 'error' => $e->getMessage()]);
        }
        exit();
    case 'verify':
        // Simulação de verificação de token (ajuste para JWT real se desejar)
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? '';
        if ($token === 'Bearer fake-jwt-token') {
            // Busca o primeiro usuário só para exemplo
            $stmt = $pdo->query('SELECT id, email, name FROM users LIMIT 1');
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user) {
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Token inválido']);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Ação não encontrada']);
        exit();
}
