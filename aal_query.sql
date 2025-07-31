SELECT "transactionDate", "transactionType", "securityType", quantity, price, amount, description 
FROM transactions 
WHERE "calculatedSymbol" = 'AAL' 
ORDER BY "transactionDate";
