INSERT INTO positions (
  id, 
  symbol, 
  "positionType", 
  status, 
  "openDate", 
  quantity, 
  "averageCostBasis", 
  "totalPremium", 
  "createdAt", 
  "updatedAt"
) VALUES (
  gen_random_uuid()::text, 
  'AAPL', 
  'COVERED_CALL', 
  'OPEN', 
  NOW(), 
  100, 
  150.00, 
  0, 
  NOW(), 
  NOW()
);
