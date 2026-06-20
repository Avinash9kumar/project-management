<?php

declare(strict_types=1);

if (!function_exists('timelineTypeAllowed')) {
    function timelineTypeAllowed(string $type): bool
    {
        if ($type === '') {
            return false;
        }

        if (function_exists('isValidTimelineType') && isValidTimelineType($type)) {
            return true;
        }

        return strlen($type) <= 50 && (bool) preg_match('/^[a-z][a-z0-9_]*$/', $type);
    }
}

if (!function_exists('timelineScheduleChanged')) {
    function timelineScheduleChanged(
        array $existing,
        ?string $startDate,
        ?string $dueDate,
        array $customFields,
        array $existingCustom
    ): bool {
        if (($existing['start_date'] ?? null) != $startDate) {
            return true;
        }
        if (($existing['due_date'] ?? null) != $dueDate) {
            return true;
        }

        foreach (['timeline_mode', 'start_time', 'end_time', 'end_duration_hours'] as $key) {
            if (($existingCustom[$key] ?? null) != ($customFields[$key] ?? null)) {
                return true;
            }
        }

        return false;
    }
}

function handleTimelineRoute(array $segments): void
{
    $db = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET /timeline/report — all timelines sorted by least time remaining
    if (count($segments) === 2 && ($segments[1] ?? '') === 'report' && $method === 'GET') {
        $stmt = $db->query(
            'SELECT ti.*, p.project_id AS project_code, p.title AS project_title
             FROM timeline_items ti
             INNER JOIN projects p ON p.id = ti.project_id'
        );
        $rows = $stmt->fetchAll();
        $now = time();
        $report = [];

        foreach ($rows as $row) {
            $custom = decodeItemCustomFields($row);
            $remaining = getTimelineRemainingSeconds($row, $now);
            $progress = getTimelineProgressPercent($row, $now);
            $assignTo = trim((string) ($custom['assign_to'] ?? $row['title'] ?? ''));

            $report[] = [
                'id' => (int) $row['id'],
                'project_id' => (int) $row['project_id'],
                'project_code' => $row['project_code'],
                'project_title' => $row['project_title'],
                'timeline_type' => $row['timeline_type'],
                'title' => $row['title'],
                'description' => $row['description'],
                'status' => $row['status'],
                'start_date' => $row['start_date'],
                'due_date' => $row['due_date'],
                'custom_fields' => $custom,
                'assign_to' => $assignTo,
                'remaining_seconds' => $remaining,
                'progress_percent' => $progress !== null ? round($progress, 1) : null,
            ];
        }

        usort($report, static function (array $a, array $b): int {
            $aDone = ($a['status'] ?? '') === 'completed';
            $bDone = ($b['status'] ?? '') === 'completed';
            if ($aDone !== $bDone) {
                return $aDone <=> $bDone;
            }

            $aRem = $a['remaining_seconds'];
            $bRem = $b['remaining_seconds'];
            if ($aRem === null && $bRem === null) {
                return strcmp((string) $a['project_title'], (string) $b['project_title']);
            }
            if ($aRem === null) {
                return 1;
            }
            if ($bRem === null) {
                return -1;
            }

            return $aRem <=> $bRem;
        });

        jsonResponse([
            'items' => $report,
            'generated_at' => date('c'),
            'total' => count($report),
        ]);
    }

    // GET /timeline?project_id=1&type=programming
    if (count($segments) === 1 && $method === 'GET') {
        $projectId = isset($_GET['project_id']) ? (int) $_GET['project_id'] : 0;
        $type = $_GET['type'] ?? '';

        if ($projectId <= 0) {
            jsonResponse(['error' => 'project_id query parameter is required'], 400);
        }

        if ($type !== '' && !timelineTypeAllowed($type)) {
            jsonResponse(['error' => 'Invalid timeline type'], 400);
        }

        $projectCheck = $db->prepare('SELECT id FROM projects WHERE id = ?');
        $projectCheck->execute([$projectId]);
        if (!$projectCheck->fetch()) {
            jsonResponse(['error' => 'Project not found'], 404);
        }

        $select = 'SELECT id, project_id, timeline_type, title, description, status, start_date, due_date, sort_order, custom_fields, created_at, updated_at FROM timeline_items';

        if ($type !== '') {
            $stmt = $db->prepare(
                "$select WHERE project_id = ? AND timeline_type = ? ORDER BY sort_order ASC, id ASC"
            );
            $stmt->execute([$projectId, $type]);
        } else {
            $stmt = $db->prepare(
                "$select WHERE project_id = ? ORDER BY timeline_type ASC, sort_order ASC, id ASC"
            );
            $stmt->execute([$projectId]);
        }

        $items = attachCustomFieldsToItems($db, $stmt->fetchAll());
        jsonResponse(['items' => $items]);
    }

    // POST /timeline
    if (count($segments) === 1 && $method === 'POST') {
        $input = getJsonInput();

        $projectId = (int) ($input['project_id'] ?? 0);
        $type = $input['timeline_type'] ?? '';
        $title = trim($input['title'] ?? '');
        $description = trim($input['description'] ?? '');
        $status = $input['status'] ?? 'pending';
        $startDate = validateDate($input['start_date'] ?? null, 'start_date');
        $dueDate = validateDate($input['due_date'] ?? null, 'due_date');
        $sortOrder = (int) ($input['sort_order'] ?? 0);
        $customFields = $input['custom_fields'] ?? [];

        if ($projectId <= 0) {
            jsonResponse(['error' => 'project_id is required'], 400);
        }

        if ($title === '') {
            jsonResponse(['error' => 'Assign to is required'], 400);
        }

        if (!timelineTypeAllowed($type)) {
            jsonResponse(['error' => 'Invalid timeline type'], 400);
        }

        if (!isValidStatus($status)) {
            jsonResponse(['error' => 'Invalid status'], 400);
        }

        $projectCheck = $db->prepare('SELECT id, project_id, title FROM projects WHERE id = ?');
        $projectCheck->execute([$projectId]);
        $project = $projectCheck->fetch();
        if (!$project) {
            jsonResponse(['error' => 'Project not found'], 404);
        }

        if ($startDate === null) {
            jsonResponse(['error' => 'start_date is required'], 400);
        }

        $bump = $db->prepare(
            'UPDATE timeline_items SET sort_order = sort_order + 1 WHERE project_id = ? AND timeline_type = ?'
        );
        $bump->execute([$projectId, $type]);
        $sortOrder = 0;

        $customFieldsJson = !empty($customFields) ? json_encode($customFields) : null;

        $stmt = $db->prepare(
            'INSERT INTO timeline_items (project_id, timeline_type, title, description, status, start_date, due_date, sort_order, custom_fields)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $projectId,
            $type,
            $title,
            $description !== '' ? $description : null,
            $status,
            $startDate,
            $dueDate,
            $sortOrder,
            $customFieldsJson,
        ]);

        $id = (int) $db->lastInsertId();

        $assignTo = $title;
        if (is_array($customFields) && isset($customFields['assign_to']) && is_string($customFields['assign_to'])) {
            $assignTo = trim($customFields['assign_to']);
        }

        $authUser = getAuthUser();
        $notifications = sendTimelineAssigneeEmails(
            $project,
            $type,
            $assignTo,
            $description,
            $status,
            $startDate,
            $dueDate,
            is_array($customFields) ? $customFields : [],
            $id,
            $authUser['username'] ?? null
        );

        jsonResponse([
            'item' => [
                'id' => $id,
                'project_id' => $projectId,
                'timeline_type' => $type,
                'title' => $title,
                'description' => $description !== '' ? $description : null,
                'status' => $status,
                'start_date' => $startDate,
                'due_date' => $dueDate,
                'sort_order' => $sortOrder,
                'custom_fields' => $customFields,
            ],
            'notifications' => $notifications,
        ], 201);
    }

    // PUT /timeline/{id} or DELETE /timeline/{id}
    if (count($segments) === 2 && is_numeric($segments[1])) {
        $id = (int) $segments[1];

        if ($method === 'PUT') {
            $input = getJsonInput();

            $stmt = $db->prepare('SELECT * FROM timeline_items WHERE id = ?');
            $stmt->execute([$id]);
            $existing = $stmt->fetch();

            if (!$existing) {
                jsonResponse(['error' => 'Timeline item not found'], 404);
            }

            $title = isset($input['title']) ? trim($input['title']) : $existing['title'];
            $description = array_key_exists('description', $input)
                ? (trim($input['description']) !== '' ? trim($input['description']) : null)
                : $existing['description'];
            $status = $input['status'] ?? $existing['status'];
            $startDate = array_key_exists('start_date', $input)
                ? validateDate($input['start_date'], 'start_date')
                : $existing['start_date'];
            $dueDate = array_key_exists('due_date', $input)
                ? validateDate($input['due_date'], 'due_date')
                : $existing['due_date'];
            $sortOrder = isset($input['sort_order']) ? (int) $input['sort_order'] : (int) $existing['sort_order'];

            $existingCustom = [];
            if ($existing['custom_fields']) {
                $existingCustom = json_decode($existing['custom_fields'], true) ?? [];
            }
            $customFields = $input['custom_fields'] ?? $existingCustom;

            if ($title === '') {
                jsonResponse(['error' => 'title cannot be empty'], 400);
            }

            if (!isValidStatus($status)) {
                jsonResponse(['error' => 'Invalid status'], 400);
            }

            if (timelineScheduleChanged($existing, $startDate, $dueDate, $customFields, $existingCustom)) {
                resetTimelineReminderState($customFields);
            }

            $customFieldsJson = !empty($customFields) ? json_encode($customFields) : null;

            $update = $db->prepare(
                'UPDATE timeline_items
                 SET title = ?, description = ?, status = ?, start_date = ?, due_date = ?, sort_order = ?, custom_fields = ?
                 WHERE id = ?'
            );
            $update->execute([$title, $description, $status, $startDate, $dueDate, $sortOrder, $customFieldsJson, $id]);

            $projectStmt = $db->prepare('SELECT id, project_id, title FROM projects WHERE id = ?');
            $projectStmt->execute([(int) $existing['project_id']]);
            $project = $projectStmt->fetch();

            $assignTo = $title;
            if (is_array($customFields) && isset($customFields['assign_to']) && is_string($customFields['assign_to'])) {
                $assignTo = trim($customFields['assign_to']);
            }

            $authUser = getAuthUser();
            $notifications = ['sent' => 0, 'failed' => 0, 'skipped' => 0, 'recipients' => []];

            if ($project) {
                $notifications = sendTimelineAssigneeEmails(
                    $project,
                    (string) $existing['timeline_type'],
                    $assignTo,
                    (string) ($description ?? ''),
                    $status,
                    $startDate,
                    $dueDate,
                    is_array($customFields) ? $customFields : [],
                    $id,
                    $authUser['username'] ?? null,
                    'Your timeline task has been updated. Please review the latest details below.',
                    'Updated'
                );
            }

            jsonResponse([
                'item' => [
                    'id' => $id,
                    'project_id' => (int) $existing['project_id'],
                    'timeline_type' => $existing['timeline_type'],
                    'title' => $title,
                    'description' => $description,
                    'status' => $status,
                    'start_date' => $startDate,
                    'due_date' => $dueDate,
                    'sort_order' => $sortOrder,
                    'custom_fields' => $customFields,
                ],
                'notifications' => $notifications,
            ]);
        }

        if ($method === 'DELETE') {
            $stmt = $db->prepare('DELETE FROM timeline_items WHERE id = ?');
            $stmt->execute([$id]);

            if ($stmt->rowCount() === 0) {
                jsonResponse(['error' => 'Timeline item not found'], 404);
            }

            jsonResponse(['message' => 'Timeline item deleted']);
        }
    }

    jsonResponse(['error' => 'Method not allowed'], 405);
}
