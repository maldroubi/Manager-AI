const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        // البحث عن التقرير الجاهز
        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        // جلب بيانات التقرير الفعلية
        const reportView =
            await manager.getTrialBalanceView(report.item.key);

        console.log("================================");
        console.log("Trial Balance View");
        console.log(reportView);

        output.textContent =
            JSON.stringify(reportView, null, 2);

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;

    }

}

start();