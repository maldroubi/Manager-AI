import ManagerService from "./ManagerService.js";
import EntityService from "./EntityService.js";
import Rules from "./RuleRegistry.js";

export default class AuditEngine {

    static async scan() {

        try {

            await ManagerService.initialize();
            await EntityService.initialize();

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

                try {

                    const issues = await Rule.execute(invoice);

                    if (Array.isArray(issues) && issues.length > 0) {
                        results.push(...issues);
                    }

                } catch (error) {

                    results.push({
                        code: "SYS-001",
                        category: "System",
                        level: "Error",
                        title: Rule.name,
                        description: error.message,
                        recommendation: "Review the rule implementation."
                    });

                }

            }

            const errors = results.filter(r => r.level === "Error").length;
            const warnings = results.filter(r => r.level === "Warning").length;
            const infos = results.filter(r => r.level === "Info").length;

            results.push({
                level: "Success",
                title: "Audit Summary",
                description:
`Errors : ${errors}
Warnings : ${warnings}
Info : ${infos}`
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