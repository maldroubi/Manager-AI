import EmptyInvoiceRule from "./rules/EmptyInvoiceRule.js";
import MissingCustomerRule from "./rules/MissingCustomerRule.js";
import InvalidQuantityRule from "./rules/InvalidQuantityRule.js";
import MissingRevenueAccountRule from "./rules/MissingRevenueAccountRule.js";

export default [
    EmptyInvoiceRule,
    MissingCustomerRule,
    InvalidQuantityRule,
    MissingRevenueAccountRule
];