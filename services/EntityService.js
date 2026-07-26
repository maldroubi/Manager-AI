import ManagerService from "./ManagerService.js";

export default class EntityService {

    static async initialize() {

        const endpoints = [
            "customers",
            "inventory-items",
            "inventory_items",
            "items",
            "accounts",
            "tax-codes",
            "tax_codes",
            "projects",
            "divisions"
        ];

        for (const endpoint of endpoints) {

            try {

                const result = await ManagerService.api(endpoint);

                console.log("SUCCESS:", endpoint, result);

            } catch (error) {

                console.log("FAILED:", endpoint, error);

            }

        }

    }

}