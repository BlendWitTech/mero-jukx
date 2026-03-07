import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from 'typeorm';

export class AddCancelledByToInvitations1763103799254 implements MigrationInterface {
  name = 'AddCancelledByToInvitations1763103799254';
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('invitations');
    if (table) {
      // Add cancelled_by column if it doesn't exist
      if (!table.findColumnByName('cancelled_by')) {
        await queryRunner.addColumn(
          'invitations',
          new TableColumn({
            name: 'cancelled_by',
            type: 'uuid',
            isNullable: true,
          }),
        );
      }

      // Add foreign key constraint if it doesn't exist
      if (!table.foreignKeys.find((fk) => fk.columnNames.indexOf('cancelled_by') !== -1)) {
        await queryRunner.createForeignKey(
          'invitations',
          new TableForeignKey({
            columnNames: ['cancelled_by'],
            referencedColumnNames: ['id'],
            referencedTableName: 'users',
            onDelete: 'SET NULL',
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get the foreign key constraint name
    const table = await queryRunner.getTable('invitations');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('cancelled_by') !== -1,
      );

      if (foreignKey) {
        await queryRunner.dropForeignKey('invitations', foreignKey);
      }

      // Drop the column if it exists
      if (table.findColumnByName('cancelled_by')) {
        await queryRunner.dropColumn('invitations', 'cancelled_by');
      }
    }
  }
}
