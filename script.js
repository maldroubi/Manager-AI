console.log("MANAGER-AI BUILD: 20260811-MERGED-BALANCE");
const output = document.getElementById("output");

function extractTransactions(html) {
    if (!html) return null;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    return table ? table.outerHTML : null;
}

function normalizeManagerPath(href) {
    if (!href) return "";
    try {
        const raw = String(href).trim();
        const url = new URL(raw, window.location.href);
        return /^https?:\/\//i.test(raw) ? url.href : url.pathname + url.search;
    } catch (_) { return String(href); }
}

function findTransactionLedgerHref(html, sourcePath = "") {
    const candidates = [];
    if (sourcePath) candidates.push(sourcePath);
    if (window.location?.href) candidates.push(window.location.href);

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate, window.location.href);
            if (!url.search) continue;
            if (/\/transactions$/i.test(url.pathname)) return normalizeManagerPath(url.href);
            if (/\/(?:summary-view|summary-transactions)(?:\/)?$/i.test(url.pathname) || /summary/i.test(url.pathname)) {
                url.pathname = "/transactions";
                return normalizeManagerPath(url.href);
            }
        } catch (_) {}
    }

    if (!html) return "";
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = [...doc.querySelectorAll("a[href]")];
    const direct = links.find(a => {
        const href = a.getAttribute("href") || "";
        const text = (a.innerText || a.textContent || "").trim().toLowerCase();
        return (/\/transactions(?:\?|$)/i.test(href) && !/\/summary-transactions(?:\?|$)/i.test(href)) &&
               (text === "transactions" || /\/transactions(?:\?|$)/i.test(href));
    });
    return direct ? normalizeManagerPath(direct.getAttribute("href")) : "";
}

async function loadTransactionLedger(initialResponse, initialPath = "") {
    let response = initialResponse;
    let html = response?.body || "";
    let extracted = extractor.extract(html);

    if (extracted.hasTransactionLedger) {
        return { response, html, extracted, source: "direct", ledgerHref: initialPath };
    }

    const ledgerHref = findTransactionLedgerHref(html, initialPath || response?.path || response?.url || "");
    if (!ledgerHref) return { response, html, extracted, source: "unavailable", ledgerHref: "" };

    const candidates = [ledgerHref];
    try {
        const u = new URL(ledgerHref, window.location.href);
        u.pathname = /\/transactions$/i.test(u.pathname) ? "/trial-balance-transactions" : "/transactions";
        const alt = normalizeManagerPath(u.href);
        if (alt && !candidates.includes(alt)) candidates.push(alt);
    } catch (_) {}

    let lastResponse = response, lastExtracted = extracted, successfulHref = ledgerHref;
    for (const href of candidates) {
        console.log("TRANSACTION LEDGER REQUEST:", href);
        const r = await manager.trialBalanceTransactions(href);
        lastResponse = r;
        if (!r || r.status !== 200) continue;
        const h = r.body || "";
        const x = extractor.extract(h);
        lastExtracted = x;
        successfulHref = href;
        console.log("TRANSACTION LEDGER RESULT:", {
            href, status: r.status, htmlLength: h.length,
            transactions: x.transactions?.length || 0,
            hasTransactionLedger: x.hasTransactionLedger,
            tableCount: x.diagnostics?.tableCount,
            selectedTableIndex: x.diagnostics?.selectedTableIndex
        });
        if (x.hasTransactionLedger) return {
            response: r, html: h, extracted: x,
            source: "followed-transactions-link", ledgerHref: href
        };
    }

    return {
        response: lastResponse, html: lastResponse?.body || html,
        extracted: lastExtracted,
        source: lastResponse?.status === 200 ? "ledger-page-without-transactions" : "ledger-request-failed",
        ledgerHref: successfulHref
    };
}

