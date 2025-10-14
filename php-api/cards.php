<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simulação de cartões
$cards = [
    ["id" => 1, "name" => "Nubank", "authorId" => 1, "active" => true],
    ["id" => 2, "name" => "Inter", "authorId" => 2, "active" => true]
];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode($cards);
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $newCard = [
            'id' => count($cards) + 1,
            'name' => $input['name'] ?? 'Novo Cartão',
            'authorId' => $input['authorId'] ?? 1,
            'active' => true
        ];
        // Simule adicionar
        echo json_encode($newCard);
        exit();
    case 'PUT':
        // Simule atualização
        echo json_encode(['success' => true, 'message' => 'Cartão atualizado (simulado)']);
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
