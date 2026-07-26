export default class MissingRevenueAccountRule {

    static async execute(invoice) {

        const results = [];

        const lines = invoice.lines ?? [];

        lines.forEach((line, index) => {

            // Skip if no inventory item is selected.
            if (!line.item) {
                return;
            }

            // The account may be inherited from the Item.
            // This rule will become active once Item lookup is implemented.
            if (!line.account) {

                results.push({
                    code: "REV-001",
                    category: "Revenue",
                    level: "Info",
                    title: "Revenue Account Requires Verification",
                    description: `Line ${index + 1} does not specify a revenue account.`,
                    recommendation: "Verify whether the revenue account is inherited from the inventory item."
                });

            }

        });

        return results;

    }

}