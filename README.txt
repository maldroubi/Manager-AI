Manager AI — V9 AI Audit Layer

This build keeps the existing Manager transaction extraction and deterministic
rules, but adds a final AI review layer.

Flow:
Manager.io -> transaction extraction -> technical audit signals -> FULL ledger + signals -> AI -> final findings

Important:
- The AI receives the complete normalized transaction ledger.
- Debit/credit side is now explicitly extracted from transaction amounts.
- Matching debit/credit entries are not automatically treated as duplicates.
- The deterministic audit rules are signals only; the AI decides which findings
  are confirmed and which are false positives.
- If AI is unavailable, the technical signals remain visible.

AI endpoint:
POST /api/ai-audit

Required server environment variable:
OPENAI_API_KEY

Optional:
OPENAI_MODEL=gpt-5

Deploy the project to a platform supporting the /api directory (for example
Vercel), set OPENAI_API_KEY in the server environment, and keep the API key
out of all browser-side files.
