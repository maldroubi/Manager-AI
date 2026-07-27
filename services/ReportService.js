import ManagerService from "./ManagerService.js";

export default class ReportService {

    /**
     * Read the current report model from Manager.
     */
    static async getModel() {

        return await ManagerService.api({

            path: "/api4/view-v1" + window.location.search,

            headers: {
                Accept: "application/json"
            }

        });

    }

    /**
     * Report title.
     */
    static async getTitle() {

        const model = await this.getModel();

        return model?.title ?? "";

    }

    /**
     * Full table object.
     */
    static async getTable() {

        const model = await this.getModel();

        return model?.table ?? null;

    }

    /**
     * Report columns.
     */
    static async getColumns() {

        const table = await this.getTable();

        return table?.columns ?? [];

    }

    /**
     * Raw report rows.
     */
    static async getRawRows() {

        const table = await this.getTable();

        return table?.rows ?? [];

    }

    /**
     * Flatten Manager hierarchical rows.
     */
    static flattenRows(rows, level = 0, result = []) {

        if (!rows) return result;

        for (const row of rows) {

            if (row.rows) {

                if (row.cells?.length) {

                    result.push({

                        type: "group",

                        level,

                        cells: row.cells

                    });

                }

                this.flattenRows(row.rows, level + 1, result);

                continue;

            }

            result.push({

                type: row.isTotalRow ? "total" : "row",

                level,

                cells: row.cells ?? []

            });

        }

        return result;

    }

    /**
     * Flattened report rows.
     */
    static async getRows() {

        const rows = await this.getRawRows();

        return this.flattenRows(rows);

    }

    /**
     * Returns report totals.
     */
    static async getTotals() {

        const model = await this.getModel();

        return model?.totals ?? [];

    }

    /**
     * Basic report information.
     */
    static async getInfo() {

        const model = await this.getModel();

        return {

            title: model?.title ?? "",

            subtitles: model?.subtitles ?? [],

            businessName: model?.businessName ?? "",

            direction: model?.direction ?? "ltr",

            language: model?.language ?? "en"

        };

    }

}