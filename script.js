const output = document.getElementById("output");


function extractTransactions(html) {

    const doc =
        new DOMParser().parseFromString(
            html,
            "text/html"
        );

    const table =
        doc.querySelector("table");

    if (!table)
        return null;

    return table.outerHTML;
}


/*
 * Convert money text into a number.
 *
 * Examples:
 * 25,000.00
 * AED 25,000.00
 * 25,000.00 Dr
 * 25,000.00 Cr
 */
function parseMoney(value) {

    if (
        value === null ||
        value === undefined
    )
        return 0;

    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/[^\d.\-]/g, "");

    const number =
        parseFloat(cleaned);

    return Number.isNaN(number)
        ? 0
        : number;
}


/*
 * Convert transaction balance into
 * a signed number.
 *
 * Debit  = positive
 * Credit = negative
 */
function parseSignedBalance(value) {

    if (
        value === null ||
        value === undefined
    )
        return 0;

    const text =
        String(value).toLowerCase();

    const amount =
        parseMoney(value);

    if (text.includes("cr"))
        return -amount;

    return amount;
}


/*
 * Balance Sheet balance.
 *
 * Debit  = positive
 * Credit = negative
 */
function getBalanceSheetBalance(account) {

    const debit =
        parseMoney(account.debit);

    const credit =
        parseMoney(account.credit);

    return debit - credit;
}


/*
 * Convert Manager date:
 *
 * DD-MM-YYYY
 *
 * into timestamp.
 */
function parseTransactionDate(value) {

    if (!value)
        return 0;

    const text =
        String(value).trim();

    const match =
        text.match(
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        );

    if (match) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const year =
            Number(match[3]);

        return new Date(
            year,
            month,
            day
        ).getTime();
    }

    const timestamp =
        Date.parse(text);

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


/*
 * Find the latest transaction
 * by date.
 */
function getLatestTransaction(
    transactions
) {

    if (
        !Array.isArray(transactions) ||
        transactions.length === 0
    )
        return null;


    let latest =
        transactions[0];

    let latestTime =
        parseTransactionDate(
            latest.date
        );


    for (
        const transaction
        of transactions
    ) {

        const time =
            parseTransactionDate(
                transaction.date
            );


        if (time > latestTime) {

            latest =
                transaction;

            latestTime =
                time;
        }
    }


    return latest;
}


/*
 * Compare Balance Sheet balance
 * with latest transaction balance.
 */
function checkBalance(
    account,
    finalBalance,
    hasTransactionLedger,
    accountDetailBalance,
    hasAccountDetailBalance
) {

    const balanceSheetBalance =
        getBalanceSheetBalance(account);

    if (!hasTransactionLedger) {

        if (
            hasAccountDetailBalance &&
            accountDetailBalance &&
            Number.isFinite(Number(accountDetailBalance.value))
        ) {
            const comparedBalance = Number(accountDetailBalance.value);
            const difference = balanceSheetBalance - comparedBalance;

            return {
                available: true,
                balanceSheetBalance,
                transactionBalance: comparedBalance,
                comparedBalance,
                balanceSource: "account-detail",
                difference,
                matches: Math.abs(difference) < 0.01,
                transaction: null
            };
        }

        return {
            available: false,
            balanceSheetBalance,
            transactionBalance: null,
            comparedBalance: null,
            balanceSource: "none",
            difference: null,
            matches: null,
            transaction: null,
            reason: "No transaction ledger or account-detail balance was available for comparison."
        };
    }

    if (!finalBalance || finalBalance.value === undefined) {
        return {
            available: false,
            balanceSheetBalance,
            transactionBalance: null,
            comparedBalance: null,
            balanceSource: "transaction-ledger",
            difference: null,
            matches: null,
            transaction: null,
            reason: "Transaction ledger found, but final balance could not be extracted."
        };
    }

    const transactionBalance = Number(finalBalance.value) || 0;
    const difference = balanceSheetBalance - transactionBalance;

    return {
        available: true,
        balanceSheetBalance,
        transactionBalance,
        comparedBalance: transactionBalance,
        balanceSource: "transaction-ledger",
        difference,
        matches: Math.abs(difference) < 0.01,
        transaction: null
    };
}

/*
 * Format amount for display.
 */
function formatMoney(value) {

    if (
        value === null ||
        value === undefined
    )
        return "-";


    return Number(value)
        .toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,

                maximumFractionDigits: 2
            }
        );
}


/*
 * Render Balance Check.
 */
