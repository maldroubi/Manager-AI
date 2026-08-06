const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        const report =
            await reports.getTrialBalanceReport();

        console.log("Selected Trial Balance Report");
        console.log(report);

        const result =
            await manager.getTrialBalance(report.key);

        console.log("Trial Balance Definition");
        console.log(result);

        output.textContent =
            JSON.stringify(result, null, 2);

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.message;

    }

}

start();