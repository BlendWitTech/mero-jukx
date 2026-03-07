import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHrPhase31860000000000 implements MigrationInterface {
    name = 'AddHrPhase31860000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ─── hr_job_openings ──────────────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_job_openings'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_job_openings_employment_type_enum" AS ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');
                CREATE TYPE "hr_job_openings_status_enum" AS ENUM('DRAFT', 'OPEN', 'ON_HOLD', 'CLOSED');
                CREATE TABLE "hr_job_openings" (
                    "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"   UUID NOT NULL,
                    "title"             VARCHAR(255) NOT NULL,
                    "department_id"     UUID,
                    "department"        VARCHAR(100),
                    "location"          VARCHAR(255),
                    "employment_type"   "hr_job_openings_employment_type_enum" NOT NULL DEFAULT 'FULL_TIME',
                    "description"       TEXT,
                    "requirements"      TEXT,
                    "salary_range"      JSONB,
                    "vacancies"         INTEGER NOT NULL DEFAULT 1,
                    "status"            "hr_job_openings_status_enum" NOT NULL DEFAULT 'DRAFT',
                    "published_at"      DATE,
                    "deadline"          DATE,
                    "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_job_openings" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_job_openings_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE
                )
            `);
        }

        // ─── hr_candidates ────────────────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_candidates'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_candidates_source_enum" AS ENUM('REFERRAL', 'JOB_PORTAL', 'WEBSITE', 'WALK_IN', 'OTHER');
                CREATE TYPE "hr_candidates_stage_enum" AS ENUM('APPLIED', 'SCREENING', 'INTERVIEW', 'TECHNICAL', 'OFFER', 'HIRED', 'REJECTED');
                CREATE TABLE "hr_candidates" (
                    "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"   UUID NOT NULL,
                    "job_id"            UUID,
                    "first_name"        VARCHAR(255) NOT NULL,
                    "last_name"         VARCHAR(255),
                    "email"             VARCHAR(255) NOT NULL,
                    "phone"             VARCHAR(50),
                    "resume_url"        TEXT,
                    "cover_letter"      TEXT,
                    "source"            "hr_candidates_source_enum" NOT NULL DEFAULT 'OTHER',
                    "stage"             "hr_candidates_stage_enum" NOT NULL DEFAULT 'APPLIED',
                    "rating"            DECIMAL(3,1),
                    "notes"             TEXT,
                    "expected_salary"   DECIMAL(15,2),
                    "interview_date"    TIMESTAMP,
                    "hired_at"          TIMESTAMP,
                    "rejected_at"       TIMESTAMP,
                    "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_candidates" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_candidates_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE,
                    CONSTRAINT "FK_hr_candidates_job" FOREIGN KEY ("job_id")
                        REFERENCES "hr_job_openings"("id") ON DELETE SET NULL
                )
            `);
        }

        // ─── hr_performance_goals ─────────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_performance_goals'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_perf_goals_category_enum" AS ENUM('INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'COMPANY');
                CREATE TYPE "hr_perf_goals_status_enum" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
                CREATE TABLE "hr_performance_goals" (
                    "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"   UUID NOT NULL,
                    "employee_id"       UUID NOT NULL,
                    "title"             VARCHAR(255) NOT NULL,
                    "description"       TEXT,
                    "category"          "hr_perf_goals_category_enum" NOT NULL DEFAULT 'INDIVIDUAL',
                    "target_value"      DECIMAL(15,2),
                    "current_value"     DECIMAL(15,2) NOT NULL DEFAULT 0,
                    "unit"              VARCHAR(50),
                    "status"            "hr_perf_goals_status_enum" NOT NULL DEFAULT 'NOT_STARTED',
                    "due_date"          DATE,
                    "fiscal_year"       VARCHAR(20) NOT NULL,
                    "weight"            INTEGER NOT NULL DEFAULT 1,
                    "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_performance_goals" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_perf_goals_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE,
                    CONSTRAINT "FK_hr_perf_goals_emp" FOREIGN KEY ("employee_id")
                        REFERENCES "hr_employees"("id") ON DELETE CASCADE
                )
            `);
        }

        // ─── hr_performance_reviews ───────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_performance_reviews'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_perf_reviews_rating_label_enum" AS ENUM('EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT', 'UNSATISFACTORY');
                CREATE TYPE "hr_perf_reviews_status_enum" AS ENUM('DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED');
                CREATE TABLE "hr_performance_reviews" (
                    "id"                        UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"           UUID NOT NULL,
                    "employee_id"               UUID NOT NULL,
                    "reviewer_id"               UUID,
                    "review_period"             VARCHAR(50) NOT NULL,
                    "fiscal_year"               VARCHAR(20) NOT NULL,
                    "review_date"               DATE NOT NULL,
                    "self_rating"               DECIMAL(3,1),
                    "manager_rating"            DECIMAL(3,1),
                    "final_rating"              DECIMAL(3,1),
                    "overall_rating_label"      "hr_perf_reviews_rating_label_enum",
                    "strengths"                 TEXT,
                    "areas_for_improvement"     TEXT,
                    "goals_achieved"            JSONB,
                    "training_recommendations"  TEXT,
                    "comments"                  TEXT,
                    "status"                    "hr_perf_reviews_status_enum" NOT NULL DEFAULT 'DRAFT',
                    "created_at"                TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"                TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_performance_reviews" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_perf_reviews_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE,
                    CONSTRAINT "FK_hr_perf_reviews_emp" FOREIGN KEY ("employee_id")
                        REFERENCES "hr_employees"("id") ON DELETE CASCADE
                )
            `);
        }

        // ─── hr_training_programs ─────────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_training_programs'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_training_mode_enum" AS ENUM('IN_PERSON', 'ONLINE', 'HYBRID');
                CREATE TYPE "hr_training_status_enum" AS ENUM('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');
                CREATE TABLE "hr_training_programs" (
                    "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"   UUID NOT NULL,
                    "title"             VARCHAR(255) NOT NULL,
                    "category"          VARCHAR(100) NOT NULL,
                    "description"       TEXT,
                    "trainer"           VARCHAR(255) NOT NULL,
                    "start_date"        DATE NOT NULL,
                    "end_date"          DATE NOT NULL,
                    "duration"          VARCHAR(100) NOT NULL,
                    "capacity"          INTEGER NOT NULL DEFAULT 20,
                    "enrolled"          INTEGER NOT NULL DEFAULT 0,
                    "location"          VARCHAR(255),
                    "mode"              "hr_training_mode_enum" NOT NULL DEFAULT 'IN_PERSON',
                    "status"            "hr_training_status_enum" NOT NULL DEFAULT 'UPCOMING',
                    "budget"            DECIMAL(15,2),
                    "completion_rate"   DECIMAL(5,2),
                    "notes"             TEXT,
                    "created_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"        TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_training_programs" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_training_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE
                )
            `);
        }

        // ─── hr_exit_records ──────────────────────────────────────────────────
        if (!(await queryRunner.hasTable('hr_exit_records'))) {
            await queryRunner.query(`
                CREATE TYPE "hr_exit_reason_enum" AS ENUM('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'MUTUAL_SEPARATION', 'CONTRACT_END', 'DEATH', 'OTHER');
                CREATE TYPE "hr_exit_separation_enum" AS ENUM('VOLUNTARY', 'INVOLUNTARY');
                CREATE TYPE "hr_exit_clearance_enum" AS ENUM('PENDING', 'PARTIAL', 'COMPLETED');
                CREATE TYPE "hr_exit_status_enum" AS ENUM('INITIATED', 'IN_PROGRESS', 'COMPLETED');
                CREATE TABLE "hr_exit_records" (
                    "id"                        UUID NOT NULL DEFAULT uuid_generate_v4(),
                    "organization_id"           UUID NOT NULL,
                    "employee_id"               UUID NOT NULL,
                    "reason"                    "hr_exit_reason_enum" NOT NULL DEFAULT 'RESIGNATION',
                    "separation_type"           "hr_exit_separation_enum" NOT NULL DEFAULT 'VOLUNTARY',
                    "last_working_day"          DATE NOT NULL,
                    "notice_period_days"        INTEGER,
                    "notice_served_days"        INTEGER,
                    "exit_interview_date"       DATE,
                    "exit_interview_by_id"      UUID,
                    "feedback"                  TEXT,
                    "handover_notes"            TEXT,
                    "clearance_status"          "hr_exit_clearance_enum" NOT NULL DEFAULT 'PENDING',
                    "final_settlement_amount"   DECIMAL(15,2),
                    "final_settlement_date"     DATE,
                    "status"                    "hr_exit_status_enum" NOT NULL DEFAULT 'INITIATED',
                    "created_at"                TIMESTAMP NOT NULL DEFAULT now(),
                    "updated_at"                TIMESTAMP NOT NULL DEFAULT now(),
                    CONSTRAINT "PK_hr_exit_records" PRIMARY KEY ("id"),
                    CONSTRAINT "FK_hr_exit_org" FOREIGN KEY ("organization_id")
                        REFERENCES "organizations"("id") ON DELETE CASCADE,
                    CONSTRAINT "FK_hr_exit_emp" FOREIGN KEY ("employee_id")
                        REFERENCES "hr_employees"("id") ON DELETE CASCADE
                )
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_exit_records" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_training_programs" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_performance_reviews" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_performance_goals" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_candidates" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "hr_job_openings" CASCADE`);

        await queryRunner.query(`DROP TYPE IF EXISTS "hr_exit_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_exit_clearance_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_exit_separation_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_exit_reason_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_training_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_training_mode_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_perf_reviews_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_perf_reviews_rating_label_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_perf_goals_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_perf_goals_category_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_candidates_stage_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_candidates_source_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_job_openings_status_enum"`);
        await queryRunner.query(`DROP TYPE IF EXISTS "hr_job_openings_employment_type_enum"`);
    }
}
