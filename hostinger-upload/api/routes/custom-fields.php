<?php

declare(strict_types=1);

function handleCustomFieldsRoute(array $segments): void
{
    $db = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    // GET /custom-fields?timeline_type=programming
    if (count($segments) === 1 && $method === 'GET') {
        $type = $_GET['timeline_type'] ?? '';

        if ($type === '') {
            $stmt = $db->query(
                'SELECT id, timeline_type, field_key, field_label, field_type, options_json, sort_order
                 FROM custom_field_definitions ORDER BY timeline_type, sort_order'
            );
            $fields = $stmt->fetchAll();
        } else {
            if (!timelineTypeAllowed($type)) {
                jsonResponse(['error' => 'Invalid timeline type'], 400);
            }

            $stmt = $db->prepare(
                'SELECT id, timeline_type, field_key, field_label, field_type, options_json, sort_order
                 FROM custom_field_definitions WHERE timeline_type = ? ORDER BY sort_order'
            );
            $stmt->execute([$type]);
            $fields = $stmt->fetchAll();
        }

        foreach ($fields as &$field) {
            if (isset($field['options_json']) && is_string($field['options_json'])) {
                $field['options_json'] = json_decode($field['options_json'], true);
            }
        }
        unset($field);

        jsonResponse(['fields' => $fields]);
    }

    // POST /custom-fields
    if (count($segments) === 1 && $method === 'POST') {
        $input = getJsonInput();
        $type = $input['timeline_type'] ?? '';
        $fieldKey = trim($input['field_key'] ?? '');
        $fieldLabel = trim($input['field_label'] ?? '');
        $fieldType = $input['field_type'] ?? 'text';
        $options = $input['options_json'] ?? null;
        $sortOrder = (int) ($input['sort_order'] ?? 0);

        if (!timelineTypeAllowed($type) || $fieldKey === '' || $fieldLabel === '') {
            jsonResponse(['error' => 'timeline_type, field_key, and field_label are required'], 400);
        }

        if (!in_array($fieldType, ['text', 'number', 'date', 'select'], true)) {
            jsonResponse(['error' => 'Invalid field_type'], 400);
        }

        $optionsJson = $options !== null ? json_encode($options) : null;

        $stmt = $db->prepare(
            'INSERT INTO custom_field_definitions (timeline_type, field_key, field_label, field_type, options_json, sort_order)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([$type, $fieldKey, $fieldLabel, $fieldType, $optionsJson, $sortOrder]);

        jsonResponse([
            'field' => [
                'id' => (int) $db->lastInsertId(),
                'timeline_type' => $type,
                'field_key' => $fieldKey,
                'field_label' => $fieldLabel,
                'field_type' => $fieldType,
                'options_json' => $options,
                'sort_order' => $sortOrder,
            ],
        ], 201);
    }

    // DELETE /custom-fields/{id}
    if (count($segments) === 2 && is_numeric($segments[1]) && $method === 'DELETE') {
        $id = (int) $segments[1];
        $stmt = $db->prepare('DELETE FROM custom_field_definitions WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'Field definition not found'], 404);
        }

        jsonResponse(['message' => 'Field definition deleted']);
    }

    jsonResponse(['error' => 'Method not allowed'], 405);
}
