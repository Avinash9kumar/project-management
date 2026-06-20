export const DEFAULT_ASSIGNEE_EMAILS = [
  'avinash@ae-research.com',
  'anupam@ae-research.com',
  'aashish@ae-research.com',
  'mansiha@ae-research.com',
  'paritosh@ae-research.com',
  'shahid@ae-research.com',
  'projects@ae-research.com',
] as const;

/** @deprecated Use useAssignees().assigneeValues instead */
export const ASSIGNEE_EMAILS = ['Self', ...DEFAULT_ASSIGNEE_EMAILS] as const;

export const SELF_ASSIGNEE = 'Self';
export const SELF_EMAIL = 'avinash@ae-research.com';
