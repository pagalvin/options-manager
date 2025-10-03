# Overview 

The "update strategy" function retrieves option chains from etrade and picks a strike price based on logic already
present in the code.

The logic presently picks the next available option chain. If no option meets the strategy requirements, it shows a message that
there is no available strategy.

The fundamental purpose of the strategy is to pick a strike price such that if the option is assigned, the net premium provides
a net 1% return or higher on assignment.
 
## Strategy logic  Enhancement

MModify the logic as follows:
- If the next available option chain does not satisfy the strategy, pick the one after that in date order and try again
- If that next option chain does not provide a net amount that meetings the strategy goals, show a message that there is no available option

Basically, try moving out one more week. 

## Code
You can find the code by tracing the logic in the Options Anayzer page (UI route: /analyzer)

There is a button, "Update strategy". Follow it from there.
