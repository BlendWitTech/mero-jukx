# Mero CMS - Architecture

## Overview
Mero CMS is built as a highly integrated module that leverages the core organization data. It uses a **Theme Engine** and a **Page Builder** to allow tenants to customize their sub-domains or custom domains.

## Core Components
- **Page Engine**: Renders dynamic content based on stored JSON layouts.
- **Media Controller**: Interfaces with the global S3/Storage service.
- **Form Service**: Powers lead capture and syncs with CRM.

## Deployment
The CMS is served via a reverse proxy or a specialized frontend router that maps tenant IDs to their specific content paths.
