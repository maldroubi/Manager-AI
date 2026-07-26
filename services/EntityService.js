import ManagerService from "./ManagerService.js";

export default class EntityService {

    static #cache = {
        customers: new Map(),
        items: new Map(),
        accounts: new Map(),
        taxCodes: new Map(),
        projects: new Map(),
        divisions: new Map()
    };

    static clear() {

        for (const key of Object.keys(this.#cache)) {
            this.#cache[key].clear();
        }

    }

    static async initialize() {

        // Reserved for future loading.
        // Here we will later load:
        // - Customers
        // - Inventory Items
        // - Accounts
        // - Tax Codes
        // - Projects
        // - Divisions

    }

    static getCustomer(id) {

        return this.#cache.customers.get(id) ?? null;

    }

    static getItem(id) {

        return this.#cache.items.get(id) ?? null;

    }

    static getAccount(id) {

        return this.#cache.accounts.get(id) ?? null;

    }

    static getTaxCode(id) {

        return this.#cache.taxCodes.get(id) ?? null;

    }

    static getProject(id) {

        return this.#cache.projects.get(id) ?? null;

    }

    static getDivision(id) {

        return this.#cache.divisions.get(id) ?? null;

    }

    static async refresh() {

        this.clear();
        await this.initialize();

    }

}