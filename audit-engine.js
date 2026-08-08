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

        return this.auditor.analyze(account);
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
                : "#999";

        const label = severity.toUpperCase();

        return `
            <div style="margin-bottom:12px;padding:14px;border:1px solid ${border};border-radius:6px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.04em;color:${border};margin-bottom:6px;">
                    ${label} · ${this.escape(finding.code || `FINDING_${index + 1}`)} · ${confidence}% confidence
                </div>
                <h4 style="margin:0 0 8px 0;">${title}</h4>
                <p style="margin:0 0 8px 0;">${description}</p>
                <p style="margin:0;"><strong>Recommended review:</strong> ${recommendation}</p>
            </div>
        `;
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
