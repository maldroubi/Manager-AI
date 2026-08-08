// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc =
            new DOMParser().parseFromString(
                html,
                "text/html"
            );

        const accountDetailBalance =
            this.extractAccountDetailBalance(doc);

        const table =
            this.findTransactionTable(doc);

        if (!table) {
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

        // A Manager account-detail page can contain a table that is not
        // the transaction ledger. If no real transaction rows were
        // extracted, use the account-detail total instead.
        if (!transactions.length) {
            return {
                transactions: [],
                finalBalance: null,
                accountDetailBalance,
                hasTransactionLedger: false,
                hasAccountDetailBalance:
                    accountDetailBalance !== null
            };
        }

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

        const candidates = [];

        const moneyPattern =
            /(?:AED|SAR|USD|EUR|GBP|\$|€|£)\s*-?\d[\d,]*(?:\.\d+)?\s*(?:Dr|Cr)?/gi;

        const elements = [
            ...doc.querySelectorAll("*")
        ];

        for (const element of elements) {

            const text = this.clean(element);

            if (!text || !moneyPattern.test(text)) {
                moneyPattern.lastIndex = 0;
                continue;
            }
            moneyPattern.lastIndex = 0;

            const matches = text.match(moneyPattern) || [];

            // A leaf/near-leaf element containing one amount is the most
            // reliable representation of the blue Manager total cells.
            if (matches.length === 1) {
                const amountText = matches[0];
                const value = this.parseAmount(amountText);

                if (!Number.isFinite(value))
                    continue;

                let score = 0;
                let parent = element;

                for (let level = 0; level < 6 && parent; level++) {
                    const cls = String(parent.className || "").toLowerCase();
                    const style = String(parent.getAttribute?.("style") || "").toLowerCase();
                    const id = String(parent.id || "").toLowerCase();
                    const marker = `${cls} ${style} ${id}`;

                    if (/total|balance|summary|footer|grand|amount/.test(marker))
                        score += 100;

                    if (/blue|rgb\(0,\s*102,\s*204\)|#0066cc|#0070c0|#06c/.test(marker))
                        score += 120;

                    if (parent.tagName === "TFOOT")
                        score += 150;

                    const parentText = this.clean(parent);
                    const parentMoneyCount =
                        (parentText.match(moneyPattern) || []).length;
                    moneyPattern.lastIndex = 0;

                    if (parentMoneyCount >= 3)
                        score += 80;
                    else if (parentMoneyCount >= 2)
                        score += 40;

                    parent = parent.parentElement;
                }

                if (/\bAED\b/i.test(amountText))
                    score += 30;

                if (/\bDr\b/i.test(amountText))
                    score += 10;

                // Manager may render the amount and the Dr/Cr suffix
                // in separate DOM nodes (e.g. "AED 1,138,957.16" and
                // "Cr").  If the amount itself has no suffix, inspect
                // its nearby ancestors before defaulting to an unknown
                // side.  This is essential for credit account totals.
                let side = /\bCr\b/i.test(amountText)
                    ? "credit"
                    : /\bDr\b/i.test(amountText)
                        ? "debit"
                        : "";

                if (!side) {
                    let context = element;

                    for (let level = 0; level < 6 && context; level++) {
                        const contextText = this.clean(context);

                        // Prefer an explicit suffix near the exact amount.
                        if (/\bCr\b/i.test(contextText)) {
                            side = "credit";
                            break;
                        }

                        if (/\bDr\b/i.test(contextText)) {
                            side = "debit";
                            break;
                        }

                        context = context.parentElement;
                    }
                }

                candidates.push({
                    value,
                    score,
                    currency: /\bAED\b/i.test(amountText)
                        ? "AED"
                        : /\bSAR\b/i.test(amountText)
                            ? "SAR"
                            : /\bUSD\b|\$/i.test(amountText)
                                ? "USD"
                                : "",
                    side
                });
            }
        }

        if (!candidates.length)
            return null;

        // Prefer the main AED total. Among AED totals, the strongest
        // total/footer candidate wins; this avoids choosing a customer
        // row amount such as AED 11,950.00.
        candidates.sort((a, b) => {
            const aCurrency = a.currency === "AED" ? 1 : 0;
            const bCurrency = b.currency === "AED" ? 1 : 0;

            if (bCurrency !== aCurrency)
                return bCurrency - aCurrency;

            if (b.score !== a.score)
                return b.score - a.score;

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
                            [...tr.querySelectorAll("td")];

                        if (td.length < 12)
                            return false;

                        const date = this.clean(td[2]);
                        const documentText = this.clean(td[3]);

                        const looksLikeDate =
                            /^(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})$/.test(date);

                        const looksLikeDocument =
                            /sales invoice|purchase invoice|receipt|payment|journal|credit note|debit note|transfer|opening balance/i.test(documentText);

                        return looksLikeDate && looksLikeDocument;

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