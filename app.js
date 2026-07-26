import Audit from "./pages/Audit.js";

import "./manager.js";

import "./style.css";

window.addEventListener("DOMContentLoaded", async () => {

    const app = document.getElementById("app");

    if (!app) {
        console.error("App container not found.");
        return;
    }

    app.innerHTML = "";

    try {

        const page = Audit();

        app.appendChild(page);

        console.log("Manager AI loaded.");

    } catch (error) {

        console.error(error);

        app.innerHTML = `
            <div style="
                padding:20px;
                color:red;
                font-family:sans-serif;
            ">
                <h2>Application Error</h2>
                <pre>${error.message}</pre>
            </div>
        `;

    }

});