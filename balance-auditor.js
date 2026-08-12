// balance-auditor.js
// Account-level audit rules. Receives normalized account + transaction data.

class BalanceAuditor {

    analyze(account) {
        const findings = [];

        if (!account) {
            return findings;
        }

        const transactions = Array.isArray(account.transactions)
            ? account.transactions.filter(Boolean)
            : [];

        const balance = this.balance(account);

        this.checkSuspenseOrClearing(account, balance, findings);
        this.checkReceivableCredit(account, balance, findings);
        this.checkPayableDebit(account, balance, findings);
        this.checkOldBalance(account, balance, transactions, findings);
        this.checkInactiveAccount(account, balance, transactions, findings);
        this.checkDuplicateTransactions(transactions, findings);
        this.checkRepeatedAmounts(transactions, findings);
        this.checkTinyTransactions(transactions, findings);
        this.checkUnexpectedDocumentTypes(account, transactions, findings);
        this.checkFixedAssetActivity(account, transactions, findings);
        this.checkCapitalActivity(account, transactions, findings);
        this.checkAbnormalMovement(account, balance, transactions, findings);

        return findings;
    }

    balance(account) {
        const debit = this.number(account.debit);
        const credit = this.number(account.credit);
        return debit - credit;
    }

    number(value) {
        if (value === null || value === undefined || value === "") return 0;
        const n = Number(String(value).replace(/,/g, "").replace(/[^\d.-]/g, ""));
        return Number.isFinite(n) ? n : 0;
    }

    amount(transaction) {
        if (!transaction) return 0;
        return Math.abs(this.number(
            transaction.amount?.value !== undefined
                ? transaction.amount.value
                : transaction.amount
        ));
    }

    date(transaction) {
        const value = transaction?.date;
        if (!value) return 0;

        const text = String(value).trim();
        const match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
        if (match) {
            return new Date(
                Number(match[3]),
                Number(match[2]) - 1,
                Number(match[1])
            ).getTime();
        }

        const parsed = Date.parse(text);
        return Number.isNaN(parsed) ? 0 : parsed;
    }

    finding(severity, code, title, description, recommendation, confidence, evidence = []) {
        return {
            severity,
            code,
            title,
            description,
            recommendation,
            confidence,
            evidence
        };
    }

    checkSuspenseOrClearing(account, balance, findings) {
        const name = this.name(account);
        if (!/(suspense|clearing)/i.test(name)) return;
        if (Math.abs(balance) < 0.01) return;

        findings.push(this.finding(
            "high",
            "SUSPENSE_OR_CLEARING_BALANCE",
            `${name} has a remaining balance`,
            `The ${name} account has a non-zero balance of ${this.money(balance)}. Suspense and clearing accounts normally require the underlying item to be identified and cleared.`,
            "Review the outstanding transactions and identify the original accounting item before leaving the balance unresolved.",
            0.98,
            [{ account: name, balance }]
        ));
    }

    checkReceivableCredit(account, balance, findings) {
        if (!/(receivable|accounts receivable|trade receivable|customer)/i.test(this.name(account))) return;
        if (balance >= -0.01) return;

        findings.push(this.finding(
            "high",
            "RECEIVABLE_CREDIT_BALANCE",
            "Receivable has a credit balance",
            `The account has a credit balance of ${this.money(balance)}. A credit balance in receivables may indicate an overpayment, credit note, advance, or posting to the wrong account.`,
            "Review the customers and the transactions producing the credit balance. Confirm whether it is a genuine customer advance/overpayment or a posting error.",
            0.93,
            [{ account: this.name(account), balance }]
        ));
    }

    checkPayableDebit(account, balance, findings) {
        if (!/(payable|accounts payable|trade payable|supplier|vendor)/i.test(this.name(account))) return;
        if (balance <= 0.01) return;

        findings.push(this.finding(
            "high",
            "PAYABLE_DEBIT_BALANCE",
            "Payable has a debit balance",
            `The account has a debit balance of ${this.money(balance)}. A debit balance in payables may indicate an advance payment, supplier overpayment, or incorrect posting.`,
            "Review the supplier balances and the transactions producing the debit balance. Confirm whether the amount represents a genuine advance or a posting error.",
            0.93,
            [{ account: this.name(account), balance }]
        ));
    }

    checkOldBalance(account, balance, transactions, findings) {
        if (Math.abs(balance) < 0.01 || transactions.length === 0) return;

        const dates = transactions.map(t => this.date(t)).filter(Boolean);
        if (!dates.length) return;

        const latest = Math.max(...dates);
        const ageDays = Math.floor((Date.now() - latest) / 86400000);
        if (ageDays < 365) return;

        findings.push(this.finding(
            "medium",
            "VERY_OLD_BALANCE",
            "Balance appears very old",
            `The account still carries ${this.money(balance)}, while the latest available transaction is approximately ${ageDays} days old.`,
            "Review the outstanding balance and determine whether it should be settled, reclassified, impaired, or cleared.",
            0.88,
            [{ account: this.name(account), balance, ageDays }]
        ));
    }

