export default class MissingCustomerRule {

    static async execute(invoice) {

        const results = [];

        if (!invoice.customer) {

            results.push({
                code: "INV-002",
                category: "Customer",
                level: "Error",
                title: "Missing Customer",
                description: "No customer is assigned to this invoice.",
                recommendation: "Select a customer before saving or posting the invoice."
            });

        }

        return results;

    }

}