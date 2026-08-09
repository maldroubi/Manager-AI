// entry-extractor.js
// Extracts transaction ledger data and exposes diagnostics when a ledger
// is missing or cannot be recognized.

class EntryExtractor {

    extract(html) {
        const doc = new DOMParser().parseFromString(html || "", "text/html");
        const diagnostics = this.inspectDocument(doc);
        const table = diagnostics.selectedTable;

        if (!table) {
            return {
                transactions: [],
                finalBalance: null,
                hasTransactionLedger: false,
                diagnostics: {
                    ...diagnostics,
                    selectedTable: undefined,
                    reason: "No transaction ledger table was recognized on the returned page."
                }
            };
        }

        const transactions = this.extractTransactions(table);
        const finalBalance = this.extractFinalBalance(doc, table);
        const hasTransactionLedger = transactions.length > 0;

        return {
            transactions,
            finalBalance,
            hasTransactionLedger,
            diagnostics: {
                ...diagnostics,
                selectedTable: undefined,
                transactionRows: transactions.length,
                hasTransactionLedger,
                reason: hasTransactionLedger
                    ? "Transaction ledger detected and transactions extracted."
                    : "A table was found, but no transaction rows could be extracted from it."
            }
        };
    }

    inspectDocument(doc) {
        const tables = [...doc.querySelectorAll("table")];
        const candidates = tables.map((table, index) => {
            const rows = [...table.querySelectorAll("tbody tr")];
            const rowInfo = rows.map(tr => {
                const cells = [...tr.querySelectorAll("td")];
                return {
                    cells: cells.length,
                    text: this.clean(tr).slice(0, 180)
                };
            });

            const transactionRows = rows.filter(tr => this.isTransactionRow(tr));

            return {
                index,
                rows: rows.length,
                transactionRows: transactionRows.length,
                maxCells: rowInfo.reduce((max, row) => Math.max(max, row.cells), 0),
                sample: rowInfo.slice(0, 3)
            };
        });

        const selectedIndex = candidates.findIndex(c => c.transactionRows > 0);

        return {
            tableCount: tables.length,
            candidates,
            selectedTableIndex: selectedIndex >= 0 ? selectedIndex : null,
            selectedTable: selectedIndex >= 0 ? tables[selectedIndex] : null
        };
    }

    findTransactionTable(doc) {
        const tables = [...doc.querySelectorAll("table")];
        return tables.find(table =>
            [...table.querySelectorAll("tbody tr")].some(tr => this.isTransactionRow(tr))
        ) || null;
    }

    isTransactionRow(tr) {
        const td = [...tr.querySelectorAll("td")];
        if (td.length < 8) return false;

        const text = this.clean(tr);
        const hasDate = /\b\d{1,2}-\d{1,2}-\d{4}\b/.test(text);
        const hasDocument = /\b(?:sales invoice|purchase invoice|receipt|payment|journal|credit note|debit note|invoice)\b/i.test(text);
        const hasEditView = /\bEdit\b/.test(text) && /\bView\b/.test(text);

        // Current Manager transaction tables normally contain Edit/View plus a date
        // and document description. The document test is intentionally permissive
        // so localized/custom document labels do not break extraction.
        return hasDate && (hasDocument || hasEditView);
    }

    extractTransactions(table) {
        const transactions = [];
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach(tr => {
            const td = [...tr.querySelectorAll("td")];
            if (!this.isTransactionRow(tr)) return;

            // Current Manager layout: Edit, View, Date, Document, Contact,
            // currency/amount columns, Description, ..., Amount, ..., Balance.
            // Keep the established 12-column mapping when available.
            if (td.length < 12) return;

            const date = this.clean(td[2]);
            const documentText = this.clean(td[3]);
            const contact = this.clean(td[4]);
            const description = this.clean(td[6]);
            const amountText = this.clean(td[9]);
            const balanceText = this.clean(td[11]);
            const document = this.parseDocument(documentText);

            transactions.push({
                date,
                documentType: document.type,
                documentNumber: document.number,
                description,
                contact,
                amount: this.parseAmount(amountText),
                balance: this.parseBalance(balanceText)
            });
        });

        return transactions;
    }

    extractFinalBalance(doc, transactionTable) {
        const footerRows = [...transactionTable.querySelectorAll("tfoot tr")];
        for (const tr of footerRows) {
            const result = this.parseBalanceAmount(this.clean(tr));
            if (result !== null) return result;
        }

        let current = transactionTable;
        for (let i = 0; i < 10; i++) {
            current = current.nextElementSibling;
            if (!current) break;
            const result = this.findBalanceInElement(current);
            if (result !== null) return result;
        }

        let parent = transactionTable.parentElement;
        for (let level = 0; level < 5 && parent; level++) {
            const result = this.findBalanceInElement(parent, transactionTable);
            if (result !== null) return result;
            parent = parent.parentElement;
        }

        const allElements = [...doc.querySelectorAll("*")];
        for (const element of allElements) {
            if (element.closest("tbody tr")) continue;
            const text = this.clean(element);
            if (!this.isPureMoneyText(text)) continue;
            const childMoney = [...element.children].some(child => this.isPureMoneyText(this.clean(child)));
            if (childMoney) continue;
            const result = this.parseBalanceAmount(text);
            if (result !== null) return result;
        }

        return null;
    }

    findBalanceInElement(element, transactionTable = null) {
        if (!element) return null;
        const elements = [element, ...element.querySelectorAll("*")];

        for (const child of elements) {
            if (transactionTable && (child === transactionTable || transactionTable.contains(child))) continue;
            if (child.closest("tbody tr")) continue;

            const text = this.clean(child);
            if (!this.isPureMoneyText(text)) continue;

            const hasExactChild = [...child.children].some(nested => this.isPureMoneyText(this.clean(nested)));
            if (hasExactChild) continue;

            const result = this.parseBalanceAmount(text);
            if (result !== null) return result;
        }
        return null;
    }

    isPureMoneyText(text) {
        if (!text) return false;
        const pattern = /^(?:AED|SAR|USD|EUR|GBP|\$|€|£)?\s*-?\d[\d,]*(?:\.\d+)?\s*(?:Dr|Cr)?$/i;
        return pattern.test(text.trim());
    }

    parseBalanceAmount(text) {
        if (!text || !this.isPureMoneyText(String(text).replace(/\s+/g, " ").trim())) return null;
        const cleanText = String(text).replace(/\s+/g, " ").trim();
        const amount = this.parseAmount(cleanText);
        if (!Number.isFinite(amount)) return null;

        let side = "";
        if (/\bDr\b/i.test(cleanText)) side = "debit";
        else if (/\bCr\b/i.test(cleanText)) side = "credit";

        return { value: amount, side };
    }

    parseDocument(text) {
        if (!text) return { type: "", number: "" };
        const parts = text.split("—").map(x => x.trim()).filter(Boolean);
        return { type: parts[0] || "", number: parts[1] || "" };
    }

    parseAmount(text) {
        if (!text) return 0;
        const cleaned = String(text).replace(/,/g, "").replace(/[^\d.-]/g, "");
        const number = parseFloat(cleaned);
        return isNaN(number) ? 0 : number;
    }

    parseBalance(text) {
        if (!text) return { value: 0, side: "" };
        let side = "";
        if (/\bDr\b/i.test(text)) side = "debit";
        else if (/\bCr\b/i.test(text)) side = "credit";
        return { value: this.parseAmount(text), side };
    }

    clean(element) {
        if (!element) return "";
        return (element.innerText || element.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
    }
}

const extractor = new EntryExtractor();
