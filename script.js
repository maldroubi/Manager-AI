const output = document.getElementById("output");

async function start() {

    output.textContent = "Searching for Trial Balance report...";

    try {

        const report = await reports.getAuditReport();

        output.textContent =
            JSON.stringify(report, null, 2);

    }
    catch (e) {

        output.textContent = e.message;

    }

}

start();