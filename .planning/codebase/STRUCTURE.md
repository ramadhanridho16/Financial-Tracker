# Codebase Structure

```
Financial Tracker/
├── .clasp.json                  # Clasp configuration for Apps Script synchronization
├── .gitignore                   # Git ignore rules
├── AGENTS.md                    # Mandatory rules and reading list for AI agents
├── README.md                    # Project overview
├── docs/                        # Project documentation
│   ├── AI_CONTEXT.md            # Guidelines for AI development & architectural rules
│   ├── CODING_STANDARD.md       # Mandatory coding standards & constraints (<=50 lines, JSDoc, pure parser)
│   ├── PARSER.md                # Natural language parser specifications, normalizer, and loan wizard
│   ├── PROJECT.md               # Project goals, scope, and feature set
│   ├── ROADMAP.md               # Feature roadmap across milestones
│   └── SHEETS.md                # Spreadsheet schema documentation (Transactions, Loans 13-col, etc.)
├── src/                         # Google Apps Script Source Code
│   ├── appsscript.json          # GAS manifest (V8 runtime, timezone, public webapp config)
│   ├── Category.js              # Dictionary engine and keyword category classification
│   ├── bootstrap/
│   │   └── Main.js              # Application entrypoint / controller & testing triggers
│   ├── config/
│   │   └── Config.js            # Global configuration (sheet names, constants, defaults, Telegram token)
│   ├── core/
│   │   └── Utilities.js         # Core utilities (formatting, parsing, dates, settings, ID generator)
│   ├── normalizer/
│   │   └── Normalizer.js        # Indonesian slang & numeric shorthand normalizer ('k', 'rb', 'jt')
│   ├── parser/
│   │   ├── Parser.js            # Pure natural language transaction parser
│   │   └── ParsingStatus.js     # Form response parsing status tracking
│   ├── repositories/
│   │   ├── ArchiveRepository.js # Spreadsheet & Drive persistence for archives
│   │   ├── DashboardRepository.js # Visual layout, KPI cards, tables & chart for Dashboard
│   │   ├── HomeInventory.js     # External inventory spreadsheet persistence
│   │   ├── OcrRepository.js     # Google Drive OCR temporary file converter
│   │   └── TelegramRepository.js# Telegram Bot HTTP API client (sendMessage, getFile, download, etc.)
│   ├── services/
│   │   ├── ArchiveService.js    # Archiving business logic & CSV ZIP builder
│   │   ├── BotCommands.js       # Telegram slash command registry & handler dispatcher
│   │   ├── Budget.js            # Budget service & limit tracking
│   │   ├── Dashboard.js         # Financial metrics & category consumption analysis
│   │   ├── InventorySync.js     # Inventory purchase detection & cross-sheet sync
│   │   ├── Loan.js              # Loan service (13-column schema, economic calculations, auto-settlement, calendar)
│   │   ├── LoanWizardService.js # Conversational loan wizard state machine via Script Cache
│   │   ├── OcrService.js        # Receipt image extraction, total amount & merchant regex parser
│   │   ├── RecurringTransaction.js # Recurring transactions scheduler
│   │   ├── Report.js            # Financial reports generator
│   │   ├── TelegramBot.js       # Telegram update router, receipt formatter, deduplication, reminders
│   │   ├── Transaction.js       # Transaction CRUD & classification
│   │   └── Wallet.js            # Wallet balance calculations & ledger updates
│   ├── trigger/
│   │   ├── Setup.js             # Sheet initialization, headers & clock trigger installers
│   │   ├── Trigger.js           # Trigger event router (onFormSubmit, onLoanSubmit)
│   │   └── Webhook.js           # Web App HTTP endpoint (doGet & doPost) & simulator
│   └── ui/
│       └── Form.js              # Form response extraction utilities
└── .planning/                   # GSD Planning directory
    ├── codebase/                # Codebase intelligence & architecture maps
    ├── onboarding/              # Onboarding artifacts & summary
    └── phases/                  # Phase execution plans & research
```
