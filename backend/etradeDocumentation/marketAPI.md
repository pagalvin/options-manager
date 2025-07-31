Market API
Overview
This API retrieves the quote information for one or more specified symbols.

Get Quotes link
Description
This API returns detailed quote information for one or more specified securities. An optional flag specifies one of five pre-configured field sets to return: fundamentals, intraday activity, options, a 52-week display, or all available details (the default). Developers can select the response that most closely fits their needs to minimize data size, processing time, and network traffic. To receive access to real-time market data, you would need to sign the market data agreement and use the API through the OAuth process. Otherwise, you will receive delayed market data.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/quote/{symbols}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/quote/{symbols}
                
Request
Property	Type	Required?	Description	Allowable Values
symbols	path	yes	One or more (comma-separated) symbols for equities or options, up to a maximum of 25. Symbols for equities are simple, for example, GOOG. Symbols for options are more complex, consisting of six elements separated by colons, in this format: underlier:year:month:day:optionType:strikePrice.	
detailFlag	query	no	Determines the market fields returned from a quote request.	ALL, FUNDAMENTAL, INTRADAY, OPTIONS, WEEK_52, MF_DETAIL
requireEarningsDate	query	no	If value is true, then nextEarningDate will be provided in the output. If value is false or if the field is not passed, nextEarningDate will be returned with no value.	
overrideSymbolCount	query	no	If value is true, then symbolList may contain a maximum of 50 symbols; otherwise, symbolList can only contain 25 symbols.	
skipMiniOptionsCheck	query	no	If value is true, no call is made to the service to check whether the symbol has mini options. If value is false or if the field is not specified, a service call is made to check if the symbol has mini options.	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	QuoteResponse	
400	Invalid symbol.		1019
400	Invalid count. A request may contain up to 50 quotes.		1025
400	Error getting the product details.		1002
400	Please enter valid Mutual Fund or Money Market Fund symbols.		1024
400	Invalid count. A request may contain up to 25 quotes.		1023
400	Invalid user id.		1021
400	Invalid detail flag.		1020
500	Quote service is not available at this time, please try again later.		163
AllQuoteDetails link
Property	Type	Description	Possible Values
adjustedFlag	boolean	Indicates whether an option has been adjusted due to a corporate action (for example, a dividend or stock split)	
ask	number (double)	The current ask price for a security	
askSize	integer (int64)	Number shares or contracts offered by broker or dealer at the ask price	
askTime	string	The time of the ask; for example, '15:15:43 PDT 03-21-2018'	
bid	number (double)	Current bid price for a security	
bidExchange	string	Code for the exchange reporting the bid price	
bidSize	integer (int64)	Number of shares or contracts offered at the bid price	
bidTime	string	Time of the bid; for example '15:15:43 PDT 03-21-2018'	
changeClose	number (double)	Dollar change of the last price from the previous close	
changeClosePercentage	number (double)	Percentage change of the last price from the previous close	
companyName	string	Name of the company or mutual fund (shows up to 40 characters)	
daysToExpiration	integer (int64)	Number of days before the option expires	
dirLast	string	Direction of movement; that is, whether the current price is higher or lower than the price of the most recent trade	
dividend	number (double)	Cash amount per share of the latest dividend	
eps	number (double)	Earnings per share on rolling basis (stocks only)	
estEarnings	number (double)	Projected Earnings per share for the next fiscal year (stocks only)	
exDividendDate	integer (int64)	Date (in Epoch time) on which shareholders were entitled to receive the latest dividend	
high	number (double)	Highest price at which a security has traded during the current day	
high52	number (double)	Highest price at which a security has traded during the past year (52 weeks). For options, this value is the lifetime high.	
lastTrade	number (double)	Price of the most recent trade of a security	
low	number (double)	Lowest price at which a security has traded during the current day	
low52	number (double)	Lowest price at which security has traded during the past year (52 weeks). For options, this value is the lifetime low.	
open	number (double)	Price of a security at the current day's market open	
openInterest	integer (int64)	Total number of options or futures contracts that are not closed or delivered on a particular day	
optionStyle	string	Specifies how the contract treats the expiration date. Possible values are "European" (options can be exercised only on the expiration date) or "American" (options can be exercised any time before they expire).	
optionUnderlier	string	Symbol for the underlier (options only)	
optionUnderlierExchange	string	Exchange code for option underlier symbol; applicable only for options	
previousClose	number (double)	Official price at the close of the previous trading day	
previousDayVolume	integer (int64)	Final volume from the previous market session	
primaryExchange	string	Exchange code of the primary listing exchange for this instrument	
symbolDescription	string	Description of the security; for example, the company name or the option description	
totalVolume	integer (int64)	Total number of shares or contracts exchanging hands	
upc	integer (int64)	Uniform Practice Code identifies specific FINRA advisories detailing unusual circumstances; for example, extremely large dividends, when-issued settlement dates, and worthless securities	
optionDeliverableList	array[OptionDeliverable]	List of mulitple deliverables	
cashDeliverable	number	The cash deliverables in case of multiple deliverables	
marketCap	number	The value market capitalization	
sharesOutstanding	number	The number of outstanding shares	
nextEarningDate	string	If requireEarningsDate is true, the next earning date value in mm/dd/yyyy format	
beta	number (double)	A measure of a stock's volatility relative to the primary market index	
yield	number (double)	The dividend yield	
declaredDividend	number (double)	The declared dividend	
dividendPayableDate	integer (int64)	The dividend payable date	
pe	number (double)	The option multiplier	
week52LowDate	integer (int64)	The date at which the price was the lowest in the last 52 weeks; applicable for stocks and mutual funds	
week52HiDate	integer (int64)	The date at which the price was highest in the last 52 weeks; applicable for stocks and mutual funds	
intrinsicValue	number (double)	The intrinsic value of the share	
timePremium	number (double)	The value of the time premium	
optionMultiplier	number (double)	The option multiplier value	
contractSize	number (double)	CThe contract size of the option	
expirationDate	integer (int64)	The expiration date of the option	
ehQuote	ExtendedHourQuoteDetail	QuoteDetails when market is in extended hours; appears only for after-hours market and when detailFlag is ALL or all	
optionPreviousBidPrice	number	The option previous bid price	
optionPreviousAskPrice	number	OThe option previous ask price	
osiKey	string	The Options Symbology Initiative (OSI) representation of the option symbol	
timeOfLastTrade	integer (int64)	The time when the last trade was placed	
averageVolume	integer (int64)	Average volume value corresponding to the symbol	
ExtendedHourQuoteDetail link
Property	Type	Description	Possible Values
lastPrice	number (double)	The price of the most recent trade of a security	
change	number (double)	The dollar value of the difference between the previous and the present executed price	
percentChange	number (double)	The percentage value of difference between the previous and the present executed price	
bid	number (double)	The bid price of the symbol	
bidSize	integer (int64)	The number of shares or contracts offered by a broker or dealer at the bid price	
ask	number (double)	The ask price of the symbol	
askSize	integer (int64)	The number of shares or contracts offered by a broker or dealer at the ask price	
volume	integer (int64)	The number of shares or contracts	
timeOfLastTrade	integer (int64)	The time when the last trade was carried out for the symbol	
timeZone	string	The time zone corresponding to the timestamp provided in the quote response	
quoteStatus	string	The status of the quote, either delayed or real time	REALTIME, DELAYED, CLOSING, EH_REALTIME, EH_BEFORE_OPEN, EH_CLOSED, INDICATIVE_REALTIME
FundamentalQuoteDetails link
Property	Type	Description	Possible Values
companyName	string	The name of the company associated with the equity, option, or index.	
eps	number (double)	The earnings per share on a rolling basis (Applies to stocks only)	
estEarnings	number (double)	The estimated earnings	
high52	number (double)	The highest price at which a security has traded during the past year (52 weeks). For options, this value is the lifetime high.	
lastTrade	number (double)	The most recent trade price for a security	
low52	number (double)	The lowest price at which a security has traded during the past year (52 weeks). For options, this value is the lifetime low.	
symbolDescription	string	A description of the security, such as company name or option description	
IntradayQuoteDetails link
Property	Type	Description	Possible Values
ask	number (double)	The current ask price for a security	
bid	number (double)	The current bid price for a security	
changeClose	number (double)	The dollar change of the last price from the previous close	
changeClosePercentage	number (double)	The percentage change of the last price from the previous close	
companyName	string	The name of the company associated with the equity, option, or index	
high	number (double)	The highest price at which a security has traded during the current day	
lastTrade	number (double)	The price of the last trade	
low	number (double)	The lowest price at which a security has traded during the current day	
totalVolume	integer (int64)	Total number of shares or contracts exchanging hands	
Message link
Property	Type	Description	Possible Values
description	string	The text of the result message, indicating order status, success or failure, additional requirements that must be met before placing the order, and so on. Applications typically display this message to the user, which may result in further user action.	
code	integer (int32)	The standard numeric code of the result message. Refer to the Error Messages documentation for examples. May optionally be displayed to the user, but is primarily intended for internal use.	
type	string	The type used to identify the message	WARNING, INFO, INFO_HOLD, ERROR
Messages link
Property	Type	Description	Possible Values
message	array[Message]	The object for the message	
MutualFund link
Property	Type	Description	Possible Values
symbolDescription	string	The description of the security; for example, company name	
cusip	string	The identifier for the security	
changeClose	number (double)	The dollar change of the last price from the previous close	
previousClose	number (double)	The official price at the close of the previous trading day	
transactionFee	string	An indicator (yes or no) whether or not there is a fee applicable for the security transaction	
earlyRedemptionFee	string	The redemption fee applicable for the security transaction	
availability	string	An indicator to inform if the mutual fund is available for new buy and sell orders	
initialInvestment	number (double)	The minimum initial investment required to purchase the fund	
subsequentInvestment	number (double)	The minimum subsequent investment amount	
fundFamily	string	The type of fund family the mutual fund belongs to	
fundName	string	The name of the mutual fund	
changeClosePercentage	number (double)	The percentage change of the last price from the previous close	
timeOfLastTrade	integer (int64)	The time the last trade was placed	
netAssetValue	number	The Net Access Value (NAV) is the fund's per share market value; that is, the bid price investors pay to purchase fund shares	
publicOfferPrice	number (double)	The Public Offering Price (POP) is the price at which shares are sold to public; for funds without sales commission (that is, load), POP is equal to NAV	
netExpenseRatio	number (double)	The expense ratio of the fund after application of expense waivers and reimbursements	
grossExpenseRatio	number (double)	The fund's total annual operating expense ratio gross of any fee waivers or expense reimbursements	
orderCutoffTime	integer (int64)	The cut-off time for the purchase and redemption of mutual fund shares	
salesCharge	string	The sales charge for the purchase and redemption of mutual fund shares	
initialIraInvestment	number (double)	The initial amount needed to purchase mutual fund shares in an IRA account	
subsequentIraInvestment	number (double)	The minimum amount needed to purchase subsequent mutual fund shares in an IRA account	
netAssets	NetAsset	The Total Net Asset Value (NAV)	
fundInceptionDate	integer (int64)	The date when the fund started	
averageAnnualReturns	number (double)	The average annual return at the end of the quarter; this is available if fund has been active for more than 10 years	
sevenDayCurrentYield	number (double)	The seven-day current yield	
annualTotalReturn	number (double)	The annual total return	
weightedAverageMaturity	number (double)	The weighted average of maturity	
averageAnnualReturn1Yr	number (double)	The average annual return for one year	
averageAnnualReturn3Yr	number (double)	The average annual return for three years	
averageAnnualReturn5Yr	number (double)	The average annual return for five years	
averageAnnualReturn10Yr	number (double)	The average annual return for ten years	
high52	number (double)	The highest price at which a security has traded during the past year	
low52	number (double)	The lowest price at which a security has traded during the past year	
week52LowDate	integer (int64)	The date when the price was the lowest in the last 52 weeks	
week52HiDate	integer (int64)	The date when the price was the highest in the last 52 weeks	
exchangeName	string	The exchange name of the fund	
sinceInception	number	The value of the fund since its beginning	
quarterlySinceInception	number	The quarterly average value of the fund since the beginning of fund	
lastTrade	number (double)	The price of the most recent trade of the security	
actual12B1Fee	number	The annual marketing or distribution fee on the mutual fund	
performanceAsOfDate	string	The start date the performance is measured from	
qtrlyPerformanceAsOfDate	string	The start date of the quarter that the performance is measured from	
redemption	Redemption	The mutual fund shares redemption properties	
morningStarCategory	string	The Morningstar category for the fund	
monthlyTrailingReturn1Y	number	The one-year monthly trailing return value	
monthlyTrailingReturn3Y	number	The three-year monthly trailing return value	
monthlyTrailingReturn5Y	number	The five-year monthly trailing return value	
monthlyTrailingReturn10Y	number	The ten-year monthly trailing return value	
etradeEarlyRedemptionFee	string	The E*TRADE early redemption fee	
maxSalesLoad	number	The maximum sales charge	
monthlyTrailingReturnYTD	number	The year-to-date monthly trailing return value	
monthlyTrailingReturn1M	number	The one-month monthly trailing return value	
monthlyTrailingReturn3M	number	The three-month monthly trailing return value	
monthlyTrailingReturn6M	number	The six-month monthly trailing return value	
qtrlyTrailingReturnYTD	number	The year-to-date quarterly trailing return value	
qtrlyTrailingReturn1M	number	The one-month quarterly trailing return value	
qtrlyTrailingReturn3M	number	The three-month quarterly trailing return value	
qtrlyTrailingReturn6M	number	The six-month quarterly trailing return value	
deferredSalesCharges	array[SaleChargeValues]	The deferred sales charge	
frontEndSalesCharges	array[SaleChargeValues]	The front-end sales charge	
exchangeCode	string	The code of the exchange	
NetAsset link
Property	Type	Description	Possible Values
value	number	The value of the net asset	
asOfDate	integer (int64)	The net asset as of date	
OptionDeliverable link
Property	Type	Description	Possible Values
rootSymbol	string	Root symbol of option multiplier	
deliverableSymbol	string	Symbol of share to be delivered	
deliverableTypeCode	string	Type code of share to be delivered	
deliverableExchangeCode	string	Exchange code of share to be delivered	
deliverableStrikePercent	number	Strike percent of delivered product	
deliverableCILShares	number	Number of CIL shares to be delivered	
deliverableWholeShares	integer (int32)	Number of whole shares to be distributed	
OptionGreeks link
Property	Type	Description	Possible Values
rho	number	The rho value of the symbol	
vega	number	The vega value of the symbol	
theta	number	The theta value of the symbol	
delta	number	The delta value of the symbol	
gamma	number	The gamma value of the symbol	
iv	number	The Implied Volatility (IV) value of the symbol	
currentValue	boolean	The current value of the symbol	
OptionQuoteDetails link
Property	Type	Description	Possible Values
ask	number (double)	The current ask price for a security	
askSize	integer (int64)	The number of shares or contracts offered by a broker/dealer at the ask price	
bid	number (double)	The current bid price for a security	
bidSize	integer (int64)	The number of shares or contracts offered at the bid price	
companyName	string	The name of the company associated with the equity, option, or index	
daysToExpiration	integer (int64)	Number of days before the option expires	
lastTrade	number (double)	The price of the most recent trade in a security	
openInterest	integer (int64)	The total number of options or futures contracts that are not closed or delivered on a particular day	
optionPreviousBidPrice	number	The previous bid price for the option	
optionPreviousAskPrice	number	The previous ask price for the option	
osiKey	string	The Options Symbology Initiative (OSI) representation of the option symbol	
intrinsicValue	number (double)	The intrinsic value of the share	
timePremium	number (double)	The value of the time premium	
optionMultiplier	number (double)	The value of the option multiplier	
contractSize	number (double)	The contract size of the option	
symbolDescription	string	The description of the security; for example, company name or option description	
optionGreeks	OptionGreeks	The Greek values for the option	
Product link
Property	Type	Description	Possible Values
symbol	string	The symbol for which the quote details are being accessed	
securityType	string	The type code to identify the order or leg request	BOND, EQ, INDX, MF, MMF, OPTN
securitySubType	string	The subtype of the security	
callPut	string	The option type - either CALL or PUT	CALL, PUT
expiryYear	integer (int32)	The four-digit year the option will expire	
expiryMonth	integer (int32)	The month (1-12) the option will expire	
expiryDay	integer (int32)	The day (1-31) the option will expire	
strikePrice	number	The strike price for the option	
expiryType	string	The expiration type for the option	
productId	ProductId	ProductId	
ProductId link
Property	Type	Description	Possible Values
symbol	string	The market symbol for the security being bought or sold	
typeCode	string	Product Type Code	EQUITY, OPTION, MUTUAL_FUND, INDEX, MONEY_MARKET_FUND, BOND, UNKNOWN, WILDCARD, MOVE, ETF, EQUITY_OPTION_ETF, EQUITY_ETF, CLOSED_END_FUND, PREFERRED, EQUITY_OPTN, EXCHANGE_TRADED_FUND, MUTUAL_FUND_MONEY_MARKET_FUND
QuoteData link
Property	Type	Description	Possible Values
all	AllQuoteDetails	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
dateTime	string	The date and time of the quote	
dateTimeUTC	integer (int64)	The date and time of the quote in Coordinated Universal Time (UTC)	
quoteStatus	string	The status of the quote	REALTIME, DELAYED, CLOSING, EH_REALTIME, EH_BEFORE_OPEN, EH_CLOSED, INDICATIVE_REALTIME
ahFlag	string	Indicates whether the quote details are being displayed after hours or not	
errorMessage	string	The Quote API will not populate any value for an invalid symbol. When an invalid symbol is requested, the API returns the Messages structure as part of QuoteResponse instead of using the errorMessage string in QuoteData. For this reason, Quote API clients should refer to Messages in the QuoteResponse.	
fundamental	FundamentalQuoteDetails	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
intraday	IntradayQuoteDetails	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
option	OptionQuoteDetails	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
product	Product	The product details for the symbol the quote has been requested for	
week52	Week52QuoteDetails	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
mutualFund	MutualFund	The quote details to be displayed. This field depends on the detailFlag input parameter. For example, if detailFlag is ALL, AllQuoteDetails are displayed. If detailFlag is MF_DETAIL, the MutualFund structure gets displayed.	
timeZone	string	Indicates whether the time zone is set. This field is displayed only when detailFlag is MF_DETAIL.	
dstFlag	boolean	Indicates whether the daylight savings flag is set. This field is displayed only when detailFlag is MF_DETAIL.	
hasMiniOptions	boolean	Optional field. Value is true if mini options exist for the symbol; otherwise, value is false. This field will only be populated when the symbol is an equity or an index and the skipMiniOptionsCheck parameter is set to false or not provided in the request.	
QuoteResponse link
Property	Type	Description	Possible Values
quoteData	array[QuoteData]	The Quote Message Data	
messages	Messages	The Quote response Message	
Redemption link
Property	Type	Description	Possible Values
minMonth	string	The minimum month for redemption of mutual fund shares.	
feePercent	string	Fee percent charged to user by fund for redemption of mutual fund shares.	
isFrontEnd	string	If the value is '1' it indicated that the fund is front end load.	
frontEndValues	array[Values]	Potential values are low, high, and percent.Low denotes the lower timeline for the particular period of the fund.High denotes the higher timeline for the particular period of the fund.Percent denotes the percent that will be charged between the lower and higher timeline for that particular period	
redemptionDurationType	string	If the value is 4, time line is represented in years.If the value is 3, time line is represented in months.If the value is 10, time line is represented in days.	
isSales	string	This value indicates whether the fund is back end load function.	
salesDurationType	string	If the value is 4, time line is represented in years. If the value is 3, time line is represented in months. If the value is 10, time line is represented in days.	
salesValues	array[Values]	Potential values are low, high, and percent.Low denotes the lower timeline for the particular period of the fund.High denotes the higher timeline for the particular period of the fund.Percent denotes the percent that will be charged between the lower and higher timeline for that particular period.	
SaleChargeValues link
Property	Type	Description	Possible Values
lowhigh	string	The sales charge for investing in the mutual fund expressed as a low-high range (usually the sales charge is between 3-6%)	
percent	string	The percentage of the investment spent on the sales charge	
Values link
Property	Type	Description	Possible Values
low	string	When the dollar amount of mutual fund purchases reaches a specified level, the sales load decreases. This field stores the minimum investment level at which the discount becomes available.	
high	string	The maximum investment level at which the discount becomes available	
percent	string	The sales load percentage for amounts between the low and high values	
Week52QuoteDetails link
Property	Type	Description	Possible Values
companyName	string	The name of the company associated with the equity, option, or index	
high52	number (double)	The highest price at which a security has traded during the past year (52 weeks). For options, this value is the lifetime high.	
lastTrade	number (double)	The price of the most recent trade in a security	
low52	number (double)	The lowest price at which a security has traded during the past year (52 weeks). For options, this value is the lifetime low.	
perf12Months	number (double)	The performance value for the past 12 months	
previousClose	number (double)	The official price at the close on the previous trading day	
symbolDescription	string	A description of the security; for example, company name or option description	
totalVolume	integer (int64)	Total number of shares or contracts exchanging hands	
Example
Get Quote Request URL
content_copy
https://api.etrade.com/v1/market/quote/GOOG
                
