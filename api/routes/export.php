<?php

declare(strict_types=1);

function handleExportRoute(array $segments): void
{
    $db = Database::getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if (count($segments) !== 2 || $method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $format = $segments[1];
    $projectId = isset($_GET['project_id']) ? (int) $_GET['project_id'] : 0;

    if ($projectId <= 0) {
        jsonResponse(['error' => 'project_id is required'], 400);
    }

    $projectStmt = $db->prepare('SELECT id, project_id, title, end_date FROM projects WHERE id = ?');
    $projectStmt->execute([$projectId]);
    $project = $projectStmt->fetch();

    if (!$project) {
        jsonResponse(['error' => 'Project not found'], 404);
    }

    $itemsStmt = $db->prepare(
        'SELECT timeline_type, title, description, status, start_date, due_date, custom_fields, sort_order
         FROM timeline_items WHERE project_id = ? ORDER BY timeline_type, sort_order, id'
    );
    $itemsStmt->execute([$projectId]);
    $items = attachCustomFieldsToItems($db, $itemsStmt->fetchAll());

    if ($format === 'excel' || $format === 'csv') {
        exportCsv($project, $items);
    }

    if ($format === 'pdf') {
        exportPdfHtml($project, $items);
    }

    jsonResponse(['error' => 'Invalid export format. Use excel or pdf'], 400);
}

function exportCsv(array $project, array $items): void
{
    $filename = 'timeline_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $project['project_id']) . '.csv';

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Access-Control-Allow-Origin: *');

    $out = fopen('php://output', 'w');
    fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM for Excel

    fputcsv($out, ['Project ID', $project['project_id']]);
    fputcsv($out, ['Project Title', $project['title']]);
    fputcsv($out, ['Project End Date', $project['end_date'] ?? '']);
    fputcsv($out, []);

    fputcsv($out, [
        'Timeline Type',
        'Title',
        'Description',
        'Status',
        'Start Date',
        'Due Date',
        'Custom Fields',
    ]);

    foreach ($items as $item) {
        $customStr = '';
        if (!empty($item['custom_fields']) && is_array($item['custom_fields'])) {
            $pairs = [];
            foreach ($item['custom_fields'] as $k => $v) {
                $pairs[] = "$k: $v";
            }
            $customStr = implode('; ', $pairs);
        }

        fputcsv($out, [
            TIMELINE_LABELS[$item['timeline_type']] ?? $item['timeline_type'],
            $item['title'],
            $item['description'] ?? '',
            $item['status'],
            $item['start_date'] ?? '',
            $item['due_date'] ?? '',
            $customStr,
        ]);
    }

    fclose($out);
    exit;
}

function exportPdfHtml(array $project, array $items): void
{
    $filename = 'timeline_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $project['project_id']) . '.html';

    header('Content-Type: text/html; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Access-Control-Allow-Origin: *');

    $grouped = [];
    foreach ($items as $item) {
        $type = $item['timeline_type'];
        $grouped[$type][] = $item;
    }

    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Timeline Export</title>';
    echo '<style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #1d4ed8; }
        h2 { color: #2563eb; margin-top: 30px; border-bottom: 2px solid #dbeafe; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background: #eff6ff; }
        .meta { margin: 10px 0; }
        @media print { body { margin: 20px; } }
    </style></head><body>';

    echo '<h1>' . htmlspecialchars($project['title']) . '</h1>';
    echo '<div class="meta"><strong>Project ID:</strong> ' . htmlspecialchars($project['project_id']) . '</div>';
    if ($project['end_date']) {
        echo '<div class="meta"><strong>Project End Date:</strong> ' . htmlspecialchars($project['end_date']) . '</div>';
    }
    echo '<div class="meta"><strong>Exported:</strong> ' . date('Y-m-d H:i') . '</div>';

    foreach (TIMELINE_TYPES as $type) {
        if (empty($grouped[$type])) continue;

        echo '<h2>' . htmlspecialchars(TIMELINE_LABELS[$type]) . '</h2>';
        echo '<table><tr><th>#</th><th>Title</th><th>Status</th><th>Start</th><th>Due</th><th>Details</th></tr>';

        foreach ($grouped[$type] as $i => $item) {
            $custom = '';
            if (!empty($item['custom_fields'])) {
                foreach ($item['custom_fields'] as $k => $v) {
                    $custom .= htmlspecialchars("$k: $v") . '<br>';
                }
            }

            echo '<tr>';
            echo '<td>' . ($i + 1) . '</td>';
            echo '<td>' . htmlspecialchars($item['title']) . '</td>';
            echo '<td>' . htmlspecialchars($item['status']) . '</td>';
            echo '<td>' . htmlspecialchars($item['start_date'] ?? '') . '</td>';
            echo '<td>' . htmlspecialchars($item['due_date'] ?? '') . '</td>';
            echo '<td>' . ($item['description'] ? htmlspecialchars($item['description']) . '<br>' : '') . $custom . '</td>';
            echo '</tr>';
        }

        echo '</table>';
    }

    echo '<script>window.onload=function(){window.print();}</script>';
    echo '</body></html>';
    exit;
}
