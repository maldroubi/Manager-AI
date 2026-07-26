import AuditEngine from "./services/AuditEngine.js";

class ManagerAI {

    constructor() {

        this.button = document.getElementById("startButton");
        this.output = document.getElementById("result");

        if (!this.button || !this.output) {
            console.error("UI not found.");
            return;
        }

        this.button.addEventListener("click", () => {
            this.runAudit();
        });

        this.output.textContent = "Manager AI is ready.";

    }

    async runAudit() {

        this.output.textContent = "Running audit...";

        try {

            const results = await AuditEngine.scan();

            if (!results.length) {
                this.output.textContent = "No audit results.";
                return;
            }

            let text = "";

            results.forEach(item => {

                text +=
`================================

Level : ${item.level}

${item.title}

${item.description}

`;

            });

            this.output.textContent = text;

        }
        catch (error) {

            console.error(error);

            this.output.textContent =
                "ERROR:\n\n" + error.message;

        }

    }

}

window.addEventListener("DOMContentLoaded", () => {

    new ManagerAI();

});