Response
content_copy
                    
<?xml version="1.0" encoding="UTF-8"?>
<QuoteResponse>
   <QuoteData>
      <dateTime>15:17:00 EDT 06-20-2018</dateTime>
      <dateTimeUTC>1529522220</dateTimeUTC>
      <quoteStatus>DELAYED</quoteStatus>
      <ahFlag>false</ahFlag>
      <hasMiniOptions>false</hasMiniOptions>
      <All>
         <adjustedFlag>false</adjustedFlag>
         <ask>1175.79</ask>
         <askSize>100</askSize>
         <askTime>15:17:00 EDT 06-20-2018</askTime>
         <bid>1175.29</bid>
         <bidExchange />
         <bidSize>100</bidSize>
         <bidTime>15:17:00 EDT 06-20-2018</bidTime>
         <changeClose>7.68</changeClose>
         <changeClosePercentage>0.66</changeClosePercentage>
         <companyName>ALPHABET INC CAP STK CL C</companyName>
         <daysToExpiration>0</daysToExpiration>
         <dirLast>2</dirLast>
         <dividend>0.0</dividend>
         <eps>23.5639</eps>
         <estEarnings>43.981</estEarnings>
         <exDividendDate>1430163144</exDividendDate>
         <high>1186.2856</high>
         <high52>1186.89</high52>
         <lastTrade>1175.74</lastTrade>
         <low>1171.76</low>
         <low52>894.79</low52>
         <open>1175.31</open>
         <openInterest>0</openInterest>
         <optionStyle />
         <optionUnderlier />
         <previousClose>1168.06</previousClose>
         <previousDayVolume>1620909</previousDayVolume>
         <primaryExchange>NSDQ</primaryExchange>
         <symbolDescription>ALPHABET INC CAP STK CL C</symbolDescription>
         <totalVolume>1167544</totalVolume>
         <upc>0</upc>
         <cashDeliverable>0</cashDeliverable>
         <marketCap>410276824480.00</marketCap>
         <sharesOutstanding>348952000</sharesOutstanding>
         <nextEarningDate />
         <beta>1.4</beta>
         <yield>0.0</yield>
         <declaredDividend>0.0</declaredDividend>
         <dividendPayableDate>1430767944</dividendPayableDate>
         <pe>49.57</pe>
         <week52LowDate>1499110344</week52LowDate>
         <week52HiDate>1517257944</week52HiDate>
         <intrinsicValue>0.0</intrinsicValue>
         <timePremium>0.0</timePremium>
         <optionMultiplier>0.0</optionMultiplier>
         <contractSize>0.0</contractSize>
         <expirationDate>0</expirationDate>
         <timeOfLastTrade>1529522220</timeOfLastTrade>
         <averageVolume>1451490</averageVolume>
      </All>
      <Product>
         <securityType>EQ</securityType>
         <symbol>GOOG</symbol>
      </Product>
   </QuoteData>
