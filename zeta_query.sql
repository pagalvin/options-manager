SELECT "transactionDate", "transactionType", "securityType", quantity, price, amount, description 
FROM transactions 
WHERE "calculatedSymbol" = 'ZETA' 
ORDER BY "transactionDate";
