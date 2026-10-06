# Codebase Structure

```
Financial Tracker/
├── .clasp.json                  # Clasp configuration for Apps Script synchronization
├── .gitignore                   # Git ignore rules
├── AGENTS.md                    # Mandatory rules and reading list for AI agents
├── README.md                    # Project overview
├── docs/                        # Project documentation
│   ├── AI_CONTEXT.md            # Guidelines for AI development
│   ├── API.md                   # Public services API definitions
│   ├── ARCHITECTURE.md          # Core architecture diagram & layers
│   ├── CHANGELOG.md             # Version history
│   ├── CODING_STANDARD.md       # Mandatory coding standards & constraints
│   ├── PARSER.md                # Parser rules and specifications
│   ├── PROJECT.md               # Project goals and scope
│   ├── ROADMAP.md               # Feature roadmap
│   ├── SHEETS.md                # Spreadsheet schema documentation
│   └── WORKFLOW.md              # Transaction and transfer workflows
├── src/                         # Google Apps Script Source Code
│   ├── appsscript.json          # GAS manifest (V8 runtime, timezone)
│   ├── Category.js              # Dictionary engine and category classification
│   ├── bootstrap/
│   │   └── Main.js              # Application entrypoint / controller
│   ├── config/
│   │   └── Config.js            # Global configuration (sheet names, constants, defaults)
│   ├── core/
│   │   └── Utilities.js         # Core utilities (formatting, parsing, dates, settings)
│   ├── normalizer/
│   │   └── Normalizer.js        # Voice & text normalization engine
│   ├── parser/
│   │   ├── Parser.js            # Natural language transaction parser
│   │   └── ParsingStatus.js     # Form response parsing status tracking
│   ├── repositories/
│   │   ├── ArchiveRepository.js # Spreadsheet & Drive persistence for archives
│   │   ├── DashboardRepository.js # Visual layout, KPI cards, tables & chart for Dashboard
│   │   └── HomeInventory.js     # External inventory spreadsheet persistence
│   ├── services/
│   │   ├── ArchiveService.js    # Archiving business logic & CSV ZIP builder
│   │   ├── Budget.js            # Budget service & limit tracking
│   │   ├── Dashboard.js         # Financial metrics & category consumption analysis
│   │   ├── InventorySync.js     # Inventory purchase detection & synchronization
│   │   ├── Loan.js              # Loan service
│   │   ├── RecurringTransaction.js # Recurring transactions scheduler
│   │   ├── Report.js            # Financial reports generator
│   │   ├── Transaction.js       # Transaction CRUD & classification
│   │   └── Wallet.js            # Wallet balance calculations
│   ├── trigger/
│   │   ├── Setup.js             # Sheet initialization, headers & trigger installation
│   │   └── Trigger.js           # Trigger event router (onFormSubmit, onLoanSubmit)
│   └── ui/
│       └── Form.js              # Form response extraction utilities
└── .planning/                   # GSD Planning directory
    ├── codebase/                # Codebase intelligence & map
    └── onboarding/              # Onboarding artifacts & summary
```