</QuoteResponse>

                  
                
===


Market API
Overview
The Market APIs provide information about market events.

Look Up Product link
Description
This API returns a list of securities of a specified type (e.g., equity stock) based on a full or partial match of any part of the company name. For instance, a search for "jones" returns a list of securities associated with "Jones Soda Co", "Stella Jones Inc", and many others. The list contains the company name, the exchange that lists the security, the security type, and the symbol, for as many matches as are found. The result may include some unexpected matches, because the search includes more than just the display version of the company name. For instance, searching on "etrade" returns securities for "E TRADE" - notice the space in the name. This API is for searching on the company name, not a security symbol. It's commonly used to look up a symbol based on the company name, e.g., "What is the symbol for Google stock?". To look up company information based on a symbol, or to find detailed information on a security, use the quote API.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/lookup/{search}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/lookup/{search}
                
Request
Property	Type	Required?	Description	Allowable Values
search	path	yes	The search request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	LookupResponse	
400	The symbol entered is invalid. Please enter another symbol.		10033
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Error getting the product details.		10034
Get Option Chains link
Description
This API returns a list of option chains for a specific underlying instrument. The request must specify an instrument, the month the option expires, and whether you are interested in calls, puts, or both. Values returned include the option pair count and information about each option pair, including the type, call count, symbol, product, date, and strike price..

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionchains?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionchains?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
symbol	query	yes	The market symbol for the instrument; for example, GOOG	
expiryYear	query	no	Indicates the expiry year corresponding to which the optionchain needs to be fetched	
expiryMonth	query	no	Indicates the expiry month corresponding to which the optionchain needs to be fetched	
expiryDay	query	no	Indicates the expiry day corresponding to which the optionchain needs to be fetched	
strikePriceNear	query	no	The optionchians fetched will have strike price nearer to this value	
noOfStrikes	query	no	Indicates number of strikes for which the optionchain needs to be fetched	
includeWeekly	query	no	The include weekly options request. Default: false.	true, false
skipAdjusted	query	no	The skip adjusted request. Default: true.	true, false
optionCategory	query	no	The option category. Default: STANDARD.	STANDARD, ALL, MINI
chainType	query	no	The type of option chain. Default: CALLPUT.	CALL, PUT, CALLPUT
priceType	query	no	The price type. Default: ATNM.	ATNM, ALL
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionChainResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Get Option Expire Dates link
Description
Returns a list of dates suitable for structuring an option table display. The dates are used to group option data (returned by the optionchains method) for a specified underlier, creating a table display.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
expiryType	query	no	Expiration type of the option	
symbol	query	yes	The symbol in the request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionExpireDateResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Data link
Property	Type	Description	Possible Values
symbol	string	The market symbol for the security	
description	string	The text description of the security	
type	string	The symbol type	
ExpirationDate link
Property	Type	Description	Possible Values
year	integer (int32)	The four-digit year the option will expire	
month	integer (int32)	The month (1-12) the option will expire	
day	integer (int32)	The day (1-31) the option will expire	
expiryType	string	Expiration type of the option	UNSPECIFIED, DAILY, WEEKLY, MONTHLY, QUARTERLY, VIX, ALL, MONTHEND
LookupResponse link
Property	Type	Description	Possible Values
data	array[Data]	The lookup response data	
OptionChainPair link
Property	Type	Description	Possible Values
optioncall	OptionDetails	The option call in the option chain pair	
optionPut	OptionDetails	The option put in the option chain pair	
pairType	string	Determines whether the response will contain calls(CALLONLY), puts(PUTONLY), or both(CALLPUT)	
OptionChainResponse link
Property	Type	Description	Possible Values
optionPairs	array[OptionChainPair]	Container for an option pair; each option pair in the response has a container	
timeStamp	integer (int64)	The option chain response timestamp	
quoteType	string	The option chain response quote type	
nearPrice	number	The near price in the option chain	
selected	SelectedED	The selected option chain	
OptionDetails link
Property	Type	Description	Possible Values
optionCategory	string	The option category	STANDARD, ALL, MINI
optionRootSymbol	string	The root or underlying symbol of the option	
timeStamp	integer (int64)	The timestamp of the option	
adjustedFlag	boolean	Indicator signifying whether option is adjusted	
displaySymbol	string	The display symbol	
optionType	string	The option type	
strikePrice	number (double)	The agreed strike price for the option as stated in the contract	
symbol	string	The market symbol for the option	
bid	number (double)	The bid	
ask	number (double)	The ask	
bidSize	integer	The bid size	
askSize	integer	The ask size	
inTheMoney	string	The "in the money" value; a put option is "in the money" when the strike price of the put is above the current market price of the stock	
volume	integer	The option volume	
openInterest	integer	The open interest value	
netChange	number (double)	The net change value	
lastPrice	number (double)	The last price	
quoteDetail	string	The option quote detail	
osiKey	string	The Options Symbology Initiative (OSI) key containing the option root symbol, expiration date, call/put indicator, and strike price	
optionGreek	OptionGreeks	The Greeks on the option; Greeks are a collection of statistical values that measure the risk involved in an options contract in relation to certain underlying variables	
OptionExpireDateResponse link
Property	Type	Description	Possible Values
expirationDates	array[ExpirationDate]	The expiration dates for the options	
OptionGreeks link
Property	Type	Description	Possible Values
rho	number	The rho value	
vega	number	The vega value	
theta	number	The theta value	
delta	number	The delta value	
gamma	number	The gamma value	
iv	number	The Implied Volatility (IV)	
currentValue	boolean	The current value	
SelectedED link
Property	Type	Description	Possible Values
month	integer (int32)	The selected month	
year	integer (int32)	The selected year	
day	integer (int32)	The selected day	
Example
Look Up Product Request URL
content_copy
https://api.etrade.com/v1/market/lookup/a
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<LookupResponse>
   <Data>
      <symbol>A</symbol>
      <description>AGILENT TECHNOLOGIES INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AA</symbol>
      <description>ALCOA CORP COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AABA</symbol>
      <description>ALTABA INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AAPL</symbol>
      <description>APPLE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABBV</symbol>
      <description>ABBVIE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABEV</symbol>
      <description>AMBEV SA SPONSORED ADR</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABT</symbol>
      <description>ABBOTT LABS COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ACN</symbol>
      <description>ACCENTURE PLC IRELAND SHS CLASS A</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADBE</symbol>
      <description>ADOBE SYS INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADP</symbol>
      <description>AUTOMATIC DATA PROCESSING INC COM</description>
      <type>EQUITY</type>
   </Data>
