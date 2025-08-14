
export interface Transaction {
    id: string;
    transaction_date: string;
    transaction_type: string;
    security_type: string;
    calculated_symbol: string;
    symbol: string;
    quantity: number;
    amount: number;
    price: number;
    commission: number;
    description: string;
    strike: number;
}


class TransactionsService {
    private static instance: TransactionsService;
    private readonly baseUrl = 'http://localhost:3001/api';

    private constructor() {}

    public static getInstance(): TransactionsService {
        if (!TransactionsService.instance) {
            TransactionsService.instance = new TransactionsService();
        }
        return TransactionsService.instance;
    }

    public async fetchAllTransactions(): Promise<Transaction[]> {
        try {
            const response = await fetch(`${this.baseUrl}/transactions`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            console.error("Error fetching transactions:", err);
            throw new Error("Failed to fetch transactions");
        }
    }

    public async fetchTransactionsBySymbol(symbol: string): Promise<Transaction[]> {
        try {
            const response = await fetch(`${this.baseUrl}/transactions/symbol/${symbol}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (err) {
            console.error(`Error fetching transactions for ${symbol}:`, err);
            throw new Error(`Failed to fetch transactions for ${symbol}`);
        }
    }
}

export default TransactionsService.getInstance();