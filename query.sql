SELECT 
    SUM(CASE 
        WHEN t."transactionType" = 'Sold Short' THEN ABS(t.quantity)
        WHEN t."transactionType" IN ('Bought To Cover', 'Option Assigned', 'Option Expired') THEN -ABS(t.quantity)
        ELSE 0
    END) as total_open_contracts
FROM transactions t 
WHERE (t.symbol LIKE '%CLSK%' OR t.description LIKE '%CLSK%') AND t."securityType" = 'OPTN';
