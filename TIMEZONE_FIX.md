# Timezone Fix for News Snapshots

## Issue
When retrieving news snapshots by date via the API endpoint `/api/news/snapshots/YYYY-MM-DD`, the system was returning a 404 error even though snapshots existed for that date in the database.

## Root Cause
The issue was caused by timezone handling in the PostgreSQL query. When Node.js's `pg` library passes a JavaScript `Date` object to PostgreSQL, it converts it to a timestamp with timezone. This was causing the date comparison to fail:

1. Frontend sends: `2025-10-08` (just the date)
2. JavaScript creates: `new Date('2025-10-08')` → `2025-10-08T00:00:00.000Z` (UTC midnight)
3. PostgreSQL receives the timestamp and applies timezone conversion
4. Database has: `2025-10-08 07:15:11.707` (local time, no timezone)
5. Comparison failed due to timezone mismatch

## Solution
Changed the query to use a date string instead of a Date object:

**Before:**
```typescript
const query = `
  SELECT * FROM overlord.news_snapshots
  WHERE DATE(date_generated) = DATE($1::timestamp)
  ORDER BY date_generated DESC
  LIMIT 1
`;
const result = await pool.query(query, [date]); // Passing Date object
```

**After:**
```typescript
// Extract just the YYYY-MM-DD part
const dateStr = date.toISOString().split('T')[0]; // e.g., "2025-10-08"

const query = `
  SELECT * FROM overlord.news_snapshots
  WHERE DATE(date_generated) = $1::date
  ORDER BY date_generated DESC
  LIMIT 1
`;
const result = await pool.query(query, [dateStr]); // Passing string
```

## Why This Works
By passing a string like `"2025-10-08"` and casting it as `::date` in PostgreSQL:
- PostgreSQL interprets it as a date (not timestamp)
- No timezone conversion occurs
- The `DATE()` function on `date_generated` extracts just the date part
- String comparison matches correctly regardless of what time the snapshot was created

## Files Modified
- `backend/src/services/newsService.ts` - Updated `getNewsSnapshotByDate()` method

## Testing
Verified the fix works by:
1. Checking database has snapshot: `SELECT * FROM overlord.news_snapshots WHERE DATE(date_generated) = '2025-10-08'::date;` ✅
2. API endpoint returns data: `GET /api/news/snapshots/2025-10-08` ✅
3. Frontend can now load today's snapshot correctly ✅

## Prevention
To avoid similar issues in the future:
- Use date strings (YYYY-MM-DD) for date-only comparisons
- Cast to `::date` type in PostgreSQL for date-only fields
- Avoid passing JavaScript Date objects when only the date portion matters
- Document timezone handling in API specifications

---
**Fixed**: October 8, 2025
**Status**: ✅ Resolved
