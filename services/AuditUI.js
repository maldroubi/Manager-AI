import AuditEngine from "./AuditEngine.js";

export default class AuditUI {

    static async start() {

        const output = document.getElementById("result");

        if (!output) {
            console.error("Result element not found.");
            return;
        }

        output.textContent = "Loading...";

        try {

            const results = await AuditEngine.scan();

            let html = "";

            results.forEach(item => {

                html += `
================================
Level : ${item.level}

${item.title}

${item.description}

`;

            });

            output.textContent = html;

        }
        catch (error) {

            console.error(error);

            output.textContent = error.message;

        }

    }

}