</LookupResponse>
                  
                
Get Option Chains Request URL
content_copy
https://api.etrade.com/v1/market/optionchains?symbol=IBM&expiryYear=2018&expiryMonth=08&strikePriceNear=200&noOfStrikes=2
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionChainResponse>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529430484</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.05</ask>
         <bidSize>0</bidSize>
         <askSize>138</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:200.000000</quoteDetail>
         <osiKey>IBM---180817C00200000</osiKey>
         <OptionGreeks>
            <rho>0.001000</rho>
            <vega>0.008600</vega>
            <theta>-0.002000</theta>
            <delta>0.004900</delta>
            <gamma>0.000800</gamma>
            <iv>0.314500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:200.000000</quoteDetail>
         <osiKey>IBM---180817P00200000</osiKey>
         <OptionGreeks>
            <rho>-0.278200</rho>
            <vega>0.015300</vega>
            <theta>-0.000200</theta>
            <delta>-0.991400</delta>
            <gamma>0.001300</gamma>
            <iv>0.348400</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:205.000000</quoteDetail>
         <osiKey>IBM---180817C00205000</osiKey>
         <OptionGreeks>
            <rho>0.000800</rho>
            <vega>0.007100</vega>
            <theta>-0.001700</theta>
            <delta>0.003900</delta>
            <gamma>0.000600</gamma>
            <iv>0.327500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:205.000000</quoteDetail>
         <osiKey>IBM---180817P00205000</osiKey>
         <OptionGreeks>
            <rho>-0.282200</rho>
            <vega>0.034800</vega>
            <theta>-0.008300</theta>
            <delta>-0.974900</delta>
            <gamma>0.002400</gamma>
            <iv>0.442700</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <timeStamp>1529430420</timeStamp>
   <quoteType>DELAYED</quoteType>
   <nearPrice>200.0</nearPrice>
   <SelectedED>
      <day>17</day>
      <month>8</month>
      <year>2018</year>
   </SelectedED>
