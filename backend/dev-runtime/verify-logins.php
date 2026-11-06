<?php
declare(strict_types=1);
require __DIR__.'/config.php';
if (!evalDevBinding(getenv()) || getenv('EVAL_DB_ROLE') !== 'runtime') {
    exit(2);
}
require dirname(__DIR__).'/bootstrap.php';

use App\Infrastructure\Authentication\LocalSessionAuthentication;
use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Encryption\Encrypter;
use Illuminate\Hashing\BcryptHasher;
use Symfony\Component\HttpFoundation\Request;

try {
    $db = Capsule::connection();
    $origin = 'https://127.0.0.1:8443,https://192.168.0.101:8443';
    $encrypter = new Encrypter(base64_decode(getenv('EVAL_RUNTIME_KEY') ?: '', true), 'AES-256-CBC');
    $hasher = new BcryptHasher(['rounds' => 4]);
    $auth = new LocalSessionAuthentication($db, $encrypter, $origin, 30, 50, 60, $hasher);

    $testCases = [
        ['login' => 'docente', 'password' => 'docente'],
        ['login' => 'estudiante', 'password' => 'estudiante'],
        ['login' => 'director', 'password' => 'director'],
        ['login' => 'subdirector', 'password' => 'subdirector'],
        ['login' => 'estu01', 'password' => 'estu01'],
        ['login' => 'estu02', 'password' => 'estu02'],
        ['login' => 'estu03', 'password' => 'estu03'],
        ['login' => 'estu04', 'password' => 'estu04'],
        // Mobile tablet case-sensitivity and whitespace robustness:
        ['login' => 'Estu01', 'password' => 'Estu01'],
        ['login' => 'Docente ', 'password' => 'Docente '],
    ];

    $results = [];
    foreach ($testCases as $tc) {
        $login = $tc['login'];
        $password = $tc['password'];

        // 1. First get a valid session and CSRF token
        $sessionReq = Request::create('https://127.0.0.1:8443/auth/session', 'GET');
        $sessionRes = $auth->handle($sessionReq, static fn() => null);
        $cookies = $sessionRes->headers->getCookies();
        $sessionCookie = null;
        foreach ($cookies as $c) {
            if ($c->getName() === LocalSessionAuthentication::COOKIE) {
                $sessionCookie = $c->getValue();
                break;
            }
        }
        $sessionData = json_decode($sessionRes->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $csrfToken = $sessionData['csrf_token'] ?? null;

        // 2. Perform POST /auth/login
        $loginReq = Request::create(
            'https://127.0.0.1:8443/auth/login',
            'POST',
            [],
            $sessionCookie ? [LocalSessionAuthentication::COOKIE => $sessionCookie] : [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_ORIGIN' => 'https://127.0.0.1:8443',
                'HTTP_X_CSRF_TOKEN' => $csrfToken
            ],
            json_encode(['login' => $login, 'password' => $password], JSON_THROW_ON_ERROR)
        );

        $loginRes = $auth->handle($loginReq, static fn() => null);
        $statusCode = $loginRes->getStatusCode();
        $body = json_decode($loginRes->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $authenticated = ($statusCode === 200 && ($body['authenticated'] ?? false) === true);

        $results[] = [
            'login' => $login,
            'status' => $statusCode,
            'authenticated' => $authenticated,
            'error' => $body['error'] ?? null
        ];
    }

    echo json_encode(['success' => true, 'all_authenticated' => array_reduce($results, fn($carry, $r) => $carry && $r['authenticated'], true), 'results' => $results], JSON_PRETTY_PRINT) . PHP_EOL;
} catch (Throwable $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]) . PHP_EOL;
    exit(1);
}
