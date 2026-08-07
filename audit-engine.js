// audit-engine.js

class AuditEngine {

    constructor() {

        this.rules = [

            this.checkSuspenseBalance,
            this.checkNegativeInventoryClearing,
            this.checkReceivableCreditBalance,
            this.checkPayableDebitBalance

        ];

    }

    analyze(report) {

        const findings = [];

        if (!report) {

            findings.push({
                severity: "error",
                title: "No Trial Balance",
                message: "No Trial Balance loaded."
            });

            return findings;

        }

        this.scanRows(report.rows?.items || [], findings);

        return findings;

    }

    scanRows(rows, findings) {

        for (const row of rows) {

            if (row.cells) {

                for (const rule of this.rules) {

                    const result = rule.call(this, row);

                    if (result)
                        findings.push(result);

                }

            }

            if (row.rows?.items?.length) {

                this.scanRows(row.rows.items, findings);

            }

        }

    }

    //----------------------------------------------------
    // Rules
    //----------------------------------------------------

    checkSuspenseBalance(row) {

        const account = (row.displayName || "").toLowerCase();

        if (!account.includes("suspense"))
            return null;

        const debit = Number(row.cells?.[0]?.value || 0);
        const credit = Number(row.cells?.[1]?.value || 0);

        if (debit === 0 && credit === 0)
            return null;

        return {

            severity: "warning",

            account: row.displayName,

            title: "Suspense Account Balance",

            message:
                "Suspense account still contains a balance. Review the postings."

        };

    }

    checkNegativeInventoryClearing(row) {

        const account = (row.displayName || "").toLowerCase();

        if (!account.includes("inventory"))
            return null;

        if (!account.includes("clearing"))
            return null;

        const debit = Number(row.cells?.[0]?.value || 0);
        const credit = Number(row.cells?.[1]?.value || 0);

        if (debit === 0 && credit === 0)
            return null;

        return {

            severity: "warning",

            account: row.displayName,

            title: "Inventory Clearing Balance",

            message:
                "Inventory Clearing should normally return to zero."

        };

    }

    checkReceivableCreditBalance(row) {

        const account = (row.displayName || "").toLowerCase();

        if (!account.includes("receivable"))
            return null;

        const credit = Number(row.cells?.[1]?.value || 0);

        if (credit === 0)
            return null;

        return {

            severity: "warning",

            account: row.displayName,

            title: "Receivable Credit Balance",

            message:
                "Receivable account contains a credit balance."

        };

    }

    checkPayableDebitBalance(row) {

        const account = (row.displayName || "").toLowerCase();

        if (!account.includes("payable"))
            return null;

        const debit = Number(row.cells?.[0]?.value || 0);

        if (debit === 0)
            return null;

        return {

            severity: "warning",

            account: row.displayName,

            title: "Payable Debit Balance",

            message:
                "Payable account contains a debit balance."

        };

    }

}

const audit = new AuditEngine();