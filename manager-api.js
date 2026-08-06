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

        return await this.request(path);

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