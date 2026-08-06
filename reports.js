class Reports {

    constructor(manager) {
        this.manager = manager;
        this.reportName = "Manager AI Audit";
    }

    async trialBalanceList() {

        const response = await this.manager.trialBalanceBatch();

        if (response.status !== 200)
            throw new Error("Unable to load Trial Balance reports.");

        return response.body.items || [];

    }

    async getTrialBalanceReport() {

        const list = await this.trialBalanceList();

        const report = list.find(r =>
            (r.item.title || "").trim().toLowerCase() ===
            this.reportName.toLowerCase()
        );

        if (!report)
            throw new Error(
                `Trial Balance report "${this.reportName}" not found.`
            );

        return report;

    }

}

const reports = new Reports(manager);