<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simulação de itens
$items = [
    ["id" => 1, "invoiceId" => 1, "name" => "Mercado", "value" => 100.0],
    ["id" => 2, "invoiceId" => 1, "name" => "Uber", "value" => 30.0]
];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode($items);
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $newItem = [
            'id' => count($items) + 1,
            'invoiceId' => $input['invoiceId'] ?? 1,
            'name' => $input['name'] ?? 'Novo Item',
            'value' => $input['value'] ?? 0.0
        ];
        // Simule adicionar
        echo json_encode($newItem);
        exit();
    case 'PUT':
        // Simule atualização
        echo json_encode(['success' => true, 'message' => 'Item atualizado (simulado)']);
        exit();
    case 'DELETE':
        // Simule exclusão
        echo json_encode(['success' => true, 'message' => 'Item removido (simulado)']);
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
