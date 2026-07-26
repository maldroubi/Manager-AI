export default class ManagerService {

    static page = null;

    static pending = {};

    static requestId = 1;

    static initialized = false;

    static async initialize() {

        if (this.initialized) return;

        this.initialized = true;

        window.addEventListener("message", (event) => {

            const data = event.data;

            if (!data) return;

            switch (data.type) {

                case "page-response":

                    this.page = data.body;
                    break;

                case "api-response":

                    if (this.pending[data.requestId]) {

                        this.pending[data.requestId](data.body);

                        delete this.pending[data.requestId];

                    }

                    break;

            }

        });

    }

    static async getPage() {

        await this.initialize();

        return new Promise((resolve) => {

            const handler = (event) => {

                if (event.data?.type === "page-response") {

                    window.removeEventListener("message", handler);

                    this.page = event.data.body;

                    resolve(event.data.body);

                }

            };

            window.addEventListener("message", handler);

            window.parent.postMessage({

                type: "page-request"

            }, "*");

        });

    }

    static async api(path) {

        await this.initialize();

        return new Promise((resolve) => {

            const id = this.requestId++;

            this.pending[id] = resolve;

            window.parent.postMessage({

                type: "api-request",
                requestId: id,
                path

            }, "*");

        });

    }

    static async getCurrentInvoice() {

        const page = await this.getPage();

        if (!page?.query?.key) {

            throw new Error("Invoice key not found.");

        }

        return await this.api(
            `/api4/sales-invoice?key=${page.query.key}`
        );

    }

    static async getInvoice() {

        const raw = await this.getCurrentInvoice();

        return {

            raw,

            key: raw?.key ?? null,

            number:
                raw?.reference ??
                raw?.number ??
                raw?.invoiceNumber ??
                null,

            customer:
                raw?.customer ??
                raw?.customerName ??
                raw?.customer_name ??
                null,

            issueDate:
                raw?.date ??
                raw?.issueDate ??
                null,

            dueDate:
                raw?.dueDate ??
                null,

            currency:
                raw?.currency ??
                raw?.currencyCode ??
                null,

            subtotal:
                raw?.subtotal ??
                raw?.subTotal ??
                0,

            tax:
                raw?.tax ??
                raw?.taxAmount ??
                0,

            total:
                raw?.total ??
                raw?.totalAmount ??
                0,

            items:
                raw?.items ??
                raw?.lines ??
                raw?.lineItems ??
                []

        };

    }

}