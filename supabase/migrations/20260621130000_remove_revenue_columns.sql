-- Remove revenue/Umsatz columns permanently (product decision: no financial KPIs in BranchWise)
ALTER TABLE public.kpis DROP COLUMN IF EXISTS revenue;
ALTER TABLE public.fruhstuck_data DROP COLUMN IF EXISTS revenue;
