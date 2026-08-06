const output = document.getElementById("output");

async function start() {
    output.innerHTML = "<p>Loading Trial Balance...</p>";
    try {
        const report = await reports.getTrialBalanceReport();
        const response = await manager.getTrialBalanceView(report.item.key);
        if (response.status !== 200) throw new Error("Failed to load Trial Balance View");
        const view = response.body;

        const flatRows = [];
        function collectRows(node){
            if(!node||!Array.isArray(node.items)) return;
            for(const row of node.items){
                if(row.cells) flatRows.push(row);
                if(row.rows) collectRows(row.rows);
            }
        }
        collectRows(view.rows);

        const accounts = flatRows.map(row=>{
            const cells=row.cells||[];
            return {
                account: row.displayName||"",
                debit: cells[0]?.text||"",
                credit: cells[1]?.text||"",
                debitLink: cells[0]?.link?.href||"",
                creditLink: cells[1]?.link?.href||"",
                totalRow: row.isTotalRow,
                standout: row.makeStandOut
            };
        });

        let html=`<table border="1" cellspacing="0" cellpadding="6">
        <thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>`;
        for(const a of accounts){
            html+=`<tr>
            <td>${a.account}</td>
            <td>${a.debitLink?`<a href="#" data-link="${a.debitLink}">${a.debit}</a>`:a.debit}</td>
            <td>${a.creditLink?`<a href="#" data-link="${a.creditLink}">${a.credit}</a>`:a.credit}</td>
            </tr>`;
        }
        html+="</tbody></table>";
        output.innerHTML=html;
        output.querySelectorAll("a[data-link]").forEach(a=>{
            a.onclick=e=>{
                e.preventDefault();
                console.log("Transaction Link:",a.dataset.link);
                alert(a.dataset.link);
            }
        });
    } catch(e){
        console.error(e);
        output.textContent=e.stack||e.message;
    }
}
start();
