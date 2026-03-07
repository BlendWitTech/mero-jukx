# Mero Board - Architecture

## Module Structure
Mero Board is implemented as a shared application in the marketplace, meaning its core logic is designed to be utilized across various organizational contexts. It is located in `api/marketplace/shared/mero-board`.

### Core Components
- **MeroBoardModule**: Main entry point.
- **Workspaces**: High-level containers for categorization.
- **Boards**: The primary visualization unit.
- **Lists**: Vertical stages within a board.
- **Tasks (Cards)**: The atomic unit of work.

## Multi-Tenancy & Shared Design
Although logicaly a "shared" app, it strictly enforces row-level isolation using `organization_id`. The shared nature allows for future features like cross-organization collaboration if enabled.

## Real-time Sync
The architecture supports WebSocket-based real-time updates for:
- Card movement between lists.
- New comment notifications.
- Checklist progress updates.

## Integration Points
- **Mero CRM**: Link cards to CRM deals or leads.
- **Common Module**: Uses the global notification system for @mentions.
- **Audit Logs**: Every move or update is recorded for project accountability.
