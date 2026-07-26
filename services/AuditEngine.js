import ManagerService from "./ManagerService.js";
import Rules from "./RuleRegistry.js";

export default class AuditEngine {

    static async scan() {

        try {

            await ManagerService.initialize();

            const invoice = await ManagerService.getCurrentInvoice();

            if (!invoice) {

                return [{
                    level: "Error",
                    title: "Invoice",
                    description: "Unable to load invoice."
                }];

            }

            const results = [];

            results.push({
                level: "Success",
                title: "Connection",
                description: "Invoice loaded successfully."
            });

            results.push({
                level: "Info",
                title: "Invoice Reference",
                description: invoice.reference ?? "(None)"
            });

            results.push({
                level: "Info",
                title: "Issue Date",
                description: invoice.issueDate ?? "(None)"
            });

            for (const Rule of Rules) {

                const issues = await Rule.execute(invoice);

                if (issues?.length) {
                    results.push(...issues);
                }

            }

            const errors = results.filter(r => r.level === "Error").length;
            const warnings = results.filter(r => r.level === "Warning").length;

            results.push({
                level: "Success",
                title: "Audit Summary",
                description:
`Errors : ${errors}
Warnings : ${warnings}`
            });

            return results;

        }
        catch (error) {

            return [{
                level: "Error",
                title: "Audit Failed",
                description: error.message
            }];

        }

    }

}