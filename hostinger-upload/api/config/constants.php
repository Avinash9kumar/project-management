<?php

declare(strict_types=1);

const TIMELINE_TYPES = [
    'programming',
    'launch',
    'qc',
    'tabs_syntax',
    'oe_coding',
    'tabs',
    'invite',
    'reminders',
    'project_end_date',
];

const TIMELINE_LABELS = [
    'programming' => 'Programming Timeline',
    'launch' => 'Launch Timeline',
    'qc' => 'QC Timeline',
    'tabs_syntax' => 'Tabs Syntax Timeline',
    'oe_coding' => 'OE Coding Timeline',
    'tabs' => 'Tabs Timeline',
    'invite' => 'Invite Timeline',
    'reminders' => 'Reminders Timeline',
    'project_end_date' => 'Project End Date',
];

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

const PUBLIC_ROUTES = ['auth', 'cron'];

function isValidTimelineType(string $type): bool
{
    if (in_array($type, TIMELINE_TYPES, true)) {
        return true;
    }

    return $type !== ''
        && strlen($type) <= 50
        && (bool) preg_match('/^[a-z][a-z0-9_]*$/', $type);
}

function isValidStatus(string $status): bool
{
    return in_array($status, VALID_STATUSES, true);
}

function validateDate(?string $date, string $fieldName): ?string
{
    if ($date === null || $date === '') {
        return null;
    }

    $parsed = DateTime::createFromFormat('Y-m-d', $date);
    if (!$parsed || $parsed->format('Y-m-d') !== $date) {
        jsonResponse(['error' => "$fieldName must be YYYY-MM-DD"], 400);
    }

    return $date;
}

function attachCustomFieldsToItems(PDO $db, array $items): array
{
    foreach ($items as &$item) {
        if (isset($item['custom_fields']) && is_string($item['custom_fields'])) {
            $item['custom_fields'] = json_decode($item['custom_fields'], true) ?? [];
        } elseif (!isset($item['custom_fields'])) {
            $item['custom_fields'] = [];
        }
    }
    unset($item);

    return $items;
}
