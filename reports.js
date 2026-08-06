// reports.js

class Reports {

    constructor(manager) {
        this.manager = manager;
    }

    async trialBalanceList() {

        const result = await this.manager.trialBalanceReports();

        if (result.status !== 200) {
            throw new Error("Unable to load Trial Balance list.");
        }

        return result.body.items || [];

    }

    async getTrialBalanceById(id) {

        const list = await this.trialBalanceList();

        return list.find(r => r.item.id === id) || null;

    }

    async getTrialBalanceByTitle(title) {

        const list = await this.trialBalanceList();

        return list.find(r =>
            (r.item.title || "").toLowerCase() === title.toLowerCase()
        ) || null;

    }

    async getLatestTrialBalance() {

        const list = await this.trialBalanceList();

        if (!list.length) return null;

        list.sort((a, b) =>
            b.item.timestamp - a.item.timestamp
        );

        return list[0];

    }

}

const reports = new Reports(manager);