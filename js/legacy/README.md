# Legacy scripts (deprecated)

These files were used by the previous non-modular HMS implementation. **Do not use in new code.**

The application now runs on:

- **js/core/** – AppState, Router, StorageAdapter, ValidationEngine, ui-components
- **js/services/** – InventoryService, EquipmentService, BillingService, ExpensesService, CaseNotesService, AppointmentService, PrescriptionService
- **js/features/** – admin-dashboard, doctor-dashboard, pharmacy-dashboard, navigation-shell
- **js/entry/** – admin-app.js, doctor-app.js, pharmacy-app.js

HTML shells load only the corresponding entry module (e.g. `admin-portal/hms-dashboard.html` → `js/entry/admin-app.js`). All persistence goes through AppState and StorageAdapter.

| Legacy file     | Replaced by |
|-----------------|-------------|
| inventory.js    | services/inventory-service.js + features/admin-dashboard.js, features/pharmacy-dashboard.js |
| billing.js      | services/billing-service.js + features/admin-dashboard.js |
| equipment.js    | services/equipment-service.js + features/admin-dashboard.js |
| expenses.js     | services/expenses-service.js + features/admin-dashboard.js |
| case-notes.js   | services/case-notes-service.js + features/admin-dashboard.js |
| backup.js       | features/admin-dashboard.js (export from AppState) |
| pharmacy-prescriptions.js | services/prescription-service.js + features/pharmacy-dashboard.js |

You can delete these legacy files once you are satisfied the new flow is stable.
