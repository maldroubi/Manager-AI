export default class InvalidQuantityRule {

    static async execute(invoice) {

        const results = [];

        const lines = invoice.lines ?? [];

        lines.forEach((line, index) => {

            if ((line.qty ?? 0) <= 0) {

                results.push({
                    code: "INV-003",
                    category: "Invoice Line",
                    level: "Error",
                    title: "Invalid Quantity",
                    description: `Line ${index + 1} has an invalid quantity.`,
                    recommendation: "Quantity must be greater than zero."
                });

            }

        });

        return results;

    }

}