import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../../../src/database/entities/users.entity';
import { Board } from '../../../../src/database/entities/boards.entity';

@Entity('board_favorites')
@Unique(['user_id', 'board_id'])
@Index(['user_id'])
@Index(['board_id'])
export class BoardFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid' })
  board_id: string;

  @ManyToOne(() => Board, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @CreateDateColumn()
  created_at: Date;
}
