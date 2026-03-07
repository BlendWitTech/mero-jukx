import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddBoardFieldsToTickets1771000000007 implements MigrationInterface {
  name = 'AddBoardFieldsToTickets1771000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tickets');
    if (table) {
      // Add columns
      const columns = [
        { name: 'board_app_id', type: 'integer', isNullable: true },
        { name: 'board_id', type: 'uuid', isNullable: true },
        { name: 'board_card_id', type: 'varchar', length: '255', isNullable: true },
      ];

      for (const col of columns) {
        if (!table.findColumnByName(col.name)) {
          await queryRunner.addColumn('tickets', new TableColumn(col));
        }
      }

      // Add foreign key
      if (!table.foreignKeys.find(fk => fk.name === 'FK_tickets_board_app' || fk.columnNames.includes('board_app_id'))) {
        await queryRunner.createForeignKey('tickets', new TableForeignKey({
          name: 'FK_tickets_board_app',
          columnNames: ['board_app_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'apps',
          onDelete: 'SET NULL',
        }));
      }

      // Add index
      if (!table.indices.find(idx => idx.name === 'IDX_tickets_board_app_id' || idx.columnNames.includes('board_app_id'))) {
        await queryRunner.createIndex('tickets', new TableIndex({
          name: 'IDX_tickets_board_app_id',
          columnNames: ['board_app_id'],
        }));
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('tickets');
    if (table) {
      const index = table.indices.find(idx => idx.name === 'IDX_tickets_board_app_id');
      if (index) await queryRunner.dropIndex('tickets', index);

      const fk = table.foreignKeys.find(fk => fk.name === 'FK_tickets_board_app' || fk.columnNames.includes('board_app_id'));
      if (fk) await queryRunner.dropForeignKey('tickets', fk);

      const cols = ['board_app_id', 'board_id', 'board_card_id'];
      for (const colName of cols) {
        if (table.findColumnByName(colName)) {
          await queryRunner.dropColumn('tickets', colName);
        }
      }
    }
  }
}
