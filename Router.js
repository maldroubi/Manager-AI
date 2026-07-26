// ==========================================
// Manager AI
// Router.js
// Version: 0.5.0
// ==========================================

export default class Router {

    constructor(container) {

        this.container = container;
        this.routes = {};

    }

    /**
     * Register a page
     * @param {string} name
     * @param {Function} component
     */
    register(name, component) {

        this.routes[name] = component;

    }

    /**
     * Navigate to page
     * @param {string} name
     * @param {object} state
     */
    navigate(name, state = {}) {

        const page = this.routes[name];

        if (!page) {

            this.show404(name);
            return;

        }

        try {

            this.container.innerHTML = page(state);

        } catch (error) {

            console.error(error);

            this.showError(error);

        }

    }

    /**
     * Page not found
     */
    show404(name) {

        this.container.innerHTML = `

            <div class="page">

                <h2>404</h2>

                <p>Page "${name}" not found.</p>

            </div>

        `;

    }

    /**
     * Render runtime errors
     */
    showError(error) {

        this.container.innerHTML = `

            <div class="page">

                <h2>Application Error</h2>

                <pre>${error.message}</pre>

            </div>

        `;

    }

}