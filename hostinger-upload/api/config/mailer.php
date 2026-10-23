<?php

declare(strict_types=1);

function getMailConfig(): array
{
    $defaults = [
        'enabled' => true,
        'from_email' => 'projects@dash-bot.net',
        'from_name' => 'Project Timeline Tracker',
        'app_url' => 'https://dash-bot.net/project-management',
        'smtp_host' => 'smtp.hostinger.com',
        'smtp_port' => 465,
        'smtp_username' => 'projects@dash-bot.net',
        'smtp_password' => '',
        'self_email' => 'avinash@ae-research.com',
        'status_notify_email' => 'avinash@ae-research.com',
        'user_emails' => [],
        'reminder_thresholds' => [75],
    ];

    $config = getAppConfig();
    $mail = $config['mail'] ?? [];

    return array_merge($defaults, is_array($mail) ? $mail : []);
}

function getAdminEmail(): string
{
    $mailConfig = getMailConfig();
    $configured = trim((string) ($mailConfig['status_notify_email'] ?? $mailConfig['self_email'] ?? ''));

    if ($configured !== '' && filter_var($configured, FILTER_VALIDATE_EMAIL)) {
        return strtolower($configured);
    }

    return 'avinash@ae-research.com';
}

function resolveAssigneeRecipients(string $assignTo, ?string $creatorUsername): array
{
    $recipients = [];

    foreach (explode(',', $assignTo) as $part) {
        $part = trim($part);
        if ($part === '') {
            continue;
        }

        if (strcasecmp($part, 'Self') === 0) {
            $recipients[] = getAdminEmail();
            continue;
        }

        if (filter_var($part, FILTER_VALIDATE_EMAIL)) {
            $recipients[] = strtolower($part);
        }
    }

    return array_values(array_unique($recipients));
}

function resolveSingleAssigneeEmail(string $assignee, ?string $creatorUsername): ?string
{
    $resolved = resolveAssigneeRecipients($assignee, $creatorUsername);

    return $resolved[0] ?? null;
}

/** @return array{main: string, cc: string}|null */
function parseLegacyAssignToString(string $value): ?array
{
    $value = trim($value);
    if ($value === '') {
        return null;
    }

    if (preg_match('/^(.+?)\s*\(CC:\s*(.+)\)\s*$/i', $value, $matches) === 1) {
        return [
            'main' => trim($matches[1]),
            'cc' => trim($matches[2]),
        ];
    }

    return null;
}

function formatMailAddressList(array $emails): string
{
    $formatted = [];
    foreach ($emails as $email) {
        $email = trim(strtolower((string) $email));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $formatted[] = $email;
        }
    }

    return implode(', ', array_values(array_unique($formatted)));
}

/** @return array{to: ?string, cc: string[]} */
function resolveAssignmentRecipients(array $customFields, string $assignToFallback, ?string $creatorUsername): array
{
    $mainRaw = trim((string) ($customFields['assign_main'] ?? ''));
    $ccRaw = trim((string) ($customFields['assign_cc'] ?? ''));

    $legacyFromAssignTo = parseLegacyAssignToString(trim((string) ($customFields['assign_to'] ?? '')));
    if ($legacyFromAssignTo !== null) {
        if ($mainRaw === '') {
            $mainRaw = $legacyFromAssignTo['main'];
        }
        if ($ccRaw === '') {
            $ccRaw = $legacyFromAssignTo['cc'];
        }
    }

    if ($mainRaw !== '') {
        $to = resolveSingleAssigneeEmail($mainRaw, $creatorUsername);
        $cc = $ccRaw !== '' ? resolveAssigneeRecipients($ccRaw, $creatorUsername) : [];
        if ($to !== null) {
            $cc = array_values(array_filter($cc, static fn (string $email): bool => $email !== $to));
        }

        return ['to' => $to, 'cc' => $cc];
    }

    $legacyFromFallback = parseLegacyAssignToString($assignToFallback);
    if ($legacyFromFallback !== null) {
        $to = resolveSingleAssigneeEmail($legacyFromFallback['main'], $creatorUsername);
        $cc = $legacyFromFallback['cc'] !== ''
            ? resolveAssigneeRecipients($legacyFromFallback['cc'], $creatorUsername)
            : [];
        if ($to !== null) {
            $cc = array_values(array_filter($cc, static fn (string $email): bool => $email !== $to));
        }

        if ($to !== null) {
            return ['to' => $to, 'cc' => $cc];
        }
    }

    $all = resolveAssigneeRecipients($assignToFallback, $creatorUsername);
    if ($all === []) {
        return ['to' => null, 'cc' => []];
    }

    return [
        'to' => $all[0],
        'cc' => array_slice($all, 1),
    ];
}

