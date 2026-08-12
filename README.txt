Manager AI — Free Online AI Audit Layer

This build keeps the existing Manager transaction extraction and deterministic
rules, then adds a final AI review layer using an online free OpenRouter model.

Flow:
Manager.io -> transaction extraction -> technical audit signals -> ledger + signals -> AI -> final findings

AI scope:
- Accounting entries and journal/ledger transactions only.
- Possible misclassification, unusual postings, duplicate-looking entries,
  suspicious balances and other accounting anomalies.
- The AI does NOT analyse sales, profitability, customers, KPIs or business performance.

Important:
- Deterministic rules are signals, not facts.
- Normal double-entry debit/credit pairs are not automatically duplicates.
- The AI must validate signals against the supplied ledger before confirming an error.
- If AI is unavailable, technical audit signals remain visible.
- Customer/contact fields are not sent to the AI layer.

AI endpoint:
POST /api/ai-audit

Free online AI provider:
OpenRouter free-model access. Default model:
deepseek/deepseek-v4-flash:free

Required server environment variable:
OPENROUTER_API_KEY

Optional:
OPENROUTER_MODEL=deepseek/deepseek-v4-flash:free
OPENROUTER_SITE_URL=https://your-domain.example
OPENROUTER_APP_NAME=Manager AI Accounting Auditor

No model is downloaded to the user's computer. The API key must remain server-side.
The free model has provider/platform rate limits; no paid credits are required for
the free model, but AI requests can stop when the free quota is exhausted.
