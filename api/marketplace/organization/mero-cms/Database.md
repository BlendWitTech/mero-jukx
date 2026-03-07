# Mero CMS - Database

## Core Tables
- `cms_pages`: Stores layouts and metadata for web pages.
- `cms_posts`: Blog content and revisions.
- `cms_media`: References to uploaded files.
- `cms_forms`: Form definitions and submission storage.
- `cms_settings`: Domain mapping and theme configurations.

All tables are multi-tenant and isolated via `organization_id`.