/** @return string[] */
function getAllAssignmentRecipientEmails(array $customFields, string $assignToFallback, ?string $creatorUsername): array
{
    $assignment = resolveAssignmentRecipients($customFields, $assignToFallback, $creatorUsername);
    if ($assignment['to'] === null) {
        return [];
    }

    return array_values(array_unique(array_merge([$assignment['to']], $assignment['cc'])));
}

/** @param string[] $ccRecipients */
function normalizeEmailCcList(array $ccRecipients): array
{
    $cc = [];
    foreach ($ccRecipients as $email) {
        $normalized = strtolower(trim((string) $email));
        if ($normalized !== '' && filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            $cc[] = $normalized;
        }
    }

    return array_values(array_unique($cc));
}

function getMainAssigneeEmail(array $customFields, string $assignToFallback, ?string $creatorUsername = null): ?string
{
    $assignment = resolveAssignmentRecipients($customFields, $assignToFallback, $creatorUsername);

    return $assignment['to'];
}

function isMainAssigneeForEmail(
    array $customFields,
    string $assignToFallback,
    string $email,
    ?string $creatorUsername = null
): bool {
    $main = getMainAssigneeEmail($customFields, $assignToFallback, $creatorUsername);
    if ($main === null) {
        return false;
    }

    return strcasecmp($main, trim($email)) === 0;
}

function formatAssignToDisplay(array $customFields, string $fallback = ''): string
{
    $main = trim((string) ($customFields['assign_main'] ?? ''));
    $cc = trim((string) ($customFields['assign_cc'] ?? ''));

    if ($main !== '') {
        return $cc !== '' ? $main . ' (CC: ' . $cc . ')' : $main;
    }

    $legacy = trim((string) ($customFields['assign_to'] ?? ''));

    return $legacy !== '' ? $legacy : $fallback;
}

function getTimelineTabHeading(string $timelineType): string
{
    return TIMELINE_LABELS[$timelineType] ?? ucfirst(str_replace('_', ' ', $timelineType));
}

function buildEmailSubject(array $project, string $timelineType, string $suffix = ''): string
{
    $title = trim((string) ($project['title'] ?? 'Project'));
    $projectId = trim((string) ($project['project_id'] ?? ''));
    $tab = getTimelineTabHeading($timelineType);
    $subject = $tab . ' - ' . $title . ' - ' . $projectId;

    if ($suffix !== '') {
        $subject .= ' - ' . $suffix;
    }

    return $subject;
}

function formatStatusLabel(string $status): string
{
    return match ($status) {
        'in_progress' => 'In Progress',
        'hold' => 'Hold',
        'completed' => 'Completed',
        default => 'Pending',
    };
}

function formatTime12ForEmail(string $time): string
{
    $parts = explode(':', $time);
    $hour = (int) ($parts[0] ?? 0);
    $minute = (int) ($parts[1] ?? 0);
    $ampm = $hour >= 12 ? 'PM' : 'AM';
    $hour12 = $hour % 12;
    if ($hour12 === 0) {
        $hour12 = 12;
    }

    return sprintf('%d:%02d %s', $hour12, $minute, $ampm);
}

function formatDateForEmail(?string $date): string
{
    if ($date === null || $date === '') {
        return '—';
    }

    $ts = strtotime($date . ' 00:00:00');
    if ($ts === false) {
        return $date;
    }

    return date('l, j F Y', $ts);
}

function formatTimelineDetailsForEmail(
    ?string $startDate,
    ?string $dueDate,
    array $customFields
): array {
    $mode = $customFields['timeline_mode'] ?? 'date';

    if ($mode === 'same_day') {
        $startTime = (string) ($customFields['start_time'] ?? '');
        $endTime = (string) ($customFields['end_time'] ?? '');
        $durationHours = (int) ($customFields['end_duration_hours'] ?? 1);

        return [
            'mode_label' => 'Same day',
            'date' => formatDateForEmail($startDate),
            'start_time' => $startTime !== '' ? formatTime12ForEmail($startTime) : '—',
            'end_time' => $endTime !== '' ? formatTime12ForEmail($endTime) : '—',
            'duration' => $durationHours . ' hour' . ($durationHours === 1 ? '' : 's'),
            'end_date' => ($dueDate && $dueDate !== $startDate) ? formatDateForEmail($dueDate) : null,
        ];
    }

    return [
        'mode_label' => 'Date range',
        'start_date' => formatDateForEmail($startDate),
        'end_date' => formatDateForEmail($dueDate),
        'end_slot' => formatDateEndSlotLabel(getDateEndSlotFromCustom($customFields)),
        'date' => null,
        'start_time' => null,
        'end_time' => null,
        'duration' => null,
    ];
}

