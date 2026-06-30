<?php

declare(strict_types=1);

/** Repeat overdue assignee email every hour until completed or hold. */
const OVERDUE_EMAIL_INTERVAL_SECONDS = 3600;

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

function getMandatoryReminderPercents(): array
{
    return [75];
}

function getOptionalReminderPercentOptions(): array
{
    return [50, 70, 80, 90, 95];
}

function getDateEndSlotFromCustom(array $custom): ?string
{
    $slot = strtoupper((string) ($custom['date_end_slot'] ?? ''));
    if (in_array($slot, ['SOD', 'MID', 'EOD'], true)) {
        return $slot;
    }

    return null;
}

/** @return array{endDate: string, endTime: string} */
function resolveDateModeEnd(string $dueDate, ?string $slot): array
{
    switch ($slot) {
        case 'SOD':
            return ['endDate' => $dueDate, 'endTime' => '18:00'];
        case 'MID':
            return ['endDate' => $dueDate, 'endTime' => '21:30'];
        case 'EOD':
            $nextDay = date('Y-m-d', strtotime($dueDate . ' +1 day'));

            return ['endDate' => $nextDay, 'endTime' => '03:00'];
        default:
            return ['endDate' => $dueDate, 'endTime' => '23:59'];
    }
}

function formatDateEndSlotLabel(?string $slot): string
{
    return match ($slot) {
        'SOD' => 'SOD (6 PM)',
        'MID' => 'MID (9:30 PM)',
        'EOD' => 'EOD (next day 3 AM)',
        default => 'End of day',
    };
}

function normalizeOptionalReminderList(array $values): array
{
    $options = getOptionalReminderPercentOptions();
    $normalized = [];
    foreach ($values as $value) {
        $intValue = (int) $value;
        if (in_array($intValue, $options, true) && !in_array($intValue, getMandatoryReminderPercents(), true)) {
            $normalized[] = $intValue;
        }
    }
    $normalized = array_values(array_unique($normalized));
    sort($normalized);

    return $normalized;
}

function normalizeItemOptionalReminderPercents(array $custom): array
{
    if (isset($custom['reminder_percents']) && is_array($custom['reminder_percents'])) {
        return normalizeOptionalReminderList($custom['reminder_percents']);
    }

    $percent = (int) ($custom['reminder_percent'] ?? 0);
    if ($percent > 0 && $percent < 100) {
        if (in_array($percent, getMandatoryReminderPercents(), true)) {
            return [];
        }

        return normalizeOptionalReminderList([$percent]);
    }

    return [];
}

function mergeEffectiveReminderPercents(array $optionalPercents): array
{
    $merged = array_merge(getMandatoryReminderPercents(), normalizeOptionalReminderList($optionalPercents));
    $merged = array_values(array_unique($merged));
    sort($merged);

    return $merged;
}

/** @return int[] */
function getItemReminderThresholds(array $item): array
{
    $custom = decodeItemCustomFields($item);

    return mergeEffectiveReminderPercents(normalizeItemOptionalReminderPercents($custom));
}

/** @return array<int, array{percent: int, at: string|null}> */
function getReminderTriggerTimestamps(array $item): array
{
    $window = getTimelineItemTimeWindow($item);
    if ($window === null) {
        return [];
    }

    $duration = $window['end'] - $window['start'];
    $triggers = [];

    foreach (getItemReminderThresholds($item) as $percent) {
        $ts = $window['start'] + (int) round($duration * ($percent / 100));
        $triggers[] = [
            'percent' => $percent,
            'at' => gmdate('c', $ts),
        ];
    }

    return $triggers;
}

