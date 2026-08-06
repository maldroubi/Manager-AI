const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.dir(report, { depth: null });

        const response =
            await manager.getTrialBalanceView(report.item.key);

        if (response.status !== 200) {
            throw new Error("Failed to load Trial Balance View");
        }

        const view = response.body;

        console.log("================================");
        console.log("Trial Balance View");
        console.dir(view, { depth: null });

        console.log("================================");
        console.log("Columns");
        console.dir(view.columns, { depth: null });

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
        console.log("Rows Count");
        console.log(flatRows.length);

        if (flatRows.length > 0) {

            console.log("================================");
            console.log("First Row");
            console.dir(flatRows[0], { depth: null });

            console.log("================================");
            console.log("First Row Cells");
            console.dir(flatRows[0].cells, { depth: null });

        }

        output.textContent =
            JSON.stringify(flatRows[0], null, 2);

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;

    }

}

start();