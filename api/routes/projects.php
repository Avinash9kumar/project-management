<?php

declare(strict_types=1);

function handleProjectsRoute(array $segments): void
{
    $db = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET /projects
    if (count($segments) === 1 && $method === 'GET') {
        $stmt = $db->query(
            'SELECT id, project_id, title, end_date, created_at, updated_at FROM projects ORDER BY created_at DESC'
        );
        jsonResponse(['projects' => $stmt->fetchAll()]);
    }

    // POST /projects
    if (count($segments) === 1 && $method === 'POST') {
        $input = getJsonInput();
        $projectId = trim($input['project_id'] ?? '');
        $title = trim($input['title'] ?? '');
        $endDate = validateDate($input['end_date'] ?? null, 'end_date');

        if ($projectId === '' || $title === '') {
            jsonResponse(['error' => 'project_id and title are required'], 400);
        }

        if (strlen($projectId) > 50) {
            jsonResponse(['error' => 'project_id must be 50 characters or less'], 400);
        }

        $check = $db->prepare('SELECT id FROM projects WHERE project_id = ?');
        $check->execute([$projectId]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'Project ID already exists'], 409);
        }

        $stmt = $db->prepare(
            'INSERT INTO projects (project_id, title, end_date) VALUES (?, ?, ?)'
        );
        $stmt->execute([$projectId, $title, $endDate]);
        $id = (int) $db->lastInsertId();

        jsonResponse([
            'project' => [
                'id' => $id,
                'project_id' => $projectId,
                'title' => $title,
                'end_date' => $endDate,
            ],
        ], 201);
    }

    // GET /projects/{id}, PUT /projects/{id}, DELETE /projects/{id}
    if (count($segments) === 2 && is_numeric($segments[1])) {
        $id = (int) $segments[1];

        if ($method === 'GET') {
            $stmt = $db->prepare(
                'SELECT id, project_id, title, end_date, created_at, updated_at FROM projects WHERE id = ?'
            );
            $stmt->execute([$id]);
            $project = $stmt->fetch();

            if (!$project) {
                jsonResponse(['error' => 'Project not found'], 404);
            }

            $countsStmt = $db->prepare(
                'SELECT timeline_type, COUNT(*) as count
                 FROM timeline_items
                 WHERE project_id = ?
                 GROUP BY timeline_type'
            );
            $countsStmt->execute([$id]);
            $counts = $countsStmt->fetchAll();

            $timelineSummary = [];
            foreach (TIMELINE_TYPES as $type) {
                $timelineSummary[$type] = [
                    'label' => TIMELINE_LABELS[$type],
                    'count' => 0,
                ];
            }
            foreach ($counts as $row) {
                $type = $row['timeline_type'];
                if (!isset($timelineSummary[$type])) {
                    $timelineSummary[$type] = [
                        'label' => TIMELINE_LABELS[$type] ?? ucwords(str_replace('_', ' ', $type)),
                        'count' => 0,
                    ];
                }
                $timelineSummary[$type]['count'] = (int) $row['count'];
            }

            $project['timelines'] = $timelineSummary;
            jsonResponse(['project' => $project]);
        }

        if ($method === 'PUT') {
            $input = getJsonInput();
            $stmt = $db->prepare('SELECT * FROM projects WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();

            if (!$existing) {
                jsonResponse(['error' => 'Project not found'], 404);
            }

            $title = isset($input['title']) ? trim($input['title']) : $existing['title'];
            $endDate = array_key_exists('end_date', $input)
                ? validateDate($input['end_date'], 'end_date')
                : $existing['end_date'];

            if ($title === '') {
                jsonResponse(['error' => 'title cannot be empty'], 400);
            }

            $update = $db->prepare('UPDATE projects SET title = ?, end_date = ? WHERE id = ?');
            $update->execute([$title, $endDate, $id]);

            jsonResponse([
                'project' => [
                    'id' => $id,
                    'project_id' => $existing['project_id'],
                    'title' => $title,
                    'end_date' => $endDate,
                ],
            ]);
        }

        if ($method === 'DELETE') {
            $stmt = $db->prepare('DELETE FROM projects WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Project not found'], 404);
            }

            jsonResponse(['message' => 'Project deleted']);
        }
    }

    jsonResponse(['error' => 'Method not allowed'], 405);
}
