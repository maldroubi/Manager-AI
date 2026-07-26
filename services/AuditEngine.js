import ManagerService from "./ManagerService.js";

export default class AuditEngine {

    static async scan() {

        try {

            const invoice = await ManagerService.getInvoice();

            const results = [];

            results.push({
                level: "Info",
                title: "Invoice Summary",
                description:
`Invoice Number : ${invoice.number ?? "(None)"}

Customer : ${invoice.customer ?? "(Unknown Customer)"}

Issue Date : ${invoice.issueDate ?? "-"}

Due Date : ${invoice.dueDate ?? "-"}

Currency : ${invoice.currency ?? "-"}

Items : ${invoice.items.length}

Subtotal : ${invoice.subtotal}

Tax : ${invoice.tax}

Total : ${invoice.total}`
            });

            results.push({
                level: "Info",
                title: "Raw Invoice JSON",
                description: JSON.stringify(invoice.raw, null, 2)
            });

            return results;

        }
        catch (error) {

            return [

                {
                    level: "Error",
                    title: "Audit Failed",
                    description: error.message
                }

            ];

        }

    }

}