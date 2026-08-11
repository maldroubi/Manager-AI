Manager AI - V6 Duplicate Audit Fix (2026-08-11)

This package includes the previous V4 balance fix plus a duplicate-audit cleanup.

V4 balance fix:
- Never treat an arbitrary transaction amount as the account running balance.
- If Manager does not expose a usable running balance, show "No transaction balance was available for comparison."
- Keep transaction extraction and account audit rules active.

V6 duplicate fix:
- Exact duplicate groups are consolidated into ONE audit finding instead of one card per group.
- The finding reports the number of duplicate groups and affected transactions.
- Evidence is grouped so each matching set can still be reviewed.
- The duplicate signature uses normalized date, document type, document number, amount and description.
- Cache-busting versions were updated for the modified audit scripts.

Replace the current package with these files as a complete package; no manual merge is required.


V8 changes (2026-08-11): tightened low-value transaction alert criteria and added compact evidence/type summaries for unexpected document-type findings.