    checkInactiveAccount(account, balance, transactions, findings) {
        if (Math.abs(balance) < 0.01 || transactions.length === 0) return;

        const dates = transactions.map(t => this.date(t)).filter(Boolean);
        if (!dates.length) return;

        const latest = Math.max(...dates);
        const ageDays = Math.floor((Date.now() - latest) / 86400000);
        if (ageDays < 180 || ageDays >= 365) return;

        findings.push(this.finding(
            "low",
            "INACTIVE_BALANCE_SHEET_ACCOUNT",
            "Account has been inactive for an extended period",
            `The account has a non-zero balance of ${this.money(balance)} and no transaction has been recorded for approximately ${ageDays} days.`,
            "Confirm that the balance is still valid and that the account has not become obsolete or incorrectly classified.",
            0.79,
            [{ account: this.name(account), balance, ageDays }]
        ));
    }

    checkDuplicateTransactions(transactions, findings) {
        if (transactions.length < 2) return;

        const groups = new Map();

        const normalize = (value) => String(value ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();

        for (const t of transactions) {
            const key = [
                normalize(t.date),
                normalize(t.documentType),
                normalize(t.documentNumber),
                this.amount(t).toFixed(2),
                normalize(t.description)
            ].join("|");

            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(t);
        }

        const duplicateGroups = [...groups.values()]
            .filter(group => group.length >= 2);

        if (!duplicateGroups.length) return;

        const duplicateTransactionCount = duplicateGroups
            .reduce((total, group) => total + group.length, 0);

        const groupsWithDocumentNumber = duplicateGroups.filter(group =>
            group.some(t => String(t.documentNumber || "").trim() !== "")
        );

        const severity = groupsWithDocumentNumber.length > 0 ? "high" : "medium";
        const confidence = groupsWithDocumentNumber.length > 0 ? 0.91 : 0.76;

        // Keep all duplicate groups in one finding. The previous implementation
        // rendered one card per group, which made the audit page look as if the
        // same problem had been detected repeatedly. Evidence remains grouped
        // so the reviewer can still inspect each matching set.
        const evidence = duplicateGroups.map((group, index) => ({
            group: index + 1,
            count: group.length,
            transactions: group.slice(0, 10)
        }));

        findings.push(this.finding(
            severity,
            "DUPLICATE_TRANSACTIONS",
            "Potential duplicate transactions detected",
            `${duplicateGroups.length} duplicate group${duplicateGroups.length === 1 ? "" : "s"} involving ${duplicateTransactionCount} transactions have identical date, amount, description and document details.`,
            "Review each duplicate group below and confirm whether the repeated postings represent separate accounting events or duplicate/template-based entries.",
            confidence,
            evidence
        ));
    }

    checkRepeatedAmounts(transactions, findings) {
        if (transactions.length < 5) return;

        const groups = new Map();
        for (const t of transactions) {
            const amount = this.amount(t);
            if (amount <= 0) continue;
            const key = amount.toFixed(2);
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(t);
        }

        const amounts = transactions.map(t => this.amount(t)).filter(a => a > 0);
        if (!amounts.length) return;

        const maxAmount = Math.max(...amounts);

        // A repeated amount is only interesting when it is materially large
        // for this account. Small recurring amounts (for example AED 1,000)
        // are usually normal operational activity and otherwise create noisy
        // audit findings.
        const repeated = [...groups.entries()]
            .filter(([, group]) => group.length >= 4)
            .filter(([amount]) => Number(amount) >= maxAmount * 0.05)
            .sort((a, b) => b[1].length - a[1].length)
            .slice(0, 3);

        for (const [amount, group] of repeated) {
            const distinctDates = new Set(group.map(t => String(t.date || '').trim()).filter(Boolean)).size;

            findings.push(this.finding(
                "low",
                "REPEATED_UNUSUAL_AMOUNT",
                "Repeated material transaction amount",
                `The amount ${this.money(Number(amount))} appears ${group.length} times across ${distinctDates || group.length} transaction date${(distinctDates || group.length) === 1 ? "" : "s"}. Because this amount is material relative to the account's largest transaction, the repetition deserves review.`,
                "Confirm that the repeated material amount represents genuine recurring transactions and is not caused by duplicate, template-based, or incorrectly posted entries.",
                0.72,
                group.slice(0, 8)
            ));
        }
    }

    checkTinyTransactions(transactions, findings) {
        if (transactions.length < 10) return;

        const amounts = transactions.map(t => this.amount(t)).filter(a => a > 0);
        if (!amounts.length) return;

        const max = Math.max(...amounts);
        if (max <= 0) return;

        const tiny = transactions.filter(t => {
            const amount = this.amount(t);
            return amount > 0 && amount <= max * 0.01;
        });

        // This rule is intended for genuine fragmentation/noise, not for an
        // account that simply has many smaller operational postings. Require
        // both a high population share and a meaningful share of total value.
        if (tiny.length < 15 || tiny.length / transactions.length < 0.70) return;

        const totalValue = amounts.reduce((sum, value) => sum + value, 0);
        const tinyValue = tiny.reduce((sum, t) => sum + this.amount(t), 0);
        const tinyValueRatio = totalValue > 0 ? tinyValue / totalValue : 0;

        // A tiny-value population representing only a negligible portion of
        // total activity is not useful as an audit alert.
        if (tinyValueRatio < 0.05) return;

        findings.push(this.finding(
            "low",
            "LARGE_NUMBER_OF_TINY_TRANSACTIONS",
            "Large number of low-value transactions",
            `${tiny.length} of ${transactions.length} transactions are at or below 1% of the largest transaction amount, while together representing only ${(tinyValueRatio * 100).toFixed(2)}% of total transaction value.`,
            "Review whether these low-value entries are expected operational activity or whether they indicate excessive fragmentation, posting noise, or inappropriate use of the account.",
            0.71,
            tiny.slice(0, 8)
        ));
    }

    checkUnexpectedDocumentTypes(account, transactions, findings) {
        if (transactions.length < 3) return;

        const category = this.category(this.name(account));
        const expected = {
            cash: /receipt|payment|transfer|journal/i,
            bank: /receipt|payment|transfer|journal|deposit|withdrawal/i,
            receivable: /sales invoice|receipt|credit note|journal|payment/i,
            payable: /purchase invoice|payment|debit note|journal|receipt/i,
            inventory: /sales invoice|purchase invoice|credit note|debit note|inventory|journal/i,
            fixedAsset: /purchase invoice|payment|receipt|journal|asset|disposal/i,
            capital: /capital|journal|receipt|payment|transfer/i
        }[category];

        if (!expected) return;

        const unexpected = transactions.filter(t => {
            const type = String(t.documentType || "").trim();
            return type && !expected.test(type);
        });

        if (!unexpected.length) return;

        const ratio = unexpected.length / transactions.length;
        if (ratio < 0.34 && unexpected.length < 3) return;

        const typeCounts = new Map();
        for (const t of unexpected) {
            const type = String(t.documentType || "").trim() || "(blank)";
            typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        }

        const typeSummary = [...typeCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => `${type} (${count})`)
            .join(", ");

        // A transfer document posted directly to a receivable/payable account
        // is materially more concerning than a generic unexpected document.
        // In Manager, an Inter Account Transfer is normally associated with
        // movement between cash/bank accounts. Treat a repeated occurrence on
        // a receivable/payable account as a high-priority classification signal.
        const transferTypeOnly = [...typeCounts.keys()].length === 1 &&
            /^inter\s+account\s+transfer$/i.test([...typeCounts.keys()][0]);
        // Inter Account Transfer is a legitimate Manager document type.
        // Its presence on a receivable/payable account is a review signal,
        // not proof of a misclassification. Let the AI inspect the actual
        // transaction context before escalating it.
        const highPriority = false;

        // Detect overlap with the duplicate rule so the reviewer understands
        // when the same entries are triggering two independent audit signals.
        const duplicateKeys = new Set();
        const normalize = (value) => String(value ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .toLowerCase();
        for (const t of transactions) {
            const key = [
                normalize(t.date),
                normalize(t.documentType),
                normalize(t.documentNumber),
                this.amount(t).toFixed(2),
                normalize(t.description)
            ].join("|");
            if (!duplicateKeys.has(key)) {
                duplicateKeys.add(key);
            }
        }

        const duplicateGroupKeys = new Map();
        for (const t of transactions) {
            const key = [
                normalize(t.date),
                normalize(t.documentType),
                normalize(t.documentNumber),
                this.amount(t).toFixed(2),
                normalize(t.description)
            ].join("|");
            duplicateGroupKeys.set(key, (duplicateGroupKeys.get(key) || 0) + 1);
        }
        const overlappingUnexpected = unexpected.filter(t => {
            const key = [
                normalize(t.date),
                normalize(t.documentType),
                normalize(t.documentNumber),
                this.amount(t).toFixed(2),
                normalize(t.description)
            ].join("|");
            return (duplicateGroupKeys.get(key) || 0) >= 2;
        }).length;

        let description = `${unexpected.length} of ${transactions.length} transactions use document types that are not normally expected for a ${category} account. Detected types: ${typeSummary}.`;

        if (transferTypeOnly && (category === "receivable" || category === "payable")) {
            description += ` All ${unexpected.length} entries are Inter Account Transfer postings on this ${category} account. This is a classification review signal, not a confirmed error; the AI should inspect the underlying posting context before escalating it.`;
        }

        if (overlappingUnexpected > 0) {
            description += ` ${overlappingUnexpected} of these entries also belong to duplicate transaction groups, so the two findings may relate to the same underlying postings.`;
        }

        findings.push(this.finding(
            highPriority ? "high" : "medium",
            "UNEXPECTED_DOCUMENT_TYPES",
            highPriority ? "Inter-account transfers posted to a receivable/payable account" : "Unexpected document type activity",
            description,
            highPriority
                ? "Review these Inter Account Transfer postings first. Confirm why they are posted to the receivable/payable account and whether they should instead be recorded in a cash, bank, clearing, or other appropriate account. Also review the duplicate groups before making corrections."
                : "Review the highlighted entries and confirm that the document type and account classification are appropriate. This is a review signal, not proof of an error.",
            highPriority ? 0.88 : 0.71,
            unexpected.slice(0, 8)
        ));
    }

    checkFixedAssetActivity(account, transactions, findings) {
        if (!/fixed asset|property|plant|equipment|vehicle|furniture/i.test(this.name(account))) return;
        if (transactions.length < 5) return;

        if (transactions.length < 5) return;

        findings.push(this.finding(
            "medium",
            "FIXED_ASSET_OPERATIONAL_ACTIVITY",
            "Fixed asset account has frequent postings",
            `The fixed-asset-type account contains ${transactions.length} transactions in the loaded history. Frequent operational postings may indicate that operating expenses are being posted directly to the asset account.`,
            "Review the transaction descriptions and document types. Confirm that only capitalizable costs and valid asset movements are posted here.",
            0.73,
            transactions.slice(-8)
        ));
    }

    checkCapitalActivity(account, transactions, findings) {
        if (!/capital|share capital|owner.?s equity|equity contribution/i.test(this.name(account))) return;
        if (transactions.length < 4) return;

        findings.push(this.finding(
            "medium",
            "FREQUENT_CAPITAL_MOVEMENT",
            "Capital account changes frequently",
            `The capital/equity account contains ${transactions.length} transactions in the loaded history. Frequent changes may require confirmation of the underlying owner or shareholder transactions.`,
            "Review the capital entries and supporting documents to confirm that each movement represents a genuine contribution, withdrawal, distribution, or approved equity transaction.",
            0.72,
            transactions.slice(-8)
        ));
    }

    checkAbnormalMovement(account, balance, transactions, findings) {
        if (transactions.length < 6) return;

        const balances = transactions
            .map(t => this.signedBalance(t.balance))
            .filter(v => Number.isFinite(v));

        if (balances.length < 6) return;

        let directionChanges = 0;
        for (let i = 1; i < balances.length; i++) {
            const previous = balances[i - 1];
            const current = balances[i];
            if (previous === 0 || current === 0) continue;
            if ((previous > 0 && current < 0) || (previous < 0 && current > 0)) {
                directionChanges++;
            }
        }

        if (directionChanges < 3) return;

        findings.push(this.finding(
            "low",
            "ABNORMAL_MOVEMENT_PATTERN",
            "Abnormal balance movement pattern",
            `The running balance changes debit/credit direction ${directionChanges} times in the loaded transaction history.`,
            "Review the transactions around the direction changes and confirm that the account is being used consistently.",
            0.67,
            transactions.slice(-10)
        ));
    }

    category(name) {
        if (/receivable|customer/i.test(name)) return "receivable";
        if (/payable|supplier|vendor/i.test(name)) return "payable";
        if (/inventory|stock/i.test(name)) return "inventory";
        if (/fixed asset|property|plant|equipment|vehicle|furniture/i.test(name)) return "fixedAsset";
        if (/capital|equity contribution|owner.?s equity/i.test(name)) return "capital";
        if (/bank/i.test(name)) return "bank";
        if (/cash/i.test(name)) return "cash";
        return "other";
    }

    name(account) {
        return String(account?.name || "").trim();
    }

    signedBalance(balance) {
        if (balance && typeof balance === "object") {
            const value = this.number(balance.value);
            const side = String(balance.side || "").toLowerCase();
            if (side === "credit") return -Math.abs(value);
            return Math.abs(value);
        }
        return this.number(balance);
    }

    money(value) {
        return Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

const balanceAuditor = new BalanceAuditor();
