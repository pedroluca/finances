<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Simulação de faturas
$invoices = [
    ["id" => 1, "cardId" => 1, "month" => 10, "year" => 2025],
    ["id" => 2, "cardId" => 2, "month" => 10, "year" => 2025]
];

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        echo json_encode($invoices);
        exit();
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        $newInvoice = [
            'id' => count($invoices) + 1,
            'cardId' => $input['cardId'] ?? 1,
            'month' => $input['month'] ?? 1,
            'year' => $input['year'] ?? 2025
        ];
        // Simule adicionar
        echo json_encode($newInvoice);
        exit();
    default:
        echo json_encode(['success' => false, 'message' => 'Método não permitido']);
        exit();
}
