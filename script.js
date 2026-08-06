const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        // البحث عن التقرير الجاهز
        const report = await reports.getTrialBalanceReport();

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        const result =
    await manager.getTrialBalanceView(report.item.key);

console.log(result);

output.textContent =
    JSON.stringify(result.body, null, 2);


    
        console.log("================================");
        console.log("Trial Balance Definition");
        console.log(definition);

        // فتح التقرير الفعلي
        const result = await viewApi.trialBalance(report);

        console.log("================================");
        console.log("Trial Balance View");
        console.log(result);

        output.textContent =
            JSON.stringify(result.view, null, 2);

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.stack || e.message;

    }

}

start();