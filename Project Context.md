# Manager AI - Project Context

Version: 0.4
Status: Active Development

---

# Project Goal

Manager AI is an accounting auditing assistant built on top of Manager.io.

The objective is NOT to replace the accountant.

The objective is to discover accounting mistakes inside the Balance Sheet using AI.

The AI should behave like a senior auditor reviewing the books.

---

# Main Philosophy

The project does NOT analyze profitability.

The project does NOT generate financial reports.

The project does NOT perform KPI analysis.

The project focuses only on:

• Incorrect accounting postings
• Misclassified balance sheet accounts
• Suspicious balances
• Clearing accounts
• Suspense accounts
• Long outstanding balances
• Unusual account behaviour
• Possible accounting errors

Everything else is secondary.

---

# Current Architecture

Manager.io
        │
        ▼
Manager API
        │
        ▼
Trial Balance
        │
        ▼
Account
        │
        ▼
Transactions
        │
        ▼
AI Audit Engine
        │
        ▼
Audit Findings

---

# Current API

manager-api.js

Available methods:

- trialBalanceBatch()
- getTrialBalanceView(key)
- createTrialBalance()
- updateTrialBalance()

Additional APIs can be added later.

---

# Current UI

Scan Company

↓

Load Trial Balance

↓

Click any balance

↓

Load Transactions

↓

AI Analysis

---

# Important Discovery

Originally the project attempted:

Trial Balance
↓

Transactions
↓

View Journal Entry

↓

Analyze Journal

This approach was abandoned because the View page inside Manager.io is not accessible.

Observed behaviour:

- View opens a broken page.
- Direct link returns 404.
- Embedded page refuses connection.
- Therefore Journal View cannot be relied upon.

Decision:

Never depend on View.

Always analyze Transactions directly.

---

# New Audit Strategy

Every account is audited using its transaction history.

AI receives:

Account Name

Current Balance

Transaction Count

Transaction Dates

Document Types

Descriptions

Amounts

Running Balance

Posting Pattern

Then AI decides if the account deserves attention.

---

# What AI Should Detect

Examples:

1.

Suspense accounts with remaining balance.

2.

Negative inventory clearing not cleared.

3.

Accounts receivable with abnormal credit balance.

4.

Accounts payable with abnormal debit balance.

5.

Fixed assets receiving frequent operational postings.

6.

Capital accounts changing frequently.

7.

Clearing accounts never reaching zero.

8.

Duplicate transactions.

9.

Repeated unusual amounts.

10.

Very old balances.

11.

Inactive balance sheet accounts.

12.

Large number of tiny transactions.

13.

Unexpected document types.

14.

Abnormal movement pattern.

15.

Possible posting mistakes.

---

# What AI Should NOT Do

Do NOT:

Analyse monthly revenue.

Analyse sales trends.

Analyse business performance.

Explain profit changes.

Create management reports.

Predict future revenue.

Focus on P&L.

These are outside the project scope.

---

# Balance Sheet Priority

Highest priority:

Cash

Bank

Receivables

Payables

Inventory

Fixed Assets

Loans

VAT

Capital

Retained Earnings

Suspense

Clearing Accounts

Intercompany

Investments

Other Balance Sheet Accounts

Income Statement accounts are only inspected if they affect Balance Sheet integrity.

---

# AI Behaviour

The AI should think like:

Senior External Auditor

not

Financial Analyst

Every finding must answer:

"Could this indicate an accounting mistake?"

rather than

"Is this business performing well?"

---

# Coding Rules

Keep code simple.

Avoid unnecessary abstractions.

Avoid frameworks.

Prefer readable JavaScript.

Avoid overengineering.

Always keep HTML parsing isolated.

Every extractor should have one responsibility.

---

# Future Modules

transaction-loader.js

transaction-parser.js

balance-auditor.js

anomaly-detector.js

audit-engine.js

ai-analysis.js

report-generator.js

---

# Long-term Vision

Manager AI becomes an intelligent audit assistant capable of reviewing an entire company's balance sheet automatically and producing audit findings comparable to those of an experienced accountant.

The system should explain:

What looks wrong.

Why it is suspicious.

Accounting reasoning.

Suggested investigation.

Suggested correction.

Confidence level.

The goal is not automation.

The goal is better accounting judgement.