function formatTimelineScheduleLines(?string $startDate, ?string $dueDate, array $customFields): array
{
    $details = formatTimelineDetailsForEmail($startDate, $dueDate, $customFields);
    $lines = ['  Timeline mode: ' . $details['mode_label']];

    if ($details['mode_label'] === 'Same day') {
        $lines[] = '  Date: ' . $details['date'];
        $lines[] = '  Start time: ' . $details['start_time'];
        $lines[] = '  End time: ' . $details['end_time'];
        $lines[] = '  Duration: ' . $details['duration'];
        if ($details['end_date'] !== null) {
            $lines[] = '  Ends on: ' . $details['end_date'];
        }
    } else {
        $lines[] = '  Start date: ' . $details['start_date'];
        $lines[] = '  End date: ' . $details['end_date'];
        $lines[] = '  End time: ' . ($details['end_slot'] ?? 'End of day');
    }

    return $lines;
}

function buildCompleteUrl(int $itemId): string
{
    $mailConfig = getMailConfig();
    $appUrl = rtrim((string) ($mailConfig['app_url'] ?? ''), '/');
    $token = generateCompleteToken($itemId);

    return $appUrl . '/api/timeline/complete?token=' . urlencode($token);
}

function buildTimelineEmailBody(
    array $project,
    string $timelineType,
    string $status,
    ?string $startDate,
    ?string $dueDate,
    array $customFields,
    string $description,
    int $itemId,
    string $recipientEmail,
    string $introLine,
    array $extraLines = []
): string {
    $completeUrl = buildCompleteUrl($itemId);

    $lines = [
        'Hello,',
        $recipientEmail,
        '',
        $introLine,
        '',
        'STATUS',
        '  ' . formatStatusLabel($status),
        '',
        'SCHEDULE',
        ...formatTimelineScheduleLines($startDate, $dueDate, $customFields),
        '',
        'DESCRIPTION',
        '  ' . ($description !== '' ? $description : 'None'),
    ];

    if ($extraLines !== []) {
        $lines[] = '';
        $lines = array_merge($lines, $extraLines);
    }

    $lines[] = '';
    $lines[] = 'ACTIONS';
    $lines[] = '  Update status (Completed or Hold): ' . $completeUrl;
    $lines[] = '';
    $lines[] = '—';
    $lines[] = 'Project Timeline Tracker';

    return implode("\n", $lines);
}

function getMailTransportError(): string
{
    return $GLOBALS['mailTransportError'] ?? '';
}

function setMailTransportError(string $message): void
{
    $clean = trim(preg_replace('/\s+/', ' ', $message) ?? $message);
    if (strlen($clean) > 300) {
        $clean = substr($clean, 0, 300);
    }
    $GLOBALS['mailTransportError'] = $clean;
}

function smtpRead($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    return $data;
}

function smtpCommand($socket, string $command, array $okCodes): bool
{
    $written = 0;
    $length = strlen($command) + 2;
    $payload = $command . "\r\n";
    while ($written < $length) {
        $sent = fwrite($socket, substr($payload, $written));
        if ($sent === false) {
            setMailTransportError('Could not write to the mail server');
            return false;
        }
        $written += $sent;
    }

    $response = smtpRead($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $okCodes, true)) {
        setMailTransportError($response !== '' ? $response : 'Mail server closed the connection');
        return false;
    }

    return true;
}

function sendMailViaSmtp(
    string $to,
    string $subject,
    string $body,
    array $cc,
    string $fromEmail,
    string $fromName,
    string $host,
    int $port,
    string $username,
    string $password
): bool {
    $remote = 'ssl://' . $host . ':' . $port;
    $socket = @stream_socket_client($remote, $errno, $errstr, 20);
    if ($socket === false) {
        setMailTransportError('Cannot connect to ' . $host . ':' . $port . ' ' . $errstr . ' (' . $errno . ')');
        return false;
    }

    stream_set_timeout($socket, 20);
    $greeting = smtpRead($socket);
    if ((int) substr($greeting, 0, 3) !== 220) {
        setMailTransportError($greeting !== '' ? $greeting : 'Mail server sent no greeting');
        fclose($socket);
        return false;
    }

    $ehloHost = 'dash-bot.net';
    if (!smtpCommand($socket, 'EHLO ' . $ehloHost, [250])) {
        fclose($socket);
        return false;
    }

    if (
        !smtpCommand($socket, 'AUTH LOGIN', [334])
        || !smtpCommand($socket, base64_encode($username), [334])
        || !smtpCommand($socket, base64_encode($password), [235])
    ) {
        fclose($socket);
        return false;
    }

    if (!smtpCommand($socket, 'MAIL FROM:<' . $fromEmail . '>', [250])) {
        fclose($socket);
        return false;
    }

    $recipients = array_merge([$to], $cc);
    foreach ($recipients as $recipient) {
        if (!smtpCommand($socket, 'RCPT TO:<' . $recipient . '>', [250, 251])) {
            fclose($socket);
            return false;
        }
    }

    if (!smtpCommand($socket, 'DATA', [354])) {
        fclose($socket);
        return false;
    }

    $fromHeader = $fromName !== '' ? $fromName . ' <' . $fromEmail . '>' : $fromEmail;
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $lines = [
        'Date: ' . date(DATE_RFC2822),
        'From: ' . $fromHeader,
        'To: ' . $to,
        'Subject: ' . $encodedSubject,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Reply-To: ' . $fromEmail,
    ];
    if ($cc !== []) {
        $lines[] = 'Cc: ' . implode(', ', $cc);
    }
    $lines[] = '';
    $payload = implode("\r\n", $lines) . "\r\n" . str_replace("\n", "\r\n", str_replace("\r\n", "\n", $body));
    $payload = preg_replace('/^\./m', '..', $payload) ?? $payload;

    $accepted = smtpCommand($socket, $payload . "\r\n.", [250]);
    $mailError = getMailTransportError();
    fwrite($socket, "QUIT\r\n");
    if (!$accepted) {
        setMailTransportError($mailError);
    }
    fclose($socket);

    return $accepted;
}

