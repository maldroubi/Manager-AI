// manager-api.js

class ManagerAPI {

    constructor() {

        this.requestId = 1;
        this.pending = new Map();

        window.addEventListener("message", (event) => {

            const data = event.data;

            if (!data) return;
            if (data.type !== "api-response") return;

            const callback = this.pending.get(data.requestId);

            if (!callback) return;

            this.pending.delete(data.requestId);

            callback(data);

        });

    }

    request(path, method = "GET", body = null) {

        return new Promise((resolve) => {

            const requestId = this.requestId++;

            this.pending.set(requestId, resolve);

            window.parent.postMessage({
                type: "api-request",
                requestId,
                path,
                method,
                body
            }, "*");

        });

    }

    // -----------------------------
    // Core
    // -----------------------------

    async tabs() {
        return await this.request("/api4/tabs");
    }

    async reports() {
        return await this.request("/api4/reports");
    }

    // -----------------------------
    // Trial Balance
    // -----------------------------

    async trialBalanceBatch() {

        const reports = await this.reports();

        const link = reports.body._links.trialBalance.href;

        return await this.request(link);

    }

    async getTrialBalanceView(key) {

        return await this.request(
            `/api4/trial-balance-view?Key=${encodeURIComponent(key)}`
        );

    }

    async createTrialBalance(body) {

        return await this.request(
            "/api4/trial-balance",
            "POST",
            body
        );

    }

    async updateTrialBalance(body) {

        return await this.request(
            "/api4/trial-balance",
            "PUT",
            body
        );

    }

    // =============================
    // Trial Balance Transactions
    // =============================

    async trialBalanceTransactions(path) {

        /*
         * Manager returns absolute URLs for some report links,
         * including /summary-transactions.
         *
         * The parent API bridge expects a Manager request path,
         * not an absolute URL. Normalize the URL to pathname + query.
         */
        let requestPath = path;

        try {

            const url = new URL(
                String(path || ""),
                window.location.href
            );

            let pathname = url.pathname;

            // Manager report links can expose an intermediate transaction page.
            // The actual ledger endpoint is /transactions. Keep the full query
            // string/hash because Manager uses the opaque query as the view key.
            if (/\/(summary-transactions|trial-balance-transactions)\/?$/i.test(pathname)) {
                console.log("[Manager AI] transaction route:", pathname, "-> /transactions");
                pathname = "/transactions";
            }

            requestPath =
                pathname +
                url.search +
                url.hash;

        } catch (err) {

            requestPath = path;

        }

        const response = await this.request(requestPath);

        console.groupCollapsed("[Manager AI] Transaction request");
        console.log("Original link:", path);
        console.log("Normalized path:", requestPath);
        console.log("Status:", response?.status);
        console.log("Body type:", typeof response?.body);
        console.log("Body length:", typeof response?.body === "string" ? response.body.length : "n/a");
        console.log("Body preview:", typeof response?.body === "string" ? response.body.slice(0, 1000) : response?.body);
        console.groupEnd();

        return response;

    }

    // -----------------------------
    // OpenAPI
    // -----------------------------

    async openApi(name) {

        return await this.request(
            `/openapi/${name}`
        );

    }

}

const manager = new ManagerAPI();
