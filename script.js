console.log("MANAGER-AI BUILD: 20260811-6-BALANCE-FIX");
const output = document.getElementById("output");


function extractTransactions(html) {

    const doc =
        new DOMParser().parseFromString(
            html,
            "text/html"
        );

    const table =
        doc.querySelector("table");

    if (!table)
        return null;

    return table.outerHTML;
}


/*
 * Manager sometimes opens an intermediate "summary-transactions" page
 * before exposing the real /transactions ledger.
 *
 * The audit engine must follow that link instead of treating the
 * intermediate page as the transaction ledger.
 */
function normalizeManagerPath(href) {

    if (!href)
        return "";

    try {

        const raw = String(href).trim();
        const url = new URL(raw, window.location.href);

        // IMPORTANT: keep an absolute Manager URL absolute.
        // The host application/proxy may need the original Manager origin;
        // converting it to a relative /transactions path can silently return
        // the wrong HTML page.
        if (/^https?:\/\//i.test(raw)) {
            return url.href;
        }

        return url.pathname + url.search;

    } catch (err) {

        return String(href);

    }

}


function findTransactionLedgerHref(html, sourcePath = "") {

    /*
     * Manager can open an account from several summary pages
     * (/summary-view, /summary-transactions, etc.).  In the current
     * Manager build the real ledger uses the SAME query string on
     * /transactions.  Therefore, when we have a Manager URL with a query,
     * prefer converting its pathname to /transactions instead of depending
     * on an anchor being present in the returned HTML.
     */
    const candidates = [];

    if (sourcePath) candidates.push(sourcePath);
    if (typeof window !== "undefined" && window.location?.href) {
        candidates.push(window.location.href);
    }

    for (const candidate of candidates) {
        try {
            const url = new URL(candidate, window.location.href);

            if (!url.search) continue;

            if (/\/transactions$/i.test(url.pathname)) {
                return normalizeManagerPath(url.href);
            }

            /*
             * For summary-view, summary-transactions, and similar Manager
             * account pages, preserve the complete query and switch only
             * the pathname to the real ledger endpoint.
             */
            if (
                /\/(?:summary-view|summary-transactions)(?:\/)?$/i.test(url.pathname) ||
                /summary/i.test(url.pathname)
            ) {
                url.pathname = "/transactions";
                return normalizeManagerPath(url.href);
            }
        } catch (err) {
            // Continue with HTML link discovery below.
        }
    }

    if (!html) return "";

    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = [...doc.querySelectorAll("a[href]")];

    /* Prefer an explicit direct /transactions link. */
    const explicit = links.find(a => {
        const text = (a.innerText || a.textContent || "").trim().toLowerCase();
        const href = a.getAttribute("href") || "";
        return (
            text === "transactions" &&
            /\/transactions(?:\?|$)/i.test(href) &&
            !/\/summary-transactions(?:\?|$)/i.test(href)
        );
    });

    if (explicit) return normalizeManagerPath(explicit.getAttribute("href"));

    /* Fallback: any direct /transactions URL. */
    const direct = links.find(a => {
        const href = a.getAttribute("href") || "";
        return (
            /\/transactions(?:\?|$)/i.test(href) &&
            !/\/summary-transactions(?:\?|$)/i.test(href)
        );
    });

    return direct ? normalizeManagerPath(direct.getAttribute("href")) : "";
}

