SCHOOLTRACK EAPIHS — OFFLINE + SHARED SUPABASE STARTER
====================================================

This is a new installable web-app package. It is an offline-first STARTER, not a finished audited production system.

WHAT WORKS IN THIS PACKAGE
- Installable PWA shell with service-worker caching.
- Local inventory, report, and history storage using browser localStorage.
- Guest view and report submission.
- Admin-only local add/borrow/return/repair/delete/restore controls in the UI.
- Admin login checked by a Supabase Edge Function (the secret is not stored in app.js).
- Supabase schema and Edge Function starter.
- Manual sync button, automatic sync attempt when the device comes back online.
- JSON backup/restore, dashboard, search, theme switch.

IMPORTANT LIMITATIONS
- The sync implementation is a starter: it uploads the current local inventory and reports after Admin authentication. It does not yet implement a conflict-resolution algorithm or a durable per-operation sync protocol across multiple devices.
- Guest report submission is currently stored locally; server-side guest report submission endpoint must be added before reports can be shared from guest devices.
- Admin role is verified by an Edge Function token. Configure a strong admin code as an Edge Function secret.
- The included icon is a temporary SchoolTrack-style emblem, not a verified copy of your original uploaded logo.
- Sound controls, CSV export, custom dropdown options, full editing, report status workflow, and advanced audit controls are not included in this starter.
- Shared Supabase data requires internet. Offline app shell and local records work without internet on that device.
- Do not use sensitive student data in reports.