function sendMailMessage(string $to, string $subject, string $body, array $cc = []): bool
{
    $mailConfig = getMailConfig();
    $fromEmail = trim((string) $mailConfig['from_email']);
    $fromName = trim((string) $mailConfig['from_name']);
    $password = trim((string) ($mailConfig['smtp_password'] ?? ''));

    if ($fromEmail === '' || filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false || $password === '') {
        setMailTransportError('Mail is not configured');
        return false;
    }

    $host = trim((string) ($mailConfig['smtp_host'] ?? 'smtp.hostinger.com'));
    $port = (int) ($mailConfig['smtp_port'] ?? 465);
    $username = trim((string) ($mailConfig['smtp_username'] ?? $fromEmail));
    if ($host === '' || $port <= 0 || $username === '') {
        setMailTransportError('Mail server settings are incomplete');
        return false;
    }

    return sendMailViaSmtp($to, $subject, $body, $cc, $fromEmail, $fromName, $host, $port, $username, $password);
}

function sendMailToAssignmentGroup(
    string $primaryTo,
    array $ccRecipients,
    string $subject,
    string $body
): array {
    $result = ['sent' => 0, 'failed' => 0, 'recipients' => []];

    $to = strtolower(trim($primaryTo));
    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return $result;
    }

    $cc = [];
    foreach ($ccRecipients as $email) {
        $normalized = strtolower(trim((string) $email));
        if (
            $normalized !== '' &&
            filter_var($normalized, FILTER_VALIDATE_EMAIL) &&
            $normalized !== $to &&
            !in_array($normalized, $cc, true)
        ) {
            $cc[] = $normalized;
        }
    }

    if (sendMailMessage($to, $subject, $body, $cc)) {
        $result['sent'] = 1;
        $result['recipients'] = array_merge([$to], $cc);
    } else {
        $result['failed'] = 1;
    }

    return $result;
}

function sendTimelineEmailWithAssignment(
    array $project,
    string $timelineType,
    string $status,
    ?string $startDate,
    ?string $dueDate,
    array $customFields,
    string $description,
    int $itemId,
    string $assignToFallback,
    ?string $creatorUsername,
    string $introLine,
    ?string $subjectSuffix = null,
    array $extraLines = []
): array {
    $mailConfig = getMailConfig();
    $result = ['sent' => 0, 'failed' => 0, 'skipped' => 0, 'recipients' => []];

    if (!($mailConfig['enabled'] ?? true)) {
        $assignment = resolveAssignmentRecipients($customFields, $assignToFallback, $creatorUsername);
        $result['skipped'] = ($assignment['to'] !== null ? 1 : 0) + count($assignment['cc']);

        return $result;
    }

    $assignment = resolveAssignmentRecipients($customFields, $assignToFallback, $creatorUsername);
    if ($assignment['to'] === null) {
        return $result;
    }

    $cc = normalizeEmailCcList($assignment['cc']);

    $subject = buildEmailSubject($project, $timelineType, $subjectSuffix ?? '');
    $body = buildTimelineEmailBody(
        $project,
        $timelineType,
        $status,
        $startDate,
        $dueDate,
        $customFields,
        $description,
        $itemId,
        $assignment['to'],
        $introLine,
        $extraLines
    );

    $delivery = sendMailToAssignmentGroup($assignment['to'], $cc, $subject, $body);
    $result['sent'] = $delivery['sent'];
    $result['failed'] = $delivery['failed'];
    $result['recipients'] = $delivery['recipients'];

    return $result;
}

