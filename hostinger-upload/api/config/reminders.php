<?php

declare(strict_types=1);

function decodeItemCustomFields(array $item): array
{
    $custom = $item['custom_fields'] ?? [];
    if (is_string($custom)) {
        $custom = json_decode($custom, true) ?? [];
    }

    return is_array($custom) ? $custom : [];
}

function getReminderThresholds(): array
{
    $mailConfig = getMailConfig();
    $thresholds = $mailConfig['reminder_thresholds'] ?? [75];

    if (!is_array($thresholds)) {
        return [75];
    }

    $normalized = [];
    foreach ($thresholds as $value) {
        $intValue = (int) $value;
        if ($intValue > 0 && $intValue < 100) {
            $normalized[] = $intValue;
        }
    }

    sort($normalized);

    return $normalized !== [] ? $normalized : [75];
}

function parseDateTimeOnTimeline(string $date, string $time): ?int
{
    $time = trim($time);
    if ($time === '') {
        return strtotime($date . ' 00:00:00') ?: null;
    }

    $formats = ['Y-m-d H:i', 'Y-m-d H:i:s'];
    foreach ($formats as $format) {
        $dt = DateTime::createFromFormat($format, $date . ' ' . $time);
        if ($dt instanceof DateTime) {
            return $dt->getTimestamp();
        }
    }

    return strtotime($date . ' 00:00:00') ?: null;
}

function getTimelineItemTimeWindow(array $item): ?array
{
    $startDate = $item['start_date'] ?? null;
    if ($startDate === null || $startDate === '') {
        return null;
    }

    $custom = decodeItemCustomFields($item);
    $mode = $custom['timeline_mode'] ?? 'date';
    $dueDate = $item['due_date'] ?? $startDate;

    if ($mode === 'same_day') {
        $startTs = parseDateTimeOnTimeline($startDate, (string) ($custom['start_time'] ?? '00:00'));
        $endTs = parseDateTimeOnTimeline(
            $dueDate,
            (string) ($custom['end_time'] ?? $custom['start_time'] ?? '23:59')
        );
    } else {
        $startTs = strtotime($startDate . ' 00:00:00') ?: null;
        $endTs = strtotime($dueDate . ' 23:59:59') ?: null;
    }

    if ($startTs === null || $endTs === null || $endTs <= $startTs) {
        return null;
    }

    return ['start' => $startTs, 'end' => $endTs];
}

function getTimelineProgressPercent(array $item, ?int $now = null): ?float
{
    $window = getTimelineItemTimeWindow($item);
    if ($window === null) {
        return null;
    }

    $now = $now ?? time();
    if ($now < $window['start']) {
        return 0.0;
    }
    if ($now >= $window['end']) {
        return 100.0;
    }

    $duration = $window['end'] - $window['start'];
    $elapsed = $now - $window['start'];

    return ($elapsed / $duration) * 100;
}

function getTimelineRemainingSeconds(array $item, ?int $now = null): ?int
{
    $window = getTimelineItemTimeWindow($item);
    if ($window === null) {
        return null;
    }

    $now = $now ?? time();

    return $window['end'] - $now;
}

function isTimelineItemCompleted(array $item): bool
{
    return ($item['status'] ?? '') === 'completed';
}

function isTimelinePassedNotified(array $custom): bool
{
    return !empty($custom['timeline_passed_notified']);
}

function fetchTimelineItemStatus(PDO $db, int $itemId): ?string
{
    $stmt = $db->prepare('SELECT status FROM timeline_items WHERE id = ?');
    $stmt->execute([$itemId]);
    $status = $stmt->fetchColumn();

    return $status === false ? null : (string) $status;
}

function getPendingReminderThresholds(array $item, ?int $now = null): array
{
    if (isTimelineItemCompleted($item)) {
        return [];
    }

    $progress = getTimelineProgressPercent($item, $now);
    if ($progress === null || $progress >= 100) {
        return [];
    }

    $custom = decodeItemCustomFields($item);
    $sent = $custom['email_reminders_sent'] ?? [];
    if (!is_array($sent)) {
        $sent = [];
    }

    $pending = [];
    foreach (getReminderThresholds() as $threshold) {
        if ($progress >= $threshold && !in_array($threshold, $sent, true)) {
            $pending[] = $threshold;
        }
    }

    return $pending;
}

/** Friendly subject suffix for the 75% progress reminder. */
function reminderSubjectSuffix(int $threshold): string
{
    return match ($threshold) {
        75 => 'Reminder — 75% check-in',
        default => 'Reminder — progress check',
    };
}

/** Friendly intro for the 75% progress reminder (create email + 100% overdue are separate). */
function reminderContentForThreshold(int $threshold): array
{
    return [
        'This is a friendly check-in on your timeline task — you are three-quarters through the scheduled window.',
        ['NOTE', '  Please review your progress and update the status if needed.'],
    ];
}

