const output =
    document.getElementById("output");


function extractTransactions(html) {

    const doc =
        new DOMParser()
            .parseFromString(
                html,
                "text/html"
            );

    const table =
        doc.querySelector("table");

    if (!table)
        return null;

    return table.outerHTML;
}


async function start() {

    output.innerHTML =
        "<p>Loading Trial Balance...</p>";

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

        const view =
            response.body;

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


        const accounts =
            flatRows.map(row => {

                const cells =
                    row.cells || [];

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


        /*
         * ------------------------------------------------
         * Main transaction / audit layout
         * ------------------------------------------------
         */

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


            <hr>


            <h2>
                Transactions
            </h2>


            <div id="transactions-secondary">

                <p>
                    Select an amount to load transactions.
                </p>

            </div>

        `;


        output.innerHTML =
            html;


        /*
         * ------------------------------------------------
         * Account links
         * ------------------------------------------------
         */

        output
            .querySelectorAll(
                "a[data-link]"
            )
            .forEach(link => {


                link.onclick =
                    async e => {

                        e.preventDefault();


                        const box =
                            document.getElementById(
                                "transactions"
                            );


                        const secondaryBox =
                            document.getElementById(
                                "transactions-secondary"
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


                        secondaryBox.innerHTML =
                            "<p>Loading transactions...</p>";


                        accountBox.innerHTML =
                            "<p>Loading account...</p>";


                        analysis.innerHTML =
                            "<p>Analyzing account...</p>";


                        try {


                            /*
                             * --------------------------------
                             * Account selected from Trial Balance
                             * --------------------------------
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
                             * --------------------------------
                             * Load transaction history
                             * --------------------------------
                             */

                            const response =
                                await manager
                                    .trialBalanceTransactions(
                                        link.dataset.link
                                    );


                            /*
                             * --------------------------------
                             * Extract transactions
                             * --------------------------------
                             */

                            const extracted =
                                extractor.extract(
                                    response.body
                                );


                            account.transactions =
                                extracted.transactions || [];


                            /*
                             * --------------------------------
                             * Display Account Being Audited
                             * --------------------------------
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
                                            account.transactions.length
                                    },
                                    null,
                                    4
                                )}</pre>

                            `;


                            /*
                             * --------------------------------
                             * Run Audit
                             * --------------------------------
                             */

                            const findings =
                                audit.analyze(
                                    account
                                );


                            analysis.innerHTML =
                                audit.render(
                                    findings
                                );


                            /*
                             * --------------------------------
                             * Extract original transaction table
                             * --------------------------------
                             */

                            const table =
                                extractTransactions(
                                    response.body
                                );


                            if (!table) {

                                box.innerHTML =
                                    "<p>No transaction table found.</p>";

                                secondaryBox.innerHTML =
                                    "<p>No transaction table found.</p>";

                                return;

                            }


                            /*
                             * --------------------------------
                             * First Transactions box
                             * --------------------------------
                             */

                            box.innerHTML =
                                table;


                            /*
                             * --------------------------------
                             * Second Transactions box
                             *
                             * Keep the original layout.
                             * --------------------------------
                             */

                            secondaryBox.innerHTML =
                                table;

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


                            secondaryBox.innerHTML = `

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
            e.stack ||
            e.message;

    }

}


start();