// entry-extractor.js

class EntryExtractor {

    extract(html) {

        const doc = new DOMParser().parseFromString(
            html,
            "text/html"
        );

        return {

            document: this.extractDocument(doc),

            lines: this.extractLines(doc)

        };

    }

    extractDocument(doc) {

        const result = {

            type: "",

            number: "",

            date: ""

        };

        const h1 =
            doc.querySelector("h1,h2");

        if (h1) {

            const text = h1.textContent.trim();

            result.title = text;

            const m =
                text.match(/^([A-Za-z ]+)\s+([0-9]+)/);

            if (m) {

                result.type = m[1].trim();

                result.number = m[2];

            }

        }

        const labels =
            [...doc.querySelectorAll("label")];

        labels.forEach(label => {

            const name =
                label.textContent.trim().toLowerCase();

            const value =
                label.nextElementSibling?.textContent.trim() || "";

            if (name.includes("date"))
                result.date = value;

        });

        return result;

    }

    extractLines(doc) {

        const rows = [];

        const table =
            doc.querySelector("table");

        if (!table)
            return rows;

        table
            .querySelectorAll("tbody tr")
            .forEach(tr => {

                const td =
                    [...tr.querySelectorAll("td")];

                if (td.length < 3)
                    return;

                rows.push({

                    account:
                        td[0]?.innerText.trim() || "",

                    debit:
                        this.number(td[1]?.innerText),

                    credit:
                        this.number(td[2]?.innerText)

                });

            });

        return rows;

    }

    number(text) {

        if (!text)
            return 0;

        text =
            text.replace(/,/g, "")
                .trim();

        const n =
            parseFloat(text);

        return isNaN(n)
            ? 0
            : n;

    }

}

const extractor =
    new EntryExtractor();