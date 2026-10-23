<?php

declare(strict_types=1);

function handleAuthRoute(array $segments): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $segments[1] ?? '';

    if ($action === 'login' && $method === 'POST') {
        $input = getJsonInput();
        $username = trim($input['username'] ?? '');
        $password = $input['password'] ?? '';
        $loginMode = trim((string) ($input['login_mode'] ?? 'main'));

        if ($username === '' || $password === '') {
            jsonResponse(['error' => 'Username and password are required'], 400);
        }

        if (!in_array($loginMode, ['main', 'employee'], true)) {
            $loginMode = 'main';
        }

        $auth = authenticateLogin($username, $password, $loginMode);
        if ($auth === null) {
            jsonResponse(['error' => 'Invalid username or password'], 401);
        }

        $token = generateToken($auth['username'], $auth['role']);

        jsonResponse([
            'token' => $token,
            'user' => [
                'id' => 1,
                'username' => $auth['username'],
                'role' => $auth['role'],
            ],
        ]);
    }

    if ($action === 'me' && $method === 'GET') {
        $auth = requireAuth();

        jsonResponse([
            'user' => [
                'id' => (int) ($auth['user_id'] ?? 1),
                'username' => $auth['username'],
                'role' => $auth['role'] ?? 'main',
            ],
        ]);
    }

    jsonResponse(['error' => 'Not found'], 404);
}