function renderBalanceCheck(check) {

    if (!check.available) {

        return `

            <div style="
                margin-bottom:16px;
                padding:16px;
                border:1px solid #ddd;
                border-radius:6px;
            ">

                <h3>
                    Balance Check
                </h3>

                <p>
                    No transaction balance
                    was available for comparison.
                </p>

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

                    <strong>
                        Balance Sheet:
                    </strong>

                    ${formatMoney(
                        check.balanceSheetBalance
                    )}

                </p>


                <p>

                    <strong>
                        ${
                            check.balanceSource === "account-detail"
                                ? "Account Detail Balance:"
                                : "Latest Transaction Balance:"
                        }
                    </strong>

                    ${formatMoney(
                        check.transactionBalance
                    )}

                </p>


                <p>

                    <strong>
                        Difference:
                    </strong>

                    0.00

                </p>


                <p>

                    <strong>
                        Source:
                    </strong>

                    ${
                        check.balanceSource === "account-detail"
                            ? "Account Detail"
                            : (check.transaction?.date || "-")
                    }

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

                <strong>
                    Balance Sheet:
                </strong>

                ${formatMoney(
                    check.balanceSheetBalance
                )}

            </p>


            <p>

                <strong>
                    ${
                        check.balanceSource === "account-detail"
                            ? "Account Detail Balance:"
                            : "Latest Transaction Balance:"
                    }
                </strong>

                ${formatMoney(
                    check.transactionBalance
                )}

            </p>


            <p>

                <strong>
                    Difference:
                </strong>

                ${formatMoney(
                    check.difference
                )}

            </p>


            <p>

                <strong>
                    Source:
                </strong>

                ${
                    check.balanceSource === "account-detail"
                        ? "Account Detail"
                        : (check.transaction?.date || "-")
                }

            </p>

        </div>

    `;
}


async function start() {


    /*
     * Remove old static containers
     * that may still exist in index.html.
     */

    document
        .getElementById(
            "transactions"
        )
        ?.remove();


    document
        .getElementById(
            "analysis"
        )
        ?.remove();


    output.innerHTML =
        "<p>Loading Trial Balance...</p>";


    try {


        const report =
            await reports
                .getTrialBalanceReport();


        const response =
            await manager
                .getTrialBalanceView(
                    report.item.key
                );


        if (
            response.status !== 200
        )

            throw new Error(
                "Failed to load Trial Balance View"
            );


        const view =
            response.body;


        const flatRows = [];


        function collectRows(node) {

            if (
                !node ||
                !Array.isArray(
                    node.items
                )
            )
                return;


            for (
                const row
                of node.items
            ) {


                if (row.cells)
                    flatRows.push(row);


                if (row.rows)
                    collectRows(
                        row.rows
                    );

            }

        }


        collectRows(
            view.rows
        );


        const accounts =
            flatRows.map(
                row => {

                    const cells =
                        row.cells || [];


                    return {

                        account:
                            row.displayName ||
                            "",


                        debit:
                            cells[0]?.text ||
                            "",


                        credit:
                            cells[1]?.text ||
                            "",


                        debitLink:
                            cells[0]?.link?.href ||
                            "",


                        creditLink:
                            cells[1]?.link?.href ||
                            ""

                    };

                }
            );


        let html = `

            <h2>
                Trial Balance
            </h2>


            <table>

                <thead>

                    <tr>

                        <th>
                            Account
                        </th>


                        <th>
                            Debit
                        </th>


                        <th>
                            Credit
                        </th>

                    </tr>

                </thead>


                <tbody>

        `;


        for (
            const a
            of accounts
        ) {


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
                    Select an amount
                    to load transactions.
                </p>

            </div>


            <hr>


            <h2>
                Account Being Audited
            </h2>


            <div id="account-audited">

                <p>
                    Select an account
                    to audit.
                </p>

            </div>


            <hr>


            <h2>
                Audit Findings
            </h2>


            <div id="analysis">

                <p>
                    Select an account
                    to audit.
                </p>

            </div>

        `;


        output.innerHTML =
            html;


        output
            .querySelectorAll(
                "a[data-link]"
            )
            .forEach(
                link => {


                    link.onclick =
                        async e => {

                            e.preventDefault();


                            const box =
                                document
                                    .getElementById(
                                        "transactions"
                                    );


                            const accountBox =
                                document
                                    .getElementById(
                                        "account-audited"
                                    );


                            const analysis =
                                document
                                    .getElementById(
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
                                 * Selected account
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


const balanceCheck =
    checkBalance(
    account,
    extracted.finalBalance,
    extracted.hasTransactionLedger,
    extracted.accountDetailBalance,
    extracted.hasAccountDetailBalance
);


                                /*
                                 * Account information
                                 */

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
                                                account
                                                    .transactions
                                                    .length,


                                            balanceSheetBalance:
                                                balanceCheck
                                                    .balanceSheetBalance,


                                            balanceSource:
                                                balanceCheck
                                                    .balanceSource || "none",

                                            comparedBalance:
                                                balanceCheck
                                                    .comparedBalance,


                                            difference:
                                                balanceCheck
                                                    .difference,


                                            balanceMatches:
                                                balanceCheck
                                                    .matches

                                        },

                                        null,

                                        4

                                    )}</pre>

                                `;


                                /*
                                 * Existing audit engine
                                 */

                                const findings =
                                    audit.analyze(
                                        account
                                    );


                                /*
                                 * Show Balance Check
                                 * + existing findings
                                 */

                                analysis.innerHTML =

                                    renderBalanceCheck(
                                        balanceCheck
                                    )

                                    +

                                    audit.render(
                                        findings
                                    );


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


                                box.innerHTML =
                                    table;

                            }


                            catch (err) {

                                console.error(
                                    err
                                );


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

                }
            );

    }


    catch (e) {

        console.error(
            e
        );


        output.textContent =
            e.stack ||
            e.message;

    }

}


start();