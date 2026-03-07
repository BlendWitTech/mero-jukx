import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBrandingFieldsToOrganization1768000000000 implements MigrationInterface {
  name = 'AddBrandingFieldsToOrganization1768000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if columns already exist before adding
    const table = await queryRunner.getTable('organizations');
    
    if (table) {
      const existingColumns = table.columns.map(col => col.name);
      
      if (!existingColumns.includes('favicon_url')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'favicon_url',
            type: 'varchar',
            length: '500',
            isNullable: true,
          }),
        );
      }

      if (!existingColumns.includes('primary_color')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'primary_color',
            type: 'varchar',
            length: '7',
            isNullable: true,
          }),
        );
      }

      if (!existingColumns.includes('secondary_color')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'secondary_color',
            type: 'varchar',
            length: '7',
            isNullable: true,
          }),
        );
      }

      if (!existingColumns.includes('custom_css')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'custom_css',
            type: 'text',
            isNullable: true,
          }),
        );
      }

      if (!existingColumns.includes('custom_js')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'custom_js',
            type: 'text',
            isNullable: true,
          }),
        );
      }

      if (!existingColumns.includes('footer_text')) {
        await queryRunner.addColumn(
          'organizations',
          new TableColumn({
            name: 'footer_text',
            type: 'text',
            isNullable: true,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('organizations');
    
    if (table) {
      const existingColumns = table.columns.map(col => col.name);
      
      if (existingColumns.includes('footer_text')) {
        await queryRunner.dropColumn('organizations', 'footer_text');
      }
      if (existingColumns.includes('custom_js')) {
        await queryRunner.dropColumn('organizations', 'custom_js');
      }
      if (existingColumns.includes('custom_css')) {
        await queryRunner.dropColumn('organizations', 'custom_css');
      }
      if (existingColumns.includes('secondary_color')) {
        await queryRunner.dropColumn('organizations', 'secondary_color');
      }
      if (existingColumns.includes('primary_color')) {
        await queryRunner.dropColumn('organizations', 'primary_color');
      }
      if (existingColumns.includes('favicon_url')) {
        await queryRunner.dropColumn('organizations', 'favicon_url');
      }
    }
  }
}