</OptionChainResponse>
  
                
Get Option Expire Dates Request URL
content_copy
https://api.etrade.com/v1/market/optionexpiredate?symbol=GOOG&expiryType=ALL
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionExpireDateResponse>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>22</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>29</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>6</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>13</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>20</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>27</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>8</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>9</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>12</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>1</month>
      <day>18</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>6</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2020</year>
      <month>1</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
</OptionExpireDateResponse>
                  
                
===

Market API
Overview
The Market APIs provide information about market events.

Look Up Product link
Description
This API returns a list of securities of a specified type (e.g., equity stock) based on a full or partial match of any part of the company name. For instance, a search for "jones" returns a list of securities associated with "Jones Soda Co", "Stella Jones Inc", and many others. The list contains the company name, the exchange that lists the security, the security type, and the symbol, for as many matches as are found. The result may include some unexpected matches, because the search includes more than just the display version of the company name. For instance, searching on "etrade" returns securities for "E TRADE" - notice the space in the name. This API is for searching on the company name, not a security symbol. It's commonly used to look up a symbol based on the company name, e.g., "What is the symbol for Google stock?". To look up company information based on a symbol, or to find detailed information on a security, use the quote API.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/lookup/{search}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/lookup/{search}
                
Request
Property	Type	Required?	Description	Allowable Values
search	path	yes	The search request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	LookupResponse	
400	The symbol entered is invalid. Please enter another symbol.		10033
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Error getting the product details.		10034
Get Option Chains link
Description
This API returns a list of option chains for a specific underlying instrument. The request must specify an instrument, the month the option expires, and whether you are interested in calls, puts, or both. Values returned include the option pair count and information about each option pair, including the type, call count, symbol, product, date, and strike price..

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionchains?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionchains?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
symbol	query	yes	The market symbol for the instrument; for example, GOOG	
expiryYear	query	no	Indicates the expiry year corresponding to which the optionchain needs to be fetched	
expiryMonth	query	no	Indicates the expiry month corresponding to which the optionchain needs to be fetched	
expiryDay	query	no	Indicates the expiry day corresponding to which the optionchain needs to be fetched	
strikePriceNear	query	no	The optionchians fetched will have strike price nearer to this value	
noOfStrikes	query	no	Indicates number of strikes for which the optionchain needs to be fetched	
includeWeekly	query	no	The include weekly options request. Default: false.	true, false
skipAdjusted	query	no	The skip adjusted request. Default: true.	true, false
optionCategory	query	no	The option category. Default: STANDARD.	STANDARD, ALL, MINI
chainType	query	no	The type of option chain. Default: CALLPUT.	CALL, PUT, CALLPUT
priceType	query	no	The price type. Default: ATNM.	ATNM, ALL
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionChainResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Get Option Expire Dates link
Description
Returns a list of dates suitable for structuring an option table display. The dates are used to group option data (returned by the optionchains method) for a specified underlier, creating a table display.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
expiryType	query	no	Expiration type of the option	
symbol	query	yes	The symbol in the request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionExpireDateResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Data link
Property	Type	Description	Possible Values
symbol	string	The market symbol for the security	
description	string	The text description of the security	
type	string	The symbol type	
ExpirationDate link
Property	Type	Description	Possible Values
year	integer (int32)	The four-digit year the option will expire	
month	integer (int32)	The month (1-12) the option will expire	
day	integer (int32)	The day (1-31) the option will expire	
expiryType	string	Expiration type of the option	UNSPECIFIED, DAILY, WEEKLY, MONTHLY, QUARTERLY, VIX, ALL, MONTHEND
LookupResponse link
Property	Type	Description	Possible Values
data	array[Data]	The lookup response data	
OptionChainPair link
Property	Type	Description	Possible Values
optioncall	OptionDetails	The option call in the option chain pair	
optionPut	OptionDetails	The option put in the option chain pair	
pairType	string	Determines whether the response will contain calls(CALLONLY), puts(PUTONLY), or both(CALLPUT)	
OptionChainResponse link
Property	Type	Description	Possible Values
optionPairs	array[OptionChainPair]	Container for an option pair; each option pair in the response has a container	
timeStamp	integer (int64)	The option chain response timestamp	
quoteType	string	The option chain response quote type	
nearPrice	number	The near price in the option chain	
selected	SelectedED	The selected option chain	
OptionDetails link
Property	Type	Description	Possible Values
optionCategory	string	The option category	STANDARD, ALL, MINI
optionRootSymbol	string	The root or underlying symbol of the option	
timeStamp	integer (int64)	The timestamp of the option	
adjustedFlag	boolean	Indicator signifying whether option is adjusted	
displaySymbol	string	The display symbol	
optionType	string	The option type	
strikePrice	number (double)	The agreed strike price for the option as stated in the contract	
symbol	string	The market symbol for the option	
bid	number (double)	The bid	
ask	number (double)	The ask	
bidSize	integer	The bid size	
askSize	integer	The ask size	
inTheMoney	string	The "in the money" value; a put option is "in the money" when the strike price of the put is above the current market price of the stock	
volume	integer	The option volume	
openInterest	integer	The open interest value	
netChange	number (double)	The net change value	
lastPrice	number (double)	The last price	
quoteDetail	string	The option quote detail	
osiKey	string	The Options Symbology Initiative (OSI) key containing the option root symbol, expiration date, call/put indicator, and strike price	
optionGreek	OptionGreeks	The Greeks on the option; Greeks are a collection of statistical values that measure the risk involved in an options contract in relation to certain underlying variables	
OptionExpireDateResponse link
Property	Type	Description	Possible Values
expirationDates	array[ExpirationDate]	The expiration dates for the options	
OptionGreeks link
Property	Type	Description	Possible Values
rho	number	The rho value	
vega	number	The vega value	
theta	number	The theta value	
delta	number	The delta value	
gamma	number	The gamma value	
iv	number	The Implied Volatility (IV)	
currentValue	boolean	The current value	
SelectedED link
Property	Type	Description	Possible Values
month	integer (int32)	The selected month	
year	integer (int32)	The selected year	
day	integer (int32)	The selected day	
Example
Look Up Product Request URL
content_copy
https://api.etrade.com/v1/market/lookup/a
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<LookupResponse>
   <Data>
      <symbol>A</symbol>
      <description>AGILENT TECHNOLOGIES INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AA</symbol>
      <description>ALCOA CORP COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AABA</symbol>
      <description>ALTABA INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AAPL</symbol>
      <description>APPLE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABBV</symbol>
      <description>ABBVIE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABEV</symbol>
      <description>AMBEV SA SPONSORED ADR</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABT</symbol>
      <description>ABBOTT LABS COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ACN</symbol>
      <description>ACCENTURE PLC IRELAND SHS CLASS A</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADBE</symbol>
      <description>ADOBE SYS INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADP</symbol>
      <description>AUTOMATIC DATA PROCESSING INC COM</description>
      <type>EQUITY</type>
   </Data>
