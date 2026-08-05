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
function managerRequest(path, method = "GET", query = null, body = null) {

    return new Promise((resolve) => {

        const id = requestId++;

        pending.set(id, resolve);

        window.parent.postMessage({
            type: "api-request",
            requestId: id,
            path,
            method,
            query,
            body
        }, "*");

    });

}

async function start() {

    output.textContent = "Loading Trial Balance...";

    try {

        // الحصول على قائمة التقارير
        const batch = await managerRequest(
            "/api4/trial-balance-batch"
        );

        output.textContent =
            JSON.stringify(batch, null, 2);

        if (
            batch.status !== 200 ||
            !batch.body.items ||
            batch.body.items.length === 0
        ) {
            return;
        }

        // أول تقرير موجود
        const key = batch.body.items[0].key;

        // تحميل التقرير
        const report = await managerRequest(
            "/api4/trial-balance",
            "GET",
            {
                Key: key
            }
        );

        output.textContent =
            JSON.stringify(report, null, 2);

    } catch (e) {

        output.textContent = e.toString();

    }

}

start();