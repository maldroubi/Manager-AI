# Manager AI - Architecture

Version: 0.4

---

# Purpose

This document describes the software architecture of Manager AI.

It defines how data flows through the application, the responsibility of each module, and the development rules.

This file does NOT describe accounting logic.

Accounting decisions are documented in Project Context.md.

---

# Overall Architecture

```
Manager.io
        │
        ▼
 Manager API
        │
        ▼
 Trial Balance Loader
        │
        ▼
 Trial Balance Parser
        │
        ▼
 Account Scanner
        │
        ▼
 Transaction Loader
        │
        ▼
 Transaction Parser
        │
        ▼
 Audit Engine
        │
        ▼
 AI Analysis
        │
        ▼
 HTML Report
```

---

# Directory Structure

```
project/

│
├── index.html
├── script.js
├── manager-api.js
│
├── extractors/
│      trial-balance.js
│      transactions.js
│
├── auditors/
│      balance-auditor.js
│      anomaly-detector.js
│
├── ai/
│      ai-analysis.js
│
├── reports/
│      report-generator.js
│
├── utils/
│      html.js
│      numbers.js
│      dates.js
│
└── docs/
       Project Context.md
       Architecture.md
```

---

# Data Flow

```
Scan Company

↓

Load Trial Balance

↓

Extract Accounts

↓

User clicks Account

↓

Load Transactions

↓

Extract Transactions

↓

Normalize Data

↓

Run Audit Rules

↓

Send Summary to AI

↓

Generate Findings

↓

Display Report
```

---

# Module Responsibilities

## manager-api.js

Responsible for communication with Manager.io.

Responsibilities:

- API requests
- Session handling
- Trial Balance loading
- Report loading

Should NEVER contain:

- HTML parsing
- Audit logic
- AI prompts

---

## trial-balance.js

Input

Raw HTML

Output

```
[
{
name,
debit,
credit,
balance,
url
}
]
```

Only extracts data.

No analysis.

---

## transactions.js

Input

Transaction HTML

Output

```
[
{
date,
documentType,
documentNumber,
description,
amount,
balance
}
]
```

No accounting decisions.

No AI.

Extraction only.

---

## balance-auditor.js

Input

Account

Transactions

Output

Audit observations

Examples

```
Suspense account not cleared

Credit balance in Receivable

Inactive account

Duplicate entries
```

No HTML parsing.

---

## anomaly-detector.js

Statistical analysis only.

Examples

Repeated amount

Large outlier

Very old transaction

Abnormal activity

Unexpected document types

---

## ai-analysis.js

Input

Audit summary

Output

Human-readable explanation

Example

```
Inventory Clearing contains
275 transactions.

Balance has remained unchanged
for 14 months.

This account appears to require
manual review.
```

AI never parses HTML.

AI never calls Manager API.

---

## report-generator.js

Creates HTML sections.

Produces

Cards

Warnings

Recommendations

Risk Levels

Confidence Score

---

# Data Models

## Trial Balance Account

```
{
name

debit

credit

balance

url
}
```

---

## Transaction

```
{
date

documentType

documentNumber

description

amount

balance
}
```

---

## Audit Finding

```
{
severity

title

description

recommendation

confidence
}
```

---

# Development Rules

Every file has ONE responsibility.

Never mix:

Extraction

Analysis

Rendering

API

AI

---

# Parsing Rules

Always parse HTML inside extractor modules.

Never parse HTML inside UI.

Never parse HTML inside AI.

---

# UI Rules

UI only displays data.

UI never decides accounting logic.

UI never calculates anomalies.

---

# AI Rules

AI only receives structured JSON.

Never send raw HTML.

Never send DOM.

Never send complete pages.

---

# Error Handling

Every module returns

```
{
success

data

error
}
```

Never throw UI-breaking exceptions.

---

# Performance Rules

Load transactions only when required.

Never preload all accounts.

Avoid duplicate API requests.

Cache parsed transactions.

---

# Future Modules

planned/

```
journal-builder.js

account-classifier.js

balance-validator.js

audit-rules.js

risk-score.js

report-export.js

pdf-export.js

excel-export.js

history.js

cache.js
```

---

# Coding Style

Simple JavaScript

No frameworks

Small functions

Readable names

Minimal dependencies

Avoid unnecessary classes

Prefer pure functions

---

# Current Limitations

Journal View inside Manager.io is unreliable.

Audit must rely on transaction history.

Architecture is designed so Journal View can be added later if Manager.io exposes it correctly.

---

# Long-Term Goal

Manager AI should become an intelligent accounting audit assistant capable of reviewing an entire Balance Sheet automatically.

The software should identify potential accounting errors before the accountant discovers them.

The system assists judgement.

It never replaces professional accounting decisions.