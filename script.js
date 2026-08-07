const output = document.getElementById("output");

function extractTransactions(html) {

    const doc = new DOMParser().parseFromString(html, "text/html");

    const table = doc.querySelector("table");

    if (!table)
        return null;

    return table.outerHTML;

}

async function start() {

    output.innerHTML = "<p>Loading Trial Balance...</p>";

    try {

        const report = await reports.getTrialBalanceReport();

        const response =
            await manager.getTrialBalanceView(report.item.key);

        if (response.status !== 200)
            throw new Error("Failed to load Trial Balance View");

        const view = response.body;

        const flatRows = [];

        function collectRows(node) {

            if (!node || !Array.isArray(node.items))
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

                account: row.displayName || "",

                debit: cells[0]?.text || "",

                credit: cells[1]?.text || "",

                debitLink: cells[0]?.link?.href || "",

                creditLink: cells[1]?.link?.href || ""

            };

        });

        let html = `
            <h2>Trial Balance</h2>

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

                    <td>${a.account}</td>

                    <td>

                        ${
                            a.debitLink
                            ? `<a href="#" data-link="${a.debitLink}">${a.debit}</a>`
                            : a.debit
                        }

                    </td>

                    <td>

                        ${
                            a.creditLink
                            ? `<a href="#" data-link="${a.creditLink}">${a.credit}</a>`
                            : a.credit
                        }

                    </td>

                </tr>

            `;

        }

        html += `

                </tbody>

            </table>

            <hr>

            <h2>Transactions</h2>

            <div id="transactions">

                <p>Select an amount to load transactions.</p>

            </div>

            <hr>

            <h2>AI Analysis</h2>

            <div id="analysis">

                No analysis yet.

            </div>

        `;

        output.innerHTML = html;

        output.querySelectorAll("a[data-link]").forEach(link => {

            link.onclick = async e => {

                e.preventDefault();

                const box =
                    document.getElementById("transactions");

                box.innerHTML =
                    "<p>Loading transactions...</p>";

                try {

                    const response =
                        await manager.trialBalanceTransactions(
                            link.dataset.link
                        );
                   console.log(response.body.substring(0, 1000));
                   
                        const entry =
    extractor.extract(response.body);

console.log("ENTRY");

console.log(entry);



                        
                    const table =
                        extractTransactions(response.body);

                    if (!table) {

                        box.innerHTML =
                            "<p>No transaction table found.</p>";

                        return;

                    }

                    box.innerHTML = `

    ${table}

    <hr>

    <h3>Extracted Entry</h3>

    <pre>

${JSON.stringify(entry, null, 4)}

    </pre>

`;

                }

                catch (err) {

                    console.error(err);

                    box.innerHTML =
                        `<p style="color:red">${err.message}</p>`;

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