-- One report row per branch + report request (prevents duplicate submissions in the UI).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY branch_id, request_id
      ORDER BY
        CASE status
          WHEN 'reviewed' THEN 5
          WHEN 'submitted' THEN 4
          WHEN 'revision_required' THEN 3
          WHEN 'draft' THEN 2
          ELSE 1
        END DESC,
        updated_at DESC,
        created_at DESC
    ) AS rn
  FROM public.reports
)
DELETE FROM public.reports
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS reports_branch_request_uidx
  ON public.reports (branch_id, request_id);
