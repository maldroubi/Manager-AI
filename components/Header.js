// ==========================================
// Manager AI
// Header.js
// Version: 0.5.0
// ==========================================

export default function Header({

    title = "Manager AI",
    connected = false

} = {}) {

    const status = connected
        ? "Connected"
        : "Offline";

    const statusClass = connected
        ? "status-online"
        : "status-offline";

    return `

<header class="header">

    <div class="header-left">

        <h1 class="page-title">

            ${title}

        </h1>

    </div>

    <div class="header-right">

        <div class="connection-status ${statusClass}">

            <span class="status-dot"></span>

            ${status}

        </div>

    </div>

</header>

`;

}