/** Programming tab: notify survey team to share questionnaire with Bangalore. */
function sendProgrammingQuestionnaireNotification(
    array $project,
    string $assignTo,
    string $description,
    string $status,
    ?string $startDate,
    ?string $dueDate,
    array $customFields,
    int $itemId,
    ?string $createdByUsername = null
): array {
    $mailConfig = getMailConfig();
    $result = ['sent' => 0, 'failed' => 0, 'recipients' => []];

    if (!($mailConfig['enabled'] ?? true)) {
        $result['skipped'] = 1;

        return $result;
    }

    $to = 'qazimudassir@outlook.com';
    $cc = ['insighta1@outlook.com', 'projects@ae-research.com'];
    $surveyName = trim((string) ($project['title'] ?? 'Survey'));

    $subject = 'Questionnaire Required - ' . $surveyName;

    $body = "ACTION REQUIRED\n"
        . "  A new survey has been registered. Please ask the AER team to share the\n"
        . "  questionnaire for this survey with the Bangalore team.";

    if (sendMailMessage($to, $subject, $body, $cc)) {
        $result['sent'] = 1;
        $result['recipients'] = array_merge([$to], $cc);
    } else {
        $result['failed'] = 1;
    }

    return $result;
}

function sendTimelineAssigneeEmails(
    array $project,
    string $timelineType,
    string $assignTo,
    string $description,
    string $status,
    ?string $startDate,
    ?string $dueDate,
    array $customFields,
    int $itemId,
    ?string $creatorUsername = null,
    ?string $introLine = null,
    ?string $subjectSuffix = null
): array {
    return sendTimelineEmailWithAssignment(
        $project,
        $timelineType,
        $status,
        $startDate,
        $dueDate,
        $customFields,
        $description,
        $itemId,
        $assignTo,
        $creatorUsername,
        $introLine ?? 'You have been assigned a new timeline task.',
        $subjectSuffix
    );
}

function decodeMailCustomFields(array $item): array
{
    $custom = $item['custom_fields'] ?? [];
    if (is_string($custom)) {
        $custom = json_decode($custom, true) ?? [];
    }

    return is_array($custom) ? $custom : [];
}

function getAssignToFromItem(array $item): string
{
    $custom = decodeMailCustomFields($item);
    $fallback = trim((string) ($item['title'] ?? ''));

    return formatAssignToDisplay($custom, $fallback);
}

function buildTimelineAdminAlertEmailBody(
    array $project,
    array $item,
    string $alertMessage
): string {
    $timelineType = (string) ($item['timeline_type'] ?? '');
    $tabHeading = getTimelineTabHeading($timelineType);
    $custom = decodeMailCustomFields($item);
    $assignTo = getAssignToFromItem($item);
    $description = trim((string) ($item['description'] ?? ''));
    $notifyEmail = (string) (getMailConfig()['status_notify_email'] ?? 'avinash@ae-research.com');

    $lines = [
        'Hello,',
        $notifyEmail,
        '',
        $alertMessage,
        '',
        'PROJECT',
        '  Title: ' . ($project['title'] ?? 'Untitled'),
        '  Project ID: ' . ($project['project_id'] ?? '—'),
        '',
        'TIMELINE TAB',
        '  ' . $tabHeading,
        '',
        'ASSIGNED TO',
        '  ' . $assignTo,
        '',
        'CURRENT STATUS',
        '  ' . formatStatusLabel((string) ($item['status'] ?? 'pending')),
        '',
        'SCHEDULE',
        ...formatTimelineScheduleLines(
            $item['start_date'] ?? null,
            $item['due_date'] ?? null,
            $custom
        ),
        '',
        'DESCRIPTION',
        '  ' . ($description !== '' ? $description : 'None'),
        '',
        '—',
        'Project Timeline Tracker',
    ];

    return implode("\n", $lines);
}

function sendTimelinePassedAdminNotification(array $project, array $item): bool
{
    return false;
}

function sendTimelineStatusChangeNotification(
    array $project,
    array $item,
    string $previousStatus,
    string $newStatus,
    string $source = 'app'
): bool {
    if ($previousStatus === $newStatus) {
        return false;
    }

    $mailConfig = getMailConfig();

    if (!($mailConfig['enabled'] ?? true)) {
        return false;
    }

    $admin = getAdminEmail();
    $timelineType = (string) ($item['timeline_type'] ?? '');
    $subject = buildEmailSubject(
        $project,
        $timelineType,
        'Status: ' . formatStatusLabel($previousStatus) . ' → ' . formatStatusLabel($newStatus)
    );

    $sourceLabel = $source === 'email_link' ? 'email link' : 'the app';

    $alertMessage = 'Timeline task status changed from '
        . formatStatusLabel($previousStatus)
        . ' to '
        . formatStatusLabel($newStatus)
        . ' via '
        . $sourceLabel
        . '.';

    $body = buildTimelineAdminAlertEmailBody($project, $item, $alertMessage);

    return sendMailMessage($admin, $subject, $body);
}

