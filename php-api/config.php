<?php
// config.php
// Configure aqui os dados do seu banco de dados MySQL

$DB_HOST = 'localhost'; // ou o host do seu servidor
$DB_NAME = 'finances';
$DB_USER = 'seu_usuario';
$DB_PASS = 'sua_senha';

// Configura timezone para o Brasil (Brasília)
date_default_timezone_set('America/Sao_Paulo');

if (!isset($pdo)) {
    try {
        $pdo = new PDO(
            "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8",
            $DB_USER,
            $DB_PASS,
            [PDO::ATTR_PERSISTENT => true]
        );
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Configura timezone do MySQL para o Brasil
        $pdo->exec("SET time_zone = '-03:00'");
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erro ao conectar ao banco de dados', 'error' => $e->getMessage()]);
        exit();
    }
}
