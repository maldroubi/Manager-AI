const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        const response =
            await manager.getTrialBalanceView(report.item.key);

        if (response.status !== 200) {
            throw new Error("Failed to load Trial Balance View");
        }

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

        console.log("================================");
        console.log("Flat Rows");
        console.log(flatRows);

        const accounts = [];

        for (const row of flatRows) {

            const cells = row.cells || [];

            accounts.push({

                account: row.displayName || "",

                debit:
                    cells[0]?.value ?? null,

                credit:
                    cells[1]?.value ?? null,

                balance:
                    cells[2]?.value ?? null,

                totalRow:
                    row.isTotalRow,

                standout:
                    row.makeStandOut

            });

        }

        console.log("================================");
        console.log("Accounts");
        console.table(accounts);

        output.textContent =
            JSON.stringify(accounts, null, 2);

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;

    }

}

start();