// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc =
            new DOMParser().parseFromString(
                html,
                "text/html"
            );

        const table =
            this.findTransactionTable(doc);

        if (!table) {
    return {
        transactions: [],
        finalBalance: {
            value: 0,
            side: ""
        },
        hasTransactionLedger: false
    };
}

        const transactions =
            this.extractTransactions(
                table
            );


        /*
         * IMPORTANT:
         *
         * The Manager total/balance bar may be
         * outside the transaction table.
         *
         * Therefore we pass the complete document.
         */

        const finalBalance =
            this.extractFinalBalance(
                doc,
                table
            );


      return {
    transactions,
    finalBalance,
    hasTransactionLedger: true
};
    }


    // ==================================================
    // FIND TRANSACTION TABLE
    // ==================================================

    findTransactionTable(doc) {

        const tables = [...doc.querySelectorAll("table")];

        let best = null;
        let bestScore = 0;

        for (const table of tables) {
            const rows = [...table.querySelectorAll("tbody tr")];
            let score = 0;

            for (const tr of rows) {
                const cells = [...tr.querySelectorAll("td")];
                const text = cells.map(td => this.clean(td)).join(" | ");

                const hasDate = cells.some(td =>
                    /^\d{1,2}-\d{1,2}-\d{4}$/.test(this.clean(td))
                );

                const hasMoney = cells.some(td =>
                    /(?:AED|SAR|USD|\$|Dr\b|Cr\b)/i.test(this.clean(td)) &&
                    /\d/.test(this.clean(td))
                );

                // Manager's summary-transactions page currently renders
                // compact rows such as:
                // Edit | View | 12-06-2026 | Payment |
                // Cash & cash equivalents | AED 2,524.86 Cr
                if (hasDate && hasMoney) {
                    score += 3;
                } else if (cells.length >= 5 && /\d{1,2}-\d{1,2}-\d{4}/.test(text)) {
                    score += 1;
                }
            }

            if (score > bestScore) {
                bestScore = score;
                best = table;
            }
        }

        return bestScore > 0 ? best : null;
    }


    // ==================================================
    // EXTRACT TRANSACTIONS
    // ==================================================

    extractTransactions(table) {

        const transactions = [];
        const rows = [...table.querySelectorAll("tbody tr")];

        rows.forEach(tr => {
            const td = [...tr.querySelectorAll("td")];
            if (td.length < 5) return;

            const values = td.map(cell => this.clean(cell));
            const dateIndex = values.findIndex(value =>
                /^\d{1,2}-\d{1,2}-\d{4}$/.test(value)
            );

            if (dateIndex < 0) return;

            const date = values[dateIndex];
            const isDetailed = td.length >= 12;

            let typeText = "";
            let description = "";
            let amountText = "";
            let balanceText = "";

            if (isDetailed) {
                // Established detailed Manager layout:
                // Edit, View, Date, Document, Contact, ..., Description,
                // ..., Amount, ..., Running Balance.
                typeText = values[3] || "";
                description = values[6] || "";
                amountText = values[9] || "";
                balanceText = values[11] || "";
            } else {
                // Current compact Manager layout:
                // Edit | View | Date | Transaction | Account | Amount
                typeText = values[dateIndex + 1] || "";
                const amountIndex = (() => {
                    for (let i = values.length - 1; i > dateIndex; i--) {
                        if (/(?:AED|SAR|USD|EUR|GBP|\$|€|£|Dr\b|Cr\b)/i.test(values[i]) && /\d/.test(values[i])) {
                            return i;
                        }
                    }
                    return values.length - 1;
                })();
                amountText = values[amountIndex] || "";
                description = values.slice(dateIndex + 2, amountIndex).join(" ").trim();
            }

            const document = this.parseDocument(typeText);
            const parsedBalance = this.parseBalance(balanceText);
            const balanceAvailable = isDetailed && /\d/.test(balanceText);

            transactions.push({
                date,
                documentType: document.type || typeText,
                documentNumber: document.number,
                description,
                contact: isDetailed ? (values[4] || "") : (values[dateIndex + 2] || ""),
                amount: this.parseAmount(amountText),
                side: this.parseSide(amountText),
                balance: balanceAvailable ? parsedBalance : null,
                balanceAvailable
            });
        });

        return transactions;
    }


    // ==================================================
    // EXTRACT FINAL ACCOUNT BALANCE
    // ==================================================

    extractFinalBalance(doc, transactionTable) {

        // The compact Manager Trial Balance Transactions page shows a blue
        // amount bar at the bottom, but that value is a transaction total,
        // not necessarily the account's ending/running balance. Never use a
        // generic money-looking element as the account balance.
        //
        // A trustworthy transaction balance is available only when the
        // detailed ledger contains an explicit running-balance column.
        const rows = [...transactionTable.querySelectorAll("tbody tr")];
        const candidates = [];

        for (const tr of rows) {
            const td = [...tr.querySelectorAll("td")];
            if (td.length < 12) continue;

            const values = td.map(cell => this.clean(cell));
            const date = values[2] || "";
            const balanceText = values[11] || "";
            const balance = this.parseBalance(balanceText);

            if (!date || !/\d/.test(balanceText)) continue;
            candidates.push({ date, balance });
        }

        if (!candidates.length) return null;

        candidates.sort((a, b) => this.dateValue(a.date) - this.dateValue(b.date));
        return candidates[candidates.length - 1].balance;
    }

    dateValue(value) {
        const match = String(value || "").trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (!match) return 0;
        return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])).getTime();
    }

    // ==================================================
    // PARSE DOCUMENT
    // ==================================================

    parseDocument(
        text
    ) {

        if (!text) {

            return {

                type: "",

                number: ""

            };

        }


        const parts =
            text
                .split("—")
                .map(
                    x => x.trim()
                )
                .filter(
                    Boolean
                );


        return {

            type:
                parts[0] || "",

            number:
                parts[1] || ""

        };
    }


    // ==================================================
    // PARSE AMOUNT
    // ==================================================

    parseAmount(
        text
    ) {

        if (!text)
            return 0;


        const cleaned =
            String(text)
                .replace(
                    /,/g,
                    ""
                )
                .replace(
                    /[^\d.-]/g,
                    ""
                );


        const number =
            parseFloat(
                cleaned
            );


        return isNaN(
            number
        )
            ? 0
            : number;
    }


    // ==================================================
    // PARSE TRANSACTION SIDE
    // ==================================================

    parseSide(text) {
        if (!text) return "";

        if (/\bDr\b/i.test(String(text))) return "debit";
        if (/\bCr\b/i.test(String(text))) return "credit";

        return "";
    }


    // ==================================================
    // PARSE RUNNING BALANCE
    // ==================================================

    parseBalance(
        text
    ) {

        if (!text) {

            return {

                value: 0,

                side: ""

            };

        }


        let side = "";


        if (
            /\bDr\b/i.test(
                text
            )
        ) {

            side =
                "debit";

        }
        else if (
            /\bCr\b/i.test(
                text
            )
        ) {

            side =
                "credit";

        }


        return {

            value:
                this.parseAmount(
                    text
                ),

            side

        };
    }


    // ==================================================
    // CLEAN DOM TEXT
    // ==================================================

    clean(
        element
    ) {

        if (!element)
            return "";


        return (
            element.innerText ||
            element.textContent ||
            ""
        )
            .replace(
                /\s+/g,
                " "
            )
            .trim();
    }

}


// ======================================================
// GLOBAL EXTRACTOR INSTANCE
// ======================================================

const extractor =
    new EntryExtractor();