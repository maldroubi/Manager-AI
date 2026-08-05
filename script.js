const output = document.getElementById("output");

async function start() {

    output.textContent = "Connecting to Manager...";

    try {

        const r = await fetch("/api4/tabs");

        output.textContent =
            "HTTP " + r.status + "\n\n" +
            await r.text();

    } catch (e) {

        output.textContent = e.toString();

    }

}

start();