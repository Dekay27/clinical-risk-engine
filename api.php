<?php
declare(strict_types=1);

$backendBaseUrl = 'http://127.0.0.1:8000';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '/api.php';
$apiPath = $_GET['path'] ?? ($_SERVER['PATH_INFO'] ?? '');

if ($apiPath === '' && str_starts_with($requestPath, $scriptName)) {
    $apiPath = substr($requestPath, strlen($scriptName)) ?: '/health';
}

if ($apiPath === '') {
    $apiPath = '/health';
}

$allowedPaths = ['/health', '/metadata', '/predict'];
if (!in_array($apiPath, $allowedPaths, true)) {
    http_response_code(404);
    echo json_encode(['detail' => 'Unknown API route.']);
    exit;
}

$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);
$targetUrl = $backendBaseUrl . $apiPath . ($queryString !== '' ? '?' . $queryString : '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input') ?: '';

if (function_exists('curl_init')) {
    $ch = curl_init($targetUrl);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HEADER => false,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT => 15,
    ]);

    if ($body !== '' && !in_array($method, ['GET', 'HEAD'], true)) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }

    $response = curl_exec($ch);
    $statusCode = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        http_response_code(502);
        echo json_encode(['detail' => 'Backend request failed.', 'error' => $error]);
        exit;
    }

    http_response_code($statusCode > 0 ? $statusCode : 200);
    echo $response;
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => $method,
        'header' => "Content-Type: application/json\r\n",
        'content' => in_array($method, ['GET', 'HEAD'], true) ? '' : $body,
        'timeout' => 15,
        'ignore_errors' => true,
    ],
]);

$response = file_get_contents($targetUrl, false, $context);
$statusCode = 200;

if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $matches)) {
    $statusCode = (int) $matches[1];
}

if ($response === false) {
    http_response_code(502);
    echo json_encode(['detail' => 'Backend request failed.']);
    exit;
}

http_response_code($statusCode);
echo $response;
