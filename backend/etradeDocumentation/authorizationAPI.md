Authorization API
Overview
Returns a temporary request token, initiating the OAuth process.

Get Request Token link
Description
This API returns a temporary request token that begins the OAuth process. The request token must accompany the user to the authorization page, where the user will grant your application limited access to the account. The token expires after five minutes.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/oauth/request_token
                
Request
Property	Type	Required?	Description	Allowable Values
oauth_consumer_key	header	yes	The value used by the consumer to identify itself to the service provider.	
oauth_timestamp	header	yes	The date and time of the request, in epoch time. Must be accurate within five minutes.	
oauth_nonce	header	yes	A nonce, as described in the authorization guide - roughly, an arbitrary or random value that cannot be used again with the same timestamp.	
oauth_signature_method	header	yes	The signature method used by the consumer to sign the request. The only supported value is HMAC-SHA1.	
oauth_signature	header	yes	Signature generated with the shared secret and token secret using the specified oauth_signature_method, as described in OAuth documentation.	
oauth_callback	header	yes	Callback information, as described elsewhere. Must always be set to 'oob', whether using a callback or not.	
Response
Status Code	Reason	Response Model	Error Code
200	Successful Operation.	OAuthResponse	
400	There is issue with input		
500	An unexpected error has occurred. The error has been logged and is being investigated.		
RequestToken Response link
Property	Type	Description	Possible Values
oauth_token	string	The consumer's request token	
oauth_token_secret	string	The token secret	
oauth_callback_confirmed	string	Returns true if a callback URL is configured for the current consumer key, otherwise false. Callbacks are described under the Authorize Application API.	
Example
Get Request Token Request URL
content_copy
https://api.etrade.com/oauth/request_token
                
HTTP header
content_copy
Authorization: OAuth realm="",oauth_callback="oob",
oauth_signature="FjoSQaFDKEDK1FJazlY3xArNflk%3D", oauth_nonce="LTg2ODUzOTQ5MTEzMTY3MzQwMzE%3D",
oauth_signature_method="HMAC-SHA1",oauth_consumer_key="282683cc9e4b8fc81dea6bc687d46758",
oauth_timestamp="1273254425"
                
Response
content_copy
                   
oauth_token=%2FiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D&oauth_token_secret=%2FrC9scEpzcwSEMy4vE7nodSzPLqfRINnTNY4voczyFM%3D&oauth_callback_confirmed=true
                  
                
Notes
The request token is only valid for 5 minutes..


===

Authorization API
Overview
Allows the user to authorize the consumer application.

