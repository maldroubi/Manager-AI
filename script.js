const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        // الحصول على التقرير الجاهز
        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        // الحصول على بيانات التقرير
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

        output.textContent = JSON.stringify(
            view.rows.items,
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