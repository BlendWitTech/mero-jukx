import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Task } from '../../../../src/database/entities/tasks.entity';
import { User } from '../../../../src/database/entities/users.entity';

@Entity('mero_board_task_checklist_items')
@Index(['task_id'])
export class TaskChecklistItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    task_id: string;

    @ManyToOne(() => Task, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'task_id' })
    task: Task;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'boolean', default: false })
    is_completed: boolean;

    @Column({ type: 'int', default: 0 })
    sort_order: number;

    @Column({ type: 'uuid', nullable: true })
    completed_by_id: string | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'completed_by_id' })
    completed_by: User | null;

    @Column({ type: 'timestamp', nullable: true })
    completed_at: Date | null;

    @Column({ type: 'uuid' })
    created_by_id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by_id' })
    creator: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
