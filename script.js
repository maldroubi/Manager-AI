const output = document.getElementById("output");

let requestId = 1;
const pending = new Map();

// استقبال الرد من Manager
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

async function start() {

    output.textContent = "Loading OpenAPI...";

    try {

        const result = await managerRequest(
            "/openapi/get-trial-balance.json"
        );

        output.textContent =
            JSON.stringify(result, null, 2);

    } catch (e) {

        output.textContent = e.toString();

    }

}

start();