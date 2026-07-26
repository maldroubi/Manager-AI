import AuditEngine from "../services/AuditEngine.js";

export default function Audit() {
    const page = document.createElement("div");
    page.className = "audit-page";

    page.innerHTML = `
        <h2>Accounting Audit</h2>

        <button id="startAuditBtn">Start Audit</button>

        <div class="audit-summary" style="margin:20px 0;">
            <div>Critical: <span id="criticalCount">0</span></div>
            <div>High: <span id="highCount">0</span></div>
            <div>Medium: <span id="mediumCount">0</span></div>
            <div>Low: <span id="lowCount">0</span></div>
        </div>

        <h3>Audit Results</h3>

        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr>
                    <th style="text-align:left;">Level</th>
                    <th style="text-align:left;">Issue</th>
                    <th style="text-align:left;">Description</th>
                </tr>
            </thead>
            <tbody id="auditResults"></tbody>
        </table>
    `;

    page.querySelector("#startAuditBtn").addEventListener("click", async () => {
        const results = await AuditEngine.scan();

        updateCounters(results);
        renderTable(results);
    });

    function updateCounters(results) {
        page.querySelector("#criticalCount").textContent =
            results.filter(r => r.level === "Critical").length;

        page.querySelector("#highCount").textContent =
            results.filter(r => r.level === "High").length;

        page.querySelector("#mediumCount").textContent =
            results.filter(r => r.level === "Medium").length;

        page.querySelector("#lowCount").textContent =
            results.filter(r => r.level === "Low").length;
    }

    function renderTable(results) {
        const tbody = page.querySelector("#auditResults");

        tbody.innerHTML = "";

        results.forEach(result => {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${result.level}</td>
                <td>${result.title}</td>
                <td>${result.description}</td>
            `;

            tbody.appendChild(row);
        });
    }

    return page;
}