Manager AI — Online Free AI Audit Layer

This build keeps the existing Manager transaction extraction and deterministic
accounting rules, but adds a final online AI review layer.

Flow:
Manager.io -> transaction extraction -> deterministic audit signals -> online AI -> final findings

Important:
- The AI is an audit assistant, not the accounting authority.
- The deterministic rules still run against the complete extracted ledger.
- The AI receives the complete ledger for normal-sized accounts.
- If an account has more than 120 transactions, the AI receives a representative first/last sample so the free online context limit is not exceeded; the technical audit still checks every extracted transaction.
- Debit/credit side is explicitly extracted.
- Matching debit/credit entries are not automatically treated as duplicates.
- If AI is unavailable, technical audit signals remain visible.

Current free online provider:
Cerebras Inference -> OpenAI GPT OSS 120B (open-weight reasoning model).

Required server environment variable:
CEREBRAS_API_KEY

Optional:
CEREBRAS_MODEL=gpt-oss-120b
CEREBRAS_REASONING_EFFORT=medium
CEREBRAS_MAX_COMPLETION_TOKENS=2500

The provider is isolated in /api/ai-audit.js so it can be replaced later
without changing the browser audit layer.

Deployment:
Deploy the project to a platform supporting the /api directory (for example Vercel).
Set CEREBRAS_API_KEY only in the server environment. Never put the API key in browser-side files.
