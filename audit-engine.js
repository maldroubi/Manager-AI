// audit-engine.js
// Coordinates account-level audit rules and keeps a compatible render API.

class AuditEngine {

    constructor(auditor) {
        this.auditor = auditor;
    }

    analyze(account) {
        if (!account) {
            return [{
                severity: "error",
                code: "NO_ACCOUNT",
                title: "No account selected",
                description: "No account data was supplied to the audit engine.",
                recommendation: "Select a Balance Sheet account and run the audit again.",
                confidence: 1
            }];
        }

        const findings = this.auditor.analyze(account);

        const transactionCount = Array.isArray(account.transactions)
            ? account.transactions.filter(Boolean).length
            : 0;

        // Do not report the ledger as unavailable when the extractor actually
        // returned transaction rows. This keeps the audit state consistent
        // even if a legacy caller did not set transactionLedgerAvailable.
        if (account.transactionLedgerAvailable === false && transactionCount === 0) {
            findings.unshift({
                severity: "info",
                code: "TRANSACTION_LEDGER_UNAVAILABLE",
                title: "Transaction ledger unavailable",
                description: (account.transactionMeta && account.transactionMeta.reason) ||
                    "No transaction ledger was available on the returned account page, so transaction-level audit rules were not evaluated.",
                recommendation: "Confirm whether this account has a transaction ledger. If it does, inspect the extraction diagnostics below and update the extractor for that Manager page structure.",
                confidence: 1
            });
        }

        return findings;
    }

    render(findings) {
        if (!Array.isArray(findings) || findings.length === 0) {
            return `
                <div style="padding:16px;border:1px solid #c8e6c9;border-radius:6px;margin-bottom:16px;">
                    <h3 style="color:#2e7d32;margin-top:0;">✓ No audit findings</h3>
                    <p>No rule in the current account-level audit engine identified an item requiring attention.</p>
                </div>
            `;
        }

        return `
            <div style="margin-bottom:16px;">
                <h3>Audit Findings (${findings.length})</h3>
                ${findings.map((finding, index) => this.renderFinding(finding, index)).join("")}
            </div>
        `;
    }

    renderFinding(finding, index) {
        const severity = String(finding.severity || "info").toLowerCase();
        const title = this.escape(finding.title || "Audit finding");
        const description = this.escape(finding.description || "");
        const recommendation = this.escape(finding.recommendation || "");
        const confidence = Math.round((Number(finding.confidence) || 0) * 100);

        const border = severity === "high"
            ? "#d32f2f"
            : severity === "medium"
                ? "#f0a000"
                : severity === "info"
                    ? "#607d8b"
                    : "#999";

        const label = severity.toUpperCase();

        const evidenceHtml = this.renderEvidence(finding.evidence);

        return `
            <div style="margin-bottom:12px;padding:14px;border:1px solid ${border};border-radius:6px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:${border};margin-bottom:6px;">
                    ${label} · ${this.escape(finding.code || `FINDING_${index + 1}`)} · ${confidence}% confidence
                </div>
                <h4 style="margin:0 0 8px 0;">${title}</h4>
                <p style="margin:0 0 8px 0;">${description}</p>
                ${evidenceHtml}
                <p style="margin:0;"><strong>Recommended review:</strong> ${recommendation}</p>
            </div>
        `;
    }

    renderEvidence(evidence) {
        if (!Array.isArray(evidence) || evidence.length === 0) return "";

        // Duplicate findings use grouped evidence: [{group, count, transactions}].
        if (evidence[0] && Array.isArray(evidence[0].transactions)) {
            const groups = evidence.map(item => {
                const rows = Array.isArray(item.transactions) ? item.transactions : [];
                const preview = rows.slice(0, 3).map(t => {
                    const date = this.escape(t.date || "");
                    const amount = this.escape(
                        t.amount?.display ??
                        t.amount?.value ??
                        t.amount ??
                        ""
                    );
                    const doc = this.escape(t.documentNumber || t.documentType || "");
                    const desc = this.escape(t.description || "");
                    return `<div style="padding:4px 0;">${date} · ${amount}${doc ? ` · ${doc}` : ""}${desc ? ` · ${desc}` : ""}</div>`;
                }).join("");

                const more = rows.length > 3
                    ? `<div style="padding-top:2px;opacity:.7;">+ ${rows.length - 3} more in this group</div>`
                    : "";

                return `<div style="margin:6px 0;padding:8px 10px;background:#fafafa;border-radius:4px;">
                    <strong>Duplicate group ${this.escape(item.group)} (${this.escape(item.count)} transactions)</strong>
                    <div style="font-size:12px;margin-top:4px;">${preview}${more}</div>
                </div>`;
            }).join("");

            return `<div style="margin:0 0 10px 0;font-size:12px;"><strong>Matching groups:</strong>${groups}</div>`;
        }

        return "";
    }

    escape(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

const audit = new AuditEngine(balanceAuditor);