function timelineReminderSettingsChanged(array $existingCustom, array $customFields): bool
{
    return json_encode(normalizeItemOptionalReminderPercents($existingCustom))
        !== json_encode(normalizeItemOptionalReminderPercents($customFields));
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
        $slot = getDateEndSlotFromCustom($custom);
        $resolved = resolveDateModeEnd($dueDate, $slot);
        $startTs = strtotime($startDate . ' 00:00:00') ?: null;
        $endTs = parseDateTimeOnTimeline($resolved['endDate'], $resolved['endTime']);
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

function isTimelineItemOnHold(array $item): bool
{
    return ($item['status'] ?? '') === 'hold';
}

function isTimelineItemInactiveForReminders(array $item): bool
{
    $status = (string) ($item['status'] ?? '');

    return $status === 'completed' || $status === 'hold';
}

function isTimelinePassedNotified(array $custom): bool
{
    return getOverdueLastSentAt($custom) !== null || !empty($custom['timeline_passed_notified']);
}

function getOverdueLastSentAt(array $custom): ?int
{
    if (isset($custom['overdue_last_sent_at'])) {
        $value = $custom['overdue_last_sent_at'];
        if (is_numeric($value)) {
            $ts = (int) $value;

            return $ts > 0 ? $ts : null;
        }

        $parsed = strtotime((string) $value);

        return $parsed !== false ? $parsed : null;
    }

    return null;
}

function resolveOverdueLastSentAt(array $item, array $custom, int $now): ?int
{
    $lastSent = getOverdueLastSentAt($custom);
    if ($lastSent !== null) {
        return $lastSent;
    }

    if (!empty($custom['timeline_passed_notified'])) {
        $window = getTimelineItemTimeWindow($item);

        return $window !== null ? $window['end'] : $now;
    }

    return null;
}

function getOverdueEmailIntervalSeconds(): int
{
    return OVERDUE_EMAIL_INTERVAL_SECONDS;
}

function isOverdueEmailDue(array $item, ?int $now = null): bool
{
    if (isTimelineItemInactiveForReminders($item)) {
        return false;
    }

    $progress = getTimelineProgressPercent($item, $now);
    if ($progress === null || $progress < 100) {
        return false;
    }

    $now = $now ?? time();
    $custom = decodeItemCustomFields($item);
    $lastSent = resolveOverdueLastSentAt($item, $custom, $now);

    if ($lastSent === null) {
        return true;
    }

    return ($now - $lastSent) >= getOverdueEmailIntervalSeconds();
}

function getOverdueNextSendAt(array $item, ?int $now = null): ?int
{
    if (isTimelineItemInactiveForReminders($item)) {
        return null;
    }

    $progress = getTimelineProgressPercent($item, $now);
    if ($progress === null || $progress < 100) {
        return null;
    }

    $now = $now ?? time();
    $custom = decodeItemCustomFields($item);
    $lastSent = resolveOverdueLastSentAt($item, $custom, $now);

    if ($lastSent === null) {
        return $now;
    }

    $next = $lastSent + getOverdueEmailIntervalSeconds();

    return $next > $now ? $next : $now;
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
    if (isTimelineItemInactiveForReminders($item)) {
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
    foreach (getItemReminderThresholds($item) as $threshold) {
        if ($progress >= $threshold && !in_array($threshold, $sent, true)) {
            $pending[] = $threshold;
        }
    }

    return $pending;
}

function reminderSubjectSuffix(int $threshold): string
{
    return 'Reminder — ' . $threshold . '% check-in';
}

/** Friendly intro for the progress reminder (create email + 100% overdue are separate). */
function reminderContentForThreshold(int $threshold): array
{
    return [
        'This is a friendly check-in on your timeline task — you are '
            . $threshold
            . '% through the scheduled window.',
        ['NOTE', '  Please review your progress and update the status if needed.'],
    ];
}

function sendTimelineReminderEmails(
    array $project,
    array $item,
    string $assignTo,
    int $threshold
): array {
    if (isTimelineItemInactiveForReminders($item)) {
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
    if (isTimelineItemInactiveForReminders($item)) {
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

function markTimelinePassedNotified(PDO $db, int $itemId, array $customFields, ?int $sentAt = null): void
{
    $sentAt = $sentAt ?? time();
    $customFields['overdue_last_sent_at'] = $sentAt;
    $customFields['timeline_passed_notified'] = true;

    $sent = $customFields['email_reminders_sent'] ?? [];
    if (!is_array($sent)) {
        $sent = [];
    }

    foreach (mergeEffectiveReminderPercents(normalizeItemOptionalReminderPercents($customFields)) as $threshold) {
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
    unset(
        $customFields['email_reminders_sent'],
        $customFields['timeline_passed_notified'],
        $customFields['overdue_last_sent_at']
    );
}

function processTimelineReminders(PDO $db): array
{
    $stmt = $db->query(
        'SELECT ti.*, p.project_id AS project_code, p.title AS project_title
         FROM timeline_items ti
         INNER JOIN projects p ON p.id = ti.project_id
         WHERE ti.status NOT IN (\'completed\', \'hold\')
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
        'skipped_hold' => 0,
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
        if ($currentStatus === 'hold') {
            $summary['skipped_hold']++;
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
        $now = time();

        // Overdue — first email when schedule ends, then every hour until completed/hold
        if ($progress !== null && $progress >= 100 && isOverdueEmailDue($row, $now)) {
            $assigneeResult = sendTimelineOverdueAssigneeEmail($project, $row, $assignTo);

            $summary['failed'] += $assigneeResult['failed'];

            if ($assigneeResult['sent'] > 0) {
                $summary['reminders_sent'] += $assigneeResult['sent'];
                markTimelinePassedNotified($db, $itemId, $custom, $now);
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
        if ($latestStatus === 'hold') {
            $summary['skipped_hold']++;
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
         WHERE ti.status NOT IN (\'completed\', \'hold\')
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
        $overdueLastSent = resolveOverdueLastSentAt($row, $custom, $now);
        $overduePending = isOverdueEmailDue($row, $now);
        $overdueNextAt = getOverdueNextSendAt($row, $now);

        $reason = 'ready';
        if ($progress === null) {
            $reason = 'invalid_time_window';
        } elseif ($overduePending) {
            $reason = 'overdue_ready';
        } elseif ($pending === []) {
            $thresholds = getItemReminderThresholds($row);
            if ($progress >= 100 && !$overduePending) {
                $reason = 'overdue_interval_waiting';
            } elseif ($thresholds === []) {
                $reason = 'no_reminders_configured';
            } elseif ($progress < min($thresholds)) {
                $reason = 'below_first_threshold';
            } else {
                $reason = 'already_sent_or_completed';
            }
        }

        $assignTo = trim((string) ($custom['assign_to'] ?? $row['title'] ?? ''));

        $triggerTs = getReminderTriggerTimestamps($row);

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
            'reminder_percents_optional' => normalizeItemOptionalReminderPercents($custom),
            'reminder_percents_mandatory' => getMandatoryReminderPercents(),
            'reminder_percents' => getItemReminderThresholds($row),
            'reminder_overdue_percent' => 100,
            'reminder_triggers' => $triggerTs,
            'progress_percent' => $progress !== null ? round($progress, 1) : null,
            'window_start' => $window ? gmdate('c', $window['start']) : null,
            'window_end' => $window ? gmdate('c', $window['end']) : null,
            'reminders_already_sent' => $sent,
            'timeline_passed_notified' => $passedNotified,
            'overdue_last_sent_at' => $overdueLastSent !== null ? gmdate('c', $overdueLastSent) : null,
            'overdue_next_at' => $overdueNextAt !== null ? gmdate('c', $overdueNextAt) : null,
            'overdue_interval_hours' => getOverdueEmailIntervalSeconds() / 3600,
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
