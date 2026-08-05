const output = document.getElementById("output");

document.getElementById("scan").onclick = async () => {

    try {

        const r = await fetch("/api4/tabs");

        output.textContent =
            "Status: " + r.status + "\n\n" +
            await r.text();

    } catch (e) {

        output.textContent =
            "ERROR:\n\n" + e.toString();

    }

};