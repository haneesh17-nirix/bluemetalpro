-- 016_cascade_delete_tenant.sql
ALTER TABLE crushers DROP CONSTRAINT IF EXISTS crushers_tenant_id_fkey;
ALTER TABLE crushers ADD CONSTRAINT crushers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
