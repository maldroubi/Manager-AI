const output = document.getElementById("output");

let requestId = 1;
const pending = new Map();

// استقبال الردود من Manager
window.addEventListener("message", (event) => {

    const data = event.data;

    if (!data) return;

    if (data.type !== "api-response") return;

    const callback = pending.get(data.requestId);

    if (!callback) return;

    pending.delete(data.requestId);

    callback(data);

});

// إرسال طلب إلى Manager
function managerRequest(path, method = "GET", body = null) {

    return new Promise((resolve) => {

        const id = requestId++;

        pending.set(id, resolve);

        window.parent.postMessage({

            type: "api-request",
            requestId: id,
            path,
            method,
            body

        }, "*");

    });

}

// اختبار الاتصال
async function start() {

    output.textContent = "Connecting...";

    try {

     const reports = await managerRequest("/api4/reports");

const trialBalanceUrl =
    reports.body._links.trialBalance.href;

const result =
    await managerRequest(trialBalanceUrl);

output.textContent =
    JSON.stringify(result, null, 2);
    

        output.textContent = JSON.stringify(result, null, 2);

    } catch (e) {

        output.textContent = e.toString();

    }

}

start();