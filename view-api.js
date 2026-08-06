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

        if (!definition)
            throw new Error("Definition not returned.");

        return definition;

    }

}

const viewApi = new ViewAPI(manager);