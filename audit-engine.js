// audit-engine.js

class AuditEngine {

    analyze(entry) {

        const findings = [];

        if (!entry) {

            findings.push({
                severity: "error",
                title: "No Entry",
                message: "No accounting entry loaded."
            });

            return findings;

        }

        if (!entry.lines || entry.lines.length === 0) {

            findings.push({
                severity: "warning",
                title: "Empty Entry",
                message: "No posting lines found."
            });

            return findings;

        }

        for (const line of entry.lines) {

            const account = (line.account || "").toLowerCase();

            const debit = Number(line.debit || 0);

            const credit = Number(line.credit || 0);

            if (account.includes("receivable") && credit > 0) {

                findings.push({

                    severity: "warning",

                    title: "Accounts Receivable",

                    message:
                        "Credit posting detected on Accounts Receivable.",

                    line

                });

            }

            if (account.includes("payable") && debit > 0) {

                findings.push({

                    severity: "warning",

                    title: "Accounts Payable",

                    message:
                        "Debit posting detected on Accounts Payable.",

                    line

                });

            }

            if (account.includes("suspense")) {

                findings.push({

                    severity: "warning",

                    title: "Suspense Account",

                    message:
                        "Posting detected in Suspense account. Review required.",

                    line

                });

            }

        }

        if (findings.length === 0) {

            findings.push({

                severity: "success",

                title: "No Findings",

                message:
                    "No accounting issues detected."

            });

        }

        return findings;

    }

    render(findings) {

        return findings.map(f => `

<div class="audit-card ${f.severity}">

<h3>${f.title}</h3>

<p>${f.message}</p>

</div>

`).join("");

    }

}

const audit = new AuditEngine();