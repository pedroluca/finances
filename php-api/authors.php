<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simulação de autores
$authors = [
    ["id" => 1, "name" => "Pedro"],
    ["id" => 2, "name" => "Lucas"]
];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode($authors);
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $newAuthor = [
            'id' => count($authors) + 1,
            'name' => $input['name'] ?? 'Novo Autor'
        ];
        // Simule adicionar
        echo json_encode($newAuthor);
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
