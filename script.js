const output = document.getElementById("output");

function extractTransactions(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");

    if (!table)
        return null;

    return table.outerHTML;
}


function parseMoney(value) {
    if (value === null || value === undefined) return 0;

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[^\d.\-]/g, "");

    const number = parseFloat(cleaned);
    return Number.isNaN(number) ? 0 : number;
}

function parseSignedBalance(value) {
    if (value === null || value === undefined) return 0;

    const text = String(value).toLowerCase();
    const amount = parseMoney(value);

    return text.includes("cr") ? -amount : amount;
}

function getBalanceSheetBalance(account) {
    return parseMoney(account.debit) - parseMoney(account.credit);
}

function parseTransactionDate(value) {
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

    const timestamp = Date.parse(text);
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getLatestTransaction(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0)
        return null;

    let latest = transactions[0];
    let latestTime = parseTransactionDate(latest.date);

    for (const transaction of transactions) {
        const time = parseTransactionDate(transaction.date);

        if (time > latestTime) {
            latest = transaction;
            latestTime = time;
        }
    }

    return latest;
}

function checkBalance(account) {
    const balanceSheetBalance = getBalanceSheetBalance(account);
    const latestTransaction = getLatestTransaction(account.transactions);

    if (!latestTransaction) {
        return {
            available: false,
            balanceSheetBalance,
            transactionBalance: null,
            difference: null,
            matches: null,
            transaction: null
        };
    }

    // Some Manager transaction pages expose transaction amounts but do NOT
    // expose a running-balance column. The extractor marks those rows with
    // balanceAvailable:false and a placeholder balance of 0. Never compare
    // that placeholder with the Balance Sheet balance.
    if (latestTransaction.balanceAvailable === false ||
        latestTransaction.balance === null ||
        latestTransaction.balance === undefined) {
        return {
            available: false,
            balanceSheetBalance,
            transactionBalance: null,
            difference: null,
            matches: null,
            transaction: latestTransaction
        };
    }

    const transactionBalance =
        parseSignedBalance(latestTransaction.balance);

    const difference =
        balanceSheetBalance - transactionBalance;

    return {
        available: true,
        balanceSheetBalance,
        transactionBalance,
        difference,
        matches: Math.abs(difference) < 0.01,
        transaction: latestTransaction
    };
}