async function loadTransactionLedger(
    initialResponse,
    initialPath = ""
) {

    let response =
        initialResponse;

    let html =
        response?.body || "";

    /*
     * First try the page we already received.
     */
    let extracted =
        extractor.extract(
            html
        );

    if (
        extracted.hasTransactionLedger
    ) {

        return {
            response,
            html,
            extracted,
            source: "direct"
        };

    }

    /*
     * If this is an intermediate Manager page,
     * follow its real Transactions link.
     */
    const sourcePath =
        initialPath ||
        response?.path ||
        response?.url ||
        initialResponse?.path ||
        initialResponse?.url ||
        "";

    const ledgerHref =
        findTransactionLedgerHref(
            html,
            sourcePath
        );

    if (!ledgerHref) {

        return {
            response,
            html,
            extracted,
            source: "unavailable"
        };

    }

    console.log("TRANSACTION LEDGER SOURCE PATH:", sourcePath);
    console.log("TRANSACTION LEDGER LINK:", ledgerHref);

    /*
     * Try the discovered ledger first.  Manager has used both /transactions
     * and /trial-balance-transactions in different builds, so if the first
     * page is valid HTML but still does not contain transaction rows, try the
     * alternate ledger endpoint with the exact same query string.
     */
    const candidateHrefs = [ledgerHref];

    try {
        const discoveredUrl = new URL(ledgerHref, window.location.href);
        const alternatePath = /\/transactions$/i.test(discoveredUrl.pathname)
            ? "/trial-balance-transactions"
            : "/transactions";
        discoveredUrl.pathname = alternatePath;
        const alternateHref = normalizeManagerPath(discoveredUrl.href);
        if (alternateHref && !candidateHrefs.includes(alternateHref)) {
            candidateHrefs.push(alternateHref);
        }
    } catch (err) {
        // Keep the discovered candidate only.
    }

    let lastResponse = null;
    let lastExtracted = extracted;
    let successfulHref = ledgerHref;

    for (const candidateHref of candidateHrefs) {
        console.log("TRANSACTION LEDGER REQUEST:", candidateHref);

        const candidateResponse =
            await manager
                .trialBalanceTransactions(candidateHref);

        lastResponse = candidateResponse;

        if (!candidateResponse || candidateResponse.status !== 200) {
            console.warn(
                "TRANSACTION LEDGER REQUEST FAILED:",
                candidateHref,
                candidateResponse?.status
            );
            continue;
        }

        const candidateHtml = candidateResponse.body || "";
        const candidateExtracted = extractor.extract(candidateHtml);
        lastExtracted = candidateExtracted;
        successfulHref = candidateHref;

        console.log("TRANSACTION LEDGER RESULT:", {
            href: candidateHref,
            status: candidateResponse.status,
            htmlLength: candidateHtml.length,
            transactions: candidateExtracted.transactions?.length || 0,
            hasTransactionLedger: candidateExtracted.hasTransactionLedger,
            tableCount: candidateExtracted.diagnostics?.tableCount,
            selectedTableIndex: candidateExtracted.diagnostics?.selectedTableIndex
        });

        if (candidateExtracted.hasTransactionLedger) {
            return {
                response: candidateResponse,
                html: candidateHtml,
                extracted: candidateExtracted,
                source: "followed-transactions-link",
                ledgerHref: candidateHref
            };
        }
    }

    return {
        response: lastResponse || response,
        html: lastResponse?.body || html,
        extracted: lastExtracted,
        source: lastResponse?.status === 200
            ? "ledger-page-without-transactions"
            : "ledger-request-failed",
        ledgerHref: successfulHref
    };

}


/*
 * Convert money text into a number.
 *
 * Examples:
 * 25,000.00
 * AED 25,000.00
 * 25,000.00 Dr
 * 25,000.00 Cr
 */
function parseMoney(value) {

    if (
        value === null ||
        value === undefined
    )
        return 0;

    const cleaned =
        String(value)
            .replace(/,/g, "")
            .replace(/[^\d.\-]/g, "");

    const number =
        parseFloat(cleaned);

    return Number.isNaN(number)
        ? 0
        : number;
}


/*
 * Convert transaction balance into
 * a signed number.
 *
 * Debit  = positive
 * Credit = negative
 */
function parseSignedBalance(value) {

    if (
        value === null ||
        value === undefined
    )
        return 0;

    const text =
        String(value).toLowerCase();

    const amount =
        parseMoney(value);

    if (text.includes("cr"))
        return -amount;

    return amount;
}


/*
 * Balance Sheet balance.
 *
 * Debit  = positive
 * Credit = negative
 */
function getBalanceSheetBalance(account) {

    const debit =
        parseMoney(account.debit);

    const credit =
        parseMoney(account.credit);

    return debit - credit;
}


/*
 * Convert Manager date:
 *
 * DD-MM-YYYY
 *
 * into timestamp.
 */
function parseTransactionDate(value) {

    if (!value)
        return 0;

    const text =
        String(value).trim();

    const match =
        text.match(
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        );

    if (match) {

        const day =
            Number(match[1]);

        const month =
            Number(match[2]) - 1;

        const year =
            Number(match[3]);

        return new Date(
            year,
            month,
            day
        ).getTime();
    }

    const timestamp =
        Date.parse(text);

    return Number.isNaN(timestamp)
        ? 0
        : timestamp;
}