function sendTimelineReminderEmails(
    array $project,
    array $item,
    string $assignTo,
    int $threshold
): array {
    if (isTimelineItemCompleted($item)) {
        return ['sent' => 0, 'failed' => 0, 'skipped' => 1, 'recipients' => []];
    }

    $custom = decodeItemCustomFields($item);
    $timelineType = (string) ($item['timeline_type'] ?? '');
    $description = trim((string) ($item['description'] ?? ''));
    $status = (string) ($item['status'] ?? 'pending');
    $itemId = (int) ($item['id'] ?? 0);

    [$intro, $extraLines] = reminderContentForThreshold($threshold);
    $subjectSuffix = reminderSubjectSuffix($threshold);

    return sendTimelineEmailWithAssignment(
        $project,
        $timelineType,
        $status,
        $item['start_date'] ?? null,
        $item['due_date'] ?? null,
        $custom,
        $description,
        $itemId,
        $assignTo,
        null,
        $intro,
        $subjectSuffix,
        $extraLines
    );
}

function sendTimelineOverdueAssigneeEmail(
    array $project,
    array $item,
    string $assignTo
): array {
    if (isTimelineItemCompleted($item)) {
        return ['sent' => 0, 'failed' => 0, 'skipped' => 1, 'recipients' => []];
    }

    $custom = decodeItemCustomFields($item);
    $timelineType = (string) ($item['timeline_type'] ?? '');
    $description = trim((string) ($item['description'] ?? ''));
    $status = (string) ($item['status'] ?? 'pending');
    $itemId = (int) ($item['id'] ?? 0);

    $intro = "The scheduled window for this task has ended. If you have finished the work, please mark it as completed using the link below.\n\n"
        . 'If the task is not yet completed, please contact your manager Avinash (avinash@ae-research.com) immediately for further action.';
    $extraLines = [
        'NOTE',
        '  The scheduled end time has been reached.',
    ];

    return sendTimelineEmailWithAssignment(
        $project,
        $timelineType,
        $status,
        $item['start_date'] ?? null,
        $item['due_date'] ?? null,
        $custom,
        $description,
        $itemId,
        $assignTo,
        null,
        $intro,
        'Schedule Ended — Please Update Status',
        $extraLines
    );
}

function markRemindersSent(PDO $db, int $itemId, array $customFields, array $newThresholds): void
{
    $sent = $customFields['email_reminders_sent'] ?? [];
    if (!is_array($sent)) {
        $sent = [];
    }

    foreach ($newThresholds as $threshold) {
        if (!in_array($threshold, $sent, true)) {
            $sent[] = $threshold;
        }
    }

    sort($sent);
    $customFields['email_reminders_sent'] = $sent;

    $stmt = $db->prepare('UPDATE timeline_items SET custom_fields = ? WHERE id = ?');
    $stmt->execute([json_encode($customFields), $itemId]);
}

function markTimelinePassedNotified(PDO $db, int $itemId, array $customFields): void
{
    $customFields['timeline_passed_notified'] = true;

    $sent = $customFields['email_reminders_sent'] ?? [];
    if (!is_array($sent)) {
        $sent = [];
    }

    foreach (getReminderThresholds() as $threshold) {
        if (!in_array($threshold, $sent, true)) {
            $sent[] = $threshold;
        }
    }

    sort($sent);
    $customFields['email_reminders_sent'] = $sent;

    $stmt = $db->prepare('UPDATE timeline_items SET custom_fields = ? WHERE id = ?');
    $stmt->execute([json_encode($customFields), $itemId]);
}

function resetTimelineReminderState(array &$customFields): void
{
    unset($customFields['email_reminders_sent'], $customFields['timeline_passed_notified']);
}

