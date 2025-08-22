const fetch = require('node-fetch');

async function testTransactionAPI() {
  try {
    console.log('=== TESTING TRANSACTION API ENDPOINT ===');
    
    const testTransaction = {
      transactionDate: '2025-08-18',
      transactionType: 'BUY',
      securityType: 'EQ',
      calculatedSymbol: 'AAPL',
      quantity: 100,
      price: 150.00,
      commission: 0,
      description: 'API Test transaction'
    };

    console.log('Sending transaction data:', testTransaction);

    const response = await fetch('http://localhost:3001/api/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testTransaction),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    if (response.ok) {
      const responseData = JSON.parse(responseText);
      console.log('✅ Transaction created successfully:', responseData);
      
      // Clean up - delete the test transaction
      const deleteResponse = await fetch(`http://localhost:3001/api/transactions/${responseData.id}`, {
        method: 'DELETE',
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test transaction cleaned up');
      } else {
        console.log('⚠️ Failed to clean up test transaction');
      }
    } else {
      console.log('❌ Transaction creation failed');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error details:', errorData);
      } catch (e) {
        console.log('Raw error response:', responseText);
      }
    }

  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

testTransactionAPI();
