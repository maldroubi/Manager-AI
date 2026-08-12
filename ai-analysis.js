// ai-analysis.js
// Final AI audit layer. It receives the full normalized ledger and the
// deterministic audit signals, then decides which findings are real.

class AIAuditAnalyzer {
    constructor(options = {}) {
        this.endpoint = options.endpoint || "/api/ai-audit";
        this.timeoutMs = options.timeoutMs || 60000;
    }

    async analyze(account, ruleFindings = [], balanceCheck = null) {
        if (!account) throw new Error("No account supplied to AI audit.");

        const normalizedTransactions = Array.isArray(account.transactions)
            ? account.transactions.filter(Boolean).map((t, index) => ({
                index: index + 1,
                date: t.date || "",
                documentType: t.documentType || "",
                documentNumber: t.documentNumber || "",
                description: t.description || "",
                contact: t.contact || "",
                amount: t.amount?.value ?? t.amount ?? 0,
                side: t.side || "",
                balance: t.balance?.value ?? t.balance ?? null,
                balanceSide: t.balance?.side || "",
                balanceAvailable: t.balanceAvailable !== false
            }))
            : [];

        // Cerebras' free tier has a smaller effective context limit. Keep normal
        // accounts fully represented, but avoid sending an oversized ledger that
        // would make the free online audit fail. For large ledgers we preserve the
        // beginning and end, while the deterministic engine still sees every row.
        const MAX_AI_ROWS = 120;
        const ledgerMode = normalizedTransactions.length > MAX_AI_ROWS ? "sampled" : "full";
        const transactions = ledgerMode === "full"
            ? normalizedTransactions
            : [
                ...normalizedTransactions.slice(0, Math.ceil(MAX_AI_ROWS / 2)),
                ...normalizedTransactions.slice(-Math.floor(MAX_AI_ROWS / 2))
            ];

        const payload = {
            account: this.sanitizeAccount(account),
            balanceCheck: balanceCheck || null,
            ruleFindings: Array.isArray(ruleFindings) ? ruleFindings : [],
            ledgerMode,
            totalTransactionCount: normalizedTransactions.length,
            transactions
        };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const response = await fetch(this.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (_) {
                throw new Error(`AI endpoint returned invalid JSON (${response.status}).`);
            }

            if (!response.ok) {
                throw new Error(data.error || `AI endpoint failed with HTTP ${response.status}.`);
            }

            return this.normalizeResult(data);
        } finally {
            clearTimeout(timer);
        }
    }

    sanitizeAccount(account) {
        return {
            name: account.name || "",
            debit: account.debit || "",
            credit: account.credit || "",
            transactionCount: Array.isArray(account.transactions)
                ? account.transactions.filter(Boolean).length
                : 0
        };
    }

    normalizeResult(data) {
        const result = data?.result || data;
        return {
            status: result.status || "review",
            summary: result.summary || "AI audit completed.",
            confirmedFindings: Array.isArray(result.confirmedFindings)
                ? result.confirmedFindings
                : [],
            dismissedFindings: Array.isArray(result.dismissedFindings)
                ? result.dismissedFindings
                : [],
            followUp: Array.isArray(result.followUp) ? result.followUp : [],
            model: data?.model || result.model || "",
            ledgerMode: data?.ledgerMode || "full"
        };
    }

    render(result) {
        if (!result) return "";

        const status = String(result.status || "review").toLowerCase();
        const border = status === "critical"
            ? "#d32f2f"
            : status === "clear"
                ? "#2e7d32"
                : "#f0a000";

        const title = status === "clear"
            ? "✓ AI Audit Conclusion"
            : status === "critical"
                ? "⚠ AI Audit Conclusion"
                : "AI Audit Conclusion";

        const findings = (result.confirmedFindings || []).map((finding, index) => {
            const severity = String(finding.severity || "medium").toUpperCase();
            const confidence = Math.round(Number(finding.confidence || 0) * 100);
            const evidence = Array.isArray(finding.evidenceIndexes)
                ? `<div style="font-size:12px;margin-top:6px;"><strong>Evidence rows:</strong> ${finding.evidenceIndexes.join(", ")}</div>`
                : "";

            return `
                <div style="margin:10px 0;padding:12px;border:1px solid #ddd;border-radius:6px;">
                    <div style="font-size:12px;font-weight:700;letter-spacing:.04em;">
                        ${this.escape(severity)} · ${this.escape(finding.code || `AI_FINDING_${index + 1}`)} · ${confidence}% confidence
                    </div>
                    <h4 style="margin:6px 0;">${this.escape(finding.title || "Audit finding")}</h4>
                    <p style="margin:0 0 6px;">${this.escape(finding.explanation || "")}</p>
                    <p style="margin:0;"><strong>Recommended review:</strong> ${this.escape(finding.recommendation || "")}</p>
                    ${evidence}
                </div>
            `;
        }).join("");

        const dismissed = (result.dismissedFindings || []).map(item => `
            <div style="padding:5px 0;font-size:13px;">
                <strong>${this.escape(item.code || "")}</strong> — ${this.escape(item.reason || "False positive / explained by transaction context.")}
            </div>
        `).join("");

        const followUp = (result.followUp || []).map(item =>
            `<li>${this.escape(item)}</li>`
        ).join("");

        return `
            <div style="margin-bottom:16px;padding:16px;border:2px solid ${border};border-radius:8px;">
                <h3 style="margin-top:0;">${title}</h3>
                <p style="margin:0 0 12px;">${this.escape(result.summary)}</p>
                ${result.ledgerMode === "sampled" ? `<p style="margin:0 0 12px;font-size:12px;color:#8a5a00;"><strong>Note:</strong> The account has a large ledger; the AI reviewed a representative first/last transaction sample. Technical rules still ran against the complete extracted ledger.</p>` : ""}
                ${findings || `<p style="margin:0;"><strong>No confirmed accounting anomaly was identified by the AI.</strong></p>`}
                ${dismissed ? `
                    <details style="margin-top:12px;">
                        <summary><strong>System signals dismissed by AI (${result.dismissedFindings.length})</strong></summary>
                        <div style="margin-top:8px;">${dismissed}</div>
                    </details>
                ` : ""}
                ${followUp ? `
                    <div style="margin-top:12px;"><strong>Suggested follow-up:</strong><ul>${followUp}</ul></div>
                ` : ""}
            </div>
        `;
    }

    escape(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

const aiAudit = new AIAuditAnalyzer();