function appendCompletionCommentToDescription(?string $existingDescription, string $comment): ?string
{
    $existing = trim((string) $existingDescription);
    $comment = trim($comment);

    if ($comment === '') {
        return $existing !== '' ? $existing : null;
    }

    if ($existing === '') {
        return $comment;
    }

    return $existing . "\n\n---\nCompletion comment:\n" . $comment;
}

function getCompletePageStyles(): string
{
    return <<<'CSS'
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;min-height:100vh;background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 50%,#ede9fe 100%);color:#0f172a;line-height:1.5;-webkit-font-smoothing:antialiased}
.page{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px 16px}
.card{width:100%;max-width:560px;background:#fff;border-radius:20px;box-shadow:0 25px 50px -12px rgba(79,70,229,.15),0 0 0 1px rgba(226,232,240,.8);overflow:hidden;animation:slideUp .4s ease-out}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
.hero{background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:28px 32px;color:#fff}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.15);border-radius:12px;padding:8px 14px;font-size:13px;font-weight:600;margin-bottom:16px;backdrop-filter:blur(8px)}
.hero h1{font-size:22px;font-weight:700;letter-spacing:-.02em;margin-bottom:4px}
.hero p{font-size:14px;color:rgba(255,255,255,.8)}
.body{padding:28px 32px 32px}
.info-grid{display:grid;gap:12px;margin-bottom:24px}
.info-item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px}
.info-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin-bottom:4px}
.info-value{font-size:14px;font-weight:500;color:#1e293b;word-break:break-word}
.info-value.mono{font-family:ui-monospace,monospace;font-size:13px}
.desc-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;font-size:14px;color:#475569;white-space:pre-wrap;line-height:1.6;max-height:200px;overflow-y:auto}
label.field-label{display:block;font-size:13px;font-weight:600;color:#334155;margin-bottom:8px}
textarea.field{width:100%;min-height:100px;padding:14px 16px;border:1px solid #e2e8f0;border-radius:12px;font-family:inherit;font-size:14px;color:#1e293b;resize:vertical;outline:none;transition:border-color .2s,box-shadow .2s}
textarea.field:focus{border-color:#818cf8;box-shadow:0 0 0 4px rgba(99,102,241,.12)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px 24px;border:none;border-radius:12px;font-size:15px;font-weight:600;cursor:pointer;transition:transform .15s,box-shadow .2s}
.btn:active{transform:scale(.98)}
.btn-success{background:linear-gradient(135deg,#059669,#10b981);color:#fff;box-shadow:0 4px 14px rgba(5,150,105,.35)}
.btn-success:hover{box-shadow:0 6px 20px rgba(5,150,105,.45)}
.btn-hold{background:linear-gradient(135deg,#6d28d9,#7c3aed);color:#fff;box-shadow:0 4px 14px rgba(109,40,217,.35)}
.btn-hold:hover{box-shadow:0 6px 20px rgba(109,40,217,.45)}
.action-row{display:grid;gap:12px;margin-top:20px}
@media(min-width:480px){.action-row{grid-template-columns:1fr 1fr}}
.status-icon.hold{background:#ede9fe;color:#6d28d9}
.status-icon{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;font-size:28px}
.status-icon.success{background:#d1fae5;color:#059669}
.status-icon.error{background:#fee2e2;color:#dc2626}
.status-icon.info{background:#e0e7ff;color:#4f46e5}
.result-title{text-align:center;font-size:22px;font-weight:700;margin-bottom:8px;letter-spacing:-.02em}
.result-msg{text-align:center;font-size:15px;color:#64748b;margin-bottom:24px}
.detail-section{margin-top:20px;padding-top:20px;border-top:1px solid #e2e8f0}
.footer{text-align:center;padding:16px;font-size:12px;color:#94a3b8}
CSS;
}

function renderCompletePageShell(string $title, string $heroTitle, string $heroSubtitle, string $bodyContent): void
{
    $titleEsc = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
    $heroTitleEsc = htmlspecialchars($heroTitle, ENT_QUOTES, 'UTF-8');
    $heroSubtitleEsc = htmlspecialchars($heroSubtitle, ENT_QUOTES, 'UTF-8');

    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>' . $titleEsc . '</title>'
        . '<style>' . getCompletePageStyles() . '</style></head><body>'
        . '<div class="page"><div class="card">'
        . '<div class="hero"><div class="hero-badge">'
        . '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">'
        . '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>'
        . ' Project Timeline Tracker</div>'
        . '<h1>' . $heroTitleEsc . '</h1>'
        . '<p>' . $heroSubtitleEsc . '</p></div>'
        . '<div class="body">' . $bodyContent . '</div></div></div>'
        . '<div class="footer">AE Research · Project Timeline Tracker</div>'
        . '</body></html>';
    exit;
}

function renderCompleteFormPage(array $item, string $token): void
{
    http_response_code(200);
    header('Content-Type: text/html; charset=utf-8');

    $tab = getTimelineTabHeading((string) ($item['timeline_type'] ?? ''));
    $description = trim((string) ($item['description'] ?? ''));
    $descriptionDisplay = $description !== '' ? $description : 'No description provided';
    $projectCode = htmlspecialchars((string) ($item['project_code'] ?? ''), ENT_QUOTES, 'UTF-8');
    $projectTitle = htmlspecialchars((string) ($item['project_title'] ?? ''), ENT_QUOTES, 'UTF-8');
    $tabEsc = htmlspecialchars($tab, ENT_QUOTES, 'UTF-8');
    $descEsc = htmlspecialchars($descriptionDisplay, ENT_QUOTES, 'UTF-8');
    $tokenEsc = htmlspecialchars($token, ENT_QUOTES, 'UTF-8');
    $assignTo = htmlspecialchars(getAssignToFromItem($item), ENT_QUOTES, 'UTF-8');
    $statusEsc = htmlspecialchars(formatStatusLabel((string) ($item['status'] ?? 'pending')), ENT_QUOTES, 'UTF-8');

    $custom = decodeMailCustomFields($item);
    $scheduleLines = formatTimelineScheduleLines(
        $item['start_date'] ?? null,
        $item['due_date'] ?? null,
        $custom
    );
    $scheduleHtml = '';
    foreach ($scheduleLines as $line) {
        $scheduleHtml .= htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . '<br>';
    }
    if ($scheduleHtml === '') {
        $scheduleHtml = 'Not scheduled';
    }

    $body = '<div class="info-grid">'
        . '<div class="info-item"><div class="info-label">Project</div><div class="info-value">' . $projectTitle . '</div></div>'
        . '<div class="info-item"><div class="info-label">Project ID</div><div class="info-value mono">' . $projectCode . '</div></div>'
        . '<div class="info-item"><div class="info-label">Timeline</div><div class="info-value">' . $tabEsc . '</div></div>'
        . '<div class="info-item"><div class="info-label">Assigned To</div><div class="info-value">' . $assignTo . '</div></div>'
        . '<div class="info-item"><div class="info-label">Current Status</div><div class="info-value">' . $statusEsc . '</div></div>'
        . '<div class="info-item"><div class="info-label">Schedule</div><div class="info-value">' . $scheduleHtml . '</div></div>'
        . '</div>'
        . '<div style="margin-bottom:20px"><div class="info-label" style="margin-bottom:8px">Description</div>'
        . '<div class="desc-box">' . nl2br($descEsc) . '</div></div>'
        . '<form method="post" action="">'
        . '<input type="hidden" name="token" value="' . $tokenEsc . '">'
        . '<label class="field-label" for="comment">Add a comment (optional)</label>'
        . '<textarea id="comment" name="comment" class="field" placeholder="Share any notes about this task..."></textarea>'
        . '<div class="action-row">'
        . '<button type="submit" name="action" value="completed" class="btn btn-success">'
        . '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">'
        . '<path d="M5 13l4 4L19 7"/></svg>'
        . ' Mark as Completed</button>'
        . '<button type="submit" name="action" value="hold" class="btn btn-hold">'
        . '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">'
        . '<path d="M10 9v6m4-6v6M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"/></svg>'
        . ' Mark as Hold</button>'
        . '</div></form>';

    renderCompletePageShell(
        'Update Task Status',
        'Update this task',
        'Choose Completed or Hold after reviewing the details below',
        $body
    );
}

function renderCompletePage(bool $success, string $message, ?array $item = null, ?string $addedComment = null): void
{
    http_response_code($success ? 200 : 400);
    header('Content-Type: text/html; charset=utf-8');

    if ($success) {
        $isHold = ($item['status'] ?? '') === 'hold';
        if ($isHold) {
            $icon = '<div class="status-icon hold">⏸</div>';
            $title = 'Task On Hold';
            $heroTitle = 'On hold';
            $heroSubtitle = 'Reminders are paused until status changes';
            $titleColor = '#6d28d9';
        } else {
            $icon = '<div class="status-icon success">✓</div>';
            $title = 'Task Completed';
            $heroTitle = 'All done!';
            $heroSubtitle = 'The timeline task has been updated';
            $titleColor = '#059669';
        }
    } elseif ($item !== null && ($item['status'] ?? '') === 'completed') {
        $icon = '<div class="status-icon info">✓</div>';
        $title = 'Already Completed';
        $heroTitle = 'Already completed';
        $heroSubtitle = 'This task was marked done earlier';
        $titleColor = '#4f46e5';
    } else {
        $icon = '<div class="status-icon error">✕</div>';
        $title = 'Unable to Complete';
        $heroTitle = 'Something went wrong';
        $heroSubtitle = 'We could not update this task';
        $titleColor = '#dc2626';
    }

    $body = $icon
        . '<div class="result-title" style="color:' . $titleColor . '">'
        . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</div>'
        . '<p class="result-msg">' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</p>';

    if ($item !== null) {
        $tab = getTimelineTabHeading((string) ($item['timeline_type'] ?? ''));
        $description = trim((string) ($item['description'] ?? ''));
        $body .= '<div class="detail-section"><div class="info-grid">'
            . '<div class="info-item"><div class="info-label">Project</div><div class="info-value">'
            . htmlspecialchars((string) ($item['project_title'] ?? ''), ENT_QUOTES, 'UTF-8') . '</div></div>'
            . '<div class="info-item"><div class="info-label">Project ID</div><div class="info-value mono">'
            . htmlspecialchars((string) ($item['project_code'] ?? ''), ENT_QUOTES, 'UTF-8') . '</div></div>'
            . '<div class="info-item"><div class="info-label">Timeline</div><div class="info-value">'
            . htmlspecialchars($tab, ENT_QUOTES, 'UTF-8') . '</div></div>'
            . '<div class="info-item"><div class="info-label">Status</div><div class="info-value">'
            . htmlspecialchars(formatStatusLabel((string) ($item['status'] ?? '')), ENT_QUOTES, 'UTF-8') . '</div></div>'
            . '</div>';

        if ($description !== '') {
            $body .= '<div style="margin-top:16px"><div class="info-label" style="margin-bottom:8px">Description</div>'
                . '<div class="desc-box">' . nl2br(htmlspecialchars($description, ENT_QUOTES, 'UTF-8')) . '</div></div>';
        }

        if ($addedComment !== null && trim($addedComment) !== '') {
            $body .= '<div style="margin-top:12px;padding:12px 16px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;font-size:13px;color:#047857">'
                . '✓ Your comment was saved.</div>';
        }

        $body .= '</div>';
    }

    renderCompletePageShell($title, $heroTitle, $heroSubtitle, $body);
}

function handleTimelineCompleteRoute(): void
{
    $method = $_SERVER['REQUEST_METHOD'];
    $token = (string) (($method === 'POST' ? ($_POST['token'] ?? '') : ($_GET['token'] ?? '')));

    if ($token === '') {
        renderCompletePage(false, 'Completion link is missing or invalid.');
    }

    $itemId = verifyCompleteToken($token);
    if ($itemId === null || $itemId <= 0) {
        renderCompletePage(false, 'This completion link is invalid or has expired.');
    }

    $db = Database::getConnection();
    $stmt = $db->prepare(
        'SELECT ti.*, p.project_id AS project_code, p.title AS project_title
         FROM timeline_items ti
         INNER JOIN projects p ON p.id = ti.project_id
         WHERE ti.id = ?'
    );
    $stmt->execute([$itemId]);
    $item = $stmt->fetch();

    if (!$item) {
        renderCompletePage(false, 'Timeline task not found.');
    }

    if (($item['status'] ?? '') === 'completed') {
        renderCompletePage(true, 'This task is already marked as completed.', $item);
    }

    if ($method === 'GET') {
        renderCompleteFormPage($item, $token);
    }

    if ($method !== 'POST') {
        renderCompletePage(false, 'Invalid request method.');
    }

    $action = (string) ($_POST['action'] ?? 'completed');
    if (!in_array($action, ['completed', 'hold'], true)) {
        renderCompletePage(false, 'Please choose Completed or Hold.', $item);
    }

    $comment = (string) ($_POST['comment'] ?? '');
    $previousStatus = (string) ($item['status'] ?? 'pending');
    $newStatus = $action === 'hold' ? 'hold' : 'completed';
    $newDescription = appendCompletionCommentToDescription($item['description'] ?? null, $comment);

    $update = $db->prepare('UPDATE timeline_items SET status = ?, description = ? WHERE id = ?');
    $update->execute([$newStatus, $newDescription, $itemId]);
    $item['status'] = $newStatus;
    $item['description'] = $newDescription;

    $project = [
        'id' => (int) $item['project_id'],
        'project_id' => $item['project_code'],
        'title' => $item['project_title'],
    ];
    sendTimelineStatusChangeNotification($project, $item, $previousStatus, $newStatus, 'email_link');

    if ($newStatus === 'hold') {
        renderCompletePage(true, 'The timeline task has been marked as hold.', $item, $comment);
    }

    renderCompletePage(true, 'The timeline task has been marked as completed.', $item, $comment);
}
