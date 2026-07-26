import ManagerService from "./ManagerService.js";

export default class EntityService {

    static async initialize() {

        console.log("EntityService initialized");

        // المرحلة القادمة:
        // سنكتشف كيف يوفّر Manager:
        // - Accounts
        // - Customers
        // - Inventory Items
        // - Tax Codes

    }

    static async probe(endpoint) {

        try {

            const data = await ManagerService.api(endpoint);

            console.log(endpoint, data);

            return data;

        } catch (error) {

            console.log(endpoint, error);

            return null;

        }

    }

}