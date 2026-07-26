// ==========================================
// Manager AI
// Sidebar.js
// Version: 0.5.0
// ==========================================

const menuItems = [

    {
        id: "dashboard",
        icon: "📊",
        title: "Dashboard"
    },

    {
        id: "invoices",
        icon: "📄",
        title: "Invoices"
    },

    {
        id: "customers",
        icon: "👥",
        title: "Customers"
    },

    {
        id: "reports",
        icon: "📈",
        title: "Reports"
    },

    {
        id: "audit",
        icon: "🧾",
        title: "Audit"
    },

    {
        id: "copilot",
        icon: "🤖",
        title: "AI Copilot"
    },

    {
        id: "settings",
        icon: "⚙️",
        title: "Settings"
    }

];

export default function Sidebar() {

    const items = menuItems.map(item => `

        <button
            class="sidebar-item"
            data-page="${item.id}"
            type="button">

            <span class="sidebar-icon">

                ${item.icon}

            </span>

            <span class="sidebar-title">

                ${item.title}

            </span>

        </button>

    `).join("");

    return `

        <aside class="sidebar">

            <div class="sidebar-logo">

                <div class="logo-icon">

                    AI

                </div>

                <div>

                    <h2>Manager AI</h2>

                    <small>Accounting Copilot</small>

                </div>

            </div>

            <nav class="sidebar-menu">

                ${items}

            </nav>

            <div class="sidebar-footer">

                Version 0.5.0

            </div>

        </aside>

    `;

}