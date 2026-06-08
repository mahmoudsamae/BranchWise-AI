ALTER TABLE ai_summaries DROP CONSTRAINT IF EXISTS ai_summaries_report_id_key;
ALTER TABLE ai_summaries ADD CONSTRAINT ai_summaries_report_id_key UNIQUE (report_id);