/*
 * Find the latest transaction
 * by date.
 */
function getLatestTransaction(
    transactions
) {

    if (
        !Array.isArray(transactions) ||
        transactions.length === 0
    )
        return null;


    let latest =
        transactions[0];

    let latestTime =
        parseTransactionDate(
            latest.date
        );


    for (
        const transaction
        of transactions
    ) {

        const time =
            parseTransactionDate(
                transaction.date
            );


        if (time > latestTime) {

            latest =
                transaction;

            latestTime =
                time;
        }
    }


    return latest;
}


/*
 * Compare Balance Sheet balance
 * with latest transaction balance.
 */
function checkBalance(
    account,
    finalBalance,
    hasTransactionLedger
) {

    const balanceSheetBalance =
        getBalanceSheetBalance(account);


    // -----------------------------------------
    // No transaction ledger available
    // -----------------------------------------

    if (!hasTransactionLedger) {

        return {

            available: false,

            balanceSheetBalance,

            transactionBalance: null,

            difference: null,

            matches: null,

            transaction: null,

            reason:
                "Transaction ledger is not available on this page."

        };
    }


    // -----------------------------------------
    // Ledger exists but final balance
    // could not be extracted
    // -----------------------------------------

    if (
        !finalBalance ||
        finalBalance.value === undefined
    ) {

        return {

            available: false,

            balanceSheetBalance,

            transactionBalance: null,

            difference: null,

            matches: null,

            transaction: null,

            reason:
                "Transaction ledger found, but final balance could not be extracted."

        };
    }


    // -----------------------------------------
    // Normal comparison
    // -----------------------------------------

    const transactionBalance =
        Number(finalBalance.value) || 0;


    const difference =
        balanceSheetBalance -
        transactionBalance;


    return {

        available: true,

        balanceSheetBalance,

        transactionBalance,

        difference,

        matches:
            Math.abs(difference) < 0.01,

        transaction: null

    };
}


/*
 * Format amount for display.
 */
function formatMoney(value) {

    if (
        value === null ||
        value === undefined
    )
        return "-";


    return Number(value)
        .toLocaleString(
            "en-US",
            {
                minimumFractionDigits: 2,

                maximumFractionDigits: 2
            }
        );
}


/*
 * Render Balance Check.
 */
function renderBalanceCheck(check) {

    if (!check.available) {

        return `

            <div style="
                margin-bottom:16px;
                padding:16px;
                border:1px solid #ddd;
                border-radius:6px;
            ">

                <h3>
                    Balance Check
                </h3>

                <p>
                    No transaction balance
                    was available for comparison.
                </p>

            </div>

        `;
    }


    if (check.matches) {

        return `

            <div style="
                margin-bottom:16px;
                padding:16px;
                border:1px solid #c8e6c9;
                border-radius:6px;
            ">

                <h3 style="color:#2e7d32;">

                    ✓ Balance Matches

                </h3>


                <p>

                    <strong>
                        Balance Sheet:
                    </strong>

                    ${formatMoney(
                        check.balanceSheetBalance
                    )}

                </p>


                <p>

                    <strong>
                        Latest Transaction Balance:
                    </strong>

                    ${formatMoney(
                        check.transactionBalance
                    )}

                </p>


                <p>

                    <strong>
                        Difference:
                    </strong>

                    0.00

                </p>


                <p>

                    <strong>
                        Latest Transaction:
                    </strong>

                    ${
                        check.transaction?.date ||
                        "-"
                    }

                </p>

            </div>

        `;
    }


    return `

        <div style="
            margin-bottom:16px;
            padding:16px;
            border:1px solid #f0c36d;
            border-radius:6px;
        ">

            <h3 style="color:#c65d00;">

                ⚠ Balance Difference Detected

            </h3>


            <p>

                <strong>
                    Balance Sheet:
                </strong>

                ${formatMoney(
                    check.balanceSheetBalance
                )}

            </p>


            <p>

                <strong>
                    Latest Transaction Balance:
                </strong>

                ${formatMoney(
                    check.transactionBalance
                )}

            </p>


            <p>

                <strong>
                    Difference:
                </strong>

                ${formatMoney(
                    check.difference
                )}

            </p>


            <p>

                <strong>
                    Latest Transaction:
                </strong>

                ${
                    check.transaction?.date ||
                    "-"
                }

            </p>

        </div>

    `;
}


