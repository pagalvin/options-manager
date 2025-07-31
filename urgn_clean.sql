SELECT "transactionDate", "transactionType", "securityType", quantity, price, amount, description 
FROM transactions 
WHERE "calculatedSymbol" = 'URGN' 
ORDER BY "transactionDate";
