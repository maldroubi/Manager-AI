import ReportService from "./ReportService.js";

export default class AuditUI {

    static async start() {

        const output = document.getElementById("result");

        if (!output) {
            console.error("Result element not found.");
            return;
        }

        output.textContent = "Loading Trial Balance...";

        try {

            const info = await ReportService.getInfo();
            const columns = await ReportService.getColumns();
            const rows = await ReportService.getRows();
            const totals = await ReportService.getTotals();

            let text = "";

            text += "================================\n";
            text += "Manager AI Financial Auditor\n";
            text += "================================\n\n";

            text += `Report      : ${info.title}\n`;
            text += `Business    : ${info.businessName}\n`;
            text += `Language    : ${info.language}\n`;
            text += `Direction   : ${info.direction}\n`;
            text += `Columns     : ${columns.length}\n`;
            text += `Rows        : ${rows.length}\n`;
            text += `Totals      : ${totals.length}\n\n`;

            text += "Columns\n";
            text += "--------------------------------\n";

            columns.forEach((column, index) => {
                text += `${index + 1}. ${column.label ?? "(no label)"}\n`;
            });

            text += "\nFirst Rows\n";
            text += "--------------------------------\n\n";

            rows.slice(0, 10).forEach((row, index) => {

                text += `Row ${index + 1}\n`;
                text += `Type  : ${row.type}\n`;
                text += `Level : ${row.level}\n`;

                (row.cells || []).forEach((cell, i) => {

                    text += `   [${i}] ${cell.text ?? ""}\n`;

                });

                text += "\n";

            });

            output.textContent = text;

        }
        catch (error) {

            console.error(error);

            output.textContent =
                "ERROR\n\n" +
                error.message +
                "\n\n" +
                (error.stack || "");

        }

    }

}