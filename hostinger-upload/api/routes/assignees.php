<?php

declare(strict_types=1);

function ensureAssigneesTable(PDO $db): void
{
    $db->exec(
        'CREATE TABLE IF NOT EXISTS assignees (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            value VARCHAR(255) NOT NULL,
            sort_order INT UNSIGNED DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_assignee_value (value)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
    );
}

function defaultAssigneeEmails(): array
{
    return [
        'avinash@ae-research.com',
        'anupam@ae-research.com',
        'aashish@ae-research.com',
        'mansiha@ae-research.com',
        'paritosh@ae-research.com',
        'shahid@ae-research.com',
        'projects@ae-research.com',
    ];
}

function seedDefaultAssignees(PDO $db): void
{
    $count = (int) $db->query('SELECT COUNT(*) FROM assignees')->fetchColumn();
    if ($count > 0) {
        return;
    }

    $stmt = $db->prepare('INSERT INTO assignees (value, sort_order) VALUES (?, ?)');
    foreach (defaultAssigneeEmails() as $index => $email) {
        $stmt->execute([$email, $index]);
    }
}

function normalizeAssigneeValue(string $value): string
{
    return trim($value);
}

function isValidAssigneeValue(string $value): bool
{
    if ($value === '') {
        return false;
    }

    if (strcasecmp($value, 'Self') === 0) {
        return false;
    }

    return filter_var($value, FILTER_VALIDATE_EMAIL) !== false;
}

function fetchAssignees(PDO $db): array
{
    ensureAssigneesTable($db);
    seedDefaultAssignees($db);

    $stmt = $db->query(
        'SELECT id, value, sort_order, created_at
         FROM assignees
         ORDER BY sort_order ASC, value ASC'
    );

    return $stmt->fetchAll();
}

function handleAssigneesRoute(array $segments): void
{
    $db = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET /assignees
    if (count($segments) === 1 && $method === 'GET') {
        jsonResponse(['assignees' => fetchAssignees($db)]);
    }

    // POST /assignees
    if (count($segments) === 1 && $method === 'POST') {
        $input = getJsonInput();
        $value = normalizeAssigneeValue((string) ($input['value'] ?? ''));

        if (!isValidAssigneeValue($value)) {
            jsonResponse(['error' => 'Enter a valid email address'], 400);
        }

        ensureAssigneesTable($db);

        $existing = $db->prepare('SELECT id FROM assignees WHERE LOWER(value) = LOWER(?)');
        $existing->execute([$value]);
        if ($existing->fetch()) {
            jsonResponse(['error' => 'Assignee already exists'], 409);
        }

        $sortOrder = (int) $db->query('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM assignees')->fetchColumn();

        $stmt = $db->prepare('INSERT INTO assignees (value, sort_order) VALUES (?, ?)');
        $stmt->execute([strtolower($value), $sortOrder]);

        jsonResponse([
            'assignee' => [
                'id' => (int) $db->lastInsertId(),
                'value' => strtolower($value),
                'sort_order' => $sortOrder,
            ],
        ], 201);
    }

    // DELETE /assignees/{id}
    if (count($segments) === 2 && is_numeric($segments[1]) && $method === 'DELETE') {
        $id = (int) $segments[1];
        if ($id <= 0) {
            jsonResponse(['error' => 'Invalid assignee id'], 400);
        }

        ensureAssigneesTable($db);

        $stmt = $db->prepare('DELETE FROM assignees WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'Assignee not found'], 404);
        }

        jsonResponse(['success' => true]);
    }

    jsonResponse(['error' => 'Not found'], 404);
}
