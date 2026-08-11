Manager AI - V3 Balance Check Fix

Replace these two files in the current Manager AI project:
1. entry-extractor.js
2. script.js

Do NOT replace index.html.

Main fix:
- Never treat an arbitrary number such as 50.00 as the account running balance.
- A balance comparison is only performed when a dated transaction has a valid balance.
- If Manager does not expose a usable running balance, the report says it is unavailable instead of producing a false Balance Difference.
- The extractor no longer scans the entire document for a bare money value.
- Transaction dates are normalized for common DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD formats.
