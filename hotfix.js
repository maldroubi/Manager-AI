// Manager-AI transaction ledger routing hotfix.
// Some Manager builds expose an intermediate /summary-transactions URL.
// Route that request directly to the real /transactions ledger while
// preserving the complete query string.
(function () {
    if (!window.manager || typeof window.manager.trialBalanceTransactions !== "function") {
        console.warn("[Manager AI] transaction hotfix: manager API not ready");
        return;
    }

    const original = window.manager.trialBalanceTransactions.bind(window.manager);

    window.manager.trialBalanceTransactions = async function (path) {
        try {
            const url = new URL(String(path || ""), window.location.href);
            if (/\/summary-transactions\/?$/i.test(url.pathname)) {
                url.pathname = "/transactions";
                console.log("[Manager AI] hotfix: summary-transactions ->", url.href);
                return await original(url.pathname + url.search + url.hash);
            }
        } catch (err) {
            console.warn("[Manager AI] transaction hotfix normalization failed", err);
        }

        return await original(path);
    };

    console.log("[Manager AI] transaction ledger routing hotfix loaded");
})();
