import ManagerService from "./ManagerService.js";

export default class AuditEngine {
    static async scan() {

        const results = [];

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

            results.push({
                level: "Success",
                title: "Connection",
                description: "Invoice loaded successfully."
            });

            // -------------------------------------------------
            // Basic Information
            // -------------------------------------------------

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

            // -------------------------------------------------
            // Check Lines
            // -------------------------------------------------

            const lines = invoice.lines ?? [];

            results.push({
                level: "Info",
                title: "Items",
                description: `${lines.length} line(s)`
            });

            if (lines.length === 0) {

                results.push({
                    level: "Error",
                    title: "Empty Invoice",
                    description: "Invoice has no lines."
                });

                return results;
            }

            // -------------------------------------------------
            // Audit every line
            // -------------------------------------------------

            lines.forEach((line, index) => {

                const row = index + 1;

                // Missing Item

                if (!line.item) {
                    results.push({
                        level: "Error",
                        title: `Line ${row}`,
                        description: "Missing inventory item."
                    });
                }

                // Missing Account

                if (!line.account) {
                    results.push({
                        level: "Warning",
                        title: `Line ${row}`,
                        description: "No sales account selected."
                    });
                }

                // Quantity

                if ((line.qty ?? 0) <= 0) {
                    results.push({
                        level: "Error",
                        title: `Line ${row}`,
                        description: "Quantity must be greater than zero."
                    });
                }

                // Unit Price

                if ((line.salesUnitPrice ?? 0) <= 0) {
                    results.push({
                        level: "Error",
                        title: `Line ${row}`,
                        description: "Unit price must be greater than zero."
                    });
                }

                // Discount %

                if ((line.discountPercentage ?? 0) > 100) {
                    results.push({
                        level: "Error",
                        title: `Line ${row}`,
                        description: "Discount percentage exceeds 100%."
                    });
                }

                // Discount Amount

                if ((line.discountAmount ?? 0) < 0) {
                    results.push({
                        level: "Error",
                        title: `Line ${row}`,
                        description: "Negative discount amount."
                    });
                }

            });

            // -------------------------------------------------
            // Summary
            // -------------------------------------------------

            const errors = results.filter(r => r.level === "Error").length;
            const warnings = results.filter(r => r.level === "Warning").length;

            results.push({
                level: "Success",
                title: "Audit Summary",
                description:
                    `Errors : ${errors}\nWarnings : ${warnings}`
            });

            return results;

        } catch (error) {

            return [{
                level: "Error",
                title: "Audit Failed",
                description: error.message
            }];

        }

    }
}