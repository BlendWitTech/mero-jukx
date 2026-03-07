# Mero Board - API

## Base Path
`/api/boards`

## Board Management
- `GET /boards`: List all boards in the active organization.
- `POST /boards`: Create a new board within a workspace.
- `GET /boards/:id`: Fetch board structure (Lists and Tasks).
- `PATCH /boards/:id`: Update board metadata or appearance.

## List Management
- `POST /boards/lists`: Add a new list to a board.
- `PATCH /boards/lists/:id/position`: Reorder lists.
- `DELETE /boards/lists/:id`: Remove a list.

## Task/Card Management
- `POST /boards/tasks`: Create a new task in a list.
- `PATCH /boards/tasks/:id/move`: Move a task between lists or change position.
- `POST /boards/tasks/:id/comments`: Add a collaborative comment.
- `PATCH /boards/tasks/:id/checklist`: Update checklist item status.

## Authentication
Requires Bearer Token. Permissions checked: `BOARD_VIEW`, `BOARD_MANAGE_TASKS`.

## Example: Move Task
```json
PATCH /api/boards/tasks/task-uuid/move
{
  "listId": "new-list-uuid",
  "position": 5
}
```
