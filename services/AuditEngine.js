import ManagerService from "./ManagerService.js";

export default class AuditEngine {

    static async scan() {

        const results = [];

        try {

            // تحميل الصفحة الحالية
            const page = await ManagerService.getPage();

            console.log("Current Page:", page);

            // تحميل الفاتورة الحالية
            const invoice = await ManagerService.getCurrentInvoice();

            console.log("Invoice:", invoice);

            results.push({
                level: "Success",
                title: "Connection Successful",
                description: "Invoice loaded successfully from Manager."
            });

            results.push({
                level: "Info",
                title: "Invoice Number",
                description: invoice.reference || "(No Reference)"
            });

            results.push({
                level: "Info",
                title: "Customer",
                description: invoice.customer?.name || "(Unknown Customer)"
            });

        }
        catch (error) {

            console.error(error);

            results.push({
                level: "Critical",
                title: "Connection Failed",
                description: error.message
            });

        }

        return results;

    }

}