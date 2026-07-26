export default class EmptyInvoiceRule {

    static async execute(invoice) {

        const results = [];

        const lines = invoice.lines ?? [];

        if (lines.length === 0) {

            results.push({
                code: "INV-001",
                category: "Invoice",
                level: "Error",
                title: "Empty Invoice",
                description: "Invoice has no lines.",
                recommendation: "Add at least one invoice line before posting."
            });

        }

        return results;

    }

}