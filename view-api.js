// view-api.js

class ViewAPI {

    constructor(manager) {
        this.manager = manager;
    }

    async open(viewPath) {

        const result = await this.manager.request(viewPath);

        if (!result)
            throw new Error("No response from Manager.");

        if (result.status !== 200)
            throw new Error("Unable to open Manager view.");

        return result;

    }

    async view(path) {

        return await this.manager.request(path);

    }

    async viewV1(path) {

        const apiPath = path.replace(
            "/api4/view?",
            "/api4/view-v1?"
        );

        return await this.manager.request(apiPath);

    }

    async trialBalance(report) {

        if (!report)
            throw new Error("Trial Balance report not found.");

        console.log("================================");
        console.log("Selected Trial Balance Report");
        console.log(report);

        const definition =
            await this.manager.getTrialBalance(report.item.key);

        console.log("================================");
        console.log("Trial Balance Definition");
        console.log(definition);

        if (!definition || definition.status !== 200)
            throw new Error("Unable to read Trial Balance definition.");

        if (
            !report._links ||
            !report._links.self ||
            !report._links.self.href
        ) {
            throw new Error("Report view link not found.");
        }

        console.log("================================");
        console.log("Opening View");
        console.log(report._links.self.href);

        const view =
            await this.viewV1(report._links.self.href);

        console.log("================================");
        console.log("View Result");
        console.log(view);

        return {
            definition,
            view
        };

    }

}

const viewApi = new ViewAPI(manager);