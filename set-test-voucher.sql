UPDATE vouchers
SET 
  status = 'Aktif',
  expiry_date = NOW() + INTERVAL '1 day'
WHERE id = (
  SELECT id FROM vouchers LIMIT 1
);