</LookupResponse>
                  
                
Get Option Chains Request URL
content_copy
https://api.etrade.com/v1/market/optionchains?symbol=IBM&expiryYear=2018&expiryMonth=08&strikePriceNear=200&noOfStrikes=2
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionChainResponse>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529430484</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.05</ask>
         <bidSize>0</bidSize>
         <askSize>138</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:200.000000</quoteDetail>
         <osiKey>IBM---180817C00200000</osiKey>
         <OptionGreeks>
            <rho>0.001000</rho>
            <vega>0.008600</vega>
            <theta>-0.002000</theta>
            <delta>0.004900</delta>
            <gamma>0.000800</gamma>
            <iv>0.314500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:200.000000</quoteDetail>
         <osiKey>IBM---180817P00200000</osiKey>
         <OptionGreeks>
            <rho>-0.278200</rho>
            <vega>0.015300</vega>
            <theta>-0.000200</theta>
            <delta>-0.991400</delta>
            <gamma>0.001300</gamma>
            <iv>0.348400</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:205.000000</quoteDetail>
         <osiKey>IBM---180817C00205000</osiKey>
         <OptionGreeks>
            <rho>0.000800</rho>
            <vega>0.007100</vega>
            <theta>-0.001700</theta>
            <delta>0.003900</delta>
            <gamma>0.000600</gamma>
            <iv>0.327500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:205.000000</quoteDetail>
         <osiKey>IBM---180817P00205000</osiKey>
         <OptionGreeks>
            <rho>-0.282200</rho>
            <vega>0.034800</vega>
            <theta>-0.008300</theta>
            <delta>-0.974900</delta>
            <gamma>0.002400</gamma>
            <iv>0.442700</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <timeStamp>1529430420</timeStamp>
   <quoteType>DELAYED</quoteType>
   <nearPrice>200.0</nearPrice>
   <SelectedED>
      <day>17</day>
      <month>8</month>
      <year>2018</year>
   </SelectedED>
