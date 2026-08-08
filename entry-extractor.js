// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc =
            new DOMParser().parseFromString(
                html,
                "text/html"
            );

        const table = this.findTransactionTable(doc);

        if (!table) {
            return {
                transactions: [],
                finalBalance: {
                    value: 0,
                    side: ""
                }
            };
        }

        const transactions =
            this.extractTransactions(table);

        const finalBalance =
            this.extractFinalBalance(table);

        return {
            transactions,
            finalBalance
        };
    }


    // --------------------------------------------------
    // Find the Manager transaction table
    // --------------------------------------------------

    findTransactionTable(doc) {

        const tables =
            [...doc.querySelectorAll("table")];

        for (const table of tables) {

            const rows =
                [...table.querySelectorAll("tbody tr")];

            const hasTransactionRows =
                rows.some(tr => {

                    const td =
                        tr.querySelectorAll("td");

                    return td.length >= 12;
                });

            if (hasTransactionRows) {
                return table;
            }
        }

        return null;
    }


    // --------------------------------------------------
    // Extract transactions
    // --------------------------------------------------

    extractTransactions(table) {

        const transactions = [];

        const rows =
            table.querySelectorAll("tbody tr");

        rows.forEach(tr => {

            const td =
                [...tr.querySelectorAll("td")];

            // Manager transaction table has 12 columns.
            if (td.length < 12)
                return;


            const date =
                this.clean(td[2]);


            const documentText =
                this.clean(td[3]);


            const contact =
                this.clean(td[4]);


            const description =
                this.clean(td[6]);


            const amountText =
                this.clean(td[9]);


            const balanceText =
                this.clean(td[11]);


            const document =
                this.parseDocument(documentText);


            transactions.push({

                date,

                documentType:
                    document.type,

                documentNumber:
                    document.number,

                description,

                contact,

                amount:
                    this.parseAmount(amountText),

                balance:
                    this.parseBalance(balanceText)

            });

        });


        return transactions;
    }


    // --------------------------------------------------
    // Extract the FINAL ACCOUNT BALANCE
    //
    // Manager displays this separately in the blue
    // total row at the bottom of the transaction table.
    // It must NOT be taken from the last transaction.
    // --------------------------------------------------

    extractFinalBalance(table) {

        // ----------------------------------------------
        // 1. Try <tfoot>
        // ----------------------------------------------

        const footerRows =
            [...table.querySelectorAll("tfoot tr")];

        for (const tr of footerRows) {

            const text =
                this.clean(tr);

            const value =
                this.extractLargestMoneyValue(text);

            if (value !== null) {

                return {
                    value,
                    side:
                        this.detectBalanceSide(text)
                };
            }
        }


        // ----------------------------------------------
        // 2. Look for total rows inside the table
        // ----------------------------------------------

        const allRows =
            [...table.querySelectorAll("tr")];

        for (const tr of allRows) {

            // Total rows normally do not contain
            // Edit / View links.
            const links =
                tr.querySelectorAll("a");

            if (links.length > 0)
                continue;


            const text =
                this.clean(tr);

            if (!text)
                continue;


            // Look for a money value.
            const value =
                this.extractLargestMoneyValue(text);

            if (value === null)
                continue;


            // Prefer rows that look like totals.
            const isTotalRow =
                this.isLikelyTotalRow(tr, text);


            if (isTotalRow) {

                return {
                    value,
                    side:
                        this.detectBalanceSide(text)
                };
            }
        }


        // ----------------------------------------------
        // 3. Fallback:
        // Search for a row with a single meaningful
        // numeric cell after the transaction rows.
        // ----------------------------------------------

        for (const tr of allRows) {

            const td =
                [...tr.querySelectorAll("td")];

            if (td.length === 0)
                continue;


            if (td.length >= 12)
                continue;


            const text =
                this.clean(tr);

            const value =
                this.extractLargestMoneyValue(text);


            if (value !== null) {

                return {
                    value,
                    side:
                        this.detectBalanceSide(text)
                };
            }
        }


        return {
            value: 0,
            side: ""
        };
    }


    // --------------------------------------------------
    // Identify a total / balance row
    // --------------------------------------------------

    isLikelyTotalRow(tr, text) {

        const lower =
            text.toLowerCase();


        // Common words used by Manager / accounting
        // tables for total rows.
        if (
            lower.includes("total") ||
            lower.includes("balance")
        ) {
            return true;
        }


        // Blue total rows commonly have a background
        // colour or a special class.
        const className =
            String(tr.className || "").toLowerCase();


        if (
            className.includes("total") ||
            className.includes("footer") ||
            className.includes("balance")
        ) {
            return true;
        }


        const style =
            String(tr.getAttribute("style") || "")
                .toLowerCase();


        if (
            style.includes("background") ||
            style.includes("blue")
        ) {
            return true;
        }


        // A row with one cell containing only a money
        // amount is very likely the Manager total row.
        const cells =
            [...tr.querySelectorAll("td")];

        if (cells.length <= 2) {

            const numericCells =
                cells.filter(cell => {

                    const value =
                        this.clean(cell);

                    return (
                        value &&
                        this.extractLargestMoneyValue(value) !== null
                    );
                });

            if (numericCells.length === 1) {
                return true;
            }
        }


        return false;
    }


    // --------------------------------------------------
    // Extract money value from text
    // --------------------------------------------------

    extractLargestMoneyValue(text) {

        if (!text)
            return null;


        /*
         * Examples:
         *
         * AED 25,000.00
         * SAR 25,000.00
         * $ 25,000.00
         * 25,000.00 Dr
         *
         * We deliberately allow currency text before
         * the number and Dr / Cr after it.
         */

        const matches =
            text.match(
                /(?:AED|SAR|USD|EUR|GBP|\$|€|£)?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:Dr|Cr)?/gi
            );


        if (!matches || matches.length === 0)
            return null;


        const values =
            matches
                .map(value =>
                    this.parseAmount(value)
                )
                .filter(value =>
                    Number.isFinite(value)
                );


        if (values.length === 0)
            return null;


        // The total row normally contains one value.
        // If multiple values exist, use the largest one.
        return Math.max(...values);
    }


    // --------------------------------------------------
    // Detect Dr / Cr
    // --------------------------------------------------

    detectBalanceSide(text) {

        if (!text)
            return "";


        if (/\bDr\b/i.test(text))
            return "debit";


        if (/\bCr\b/i.test(text))
            return "credit";


        return "";
    }


    // --------------------------------------------------
    // Parse document
    // --------------------------------------------------

    parseDocument(text) {

        if (!text) {

            return {
                type: "",
                number: ""
            };
        }


        const parts =
            text
                .split("—")
                .map(x => x.trim())
                .filter(Boolean);


        return {

            type:
                parts[0] || "",

            number:
                parts[1] || ""

        };
    }


    // --------------------------------------------------
    // Parse amount
    // --------------------------------------------------

    parseAmount(text) {

        if (!text)
            return 0;


        const cleaned =
            text
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, "");


        const number =
            parseFloat(cleaned);


        return isNaN(number)
            ? 0
            : number;
    }


    // --------------------------------------------------
    // Parse running balance
    // --------------------------------------------------

    parseBalance(text) {

        if (!text) {

            return {
                value: 0,
                side: ""
            };
        }


        const side =
            /\bDr\b/i.test(text)
                ? "debit"
                : /\bCr\b/i.test(text)
                    ? "credit"
                    : "";


        return {

            value:
                this.parseAmount(text),

            side

        };
    }


    // --------------------------------------------------
    // Clean DOM text
    // --------------------------------------------------

    clean(element) {

        if (!element)
            return "";


        return (element.innerText || element.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
    }

}


// ------------------------------------------------------
// Global extractor instance
// ------------------------------------------------------

const extractor =
    new EntryExtractor();