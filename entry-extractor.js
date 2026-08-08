// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc =
            new DOMParser().parseFromString(
                html,
                "text/html"
            );

        return {

            transactions:
                this.extractTransactions(doc)

        };

    }


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


    clean(element) {

        if (!element)
            return "";

        return element.innerText
            .replace(/\s+/g, " ")
            .trim();

    }

}


const extractor =
    new EntryExtractor();