</OptionChainResponse>
  
                
Get Option Expire Dates Request URL
content_copy
https://api.etrade.com/v1/market/optionexpiredate?symbol=GOOG&expiryType=ALL
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionExpireDateResponse>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>22</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>29</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>6</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>13</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>20</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>27</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>8</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>9</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>12</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>1</month>
      <day>18</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>6</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2020</year>
      <month>1</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
</OptionExpireDateResponse>
                  
                
===

Market API
Overview
The Market APIs provide information about market events.

Look Up Product link
Description
This API returns a list of securities of a specified type (e.g., equity stock) based on a full or partial match of any part of the company name. For instance, a search for "jones" returns a list of securities associated with "Jones Soda Co", "Stella Jones Inc", and many others. The list contains the company name, the exchange that lists the security, the security type, and the symbol, for as many matches as are found. The result may include some unexpected matches, because the search includes more than just the display version of the company name. For instance, searching on "etrade" returns securities for "E TRADE" - notice the space in the name. This API is for searching on the company name, not a security symbol. It's commonly used to look up a symbol based on the company name, e.g., "What is the symbol for Google stock?". To look up company information based on a symbol, or to find detailed information on a security, use the quote API.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/lookup/{search}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/lookup/{search}
                
Request
Property	Type	Required?	Description	Allowable Values
search	path	yes	The search request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	LookupResponse	
400	The symbol entered is invalid. Please enter another symbol.		10033
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Error getting the product details.		10034
Get Option Chains link
Description
This API returns a list of option chains for a specific underlying instrument. The request must specify an instrument, the month the option expires, and whether you are interested in calls, puts, or both. Values returned include the option pair count and information about each option pair, including the type, call count, symbol, product, date, and strike price..

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionchains?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionchains?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
symbol	query	yes	The market symbol for the instrument; for example, GOOG	
expiryYear	query	no	Indicates the expiry year corresponding to which the optionchain needs to be fetched	
expiryMonth	query	no	Indicates the expiry month corresponding to which the optionchain needs to be fetched	
expiryDay	query	no	Indicates the expiry day corresponding to which the optionchain needs to be fetched	
strikePriceNear	query	no	The optionchians fetched will have strike price nearer to this value	
noOfStrikes	query	no	Indicates number of strikes for which the optionchain needs to be fetched	
includeWeekly	query	no	The include weekly options request. Default: false.	true, false
skipAdjusted	query	no	The skip adjusted request. Default: true.	true, false
optionCategory	query	no	The option category. Default: STANDARD.	STANDARD, ALL, MINI
chainType	query	no	The type of option chain. Default: CALLPUT.	CALL, PUT, CALLPUT
priceType	query	no	The price type. Default: ATNM.	ATNM, ALL
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionChainResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Get Option Expire Dates link
Description
Returns a list of dates suitable for structuring an option table display. The dates are used to group option data (returned by the optionchains method) for a specified underlier, creating a table display.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Sandbox URL
content_copy
                    https://apisb.etrade.com/v1/market/optionexpiredate?symbol={symbol}
                