Authorize Application link
Description
Once your application has the request token, it should redirect the user to an E*TRADE authorization page, as shown in the Authorize Application Request URL below. Note that this URL includes the request token and the consumer key as parameters. Running the URL opens up a page which asks the user to authorize the application. Once the user approves the authorization request, E*TRADE generates a verification code and displays it the Authorization Complete page. The user may then manually copy the code and paste it into the application. However, we recommend that the verification code be passed directly to the application via a preconfigured callback URL; in order to do this, the callback URL must be associated with the consumer key. Follow the instructions in the Authorization guide chapter to do this(https://developer.etrade.com/getting-started/developer-guides). The callback URL may be just a simple address or may also include query parameters. Once the callback is configured, users are automatically redirected to the specified URL with the verification code appended as a query parameter. Examples are shown in the Sample Response below.

HTTP Method: GET
Live URL
content_copy
                    https://us.etrade.com/e/t/etws/authorize
                
Request
Property	Type	Required?	Description	Allowable Values
oauth_consumer_key	header	yes	The value used by the consumer to identify itself to the service provider.	
oauth_token	header	yes	The consumer’s request token.	
Response
Status Code	Reason	Response Model	Error Code
302	Redirect url for Authorization.	Authorize Response	
400	There is issue with input		
500	An unexpected error has occurred. The error has been logged and is being investigated.		
Authorize Response link
Property	Type	Description	Possible Values
oauth_verifier	string (uri)	verification code	
Authorize Application Request URL
content_copy
https://us.etrade.com/e/t/etws/authorize?key=282683cc9e4b8fc81dea6bc687d46758&token=%2FiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D
                
The authorize call is not a REST API in the usual sense, and does not return a "response" in the usual way. If the user authorizes your application on the E*TRADE authorization site, the result is either the display of a verification code at that site or, if a callback is used, a redirect to your callback URL. In the callback scenario, the verification code is appended to your callback URL as an oauth_verifier parameter. Here are two examples:

Response
content_copy
                   
		   https://myapplicationsite.com/mytradingapp?oauth_verifier=WXYZ89
		   https://myapplicationsite.com?myapp=trading&oauth_verifier=WXYZ89
                  
                
Notes
If using the default approach - letting the user copy and paste the verification code - we recommend opening a separate browser window for the authorization, leaving the application open in the original window. Once the user has authorized the application and copied the verification code, the user can simply close the authorization window and return to the application in the original window.
If using the callback approach, we recommend redirecting to the authorization page in the current window. Once the user has authorized the application, E*TRADE redirects the user to the callback page; the verification code is included as a URL parameter (as in the sample response above).


===

Authorization API
Overview
Returns an access token.

Get Access Token link
Description
This method returns an access token, which confirms that the user has authorized the application to access user data. All calls to the E*TRADE API (e.g., accountlist, placeequityorder, etc.) must include this access token along with the consumer key, timestamp, nonce, signature method, and signature. This can be done in the query string, but is typically done in the HTTP header. By default, the access token expires at the end of the current calendar day, US Eastern time. Once the token has expired, no requests will be processed for that token until the OAuth process is repeated - i.e., the user must log in again and the application must secure a new access token. During the current day, if the application does not make any requests for two hours, the access token is inactivated. In this inactive state, the access token is not valid for authorizing requests. It must be reactivated using the Renew Access Token API.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/oauth/access_token
                
Request
Property	Type	Required?	Description	Allowable Values
oauth_consumer_key	header	yes	The value used by the consumer to identify itself to the service provider.	
oauth_timestamp	header	yes	The date and time of the request, in epoch time. Must be accurate to within five minutes.	
oauth_nonce	header	yes	A nonce, as described in the authorization guide - roughly, an arbitrary or random value that cannot be used again with the same timestamp.	
oauth_signature_method	header	yes	The signature method used by the consumer to sign the request. The only supported value is HMAC-SHA1.	
oauth_signature	header	yes	Signature generated with the shared secret and token secret using the specified oauth_signature_method, as described in OAuth documentation.	
oauth_token	header	yes	The consumer’s request token to be exchanged for an access token.	
oauth_verifier	header	yes	The verification code received by the user to authenticate with the third-party application.	
Response
Status Code	Reason	Response Model	Error Code
200	Successful Operation.	Access Token	
400	There is issue with input		
500	An unexpected error has occurred. The error has been logged and is being investigated.		
Access Token link
Property	Type	Description	Possible Values
oauth_token	string	The consumer’s access token	
oauth_token_secret	integer	The token secret	
Get Access Token Request URL
content_copy
https://api.etrade.com/oauth/access_token
                
HTTP header
content_copy
Authorization: OAuth realm="",oauth_signature="FjoSQaFDKEDK1FJazlY3xArNflk%3D",oauth_nonce="LTg2ODUzOTQ5MTEzMTY3MzQwMzE%3D",
         oauth_signature_method="HMAC-SHA1",oauth_consumer_key= "282683cc9e4b8fc81dea6bc687d46758",oauth_timestamp="1273254425",
         oauth_verifier="Y27X25F",oauth_token=%2FiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D
                
Response
content_copy
                   
oauth_token=%3TiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D&oauth_token_secret=%7RrC9scEpzcwSEMy4vE7nodSzPLqfRINnTNY4voczyFM%3D
                  
                
Notes
The production access token expires by default at midnight US Eastern time.
Technically, the access token and related parameters can be passed with HTTP requests as part of the URL, but we recommend this information be passed in the header of the request instead.

====

Authorization API
Overview
Renews the OAuth access token after two hours or more of inactivity.

Renew Access Token link
Description
If the application does not make any requests for two hours, the access token is inactivated. In this inactive state, the access token is not valid for authorizing requests. It must be reactivated using the Renew Access Token API. By default the access token expires at midnight US Eastern time. Once the token has expired, no further requests will be processed until the user logs in again and the application secures a new access token.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/oauth/renew_access_token
                
Request
Property	Type	Required?	Description	Allowable Values
oauth_consumer_key	header	yes	The value used by the consumer to identify itself to the service provider.	
oauth_timestamp	header	yes	The date and time of the request, in epoch time. Must be accurate to within five minutes.	
oauth_nonce	header	yes	A nonce, as described in the authorization guide - roughly, an arbitrary or random value that cannot be used again with the same timestamp.	
oauth_signature_method	header	yes	The signature method used by the consumer to sign the request. The only supported value is HMAC-SHA1.	
oauth_signature	header	yes	Signature generated with the shared secret and token secret using the specified oauth_signature_method, as described in OAuth documentation.	
oauth_token	header	yes	The consumer’s access token to be renewed.	
Response
Status Code	Reason	Response Model	Error Code
200	Successful Operation.	Renew Access Token	
400	There is issue with input		
500	An unexpected error has occurred. The error has been logged and is being investigated.		
Renew Access Token Request URL
content_copy
https://api.etrade.com/oauth/renew_access_token
                
HTTP header
content_copy
Authorization: OAuth realm="",oauth_signature="FjoSQaFDKEDK1FJazlY3xArNflk%3D",oauth_nonce="LTg2ODUzOTQ5MTEzMTY3MzQwMzE%3D",
          oauth_signature_method="HMAC-SHA1",oauth_consumer_key= "282683cc9e4b8fc81dea6bc687d46758",oauth_timestamp="1273254425",
          oauth_token=%2FiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D
                
Response
content_copy
                   
                    Access Token has been renewed
                  
===

Authorization API
Overview
Renews the OAuth access token after two hours or more of inactivity.

Renew Access Token link
Description
If the application does not make any requests for two hours, the access token is inactivated. In this inactive state, the access token is not valid for authorizing requests. It must be reactivated using the Renew Access Token API. By default the access token expires at midnight US Eastern time. Once the token has expired, no further requests will be processed until the user logs in again and the application secures a new access token.

HTTP Method: GET
Live URL
content_copy
                    https://api.etrade.com/oauth/renew_access_token
                
Request
Property	Type	Required?	Description	Allowable Values
oauth_consumer_key	header	yes	The value used by the consumer to identify itself to the service provider.	
oauth_timestamp	header	yes	The date and time of the request, in epoch time. Must be accurate to within five minutes.	
oauth_nonce	header	yes	A nonce, as described in the authorization guide - roughly, an arbitrary or random value that cannot be used again with the same timestamp.	
oauth_signature_method	header	yes	The signature method used by the consumer to sign the request. The only supported value is HMAC-SHA1.	
oauth_signature	header	yes	Signature generated with the shared secret and token secret using the specified oauth_signature_method, as described in OAuth documentation.	
oauth_token	header	yes	The consumer’s access token to be renewed.	
Response
Status Code	Reason	Response Model	Error Code
200	Successful Operation.	Renew Access Token	
400	There is issue with input		
500	An unexpected error has occurred. The error has been logged and is being investigated.		
Renew Access Token Request URL
content_copy
https://api.etrade.com/oauth/renew_access_token
                
HTTP header
content_copy
Authorization: OAuth realm="",oauth_signature="FjoSQaFDKEDK1FJazlY3xArNflk%3D",oauth_nonce="LTg2ODUzOTQ5MTEzMTY3MzQwMzE%3D",
          oauth_signature_method="HMAC-SHA1",oauth_consumer_key= "282683cc9e4b8fc81dea6bc687d46758",oauth_timestamp="1273254425",
          oauth_token=%2FiQRgQCRGPo7Xdk6G8QDSEzX0Jsy6sKNcULcDavAGgU%3D
                
Response
content_copy
                   
                    Access Token has been renewed
                  
                