function parseMoney(value) {
    if (value === null || value === undefined) return 0;
    const n = parseFloat(String(value).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
    return Number.isNaN(n) ? 0 : n;
}

function parseSignedBalance(value) {
    const amount = parseMoney(value);
    return String(value ?? "").toLowerCase().includes("cr") ? -amount : amount;
}

function getBalanceSheetBalance(account) {
    return parseMoney(account.debit) - parseMoney(account.credit);
}

function parseTransactionDate(value) {
    if (!value) return 0;
    const m = String(value).trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]).getTime();
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
}

function getLatestTransaction(transactions) {
    if (!Array.isArray(transactions) || !transactions.length) return null;
    return transactions.reduce((latest, tx) =>
        parseTransactionDate(tx.date) > parseTransactionDate(latest.date) ? tx : latest
    );
}

function checkBalance(account) {
    const balanceSheetBalance = getBalanceSheetBalance(account);
    const latestTransaction = getLatestTransaction(account.transactions);
    if (!latestTransaction) return {
        available: false, balanceSheetBalance,
        transactionBalance: null, difference: null,
        matches: null, transaction: null,
        reason: "No transaction rows were available for balance comparison."
    };

    // IMPORTANT: compare against the running balance on the latest ledger row.
    // Do not use an arbitrary page-level amount from the summary page.
    const transactionBalance = parseSignedBalance(latestTransaction.balance);
    const difference = balanceSheetBalance - transactionBalance;
    return {
        available: true, balanceSheetBalance, transactionBalance, difference,
        matches: Math.abs(difference) < 0.01,
        transaction: latestTransaction
    };
}

