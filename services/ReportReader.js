export class ReportReader {

    static readTrialBalance() {

        const iframe = document.getElementById("iframeView");

        if (!iframe)
            throw new Error("Trial Balance iframe not found.");

        const doc = iframe.contentDocument || iframe.contentWindow.document;

        if (!doc)
            throw new Error("Unable to access iframe document.");

        const rows = [...doc.querySelectorAll("table.body tr")];

        const accounts = [];

        let currentGroup = null;

        for (const row of rows) {

            // رؤوس المجموعات مثل Expenses / Income
            if (row.classList.contains("group-header")) {

                currentGroup = row.textContent.trim();
                continue;
            }

            const cells = row.querySelectorAll("td");

            if (cells.length < 2)
                continue;

            const account = cells[0].innerText.trim();

            if (!account)
                continue;

            const debitText = cells[cells.length - 2]?.innerText.trim() ?? "";
            const creditText = cells[cells.length - 1]?.innerText.trim() ?? "";

            const debit = parseFloat(
                debitText.replace(/,/g, "")
            ) || 0;

            const credit = parseFloat(
                creditText.replace(/,/g, "")
            ) || 0;

            accounts.push({
                group: currentGroup,
                account,
                debit,
                credit
            });

        }

        return accounts;

    }

}