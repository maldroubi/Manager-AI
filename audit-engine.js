// audit-engine.js

class AuditEngine {

    analyze(trialBalance) {

        const errors = [];

        if (!trialBalance) {

            errors.push({
                type: "system",
                message: "No Trial Balance loaded."
            });

            return errors;
        }

        return errors;

    }

}

const audit = new AuditEngine();