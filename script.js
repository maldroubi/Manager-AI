const output = document.getElementById("output");

async function start() {

    output.textContent = "Loading...";

    try {

        const report =
            await reports.getLatestTrialBalance();

        const result =
            await viewApi.trialBalance(report);

        output.textContent =
            JSON.stringify(result, null, 2);

    }
    catch (e) {

        output.textContent = e.message;

    }

}

start();