import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class AddCmsModule1855000000001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        try {
            // cms_pages
            const pagesExists = await queryRunner.hasTable('cms_pages');
            if (!pagesExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_pages',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'organization_id', type: 'uuid' },
                            { name: 'title', type: 'varchar', length: '255' },
                            { name: 'slug', type: 'varchar', length: '255' },
                            { name: 'content', type: 'jsonb', isNullable: true },
                            { name: 'meta_title', type: 'varchar', length: '255', isNullable: true },
                            { name: 'meta_description', type: 'text', isNullable: true },
                            { name: 'status', type: 'enum', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: "'DRAFT'" },
                            { name: 'published_at', type: 'timestamp', isNullable: true },
                            { name: 'created_by', type: 'uuid', isNullable: true },
                            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'deleted_at', type: 'timestamp', isNullable: true },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_pages', new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }

            // cms_posts
            const postsExists = await queryRunner.hasTable('cms_posts');
            if (!postsExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_posts',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'organization_id', type: 'uuid' },
                            { name: 'title', type: 'varchar', length: '255' },
                            { name: 'slug', type: 'varchar', length: '255' },
                            { name: 'content', type: 'text', isNullable: true },
                            { name: 'excerpt', type: 'text', isNullable: true },
                            { name: 'featured_image', type: 'varchar', length: '500', isNullable: true },
                            { name: 'author_id', type: 'uuid', isNullable: true },
                            { name: 'category', type: 'varchar', length: '100', isNullable: true },
                            { name: 'tags', type: 'jsonb', isNullable: true, default: "'[]'" },
                            { name: 'status', type: 'enum', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: "'DRAFT'" },
                            { name: 'meta_title', type: 'varchar', length: '255', isNullable: true },
                            { name: 'meta_description', type: 'text', isNullable: true },
                            { name: 'published_at', type: 'timestamp', isNullable: true },
                            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'deleted_at', type: 'timestamp', isNullable: true },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_posts', new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }

            // cms_media
            const mediaExists = await queryRunner.hasTable('cms_media');
            if (!mediaExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_media',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'organization_id', type: 'uuid' },
                            { name: 'filename', type: 'varchar', length: '255' },
                            { name: 'original_name', type: 'varchar', length: '255' },
                            { name: 'mime_type', type: 'varchar', length: '100' },
                            { name: 'size', type: 'bigint', default: '0' },
                            { name: 'url', type: 'varchar', length: '1000' },
                            { name: 'folder', type: 'varchar', length: '255', isNullable: true, default: "'general'" },
                            { name: 'alt_text', type: 'varchar', length: '255', isNullable: true },
                            { name: 'uploaded_by', type: 'uuid', isNullable: true },
                            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_media', new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }

            // cms_forms
            const formsExists = await queryRunner.hasTable('cms_forms');
            if (!formsExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_forms',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'organization_id', type: 'uuid' },
                            { name: 'name', type: 'varchar', length: '255' },
                            { name: 'slug', type: 'varchar', length: '255' },
                            { name: 'fields', type: 'jsonb', isNullable: true, default: "'[]'" },
                            { name: 'crm_sync', type: 'boolean', default: false },
                            { name: 'email_notify', type: 'boolean', default: false },
                            { name: 'notify_email', type: 'varchar', length: '255', isNullable: true },
                            { name: 'status', type: 'enum', enum: ['ACTIVE', 'INACTIVE'], default: "'ACTIVE'" },
                            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_forms', new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }

            // cms_form_submissions
            const submissionsExists = await queryRunner.hasTable('cms_form_submissions');
            if (!submissionsExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_form_submissions',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'form_id', type: 'uuid' },
                            { name: 'organization_id', type: 'uuid' },
                            { name: 'data', type: 'jsonb' },
                            { name: 'submitted_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'ip_address', type: 'varchar', length: '50', isNullable: true },
                            { name: 'crm_lead_id', type: 'uuid', isNullable: true },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_form_submissions', new TableForeignKey({
                    columnNames: ['form_id'],
                    referencedTableName: 'cms_forms',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }

            // cms_settings
            const settingsExists = await queryRunner.hasTable('cms_settings');
            if (!settingsExists) {
                await queryRunner.createTable(
                    new Table({
                        name: 'cms_settings',
                        columns: [
                            { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
                            { name: 'organization_id', type: 'uuid', isUnique: true },
                            { name: 'site_name', type: 'varchar', length: '255', isNullable: true },
                            { name: 'site_description', type: 'text', isNullable: true },
                            { name: 'logo_url', type: 'varchar', length: '500', isNullable: true },
                            { name: 'favicon_url', type: 'varchar', length: '500', isNullable: true },
                            { name: 'primary_color', type: 'varchar', length: '20', isNullable: true, default: "'#3b82f6'" },
                            { name: 'custom_css', type: 'text', isNullable: true },
                            { name: 'custom_domain', type: 'varchar', length: '255', isNullable: true },
                            { name: 'created_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                            { name: 'updated_at', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
                        ],
                    }),
                    true,
                );
                await queryRunner.createForeignKey('cms_settings', new TableForeignKey({
                    columnNames: ['organization_id'],
                    referencedTableName: 'organizations',
                    referencedColumnNames: ['id'],
                    onDelete: 'CASCADE',
                }));
            }
        } catch (error) {
            console.error('AddCmsModule migration error:', error.message);
            throw error;
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('cms_settings', true);
        await queryRunner.dropTable('cms_form_submissions', true);
        await queryRunner.dropTable('cms_forms', true);
        await queryRunner.dropTable('cms_media', true);
        await queryRunner.dropTable('cms_posts', true);
        await queryRunner.dropTable('cms_pages', true);
    }
}