function formatMoney(value) {
    if (value === null || value === undefined) return "-";
    return Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderBalanceCheck(check) {
    if (!check.available) return `<div style="margin-bottom:16px;padding:16px;border:1px solid #ddd;border-radius:6px"><h3>Balance Check</h3><p>${check.reason || "No transaction balance was available for comparison."}</p></div>`;
    if (check.matches) return `<div style="margin-bottom:16px;padding:16px;border:1px solid #c8e6c9;border-radius:6px"><h3 style="color:#2e7d32">✓ Balance Matches</h3><p><strong>Balance Sheet:</strong> ${formatMoney(check.balanceSheetBalance)}</p><p><strong>Latest Transaction Balance:</strong> ${formatMoney(check.transactionBalance)}</p><p><strong>Difference:</strong> 0.00</p><p><strong>Latest Transaction:</strong> ${check.transaction?.date || "-"}</p></div>`;
    return `<div style="margin-bottom:16px;padding:16px;border:1px solid #f0c36d;border-radius:6px"><h3 style="color:#c65d00">⚠ Balance Difference Detected</h3><p><strong>Balance Sheet:</strong> ${formatMoney(check.balanceSheetBalance)}</p><p><strong>Latest Transaction Balance:</strong> ${formatMoney(check.transactionBalance)}</p><p><strong>Difference:</strong> ${formatMoney(check.difference)}</p><p><strong>Latest Transaction:</strong> ${check.transaction?.date || "-"}</p></div>`;
}

async function start() {
    document.getElementById("transactions")?.remove();
    document.getElementById("analysis")?.remove();
    output.innerHTML = "<p>Loading Trial Balance...</p>";

    try {
        const report = await reports.getTrialBalanceReport();
        const response = await manager.getTrialBalanceView(report.item.key);
        if (response.status !== 200) throw new Error("Failed to load Trial Balance View");

        const flatRows = [];
        function collectRows(node) {
            if (!node || !Array.isArray(node.items)) return;
            for (const row of node.items) {
                if (row.cells) flatRows.push(row);
                if (row.rows) collectRows(row.rows);
            }
        }
        collectRows(response.body.rows);

        const accounts = flatRows.map(row => {
            const cells = row.cells || [];
            return {
                account: row.displayName || "",
                debit: cells[0]?.text || "",
                credit: cells[1]?.text || "",
                debitLink: cells[0]?.link?.href || "",
                creditLink: cells[1]?.link?.href || ""
            };
        });

        let html = `<h2>Trial Balance</h2><table><thead><tr><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>`;
        for (const a of accounts) {
            html += `<tr><td>${a.account}</td><td>${a.debitLink ? `<a href="#" data-link="${a.debitLink}" data-account="${a.account}" data-debit="${a.debit}" data-credit="${a.credit}">${a.debit}</a>` : a.debit}</td><td>${a.creditLink ? `<a href="#" data-link="${a.creditLink}" data-account="${a.account}" data-debit="${a.debit}" data-credit="${a.credit}">${a.credit}</a>` : a.credit}</td></tr>`;
        }
        html += `</tbody></table><hr><h2>Transactions</h2><div id="transactions"><p>Select an amount to load transactions.</p></div><hr><h2>Account Being Audited</h2><div id="account-audited"><p>Select an account to audit.</p></div><hr><h2>Audit Findings</h2><div id="analysis"><p>Select an account to audit.</p></div>`;
        output.innerHTML = html;

        output.querySelectorAll("a[data-link]").forEach(link => {
            link.onclick = async e => {
                e.preventDefault();
                const box = document.getElementById("transactions");
                const accountBox = document.getElementById("account-audited");
                const analysis = document.getElementById("analysis");
                box.innerHTML = "<p>Loading transactions...</p>";
                accountBox.innerHTML = "<p>Loading account...</p>";
                analysis.innerHTML = "<p>Analyzing account...</p>";

                try {
                    const account = {
                        name: link.dataset.account,
                        debit: link.dataset.debit,
                        credit: link.dataset.credit,
                        transactions: []
                    };

                    const initialResponse = await manager.trialBalanceTransactions(link.dataset.link);
                    const ledger = await loadTransactionLedger(initialResponse, link.dataset.link);
                    const ledgerResponse = ledger.response;
                    const extracted = ledger.extracted;

                    account.transactions = extracted.transactions || [];
                    account.transactionLedgerAvailable = extracted.hasTransactionLedger === true;
                    account.transactionSource = ledger.source;
                    account.transactionLedgerHref = ledger.ledgerHref || null;
                    account.transactionDiagnostics = extracted.diagnostics || null;

                    const balanceCheck = checkBalance(account);

                    accountBox.innerHTML = `<pre>${JSON.stringify({
                        name: account.name,
                        debit: account.debit,
                        credit: account.credit,
                        transactionCount: account.transactions.length,
                        balanceSheetBalance: balanceCheck.balanceSheetBalance,
                        latestTransactionBalance: balanceCheck.transactionBalance,
                        difference: balanceCheck.difference,
                        balanceMatches: balanceCheck.matches,
                        transactionLedgerAvailable: account.transactionLedgerAvailable,
                        transactionSource: account.transactionSource,
                        transactionLedgerHref: account.transactionLedgerHref,
                        extractionReason: extracted.diagnostics?.reason || "",
                        tableCount: extracted.diagnostics?.tableCount ?? null,
                        selectedTableIndex: extracted.diagnostics?.selectedTableIndex ?? null,
                        transactionRowsDetected: extracted.diagnostics?.transactionRows ?? account.transactions.length
                    }, null, 4)}</pre>`;

                    const findings = audit.analyze(account);
                    analysis.innerHTML = renderBalanceCheck(balanceCheck) + audit.render(findings);

                    const table = extractTransactions(ledgerResponse?.body || ledger.html);
                    box.innerHTML = table || "<p>No transaction table found.</p>";
                } catch (err) {
                    console.error(err);
                    const message = `<p style="color:red">${err.message}</p>`;
                    accountBox.innerHTML = message;
                    analysis.innerHTML = message;
                    box.innerHTML = message;
                }
            };
        });
    } catch (e) {
        console.error(e);
        output.textContent = e.stack || e.message;
    }
}

start();
