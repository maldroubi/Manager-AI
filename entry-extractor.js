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
            const accountDetailBalance =
                this.extractAccountDetailBalance(doc);

            return {
                transactions: [],
                finalBalance: null,
                accountDetailBalance,
                hasTransactionLedger: false,
                hasAccountDetailBalance:
                    accountDetailBalance !== null
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
            accountDetailBalance: null,
            hasTransactionLedger: true,
            hasAccountDetailBalance: false
        };
    }


    // ==================================================
    // EXTRACT ACCOUNT DETAIL BALANCE
    // ==================================================
    // Some Manager account pages do not contain a transaction
    // ledger. Instead they show account-detail rows followed by
    // a total/balance bar. We use that total only when there is
    // no transaction ledger at all.
    extractAccountDetailBalance(doc) {
        const elements = [
            ...doc.querySelectorAll("*")
        ];

        const candidates = [];

        for (const element of elements) {
            // Account-detail totals may themselves be inside a table.
            // Only ignore ordinary detail rows, not table footers/totals.
            if (element.closest("tbody tr")) {
                continue;
            }

            const text = this.clean(element);

            if (!this.isPureMoneyText(text)) {
                continue;
            }

            const value = this.parseAmount(text);

            if (!Number.isFinite(value)) {
                continue;
            }

            let score = 0;
            let parent = element.parentElement;

            for (let level = 0; level < 5 && parent; level++) {
                const marker =
                    `${parent.id || ""} ${parent.className || ""}`
                        .toLowerCase();

                if (/total|balance|summary|footer|grand|amount/.test(marker)) {
                    score += 100;
                }

                const moneyChildren =
                    [...parent.querySelectorAll("*")]
                        .filter(child =>
                            this.isPureMoneyText(
                                this.clean(child)
                            )
                        );

                if (moneyChildren.length >= 2) {
                    score += 50;
                }

                parent = parent.parentElement;
            }

            candidates.push({
                value,
                side: /\bCr\b/i.test(text)
                    ? "credit"
                    : /\bDr\b/i.test(text)
                        ? "debit"
                        : "",
                score
            });
        }

        if (!candidates.length) {
            return null;
        }

        candidates.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return b.value - a.value;
        });

        return candidates[0];
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


                const date =
                    this.clean(
                        td[2]
                    );


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
         * METHOD 4
         *
         * Search the entire document for an element
         * whose visible text is ONLY a currency amount.
         *
         * Example:
         *
         * AED 25,000.00
         *
         * This is the important fallback for the
         * blue Manager total bar.
         * ------------------------------------------------
         */

        const allElements =
            [
                ...doc.querySelectorAll(
                    "*"
                )
            ];


        for (
            const element
            of allElements
        ) {

            /*
             * Ignore elements inside transaction rows.
             */

            if (
                element.closest(
                    "tbody tr"
                )
            ) {

                continue;

            }


            const text =
                this.clean(
                    element
                );


            if (
                !this.isPureMoneyText(
                    text
                )
            ) {

                continue;

            }


            /*
             * We want the smallest element containing
             * the exact money text.
             */

            const childMoney =
                [
                    ...element.children
                ]
                .some(
                    child => {

                        return this.isPureMoneyText(
                            this.clean(
                                child
                            )
                        );

                    }
                );


            if (
                childMoney
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


        /*
         * Nothing found.
         */

        return {

            value: 0,

            side: ""

        };
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

window.extractor = new EntryExtractor();