// audit-engine.js

class AuditEngine {

    analyze(account) {

        const findings = [];

        if (!account) {

            findings.push({

                severity: "error",

                title: "No Account",

                message:
                    "No balance sheet account was supplied."

            });

            return findings;

        }


        const name =
            String(account.name || "")
                .trim();


        const debit =
            this.toNumber(account.debit);


        const credit =
            this.toNumber(account.credit);


        const transactions =
            Array.isArray(account.transactions)
                ? account.transactions
                : [];


        /*
         * --------------------------------------------------
         * Rule 1
         *
         * Accounts Receivable should normally have
         * a debit balance.
         *
         * We only flag a credit balance.
         * --------------------------------------------------
         */

        if (
            this.isReceivable(name) &&
            credit > 0
        ) {

            findings.push({

                severity: "warning",

                title:
                    "Abnormal Receivable Balance",

                message:
                    `${name} has a credit balance of ${credit}.`,

                recommendation:
                    "Review the postings affecting this receivable account.",

                confidence:
                    "high",

                account: name,

                balance: {

                    debit,

                    credit

                }

            });

        }


        /*
         * --------------------------------------------------
         * Rule 2
         *
         * Accounts Payable should normally have
         * a credit balance.
         *
         * We only flag a debit balance.
         * --------------------------------------------------
         */

        if (
            this.isPayable(name) &&
            debit > 0
        ) {

            findings.push({

                severity: "warning",

                title:
                    "Abnormal Payable Balance",

                message:
                    `${name} has a debit balance of ${debit}.`,

                recommendation:
                    "Review the postings affecting this payable account.",

                confidence:
                    "high",

                account: name,

                balance: {

                    debit,

                    credit

                }

            });

        }


        /*
         * --------------------------------------------------
         * Rule 3
         *
         * Suspense account with remaining balance.
         * --------------------------------------------------
         */

        if (
            this.isSuspense(name) &&
            (debit > 0 || credit > 0)
        ) {

            findings.push({

                severity: "warning",

                title:
                    "Suspense Account Has Balance",

                message:
                    `${name} has a remaining balance.`,

                recommendation:
                    "Review and clear the suspense balance.",

                confidence:
                    "high",

                account: name,

                balance: {

                    debit,

                    credit

                }

            });

        }


        /*
         * --------------------------------------------------
         * No findings
         * --------------------------------------------------
         */

        if (findings.length === 0) {

            findings.push({

                severity: "success",

                title:
                    "No Findings",

                message:
                    "No balance-sheet rule was triggered for this account.",

                account: name,

                transactionCount:
                    transactions.length

            });

        }


        return findings;

    }


    isReceivable(name) {

        const value =
            name.toLowerCase();

        return (
            value.includes("accounts receivable") ||
            value.includes("account receivable") ||
            value.includes("receivable")
        );

    }


    isPayable(name) {

        const value =
            name.toLowerCase();

        return (
            value.includes("accounts payable") ||
            value.includes("account payable") ||
            value.includes("payable")
        );

    }


    isSuspense(name) {

        return name
            .toLowerCase()
            .includes("suspense");

    }


    toNumber(value) {

        if (typeof value === "number")
            return value;

        if (!value)
            return 0;

        const number =
            parseFloat(
                String(value)
                    .replace(/,/g, "")
                    .replace(/[^\d.-]/g, "")
            );

        return isNaN(number)
            ? 0
            : number;

    }


    render(findings) {

        return findings.map(f => {

            return `

                <div class="audit-card ${f.severity}">

                    <h3>
                        ${f.title}
                    </h3>

                    <p>
                        ${f.message}
                    </p>

                    ${
                        f.recommendation
                        ? `
                            <p>
                                <strong>Review:</strong>
                                ${f.recommendation}
                            </p>
                          `
                        : ""
                    }

                </div>

            `;

        }).join("");

    }

}


const audit =
    new AuditEngine();