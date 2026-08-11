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

V4 HOTFIX (2026-08-11)
- Fixed false Balance Difference warnings on Manager transaction pages that have transaction amounts but no running-balance column.
- The extractor already marks these rows as balanceAvailable:false; the UI now respects that flag and shows "No transaction balance was available for comparison" instead of comparing against a fabricated 0.00 balance.
- Transaction extraction and duplicate/repeated-amount audit rules remain unchanged.
