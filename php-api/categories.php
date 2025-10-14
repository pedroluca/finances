<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simulação de categorias
$categories = [
    ["id" => 1, "name" => "Alimentação"],
    ["id" => 2, "name" => "Transporte"]
];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode($categories);
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $newCategory = [
            'id' => count($categories) + 1,
            'name' => $input['name'] ?? 'Nova Categoria'
        ];
        // Simule adicionar
        echo json_encode($newCategory);
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
