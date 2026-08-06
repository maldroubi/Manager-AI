const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        // الحصول على تقرير Trial Balance الجاهز
        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        // جلب بيانات التقرير
        const response =
            await manager.getTrialBalanceView(report.item.key);

        console.log("================================");
        console.log("Trial Balance View");
        console.log(response);

        if (response.status !== 200) {
            throw new Error("Failed to load Trial Balance View");
        }

        const view = response.body;

        console.log("================================");
        console.log("Columns");
        console.log(view.columns);

        console.log("================================");
        console.log("Rows");
        console.log(view.rows.items);

        // تحويل شجرة التقرير إلى صفوف مسطحة
        const flatRows = [];

        function collectRows(node) {

            if (!node) return;

            if (!Array.isArray(node.items)) return;

            for (const row of node.items) {

                if (row.cells) {
                    flatRows.push(row);
                }

                if (row.rows) {
                    collectRows(row.rows);
                }

            }

        }

        collectRows(view.rows);

        console.log("================================");
        console.log("Flat Rows");
        console.log(flatRows);

        output.textContent = JSON.stringify(
            flatRows,
            null,
            2
        );

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;

    }

}

start();