Request
Property	Type	Required?	Description	Allowable Values
expiryType	query	no	Expiration type of the option	
symbol	query	yes	The symbol in the request	
Response
Status Code	Reason	Response Model	Error Code
200	Successful operation.	OptionExpireDateResponse	
400	Invalid option type. Please provide valid option type.		10040
400	There are no options for the given month.		10031
400	Please provide a valid option type.		10042
400	Invalid option type in OSI key. Please provide valid OSI key.		10041
400	The Symbol entered is invalid. Please enter another symbol.		10033
400	There are no options available for the given symbol or expiration date.		10044
400	No options are available for this symbol.		10032
400	Missing symbol. Please enter valid symbol.		10043
400	Unauthorized access to this API is restricted.		10035
400	Invalid category. Please provide valid category for top five quotes.		10046
400	Error getting the product details.		10034
400	Top five quotes are not available at this time.		10045
400	There are no standard options available for the month.		10037
400	Error getting the ExpirationDates details.		10036
400	Please provide valid expiration date.		10039
400	Mini options not available for this symbol.		10038
Data link
Property	Type	Description	Possible Values
symbol	string	The market symbol for the security	
description	string	The text description of the security	
type	string	The symbol type	
ExpirationDate link
Property	Type	Description	Possible Values
year	integer (int32)	The four-digit year the option will expire	
month	integer (int32)	The month (1-12) the option will expire	
day	integer (int32)	The day (1-31) the option will expire	
expiryType	string	Expiration type of the option	UNSPECIFIED, DAILY, WEEKLY, MONTHLY, QUARTERLY, VIX, ALL, MONTHEND
LookupResponse link
Property	Type	Description	Possible Values
data	array[Data]	The lookup response data	
OptionChainPair link
Property	Type	Description	Possible Values
optioncall	OptionDetails	The option call in the option chain pair	
optionPut	OptionDetails	The option put in the option chain pair	
pairType	string	Determines whether the response will contain calls(CALLONLY), puts(PUTONLY), or both(CALLPUT)	
OptionChainResponse link
Property	Type	Description	Possible Values
optionPairs	array[OptionChainPair]	Container for an option pair; each option pair in the response has a container	
timeStamp	integer (int64)	The option chain response timestamp	
quoteType	string	The option chain response quote type	
nearPrice	number	The near price in the option chain	
selected	SelectedED	The selected option chain	
OptionDetails link
Property	Type	Description	Possible Values
optionCategory	string	The option category	STANDARD, ALL, MINI
optionRootSymbol	string	The root or underlying symbol of the option	
timeStamp	integer (int64)	The timestamp of the option	
adjustedFlag	boolean	Indicator signifying whether option is adjusted	
displaySymbol	string	The display symbol	
optionType	string	The option type	
strikePrice	number (double)	The agreed strike price for the option as stated in the contract	
symbol	string	The market symbol for the option	
bid	number (double)	The bid	
ask	number (double)	The ask	
bidSize	integer	The bid size	
askSize	integer	The ask size	
inTheMoney	string	The "in the money" value; a put option is "in the money" when the strike price of the put is above the current market price of the stock	
volume	integer	The option volume	
openInterest	integer	The open interest value	
netChange	number (double)	The net change value	
lastPrice	number (double)	The last price	
quoteDetail	string	The option quote detail	
osiKey	string	The Options Symbology Initiative (OSI) key containing the option root symbol, expiration date, call/put indicator, and strike price	
optionGreek	OptionGreeks	The Greeks on the option; Greeks are a collection of statistical values that measure the risk involved in an options contract in relation to certain underlying variables	
OptionExpireDateResponse link
Property	Type	Description	Possible Values
expirationDates	array[ExpirationDate]	The expiration dates for the options	
OptionGreeks link
Property	Type	Description	Possible Values
rho	number	The rho value	
vega	number	The vega value	
theta	number	The theta value	
delta	number	The delta value	
gamma	number	The gamma value	
iv	number	The Implied Volatility (IV)	
currentValue	boolean	The current value	
SelectedED link
Property	Type	Description	Possible Values
month	integer (int32)	The selected month	
year	integer (int32)	The selected year	
day	integer (int32)	The selected day	
Example
Look Up Product Request URL
content_copy
https://api.etrade.com/v1/market/lookup/a
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<LookupResponse>
   <Data>
      <symbol>A</symbol>
      <description>AGILENT TECHNOLOGIES INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AA</symbol>
      <description>ALCOA CORP COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AABA</symbol>
      <description>ALTABA INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>AAPL</symbol>
      <description>APPLE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABBV</symbol>
      <description>ABBVIE INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABEV</symbol>
      <description>AMBEV SA SPONSORED ADR</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ABT</symbol>
      <description>ABBOTT LABS COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ACN</symbol>
      <description>ACCENTURE PLC IRELAND SHS CLASS A</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADBE</symbol>
      <description>ADOBE SYS INC COM</description>
      <type>EQUITY</type>
   </Data>
   <Data>
      <symbol>ADP</symbol>
      <description>AUTOMATIC DATA PROCESSING INC COM</description>
      <type>EQUITY</type>
   </Data>
</LookupResponse>
                  
                
Get Option Chains Request URL
content_copy
https://api.etrade.com/v1/market/optionchains?symbol=IBM&expiryYear=2018&expiryMonth=08&strikePriceNear=200&noOfStrikes=2
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionChainResponse>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529430484</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.05</ask>
         <bidSize>0</bidSize>
         <askSize>138</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:200.000000</quoteDetail>
         <osiKey>IBM---180817C00200000</osiKey>
         <OptionGreeks>
            <rho>0.001000</rho>
            <vega>0.008600</vega>
            <theta>-0.002000</theta>
            <delta>0.004900</delta>
            <gamma>0.000800</gamma>
            <iv>0.314500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $200 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>200.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:200.000000</quoteDetail>
         <osiKey>IBM---180817P00200000</osiKey>
         <OptionGreeks>
            <rho>-0.278200</rho>
            <vega>0.015300</vega>
            <theta>-0.000200</theta>
            <delta>-0.991400</delta>
            <gamma>0.001300</gamma>
            <iv>0.348400</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <OptionPair>
      <Call>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Call</displaySymbol>
         <optionType>CALL</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>n</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:CALL:205.000000</quoteDetail>
         <osiKey>IBM---180817C00205000</osiKey>
         <OptionGreeks>
            <rho>0.000800</rho>
            <vega>0.007100</vega>
            <theta>-0.001700</theta>
            <delta>0.003900</delta>
            <gamma>0.000600</gamma>
            <iv>0.327500</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Call>
      <Put>
         <optionCategory>STANDARD</optionCategory>
         <optionRootSymbol>IBM</optionRootSymbol>
         <timeStamp>1529431379</timeStamp>
         <adjustedFlag>false</adjustedFlag>
         <displaySymbol>IBM Aug 17 '18 $205 Put</displaySymbol>
         <optionType>PUT</optionType>
         <strikePrice>205.0</strikePrice>
         <symbol>IBM</symbol>
         <bid>0.0</bid>
         <ask>0.0</ask>
         <bidSize>0</bidSize>
         <askSize>0</askSize>
         <inTheMoney>y</inTheMoney>
         <volume>0</volume>
         <openInterest>0</openInterest>
         <netChange>0.0</netChange>
         <lastPrice>0.0</lastPrice>
         <quoteDetail>https://api.etrade.com/v1/market/quote/IBM:2018:8:17:PUT:205.000000</quoteDetail>
         <osiKey>IBM---180817P00205000</osiKey>
         <OptionGreeks>
            <rho>-0.282200</rho>
            <vega>0.034800</vega>
            <theta>-0.008300</theta>
            <delta>-0.974900</delta>
            <gamma>0.002400</gamma>
            <iv>0.442700</iv>
            <currentValue>true</currentValue>
         </OptionGreeks>
      </Put>
   </OptionPair>
   <timeStamp>1529430420</timeStamp>
   <quoteType>DELAYED</quoteType>
   <nearPrice>200.0</nearPrice>
   <SelectedED>
      <day>17</day>
      <month>8</month>
      <year>2018</year>
   </SelectedED>
</OptionChainResponse>
  
                
Get Option Expire Dates Request URL
content_copy
https://api.etrade.com/v1/market/optionexpiredate?symbol=GOOG&expiryType=ALL
                
Response
content_copy
                   
<?xml version="1.0" encoding="UTF-8"?>
<OptionExpireDateResponse>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>22</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>6</month>
      <day>29</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>6</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>13</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>20</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>7</month>
      <day>27</day>
      <expiryType>WEEKLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>8</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>9</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2018</year>
      <month>12</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>1</month>
      <day>18</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2019</year>
      <month>6</month>
      <day>21</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
   <ExpirationDate>
      <year>2020</year>
      <month>1</month>
      <day>17</day>
      <expiryType>MONTHLY</expiryType>
   </ExpirationDate>
</OptionExpireDateResponse>
                  
                