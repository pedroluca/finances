<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$action = $_GET['action'] ?? '';

// Simulação de banco de dados (substitua por conexão real depois)
$users = [
    ["id" => 1, "email" => "user@teste.com", "password" => "123456", "name" => "Usuário Teste"]
];

switch ($action) {
    case 'login':
        $input = json_decode(file_get_contents('php://input'), true);
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        foreach ($users as $user) {
            if ($user['email'] === $email && $user['password'] === $password) {
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
            }
        }
        echo json_encode(['success' => false, 'message' => 'Email ou senha incorretos']);
        exit();
    case 'register':
        // Simule cadastro
        echo json_encode(['success' => true, 'message' => 'Usuário registrado (simulado)']);
        exit();
    case 'verify':
        // Simule verificação de token
        $headers = getallheaders();
        $token = $headers['Authorization'] ?? '';
        if ($token === 'Bearer fake-jwt-token') {
            echo json_encode(['success' => true, 'user' => $users[0]]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Token inválido']);
        }
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Ação não encontrada']);
        exit();
}
