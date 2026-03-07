export enum BoardPrivacy {
    PRIVATE = 'private',
    TEAM = 'team',
    ORG = 'org',
}
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
} from 'typeorm';
import { Organization } from './organizations.entity'; // Adjust path if needed
import { User } from './users.entity'; // Adjust path if needed
import { BoardColumn } from './board_columns.entity';
import { Ticket } from './tickets.entity'; // Adjust path if needed
import { BoardProject } from './board_projects.entity';

export enum BoardType {
    KANBAN = 'KANBAN',
    SCRUM = 'SCRUM',
    LIST = 'LIST',
}

@Entity('boards')
@Index(['organization_id'])
@Index(['created_by'])
export class Board {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    organization_id: string;

    @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: Organization;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({
        type: 'enum',
        enum: BoardPrivacy,
        default: BoardPrivacy.TEAM,
    })
    privacy: BoardPrivacy;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({
        type: 'enum',
        enum: BoardType,
        default: BoardType.KANBAN,
    })
    type: BoardType;

    @Column({ type: 'varchar', length: 20, nullable: true })
    color: string | null;

    @Column({ type: 'boolean', default: false })
    is_archived: boolean;

    @Column({ type: 'uuid' })
    created_by: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' })
    creator: User;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;

    @Column({ type: 'uuid', nullable: true })
    project_id: string | null;

    @ManyToOne(() => BoardProject, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'project_id' })
    project: BoardProject | null;

    @OneToMany(() => BoardColumn, (column) => column.board)
    columns: BoardColumn[];

    @OneToMany(() => Ticket, (ticket) => ticket.board)
    tickets: Ticket[];
}
