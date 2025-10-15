<?php
// config.php
// Configure aqui os dados do seu banco de dados MySQL

$DB_HOST = 'localhost'; // ou o host do seu servidor
$DB_NAME = 'finances';
$DB_USER = 'seu_usuario';
$DB_PASS = 'sua_senha';

if (!isset($pdo)) {
    try {
        $pdo = new PDO(
            "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8",
            $DB_USER,
            $DB_PASS,
            [PDO::ATTR_PERSISTENT => true]
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao conectar ao banco de dados', 'error' => $e->getMessage()]);
        exit();
    }
}
