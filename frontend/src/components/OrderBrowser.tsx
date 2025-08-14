import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, FileText, Filter, X, Target, Clock, CheckCircle2, XCircle, Square, Pause } from 'lucide-react';
import { etradeAPI } from '@/lib/etradeAPI';

interface Account {
  accountId: string;
  accountIdKey: string;
  accountMode: string;
  accountDesc: string;
  accountName: string;
  accountType: string;
  institutionType: string;
  accountStatus: string;
}

interface OrderProduct {
  symbol: string;
  securityType: string;
  callPut?: string;
  expiryYear?: number;
  expiryMonth?: number;
  expiryDay?: number;
  strikePrice?: number;
  productId?: {
    symbol: string;
    typeCode: string;
  };
}

interface OrderInstrument {
  symbolDescription: string;
  orderAction: string;
  quantityType: string;
  orderedQuantity: number;
  filledQuantity: number;
  estimatedCommission: number;
  estimatedFees: number;
  Product: OrderProduct;
}

interface OrderDetail {
  placedTime?: number;
  executedTime?: number;
  orderValue?: number;
  status: string;
  orderTerm: string;
  priceType: string;
  limitPrice?: number;
  stopPrice?: number;
  marketSession: string;
  replacesOrderId?: number;
  allOrNone?: boolean;
  netPrice?: number;
  netBid?: number;
  netAsk?: number;
  gcd?: number;
  ratio?: string;
  Instrument?: OrderInstrument[];
}

interface Order {
  orderId: number;
  details: string; // URL to order details
  orderType: string;
  OrderDetail: OrderDetail[];
}

