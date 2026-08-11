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

        const tables =
            [
                ...doc.querySelectorAll(
                    "table"
                )
            ];


        for (
            const table
            of tables
        ) {

            const rows =
                [
                    ...table.querySelectorAll(
                        "tbody tr"
                    )
                ];


            const hasTransactionRows =
                rows.some(
                    tr => {

                        const td =
                            tr.querySelectorAll(
                                "td"
                            );


                        return td.length >= 12;

                    }
                );


            if (
                hasTransactionRows
            ) {

                return table;

            }

        }


        return null;
    }


    // ==================================================
    // EXTRACT TRANSACTIONS
    // ==================================================

    extractTransactions(
        table
    ) {

        const transactions = [];


        const rows =
            table.querySelectorAll(
                "tbody tr"
            );


        rows.forEach(
            tr => {

                const td =
                    [
                        ...tr.querySelectorAll(
                            "td"
                        )
                    ];


                /*
                 * Manager transaction row
                 * contains 12 columns.
                 */

                if (
                    td.length < 12
                ) {

                    return;

                }


                const rawDate =
                    this.clean(
                        td[2]
                    );

                const date =
                    this.parseTransactionDate(rawDate) || rawDate;


                const documentText =
                    this.clean(
                        td[3]
                    );


                const contact =
                    this.clean(
                        td[4]
                    );


                const description =
                    this.clean(
                        td[6]
                    );


                const amountText =
                    this.clean(
                        td[9]
                    );


                const balanceText =
                    this.clean(
                        td[11]
                    );


                const document =
                    this.parseDocument(
                        documentText
                    );


                transactions.push({

                    date,

                    documentType:
                        document.type,

                    documentNumber:
                        document.number,

                    description,

                    contact,

                    amount:
                        this.parseAmount(
                            amountText
                        ),

                    balance:
                        this.parseBalance(
                            balanceText
                        )

                });

            }
        );


        return transactions;
    }


    // ==================================================
    // EXTRACT FINAL ACCOUNT BALANCE
    // ==================================================

    extractFinalBalance(
        doc,
        transactionTable
    ) {

        /*
         * ------------------------------------------------
         * METHOD 1
         *
         * Check <tfoot> first.
         * ------------------------------------------------
         */

        const footerRows =
            [
                ...transactionTable.querySelectorAll(
                    "tfoot tr"
                )
            ];


        for (
            const tr
            of footerRows
        ) {

            const text =
                this.clean(
                    tr
                );


            const result =
                this.parseBalanceAmount(
                    text
                );


            if (
                result !== null
            ) {

                return result;

            }

        }


        /*
         * ------------------------------------------------
         * METHOD 2
         *
         * Search elements immediately after the
         * transaction table.
         *
         * Manager may render the blue total bar
         * outside the actual table.
         * ------------------------------------------------
         */

        let current =
            transactionTable;


        for (
            let i = 0;
            i < 10;
            i++
        ) {

            current =
                current.nextElementSibling;


            if (!current)
                break;


            const result =
                this.findBalanceInElement(
                    current
                );


            if (
                result !== null
            ) {

                return result;

            }

        }


        /*
         * ------------------------------------------------
         * METHOD 3
         *
         * Search the parent container.
         *
         * This handles structures where the table
         * and blue total bar are siblings inside
         * the same Manager container.
         * ------------------------------------------------
         */

        let parent =
            transactionTable.parentElement;


        for (
            let level = 0;
            level < 5 && parent;
            level++
        ) {

            const result =
                this.findBalanceInElement(
                    parent,
                    transactionTable
                );


            if (
                result !== null
            ) {

                return result;

            }


            parent =
                parent.parentElement;

        }


        /*
         * ------------------------------------------------
         * METHOD 4 REMOVED
         *
         * Never scan arbitrary page elements for a bare money
         * value. Manager pages contain many unrelated numeric
         * values (transaction count, pagination, totals, etc.),
         * and this caused values such as 50.00 to be treated as
         * the account balance.
         * ------------------------------------------------
         */

        /*
         * Nothing found.
         */

        return null;
    }


    // ==================================================
    // FIND BALANCE INSIDE ELEMENT
    // ==================================================

    findBalanceInElement(
        element,
        transactionTable = null
    ) {

        if (!element)
            return null;


        /*
         * Search descendants for exact currency text.
         */

        const elements =
            [
                element,
                ...element.querySelectorAll(
                    "*"
                )
            ];


        for (
            const child
            of elements
        ) {

            /*
             * Never use the transaction table itself.
             */

            if (
                transactionTable &&
                (
                    child === transactionTable ||
                    transactionTable.contains(
                        child
                    )
                )
            ) {

                continue;

            }


            /*
             * Never use transaction rows.
             */

            if (
                child.closest(
                    "tbody tr"
                )
            ) {

                continue;

            }


            const text =
                this.clean(
                    child
                );


            if (
                !this.isPureMoneyText(
                    text
                )
            ) {

                continue;

            }


            /*
             * Prefer the smallest element
             * containing the exact amount.
             */

            const hasExactChild =
                [
                    ...child.children
                ]
                .some(
                    nested => {

                        return this.isPureMoneyText(
                            this.clean(
                                nested
                            )
                        );

                    }
                );


            if (
                hasExactChild
            ) {

                continue;

            }


            const result =
                this.parseBalanceAmount(
                    text
                );


            if (
                result !== null
            ) {

                return result;

            }

        }


        return null;
    }


    // ==================================================
    // CHECK IF TEXT IS ONLY A MONEY VALUE
    // ==================================================

    isPureMoneyText(
        text
    ) {

        if (!text)
            return false;


        /*
         * Examples accepted:
         *
         * AED 25,000.00
         * SAR 25,000.00
         * USD 25,000.00
         * $25,000.00
         * 25,000.00
         * AED 25,000.00 Dr
         */

        const pattern =
            /^(?:AED|SAR|USD|EUR|GBP|\$|€|£)?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:Dr|Cr)?$/i;


        return pattern.test(
            text.trim()
        );
    }


    // ==================================================
    // PARSE BALANCE AMOUNT
    // ==================================================

    parseBalanceAmount(
        text
    ) {

        if (!text)
            return null;


        const cleanText =
            String(text)
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();


        /*
         * Only accept an element that represents
         * a money value, rather than arbitrary text.
         */

        if (
            !this.isPureMoneyText(
                cleanText
            )
        ) {

            return null;

        }


        const amount =
            this.parseAmount(
                cleanText
            );


        if (
            !Number.isFinite(
                amount
            )
        ) {

            return null;

        }


        let side = "";


        if (
            /\bDr\b/i.test(
                cleanText
            )
        ) {

            side =
                "debit";

        }
        else if (
            /\bCr\b/i.test(
                cleanText
            )
        ) {

            side =
                "credit";

        }


        return {

            value:
                amount,

            side

        };
    }


    // ==================================================
    // NORMALIZE / PARSE TRANSACTION DATE
    // ==================================================

    parseTransactionDate(value) {
        if (!value) return null;

        const text = String(value).replace(/\s+/g, " ").trim();
        if (!text || text === "-") return null;

        let m = text.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (m) {
            const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
            return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0,10);
        }

        m = text.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (m) return `${m[1]}-${String(m[2]).padStart(2,"0")}-${String(m[3]).padStart(2,"0")}`;

        const parsed = Date.parse(text);
        return Number.isNaN(parsed) ? null : new Date(parsed).toISOString().slice(0,10);
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