async function start() {


    /*
     * Remove old static containers
     * that may still exist in index.html.
     */

    document
        .getElementById(
            "transactions"
        )
        ?.remove();


    document
        .getElementById(
            "analysis"
        )
        ?.remove();


    output.innerHTML =
        "<p>Loading Trial Balance...</p>";


    try {


        const report =
            await reports
                .getTrialBalanceReport();


        const response =
            await manager
                .getTrialBalanceView(
                    report.item.key
                );


        if (
            response.status !== 200
        )

            throw new Error(
                "Failed to load Trial Balance View"
            );


        const view =
            response.body;


        const flatRows = [];


        function collectRows(node) {

            if (
                !node ||
                !Array.isArray(
                    node.items
                )
            )
                return;


            for (
                const row
                of node.items
            ) {


                if (row.cells)
                    flatRows.push(row);


                if (row.rows)
                    collectRows(
                        row.rows
                    );

            }

        }


        collectRows(
            view.rows
        );


        const accounts =
            flatRows.map(
                row => {

                    const cells =
                        row.cells || [];


                    return {

                        account:
                            row.displayName ||
                            "",


                        debit:
                            cells[0]?.text ||
                            "",


                        credit:
                            cells[1]?.text ||
                            "",


                        debitLink:
                            cells[0]?.link?.href ||
                            "",


                        creditLink:
                            cells[1]?.link?.href ||
                            ""

                    };

                }
            );


        let html = `

            <h2>
                Trial Balance
            </h2>


            <table>

                <thead>

                    <tr>

                        <th>
                            Account
                        </th>


                        <th>
                            Debit
                        </th>


                        <th>
                            Credit
                        </th>

                    </tr>

                </thead>


                <tbody>

        `;


        for (
            const a
            of accounts
        ) {


            html += `

                <tr>

                    <td>
                        ${a.account}
                    </td>


                    <td>

                        ${
                            a.debitLink

                            ?

                            `

                            <a
                                href="#"

                                data-link="${a.debitLink}"

                                data-account="${a.account}"

                                data-debit="${a.debit}"

                                data-credit="${a.credit}"
                            >

                                ${a.debit}

                            </a>

                            `

                            :

                            a.debit
                        }

                    </td>


                    <td>

                        ${
                            a.creditLink

                            ?

                            `

                            <a
                                href="#"

                                data-link="${a.creditLink}"

                                data-account="${a.account}"

                                data-debit="${a.debit}"

                                data-credit="${a.credit}"
                            >

                                ${a.credit}

                            </a>

                            `

                            :

                            a.credit
                        }

                    </td>

                </tr>

            `;

        }


        html += `

                </tbody>

            </table>


            <hr>


            <h2>
                Transactions
            </h2>


            <div id="transactions">

                <p>
                    Select an amount
                    to load transactions.
                </p>

            </div>


            <hr>


            <h2>
                Account Being Audited
            </h2>


            <div id="account-audited">

                <p>
                    Select an account
                    to audit.
                </p>

            </div>


            <hr>


            <h2>
                Audit Findings
            </h2>


            <div id="analysis">

                <p>
                    Select an account
                    to audit.
                </p>

            </div>

        `;


        output.innerHTML =
            html;


        output
            .querySelectorAll(
                "a[data-link]"
            )
            .forEach(
                link => {


                    link.onclick =
                        async e => {

                            e.preventDefault();


                            const box =
                                document
                                    .getElementById(
                                        "transactions"
                                    );


                            const accountBox =
                                document
                                    .getElementById(
                                        "account-audited"
                                    );


                            const analysis =
                                document
                                    .getElementById(
                                        "analysis"
                                    );


                            box.innerHTML =
                                "<p>Loading transactions...</p>";


                            accountBox.innerHTML =
                                "<p>Loading account...</p>";


                            analysis.innerHTML =
                                "<p>Analyzing account...</p>";


                            try {


                                /*
                                 * Selected account
                                 */

                                const account = {

                                    name:
                                        link.dataset.account,

                                    debit:
                                        link.dataset.debit,

                                    credit:
                                        link.dataset.credit,

                                    transactions: []

                                };


                                /*
                                 * Load transactions
                                 */
                                const initialResponse =
                                    await manager
                                        .trialBalanceTransactions(
                                            link.dataset.link
                                        );


                                /*
                                 * Load the actual transaction ledger.
                                 *
                                 * Some Manager pages return an intermediate
                                 * summary-transactions page first. Follow its
                                 * real /transactions link before running the
                                 * extractor.
                                 */
                                const ledger =
                                    await loadTransactionLedger(
                                        initialResponse,
                                        link.dataset.link
                                    );


                                const response =
                                    ledger.response;


                                const extracted =
                                    ledger.extracted;


                                account.transactions =
                                    extracted.transactions || [];

                                account.transactionLedgerAvailable =
                                    extracted.hasTransactionLedger === true;

                                account.transactionMeta =
                                    extracted.diagnostics || {
                                        reason:
                                            extracted.hasTransactionLedger
                                                ? "Transaction ledger detected and transactions extracted."
                                                : "Transaction ledger is not available or could not be extracted.",
                                        tableCount: null,
                                        selectedTableIndex: null,
                                        transactionRows:
                                            account.transactions.length
                                    };

                                account.transactionMeta.transactionSource =
                                    ledger.source;

                                if (ledger.ledgerHref) {
                                    account.transactionMeta.ledgerHref =
                                        ledger.ledgerHref;
                                }

                                const balanceCheck = checkBalance(
                                    account,
                                    extracted.finalBalance,
                                    extracted.hasTransactionLedger
                                );


                                /*
                                 * Account information
                                 */

                                accountBox.innerHTML = `

                                    <pre>${JSON.stringify(

                                        {

                                            name:
                                                account.name,


                                            debit:
                                                account.debit,


                                            credit:
                                                account.credit,


                                            transactionCount:
                                                account
                                                    .transactions
                                                    .length,


                                            balanceSheetBalance:
                                                balanceCheck
                                                    .balanceSheetBalance,


                                            latestTransactionBalance:
                                                balanceCheck
                                                    .transactionBalance,

                                            extractedFinalBalance:
                                                extracted.finalBalance || null,


                                            difference:
                                                balanceCheck
                                                    .difference,


                                            balanceMatches:
                                                balanceCheck
                                                    .matches,

                                            transactionLedgerAvailable:
                                                account.transactionLedgerAvailable,

                                            transactionSource:
                                                account.transactionMeta.transactionSource ||
                                                (account.transactionLedgerAvailable
                                                    ? "transaction-ledger"
                                                    : "not-available"),

                                            extractionReason:
                                                account.transactionMeta.reason || "",

                                            tableCount:
                                                account.transactionMeta.tableCount ?? null,

                                            selectedTableIndex:
                                                account.transactionMeta.selectedTableIndex ?? null,

                                            transactionRowsDetected:
                                                account.transactionMeta.transactionRows ?? 0,

                                            bodyHtmlLength:
                                                account.transactionMeta.bodyHtmlLength ?? null,

                                            rowLikeCount:
                                                account.transactionMeta.rowLikeCount ?? null,

                                            tableCandidates:
                                                account.transactionMeta.candidates ?? [],

                                            rowLikeSamples:
                                                account.transactionMeta.rowLikeSamples ?? []

                                        },

                                        null,

                                        4

                                    )}</pre>

                                `;


                                /*
                                 * Existing audit engine
                                 */

                                const findings =
                                    audit.analyze(
                                        account
                                    );


                                /*
                                 * Show Balance Check
                                 * + existing findings
                                 */

                                analysis.innerHTML =

                                    renderBalanceCheck(
                                        balanceCheck
                                    )

                                    +

                                    audit.render(
                                        findings
                                    );


                                /*
                                 * Display transactions
                                 */

                                const table =
                                    extractTransactions(
                                        response.body
                                    );


                                if (!table) {

                                    box.innerHTML =
                                        "<p>No transaction table found.</p>";

                                    return;

                                }


                                box.innerHTML =
                                    table;

                            }


                            catch (err) {

                                console.error(
                                    err
                                );


                                accountBox.innerHTML = `

                                    <p style="color:red">

                                        ${err.message}

                                    </p>

                                `;


                                analysis.innerHTML = `

                                    <p style="color:red">

                                        ${err.message}

                                    </p>

                                `;


                                box.innerHTML = `

                                    <p style="color:red">

                                        ${err.message}

                                    </p>

                                `;

                            }

                        };

                }
            );

    }


    catch (e) {

        console.error(
            e
        );


        output.textContent =
            e.stack ||
            e.message;

    }

}


start();