export function OrderBrowser() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [symbol, setSymbol] = useState('');
  const [status, setStatus] = useState<'OPEN' | 'EXECUTED' | 'CANCELLED' | 'INDIVIDUAL_FILLS' | 'CANCEL_REQUESTED' | 'EXPIRED' | 'REJECTED' | ''>('OPEN'); // Default to OPEN orders
  const [fromDate, setFromDate] = useState(''); // Default to empty (last 30 days)
  const [toDate, setToDate] = useState('');
  const [securityType, setSecurityType] = useState<'EQ' | 'OPTN' | 'MMF' | 'BOND' | ''>('');
  const [transactionType, setTransactionType] = useState<'ATNM' | 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT' | ''>('');
  const [marketSession, setMarketSession] = useState<'REGULAR' | 'EXTENDED' | ''>('');
  const [fetchAllPages, setFetchAllPages] = useState(false);
  const [pageDelay, setPageDelay] = useState(1000); // 1 second delay for orders
  
  // Quick filters
  const [showQuickFilters, setShowQuickFilters] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccount) {
      loadOrders();
    }
  }, [selectedAccount]);

  const loadAccounts = async () => {
    try {
      setError(null);
      const accountData = await etradeAPI.getAccounts();
      setAccounts(accountData);
      if (accountData.length > 0) {
        setSelectedAccount(accountData[0].accountIdKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    }
  };

  const loadOrders = async () => {
    if (!selectedAccount) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const options = {
        status: status || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        symbol: symbol || undefined,
        securityType: securityType || undefined,
        transactionType: transactionType || undefined,
        marketSession: marketSession || undefined,
        maxPages: 10,
        pageDelay
      };

      const ordersData = fetchAllPages 
        ? await etradeAPI.getAllOrders(selectedAccount, options)
        : await etradeAPI.getOrders(selectedAccount, { ...options, count: 25 });
      
      setOrders(ordersData.Order || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return <Clock className="text-blue-600" size={16} />;
      case 'EXECUTED':
      case 'FILLED':
        return <CheckCircle2 className="text-green-600" size={16} />;
      case 'CANCELLED':
        return <XCircle className="text-red-600" size={16} />;
      case 'EXPIRED':
        return <Square className="text-gray-600" size={16} />;
      case 'CANCEL_REQUESTED':
        return <Pause className="text-orange-600" size={16} />;
      case 'REJECTED':
        return <X className="text-red-700" size={16} />;
      default:
        return <Target className="text-gray-500" size={16} />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toUpperCase()) {
      case 'OPEN':
        return 'bg-blue-100 text-blue-800';
      case 'EXECUTED':
      case 'FILLED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      case 'CANCEL_REQUESTED':
        return 'bg-orange-100 text-orange-800';
      case 'REJECTED':
        return 'bg-red-200 text-red-900';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderTypeColor = (orderType: string): string => {
    switch (orderType.toUpperCase()) {
      case 'BUY':
      case 'BUY_TO_OPEN':
        return 'text-green-600 font-semibold';
      case 'SELL':
      case 'SELL_TO_CLOSE':
      case 'SELL_SHORT':
        return 'text-red-600 font-semibold';
      case 'BUY_TO_COVER':
        return 'text-blue-600 font-semibold';
      default:
        return 'text-gray-600 font-medium';
    }
  };

  const resetFilters = () => {
    setSymbol('');
    setStatus('OPEN');
    setFromDate('');
    setToDate('');
    setSecurityType('');
    setTransactionType('');
    setMarketSession('');
  };

  const applyQuickFilter = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    setFromDate(formatDateForAPI(startDate));
    setToDate(formatDateForAPI(endDate));
  };

  const formatDateForAPI = (date: Date): string => {
    // ETrade API expects MMDDYYYY format
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${month}${day}${year}`;
  };

  const getMainOrderDetail = (order: Order): OrderDetail | undefined => {
    // Orders always have OrderDetail array in the actual API
    if (order.OrderDetail && order.OrderDetail.length > 0) {
      return order.OrderDetail[0]; // Return first order detail
    }
    return undefined;
  };

  const getMainSymbol = (orderDetail: OrderDetail): string => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      return orderDetail.Instrument[0].Product.symbol;
    }
    return 'N/A';
  };

  const getTotalQuantity = (orderDetail: OrderDetail): number => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      return orderDetail.Instrument.reduce((sum, inst) => sum + inst.orderedQuantity, 0);
    }
    return 0;
  };

  const getTotalFilledQuantity = (orderDetail: OrderDetail): number => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      return orderDetail.Instrument.reduce((sum, inst) => sum + inst.filledQuantity, 0);
    }
    return 0;
  };

  const getMainAction = (orderDetail: OrderDetail): string => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      const actions = orderDetail.Instrument.map(inst => inst.orderAction);
      return actions.join(' / ');
    }
    return 'N/A';
  };

  const getTotalCommission = (orderDetail: OrderDetail): number => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      return orderDetail.Instrument.reduce((sum, inst) => sum + inst.estimatedCommission, 0);
    }
    return 0;
  };

  const getOrderDescription = (orderDetail: OrderDetail): string => {
    if (orderDetail.Instrument && orderDetail.Instrument.length > 0) {
      if (orderDetail.Instrument.length === 1) {
        return orderDetail.Instrument[0].symbolDescription;
      } else {
        // Multi-leg order (spread)
        return `${orderDetail.Instrument.length}-leg spread`;
      }
    }
    return 'N/A';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <FileText size={24} />
            <span>Open Orders</span>
          </h2>
          <button
            onClick={loadOrders}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            <span>{loading ? 'Loading...' : 'Refresh Orders'}</span>
          </button>
        </div>

        {/* Account Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Account
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an account...</option>
            {accounts.map((account) => (
              <option key={account.accountIdKey} value={account.accountIdKey}>
                {account.accountName} ({account.accountType}) - {account.accountIdKey}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Filters Toggle */}
        <div className="mb-4">
          <button
            onClick={() => setShowQuickFilters(!showQuickFilters)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
          >
            <Filter size={16} />
            <span>{showQuickFilters ? 'Hide' : 'Show'} Filters</span>
          </button>
        </div>

        {/* Filters Section */}
        {showQuickFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Symbol Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Symbol
                </label>
                <input
                  type="text"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g., AAPL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="EXECUTED">Executed</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCEL_REQUESTED">Cancel Requested</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="INDIVIDUAL_FILLS">Individual Fills</option>
                </select>
              </div>

              {/* Security Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Type
                </label>
                <select
                  value={securityType}
                  onChange={(e) => setSecurityType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="EQ">Equity</option>
                  <option value="OPTN">Options</option>
                  <option value="MMF">Money Market Fund</option>
                  <option value="BOND">Bond</option>
                </select>
              </div>

              {/* Transaction Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Action
                </label>
                <select
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Actions</option>
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                  <option value="BUY_TO_COVER">Buy to Cover</option>
                  <option value="SELL_SHORT">Sell Short</option>
                  <option value="ATNM">ATNM</option>
                </select>
              </div>
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date (MMDDYYYY)
                </label>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  placeholder="e.g., 01012024"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date (MMDDYYYY)
                </label>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  placeholder="e.g., 12312024"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Market Session
                </label>
                <select
                  value={marketSession}
                  onChange={(e) => setMarketSession(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Sessions</option>
                  <option value="REGULAR">Regular</option>
                  <option value="EXTENDED">Extended</option>
                </select>
              </div>
            </div>

            {/* Quick Date Filters */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-700">Quick filters:</span>
              <button
                onClick={() => applyQuickFilter(1)}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Today
              </button>
              <button
                onClick={() => applyQuickFilter(7)}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Last 7 days
              </button>
              <button
                onClick={() => applyQuickFilter(30)}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Last 30 days
              </button>
              <button
                onClick={() => applyQuickFilter(90)}
                className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Last 90 days
              </button>
            </div>

            {/* Pagination Control */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={fetchAllPages}
                    onChange={(e) => setFetchAllPages(e.target.checked)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Fetch all pages</span>
                </label>
                
                {fetchAllPages && (
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gray-700">Page delay:</label>
                    <select
                      value={pageDelay}
                      onChange={(e) => setPageDelay(parseInt(e.target.value))}
                      className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="500">0.5s</option>
                      <option value="1000">1.0s</option>
                      <option value="1500">1.5s</option>
                      <option value="2000">2.0s</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center space-x-1"
                >
                  <X size={14} />
                  <span>Reset</span>
                </button>
                <button
                  onClick={loadOrders}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <Filter size={16} />
                  <span>Apply Filters</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-100 text-red-700 p-3 rounded flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol / Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action/Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Est. Value
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    {loading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <RefreshCw className="animate-spin" size={20} />
                        <span>Loading orders...</span>
                      </div>
                    ) : (
                      'No orders found for the selected criteria.'
                    )}
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const detail = getMainOrderDetail(order);
                  if (!detail) return null;

                  const symbol = getMainSymbol(detail);
                  const quantity = getTotalQuantity(detail);
                  const filledQuantity = getTotalFilledQuantity(detail);
                  const remainingQuantity = quantity - filledQuantity;
                  const action = getMainAction(detail);
                  const commission = getTotalCommission(detail);
                  const description = getOrderDescription(detail);

                  return (
                    <tr key={order.orderId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.orderId}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.orderType}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(detail.status)}
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(detail.status)}`}>
                            {detail.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">
                          {symbol}
                        </div>
                        <div className="text-xs text-gray-500" title={description}>
                          {description.length > 30 ? description.substring(0, 30) + '...' : description}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${getOrderTypeColor(action)}`}>
                          {action}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {quantity.toLocaleString()}
                          {filledQuantity > 0 && (
                            <div className="text-xs text-green-600">
                              Filled: {filledQuantity.toLocaleString()}
                            </div>
                          )}
                          {remainingQuantity > 0 && remainingQuantity < quantity && (
                            <div className="text-xs text-blue-600">
                              Remaining: {remainingQuantity.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {detail.limitPrice ? formatCurrency(detail.limitPrice) : detail.priceType}
                        </div>
                        {detail.stopPrice && detail.stopPrice > 0 && (
                          <div className="text-xs text-gray-500">
                            Stop: {formatCurrency(detail.stopPrice)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {order.orderType}
                        </div>
                        <div className="text-xs text-gray-500">
                          {detail.orderTerm}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(detail.placedTime || 0)}
                        </div>
                        {detail.executedTime && (
                          <div className="text-xs text-green-600">
                            Executed: {formatDate(detail.executedTime)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatCurrency(detail.orderValue)}
                        </div>
                        {commission > 0 && (
                          <div className="text-xs text-gray-500">
                            +{formatCurrency(commission)} fee
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {orders.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Total Orders: <span className="font-semibold">{orders.length}</span>
              </div>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Clock size={14} className="text-blue-600" />
                  <span className="text-gray-600">
                    Open: <span className="font-semibold">{orders.filter(o => {
                      const detail = getMainOrderDetail(o);
                      return detail?.status === 'OPEN';
                    }).length}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="text-gray-600">
                    Executed: <span className="font-semibold">{orders.filter(o => {
                      const detail = getMainOrderDetail(o);
                      return detail?.status === 'EXECUTED';
                    }).length}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <XCircle size={14} className="text-red-600" />
                  <span className="text-gray-600">
                    Cancelled: <span className="font-semibold">{orders.filter(o => {
                      const detail = getMainOrderDetail(o);
                      return detail?.status === 'CANCELLED';
                    }).length}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
