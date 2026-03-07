# Mero Board - Developer Guide

## Development Environment
Board logic involves real-time synchronization. Ensure your local Redis instance is running for event broadcasting.

## Coding Patterns
- **Positioning**: We use a simple integer-based positioning for lists and tasks. When reordering, ideally utilize a `LEXORANK` or similar algorithm for efficiency, though current implementation uses increments.
- **Drag-and-Drop**: On the frontend, `react-beautiful-dnd` is used. Ensure that optimistic UI updates are handled to keep the interface feeling snappy.

## Permissions
- Access is scoped by both Organization and Workspace.
- Most controllers use the `@AppAccessGuard('mero-board')` to verify subscription status.

## Real-time Events
When a task is moved, a `TASK_MOVED` event should be emitted via the `Gateway` to inform other connected clients in the same organization.

## Best Practices
- **Always** validate that the `listId` belongs to the same `boardId` during a task move.
- Sanitize task descriptions (Markdown support) to prevent XSS.
- Link task attachments to the organization's S3/Storage bucket path correctly.
