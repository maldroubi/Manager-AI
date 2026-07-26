import ManagerService from "./ManagerService.js";

export default class AuditEngine {

    static async scan() {

        try {

            const raw = await ManagerService.getCurrentInvoice();

            return [

                {
                    level: "Info",
                    title: "RAW JSON",
                    description: JSON.stringify(raw, null, 2)
                }

            ];

        }
        catch (error) {

            return [

                {
                    level: "Error",
                    title: "Audit Failed",
                    description: error.message
                }

            ];

        }

    }

}