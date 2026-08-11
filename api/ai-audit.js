// Vercel/serverless endpoint for the Manager AI final audit layer.
// Keep OPENAI_API_KEY server-side. Never put the key in the browser bundle.

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const SYSTEM_PROMPT = `You are the final accounting audit layer for Manager AI.

Act like a senior external auditor reviewing a Balance Sheet account.
The deterministic rule engine produces SIGNALS, not facts. You must independently
validate every signal against the FULL underlying transaction ledger.

PROJECT SCOPE:
- Detect possible accounting mistakes, misclassification, suspicious balances,
  clearing/suspense issues, unusual account behaviour and posting mistakes.
- Do not analyse profitability, sales trends, KPIs, business performance or future revenue.

CRITICAL ACCOUNTING RULE:
A normal double-entry posting can appear as two rows with the same date, document type,
description and amount, but opposite sides (debit and credit). Those rows are NOT a duplicate
transaction merely because the deterministic duplicate rule grouped them together.
For example, an Inter Account Transfer can legitimately produce one debit and one credit entry.

Other rules:
- Do not treat an automated signal as proof of an error.
- Do not infer a balance discrepancy when the transaction balance was not actually available.
- Ignore empty/incomplete rows.
- Distinguish confirmed anomalies from review signals and false positives.
- Use the actual transaction evidence. Do not invent transactions or facts.
- If a finding is explainable by normal double-entry accounting, dismiss it.
- If a document type is unusual for the account, assess the actual posting context before calling it an error.
- Evidence indexes refer to the numbered transaction rows supplied by the user payload.
- Confidence must represent confidence in the accounting conclusion, not confidence in the rule signal.
- Prefer fewer high-quality findings over noisy alerts.

Return JSON only, following the supplied schema.`;

const SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
        status: { type: "string", enum: ["clear", "review", "critical"] },
        summary: { type: "string" },
        confirmedFindings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    severity: { type: "string", enum: ["low", "medium", "high"] },
                    code: { type: "string" },
                    title: { type: "string" },
                    explanation: { type: "string" },
                    recommendation: { type: "string" },
                    confidence: { type: "number" },
                    evidenceIndexes: {
                        type: "array",
                        items: { type: "integer" }
                    }
                },
                required: ["severity", "code", "title", "explanation", "recommendation", "confidence", "evidenceIndexes"]
            }
        },
        dismissedFindings: {
            type: "array",
            items: {
                type: "object",
                additionalProperties: false,
                properties: {
                    code: { type: "string" },
                    reason: { type: "string" },
                    evidenceIndexes: {
                        type: "array",
                        items: { type: "integer" }
                    }
                },
                required: ["code", "reason", "evidenceIndexes"]
            }
        },
        followUp: {
            type: "array",
            items: { type: "string" }
        }
    },
    required: ["status", "summary", "confirmedFindings", "dismissedFindings", "followUp"]
};

export default async function handler(req, res) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
            error: "OPENAI_API_KEY is not configured on the AI audit server."
        });
    }

    try {
        const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        if (!payload || !payload.account || !Array.isArray(payload.transactions)) {
            return res.status(400).json({ error: "Invalid audit payload." });
        }

        const model = process.env.OPENAI_MODEL || "gpt-5";

        const response = await fetch(OPENAI_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                store: false,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    {
                        role: "user",
                        content: JSON.stringify(payload)
                    }
                ],
                response_format: {
                    type: "json_schema",
                    json_schema: {
                        name: "manager_ai_audit",
                        strict: true,
                        schema: SCHEMA
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            const message = data?.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
            return res.status(502).json({ error: message });
        }

        const content = data?.choices?.[0]?.message?.content;
        if (!content) {
            return res.status(502).json({ error: "AI returned an empty audit result." });
        }

        let result;
        try {
            result = JSON.parse(content);
        } catch (_) {
            return res.status(502).json({ error: "AI returned invalid structured JSON." });
        }

        return res.status(200).json({
            result,
            model
        });
    } catch (error) {
        console.error("[Manager AI] AI audit error", error);
        return res.status(500).json({
            error: error?.name === "AbortError"
                ? "AI audit request timed out."
                : (error?.message || "AI audit failed.")
        });
    }
}