function formatMoney(value) {
    if (value === null || value === undefined) return "-";

    return Number(value).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function renderBalanceCheck(check) {
    if (!check.available) {
        return `
            <div style="
                margin-bottom:16px;
                padding:16px;
                border:1px solid #ddd;
                border-radius:6px;
            ">
                <h3>Balance Check</h3>
                <p>No transaction balance was available for comparison.</p>
            </div>
        `;
    }

    if (check.matches) {
        return `
            <div style="
                margin-bottom:16px;
                padding:16px;
                border:1px solid #c8e6c9;
                border-radius:6px;
            ">
                <h3 style="color:#2e7d32;">
                    ✓ Balance Matches
                </h3>

                <p>
                    <strong>Balance Sheet:</strong>
                    ${formatMoney(check.balanceSheetBalance)}
                </p>

                <p>
                    <strong>Latest Transaction Balance:</strong>
                    ${formatMoney(check.transactionBalance)}
                </p>

                <p>
                    <strong>Difference:</strong>
                    0.00
                </p>

                <p>
                    <strong>Latest Transaction:</strong>
                    ${check.transaction.date || "-"}
                </p>
            </div>
        `;
    }

    return `
        <div style="
            margin-bottom:16px;
            padding:16px;
            border:1px solid #f0c36d;
            border-radius:6px;
        ">
            <h3 style="color:#c65d00;">
                ⚠ Balance Difference Detected
            </h3>

            <p>
                <strong>Balance Sheet:</strong>
                ${formatMoney(check.balanceSheetBalance)}
            </p>

            <p>
                <strong>Latest Transaction Balance:</strong>
                ${formatMoney(check.transactionBalance)}
            </p>

            <p>
                <strong>Difference:</strong>
                ${formatMoney(check.difference)}
            </p>

            <p>
                <strong>Latest Transaction:</strong>
                ${check.transaction.date || "-"}
            </p>
        </div>
    `;
}


async function start() {

    // Remove old static containers from index.html
    document.getElementById("transactions")?.remove();
    document.getElementById("analysis")?.remove();

    output.innerHTML = "<p>Loading Trial Balance...</p>";

    // باقي الكود...

    try {

        const report =
            await reports.getTrialBalanceReport();

        const response =
            await manager.getTrialBalanceView(
                report.item.key
            );

        if (response.status !== 200)
            throw new Error(
                "Failed to load Trial Balance View"
            );

        const view = response.body;

        const flatRows = [];

        function collectRows(node) {

            if (
                !node ||
                !Array.isArray(node.items)
            )
                return;

            for (const row of node.items) {

                if (row.cells)
                    flatRows.push(row);

                if (row.rows)
                    collectRows(row.rows);
            }
        }

        collectRows(view.rows);

        const accounts = flatRows.map(row => {

            const cells = row.cells || [];

            return {

                account:
                    row.displayName || "",

                debit:
                    cells[0]?.text || "",

                credit:
                    cells[1]?.text || "",

                debitLink:
                    cells[0]?.link?.href || "",

                creditLink:
                    cells[1]?.link?.href || ""

            };
        });


        let html = `

            <h2>
                Trial Balance
            </h2>

            <table>

                <thead>

                    <tr>

                        <th>Account</th>
                        <th>Debit</th>
                        <th>Credit</th>

                    </tr>

                </thead>

                <tbody>

        `;


        for (const a of accounts) {

            html += `

                <tr>

                    <td>
                        ${a.account}
                    </td>

                    <td>

                        ${
                            a.debitLink

                            ?

                            `
                            <a
                                href="#"
                                data-link="${a.debitLink}"
                                data-account="${a.account}"
                                data-debit="${a.debit}"
                                data-credit="${a.credit}"
                            >
                                ${a.debit}
                            </a>
                            `

                            :

                            a.debit
                        }

                    </td>

                    <td>

                        ${
                            a.creditLink

                            ?

                            `
                            <a
                                href="#"
                                data-link="${a.creditLink}"
                                data-account="${a.account}"
                                data-debit="${a.debit}"
                                data-credit="${a.credit}"
                            >
                                ${a.credit}
                            </a>
                            `

                            :

                            a.credit
                        }

                    </td>

                </tr>

            `;
        }


        html += `

                </tbody>

            </table>

            <hr>

            <h2>
                Transactions
            </h2>

            <div id="transactions">

                <p>
                    Select an amount to load transactions.
                </p>

            </div>

            <hr>

            <h2>
                Account Being Audited
            </h2>

            <div id="account-audited">

                <p>
                    Select an account to audit.
                </p>

            </div>

            <hr>

            <h2>
                Audit Findings
            </h2>

            <div id="analysis">

                <p>
                    Select an account to audit.
                </p>

            </div>

        `;


        output.innerHTML = html;


        output
            .querySelectorAll("a[data-link]")
            .forEach(link => {

                link.onclick = async e => {

                    e.preventDefault();

                    const box =
                        document.getElementById(
                            "transactions"
                        );

                    const accountBox =
                        document.getElementById(
                            "account-audited"
                        );

                    const analysis =
                        document.getElementById(
                            "analysis"
                        );


                    box.innerHTML =
                        "<p>Loading transactions...</p>";

                    accountBox.innerHTML =
                        "<p>Loading account...</p>";

                    analysis.innerHTML =
                        "<p>Analyzing account...</p>";


                    try {

                        /*
                         * Selected Balance Sheet account
                         */

                        const account = {

                            name:
                                link.dataset.account,

                            debit:
                                link.dataset.debit,

                            credit:
                                link.dataset.credit,

                            transactions: []

                        };


                        /*
                         * Load transactions
                         */

                        const response =
                            await manager
                                .trialBalanceTransactions(
                                    link.dataset.link
                                );


                        /*
                         * Extract transactions
                         */

                        const extracted =
                            extractor.extract(
                                response.body
                            );


                        account.transactions =
                            extracted.transactions || [];

                        console.groupCollapsed("[Manager AI] Transaction extraction");
                        console.log("hasTransactionLedger:", extracted.hasTransactionLedger);
                        console.log("transactionCount:", account.transactions.length);
                        console.log("finalBalance:", extracted.finalBalance);
                        console.log("transactions:", account.transactions);
                        console.groupEnd();


                        /*
                         * Account information
                         */

                        const balanceCheck =
                            checkBalance(account);

                        accountBox.innerHTML = `
                            <pre>${JSON.stringify(
                                {
                                    name:
                                        account.name,

                                    debit:
                                        account.debit,

                                    credit:
                                        account.credit,

                                    transactionCount:
                                        account.transactions.length,

                                    balanceSheetBalance:
                                        balanceCheck.balanceSheetBalance,

                                    latestTransactionBalance:
                                        balanceCheck.transactionBalance,

                                    difference:
                                        balanceCheck.difference,

                                    balanceMatches:
                                        balanceCheck.matches
                                },
                                null,
                                4
                            )}</pre>
                        `;


                        /*
                         * Audit
                         */

                        const findings =
                            account.transactions.length === 0
                            ? [{
                                severity: "INFO",
                                title: "Transaction ledger not extracted",
                                description: "The selected account returned no recognizable transaction rows. Audit rules were not evaluated because the transaction source is incomplete.",
                                recommendation: "Inspect the transaction request diagnostics in the browser Console before relying on the audit result.",
                                confidence: 100
                              }]
                            : audit.analyze(account);


                        analysis.innerHTML =
                            renderBalanceCheck(balanceCheck) +
                            `<div id="ai-audit-result"><p>AI is reviewing the full transaction ledger...</p></div>` +
                            `<details style="margin:0 0 16px 0;">
                                <summary><strong>Technical audit signals</strong> (${findings.length})</summary>
                                <div style="margin-top:10px;">${audit.render(findings)}</div>
                            </details>`;

                        const aiBox = document.getElementById("ai-audit-result");

                        try {
                            const aiResult = await aiAudit.analyze(
                                account,
                                findings,
                                balanceCheck
                            );

                            aiBox.innerHTML = aiAudit.render(aiResult);
                            console.groupCollapsed("[Manager AI] Final AI audit");
                            console.log("AI result:", aiResult);
                            console.log("Rule signals:", findings);
                            console.groupEnd();
                        } catch (aiError) {
                            console.error("[Manager AI] AI audit failed", aiError);
                            aiBox.innerHTML = `
                                <div style="margin-bottom:16px;padding:14px;border:1px solid #f0c36d;border-radius:6px;">
                                    <strong>AI analysis unavailable</strong>
                                    <p style="margin:6px 0 0;">${String(aiError.message || aiError)}</p>
                                    <p style="margin:6px 0 0;">The technical audit signals below are retained for manual review.</p>
                                </div>
                            `;
                        }


                        /*
                         * Display transactions
                         */

                        const table =
                            extractTransactions(
                                response.body
                            );


                        if (!table) {

                            box.innerHTML =
                                "<p>No transaction table found.</p>";

                            return;
                        }


                        box.innerHTML = table;

                    }


                    catch (err) {

                        console.error(err);


                        accountBox.innerHTML = `

                            <p style="color:red">

                                ${err.message}

                            </p>

                        `;


                        analysis.innerHTML = `

                            <p style="color:red">

                                ${err.message}

                            </p>

                        `;


                        box.innerHTML = `

                            <p style="color:red">

                                ${err.message}

                            </p>

                        `;

                    }

                };

            });

    }


    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;
    }
}


start();