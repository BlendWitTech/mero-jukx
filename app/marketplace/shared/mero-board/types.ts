export interface Board {
    id: string;
    name: string;
    description: string;
    type: string;
    color: string;
    columns: BoardColumn[];
    organization_id: string;
    project_id: string;
    visibility?: 'PRIVATE' | 'WORKSPACE' | 'PUBLIC';
    is_favorite?: boolean;
}

export interface BoardColumn {
    id: string;
    name: string;
    color: string;
    sort_order: number;
    wip_limit: number | null;
    tickets: Task[]; // Using Tickets for backward compatibility while transitioning
}

export interface Task {
    id: string;
    subject: string;
    description: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    sort_order: number;
    column_id: string;
    parent_task_id: string | null;
    assignees?: TaskAssignee[];
    tags?: string[];
    sub_tasks_count?: number;
    completed_sub_tasks_count?: number;
    custom_fields?: { name: string; value: string }[];
}

export interface TaskAssignee {
    id: string;
    first_name: string;
    last_name: string;
    avatar_url?: string;
}

export interface TaskChecklistItem {
    id: string;
    task_id: string;
    content: string;
    is_completed: boolean;
    sort_order: number;
}
