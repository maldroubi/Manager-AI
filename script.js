const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        const report =
            await reports.getTrialBalanceReport();

        console.log("Selected Trial Balance Report");
        console.log(report);

        const definition = await manager.getTrialBalance(report.key);

console.log("Definition");
console.log(definition);

const view = await manager.getTrialBalanceView(
    definition.body.key
);

console.log("View");
console.log(view);

output.textContent =
    JSON.stringify(view, null, 2);
    

    }
    catch (e) {

        console.error(e);

        output.textContent =
            e.message;

    }

}

start();