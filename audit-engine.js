// audit-engine.js

class AuditEngine {

    analyze(report) {

        const findings = [];

        if (!report) {

            findings.push({
                severity: "error",
                title: "No Trial Balance",
                message: "No Trial Balance has been loaded."
            });

            return findings;

        }

        const rows = report.rows?.items || [];

        if (rows.length === 0) {

            findings.push({
                severity: "warning",
                title: "Empty Trial Balance",
                message: "The report does not contain any rows."
            });

        }

        this.scanRows(rows, findings);

        return findings;

    }

    scanRows(rows, findings) {

        for (const row of rows) {

            if (row.cells) {

                this.analyzeRow(row, findings);

            }

            if (row.rows?.items?.length) {

                this.scanRows(row.rows.items, findings);

            }

        }

    }

    analyzeRow(row, findings) {

        const name = row.displayName || "";

        const cells = row.cells || [];

        const debit = cells[0]?.value;
        const credit = cells[1]?.value;

        if (
            debit != null &&
            credit != null &&
            debit !== 0 &&
            credit !== 0
        ) {

            findings.push({

                severity: "warning",

                account: name,

                title: "Debit and Credit on same row",

                message:
                    "This account contains values in both columns and should be reviewed.",

                row

            });

        }

        if (row.isTotalRow) {

            findings.push({

                severity: "info",

                account: name,

                title: "Total Row",

                message: "Summary row."

            });

        }

    }

}

const audit = new AuditEngine();