function processTimelineReminders(PDO $db): array
{
    $stmt = $db->query(
        'SELECT ti.*, p.project_id AS project_code, p.title AS project_title
         FROM timeline_items ti
         INNER JOIN projects p ON p.id = ti.project_id
         WHERE ti.status != \'completed\'
         AND ti.start_date IS NOT NULL'
    );
    $rows = $stmt->fetchAll();

    $summary = [
        'checked' => 0,
        'reminders_sent' => 0,
        'overdue_notified' => 0,
        'admin_notified' => 0,
        'failed' => 0,
        'skipped_completed' => 0,
        'items' => [],
    ];

    foreach ($rows as $row) {
        $summary['checked']++;
        $itemId = (int) $row['id'];

        $currentStatus = fetchTimelineItemStatus($db, $itemId);
        if ($currentStatus === null || $currentStatus === 'completed') {
            $summary['skipped_completed']++;
            continue;
        }

        $row['status'] = $currentStatus;
        $custom = decodeItemCustomFields($row);
        $row['custom_fields'] = $custom;

        $assignTo = trim((string) ($custom['assign_to'] ?? $row['title'] ?? ''));
        if ($assignTo === '') {
            continue;
        }

        $project = [
            'id' => (int) $row['project_id'],
            'project_id' => $row['project_code'],
            'title' => $row['project_title'],
        ];

        $progress = getTimelineProgressPercent($row);

        // Timeline passed (100%) — one gentle assignee email + admin alert (once)
        if ($progress !== null && $progress >= 100 && !isTimelinePassedNotified($custom)) {
            $assigneeResult = sendTimelineOverdueAssigneeEmail($project, $row, $assignTo);
            $adminSent = sendTimelinePassedAdminNotification($project, $row);

            $summary['failed'] += $assigneeResult['failed'];

            if ($assigneeResult['sent'] > 0) {
                $summary['reminders_sent'] += $assigneeResult['sent'];
            }
            if ($adminSent) {
                $summary['admin_notified']++;
            }

            if ($assigneeResult['sent'] > 0 || $adminSent) {
                markTimelinePassedNotified($db, $itemId, $custom);
                $summary['overdue_notified']++;
                $summary['items'][] = [
                    'id' => $itemId,
                    'type' => 'overdue',
                ];
            }

            continue;
        }

        if ($progress !== null && $progress >= 100) {
            continue;
        }

        // Progress reminders — send only the highest pending threshold per run
        $pending = getPendingReminderThresholds($row);
        if ($pending === []) {
            continue;
        }

        $threshold = max($pending);

        $latestStatus = fetchTimelineItemStatus($db, $itemId);
        if ($latestStatus === null || $latestStatus === 'completed') {
            $summary['skipped_completed']++;
            continue;
        }

        $row['status'] = $latestStatus;
        $result = sendTimelineReminderEmails($project, $row, $assignTo, $threshold);
        $summary['failed'] += $result['failed'];
        $summary['skipped_completed'] += $result['skipped'];

        if ($result['sent'] > 0) {
            $summary['reminders_sent'] += $result['sent'];
            markRemindersSent($db, $itemId, $custom, [$threshold]);
            $summary['items'][] = [
                'id' => $itemId,
                'thresholds' => [$threshold],
            ];
        }
    }

    return $summary;
}

function getReminderDiagnostics(PDO $db): array
{
    $stmt = $db->query(
        'SELECT ti.*, p.project_id AS project_code, p.title AS project_title
         FROM timeline_items ti
         INNER JOIN projects p ON p.id = ti.project_id
         WHERE ti.status != \'completed\'
         AND ti.start_date IS NOT NULL'
    );
    $rows = $stmt->fetchAll();
    $now = time();
    $diagnostics = [];

    foreach ($rows as $row) {
        $custom = decodeItemCustomFields($row);
        $window = getTimelineItemTimeWindow($row);
        $progress = getTimelineProgressPercent($row, $now);
        $pending = getPendingReminderThresholds($row, $now);
        $sent = $custom['email_reminders_sent'] ?? [];
        if (!is_array($sent)) {
            $sent = [];
        }

        $passedNotified = isTimelinePassedNotified($custom);
        $overduePending = $progress !== null && $progress >= 100 && !$passedNotified;

        $reason = 'ready';
        if ($progress === null) {
            $reason = 'invalid_time_window';
        } elseif ($overduePending) {
            $reason = 'overdue_ready';
        } elseif ($pending === []) {
            if ($progress >= 100 && $passedNotified) {
                $reason = 'overdue_already_notified';
            } elseif ($progress < min(getReminderThresholds())) {
                $reason = 'below_first_threshold';
            } else {
                $reason = 'already_sent_or_completed';
            }
        }

        $assignTo = trim((string) ($custom['assign_to'] ?? $row['title'] ?? ''));

        $diagnostics[] = [
            'id' => (int) $row['id'],
            'project_id' => $row['project_code'],
            'project_title' => $row['project_title'],
            'timeline_type' => $row['timeline_type'],
            'status' => $row['status'],
            'assign_to' => $assignTo,
            'start_date' => $row['start_date'],
            'due_date' => $row['due_date'],
            'timeline_mode' => $custom['timeline_mode'] ?? 'date',
            'start_time' => $custom['start_time'] ?? null,
            'end_time' => $custom['end_time'] ?? null,
            'progress_percent' => $progress !== null ? round($progress, 1) : null,
            'window_start' => $window ? gmdate('c', $window['start']) : null,
            'window_end' => $window ? gmdate('c', $window['end']) : null,
            'reminders_already_sent' => $sent,
            'timeline_passed_notified' => $passedNotified,
            'pending_thresholds' => $pending,
            'overdue_pending' => $overduePending,
            'next_action' => $overduePending
                ? 'overdue_notify'
                : ($pending !== [] ? 'reminder_' . max($pending) : 'none'),
            'reason' => $reason,
            'server_time' => date('c'),
        ];
    }

    return $diagnostics;
}
