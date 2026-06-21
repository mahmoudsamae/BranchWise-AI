ALTER TABLE branch_issues
  ADD COLUMN IF NOT EXISTS collaborators jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN branch_issues.collaborators IS 'Invited Campchefs from other branches: [{ id, userId, userName, branchId, branchName, invitedAt }]';
