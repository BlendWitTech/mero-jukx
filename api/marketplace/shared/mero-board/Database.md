# Mero Board - Database

## Overview
Mero Board uses a hierarchical table structure to manage project data. All tables include `organization_id` for multi-tenant isolation.

## Core Tables

### 1. Workspaces (`board_workspaces`)
- `title`, `description`: Metadata.
- `type`: Enum (TEAM, PROJECT, PERSONAL).
- `organization_id`: Owner link.

### 2. Boards (`boards`)
- `title`, `color`, `background`: Branding.
- `workspace_id`: Parent workspace.
- `privacy`: Enum (PUBLIC, PRIVATE).

### 3. Lists (`board_lists`)
- `title`: Stage name (e.g., "To Do").
- `board_id`: Parent board.
- `position`: Order for sorting.

### 4. Tasks/Cards (`board_tasks`)
- `title`, `description`: Details.
- `list_id`: Current stage.
- `priority`: Enum (LOW, MEDIUM, HIGH, URGENT).
- `due_date`: Deadline.
- `assignees`: Link to users.

## Relationships
- **Workspaces** contain many **Boards**.
- **Boards** have many **Lists**.
- **Lists** contain many **Tasks**.
- **Tasks** can have many **Checklist Items** and **Attachments**.

## Migrations
- `1772000000000-boards.ts`
- `1778000000000-mero-board-workspaces.ts`
- `1779000000000-mero-board-task-features.ts`
- `1796000000002-AddBoardsAndColumns.ts`
