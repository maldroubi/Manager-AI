class Reports {

    constructor(manager) {
        this.manager = manager;
    }

    async trialBalanceList() {

        const response = await this.manager.trialBalanceBatch();

        if (response.status !== 200)
            throw new Error("Unable to load Trial Balance reports.");

        return response.body.items || [];

    }

    async getLatestTrialBalance() {

        const list = await this.trialBalanceList();

        if (!list.length)
            throw new Error("No Trial Balance reports found.");

        list.sort((a, b) => b.item.timestamp - a.item.timestamp);

        return list[0];

    }

}

const reports = new Reports(manager);