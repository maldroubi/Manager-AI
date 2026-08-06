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

    async getAuditReport() {

        const list = await this.trialBalanceList();

        const report = list.find(r => {

            const title = (r.item.title || "").trim().toLowerCase();

            return title === this.reportName.toLowerCase();

        });

        if (!report)
            throw new Error(
                `Trial Balance report "${this.reportName}" was not found.`
            );

        return report;

    }

}

const reports = new Reports(manager);