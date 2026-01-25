ALTER TABLE agent_company_details
ADD COLUMN IF NOT EXISTS gstin VARCHAR(255);

COMMENT ON COLUMN agent_company_details.gstin IS 'GST Identification Number';
