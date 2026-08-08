// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc =
            new DOMParser().parseFromString(
                html,
                "text/html"
            );

        return {

            document:
                this.extractDocument(doc),

            transactions:
                this.extractTransactions(doc)

        };

    }


    // --------------------------------------------------
    // Document
    // --------------------------------------------------

    extractDocument(doc) {

        const result = {

            type: "",
            number: "",
            date: "",
            title: ""

        };

        const heading =
            doc.querySelector("h1, h2");

        if (heading) {

            const text =
                heading.textContent.trim();

            result.title = text;

            const match =
                text.match(/^(.+?)\s+([0-9]+)$/);

            if (match) {

                result.type =
                    match[1].trim();

                result.number =
                    match[2];

            }

        }

        const labels =
            [...doc.querySelectorAll("label")];

        labels.forEach(label => {

            const name =
                label.textContent
                    .trim()
                    .toLowerCase();

            const value =
                label
                    .nextElementSibling
                    ?.textContent
                    .trim() || "";

            if (name.includes("date")) {

                result.date = value;

            }

        });

        return result;

    }


    // --------------------------------------------------
    // Transactions
    // --------------------------------------------------

    extractTransactions(doc) {

        const transactions = [];

        const table =
            doc.querySelector("table");

        if (!table)
            return transactions;


        const rows =
            table.querySelectorAll("tbody tr");


        rows.forEach(tr => {

            const td =
                [...tr.querySelectorAll("td")];

            /*
             * Manager transaction table
             *
             * 0  Edit
             * 1  View
             * 2  Date
             * 3  Document
             * 4  Contact
             * 5  blank
             * 6  Description
             * 7  blank
             * 8  blank
             * 9  Amount
             * 10 blank
             * 11 Balance
             */


            if (td.length < 12)
                return;


            const date =
                this.cleanText(td[2]);


            const documentText =
                this.cleanText(td[3]);


            const contact =
                this.cleanText(td[4]);


            const description =
                this.cleanText(td[6]);


            const amountText =
                this.cleanText(td[9]);


            const balanceText =
                this.cleanText(td[11]);


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

                documentDescription:
                    document.description,

                contact,

                description,

                amount:
                    this.parseAmount(
                        amountText
                    ),

                balance:
                    this.parseBalance(
                        balanceText
                    ),

                raw: {

                    document:
                        documentText,

                    amount:
                        amountText,

                    balance:
                        balanceText

                }

            });

        });


        return transactions;

    }


    // --------------------------------------------------
    // Document parser
    // --------------------------------------------------

    parseDocument(text) {

        if (!text) {

            return {

                type: "",
                number: "",
                description: ""

            };

        }


        /*
         * Examples:
         *
         * Sales Invoice — 9022163 — 22-04-2024
         *
         * Receipt — 2075
         *
         * Purchase Invoice — 12548 — 05-05-2019
         */


        const parts =
            text
                .split("—")
                .map(x => x.trim())
                .filter(Boolean);


        if (parts.length === 1) {

            return {

                type: parts[0],

                number: "",

                description: ""

            };

        }


        return {

            type:
                parts[0] || "",

            number:
                parts[1] || "",

            description:
                parts.slice(2).join(" — ")

        };

    }


    // --------------------------------------------------
    // Amount
    // --------------------------------------------------

    parseAmount(text) {

        if (!text)
            return 0;


        let value =
            text
                .replace(/,/g, "")
                .replace(/[^\d.-]/g, "")
                .trim();


        const number =
            parseFloat(value);


        if (isNaN(number))
            return 0;


        return number;

    }


    // --------------------------------------------------
    // Balance
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


        const value =
            this.parseAmount(text);


        return {

            value,

            side

        };

    }


    // --------------------------------------------------
    // Text cleanup
    // --------------------------------------------------

    cleanText(element) {

        if (!element)
            return "";

        return element.innerText
            .replace(/\s+/g, " ")
            .trim();

    }

}


const extractor =
    new EntryExtractor();