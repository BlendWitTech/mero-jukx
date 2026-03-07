import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1763103799252 implements MigrationInterface {
  name = 'InitialMigration1763103799252';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "packages" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "description" text, "base_user_limit" integer NOT NULL, "base_role_limit" integer NOT NULL, "additional_role_limit" integer NOT NULL DEFAULT '0', "price" numeric(10,2), "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4b511952e9d60aac9aa42e653f0" UNIQUE ("name"), CONSTRAINT "UQ_4fa4c83eda7c58fa0861721db18" UNIQUE ("slug"), CONSTRAINT "PK_020801f620e21f943ead9311c98" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_174c1edc5687170b6ed98f576a" ON "packages" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4fa4c83eda7c58fa0861721db1" ON "packages" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "description" text, "category" character varying(50) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "UQ_d090ad82a0e97ce764c06c7b312" UNIQUE ("slug"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_aad80a27f0a425bfc3f092a732" ON "permissions" ("category") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d090ad82a0e97ce764c06c7b31" ON "permissions" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" SERIAL NOT NULL, "role_id" integer NOT NULL, "permission_id" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_25d24010f53bb80b78e412c9656" UNIQUE ("role_id", "permission_id"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "organization_id" uuid, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "description" text, "is_system_role" boolean NOT NULL DEFAULT false, "is_organization_owner" boolean NOT NULL DEFAULT false, "is_default" boolean NOT NULL DEFAULT false, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_f65cacc6b129bca202d6509f84d" UNIQUE ("organization_id", "slug"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c328a1ecd12a5f153a96df4509" ON "roles" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9f58bffa9bdcc402c0438a60c" ON "roles" ("is_active") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_917fb937fb332ed0c14846c9a6" ON "roles" ("is_system_role") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invitations_status_enum" AS ENUM('pending', 'accepted', 'expired', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "role_id" integer NOT NULL, "invited_by" uuid NOT NULL, "token" character varying(255) NOT NULL, "status" "public"."invitations_status_enum" NOT NULL DEFAULT 'pending', "expires_at" TIMESTAMP NOT NULL, "accepted_at" TIMESTAMP, "user_id" uuid, "message" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_e577dcf9bb6d084373ed3998509" UNIQUE ("token"), CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_42d1dbb4d85dc3643fdc6560af" ON "invitations" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fecdffec754fa4d5cea9870977" ON "invitations" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35f274748195ecebcc7c138b9c" ON "invitations" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_56ce8d405de7cdcedd31d900ba" ON "invitations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3afc80b5ecc0276428da3e3a87" ON "invitations" ("organization_id", "email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e577dcf9bb6d084373ed399850" ON "invitations" ("token") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."package_features_type_enum" AS ENUM('user_upgrade', 'role_upgrade', 'chat', 'support')`,
    );
    await queryRunner.query(
      `CREATE TABLE "package_features" ("id" SERIAL NOT NULL, "name" character varying(100) NOT NULL, "slug" character varying(100) NOT NULL, "type" "public"."package_features_type_enum" NOT NULL, "value" integer, "price" numeric(10,2) NOT NULL, "description" text, "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_414a566d05aa19276fd12c94e95" UNIQUE ("name"), CONSTRAINT "UQ_472218c0cc935b5b820d0bca3b3" UNIQUE ("slug"), CONSTRAINT "PK_62d8d878bc152b6b42224c7ff15" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fa94e031b5dbb95b495e8f9580" ON "package_features" ("type") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_472218c0cc935b5b820d0bca3b" ON "package_features" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_package_features_status_enum" AS ENUM('active', 'cancelled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_package_features" ("id" SERIAL NOT NULL, "organization_id" uuid NOT NULL, "feature_id" integer NOT NULL, "status" "public"."organization_package_features_status_enum" NOT NULL DEFAULT 'active', "purchased_at" TIMESTAMP NOT NULL DEFAULT now(), "cancelled_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_81b61c5a843e4f4eb8d6679ff5d" UNIQUE ("organization_id", "feature_id"), CONSTRAINT "PK_14d74e9066e373e182e8e492bfa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_572c29601a80c4b8df243af042" ON "organization_package_features" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_28facf3cb1f34e92ef00e83179" ON "organization_package_features" ("feature_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_76c0407957e441a0f13b26926f" ON "organization_package_features" ("status") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organizations_status_enum" AS ENUM('active', 'suspended', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "phone" character varying(50), "address" text, "city" character varying(100), "state" character varying(100), "country" character varying(100), "postal_code" character varying(20), "website" character varying(255), "logo_url" character varying(500), "description" text, "package_id" integer NOT NULL, "user_limit" integer NOT NULL DEFAULT '10', "role_limit" integer NOT NULL DEFAULT '2', "mfa_enabled" boolean NOT NULL DEFAULT false, "email_verified" boolean NOT NULL DEFAULT false, "status" "public"."organizations_status_enum" NOT NULL DEFAULT 'active', "package_expires_at" TIMESTAMP NULL, "package_auto_renew" boolean NOT NULL DEFAULT false, "has_upgraded_from_freemium" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_9b7ca6d30b94fef571cff876884" UNIQUE ("name"), CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE ("slug"), CONSTRAINT "UQ_4ad920935f4d4eb73fc58b40f72" UNIQUE ("email"), CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_68d007d564953c00ae74c13dc2" ON "organizations" ("package_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f3770f157bd77d83ab022e92fc" ON "organizations" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_organizations_package_expires_at" ON "organizations" ("package_expires_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4ad920935f4d4eb73fc58b40f7" ON "organizations" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_963693341bd612aa01ddf3a4b6" ON "organizations" ("slug") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."organization_members_status_enum" AS ENUM('active', 'revoked', 'left')`,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role_id" integer NOT NULL, "invited_by" uuid, "joined_at" TIMESTAMP NOT NULL DEFAULT now(), "status" "public"."organization_members_status_enum" NOT NULL DEFAULT 'active', "revoked_at" TIMESTAMP, "revoked_by" uuid, "data_transferred_to" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f4812f00736e35131a65d6032da" UNIQUE ("organization_id", "user_id"), CONSTRAINT "PK_c2b39d5d072886a4d9c8105eb9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7062a4fbd9bab22ffd918e5d3d" ON "organization_members" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89bde91f78d36ca41e9515d91c" ON "organization_members" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5af5b0cc7f3012e9eb45d3df35" ON "organization_members" ("role_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e6ebf5aab7a65fdb7de52051f6" ON "organization_members" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "sessions" ("id" character varying(255) NOT NULL, "user_id" uuid NOT NULL, "organization_id" uuid NOT NULL, "access_token" text, "refresh_token" character varying(255), "ip_address" character varying(45), "user_agent" text, "expires_at" TIMESTAMP NOT NULL, "revoked_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c862499023be8feec98129d4e96" UNIQUE ("refresh_token"), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_085d540d9f418cfbdc7bd55bb1" ON "sessions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9e3486bb3e8509466d4c9d6c9" ON "sessions" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9cfe37d28c3b229a350e086d94" ON "sessions" ("expires_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_c862499023be8feec98129d4e9" ON "sessions" ("refresh_token") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."email_verifications_type_enum" AS ENUM('registration', 'invitation', 'email_change', 'organization_email')`,
    );
    await queryRunner.query(
      `CREATE TABLE "email_verifications" ("id" SERIAL NOT NULL, "user_id" uuid NOT NULL, "email" character varying(255) NOT NULL, "token" character varying(255) NOT NULL, "type" "public"."email_verifications_type_enum" NOT NULL, "expires_at" TIMESTAMP NOT NULL, "verified_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_595be4c36e66b21d3fd14c73a24" UNIQUE ("token"), CONSTRAINT "PK_c1ea2921e767f83cd44c0af203f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4f1838323ae1dff5aa0014891" ON "email_verifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_44e5cfea68f87243cad38bb1b1" ON "email_verifications" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_595be4c36e66b21d3fd14c73a2" ON "email_verifications" ("token") `,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "organization_id" uuid, "type" character varying(50) NOT NULL, "title" character varying(255) NOT NULL, "message" text NOT NULL, "data" json, "read_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON "notifications" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cb7b1fb018b296f2107e998b2f" ON "notifications" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d19d2ba2fddbaca8c227048d5" ON "notifications" ("read_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_77ee7b06d6f802000c0846f3a5" ON "notifications" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" BIGSERIAL NOT NULL, "organization_id" uuid, "user_id" uuid, "action" character varying(100) NOT NULL, "entity_type" character varying(50), "entity_id" character varying(255), "old_values" json, "new_values" json, "ip_address" character varying(45), "user_agent" text, "metadata" json, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_145f35b204c731ba7fc1a0be0e" ON "audit_logs" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON "audit_logs" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2cd10fda8276bb995288acfbfb" ON "audit_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON "audit_logs" ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'suspended', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "first_name" character varying(100) NOT NULL, "last_name" character varying(100) NOT NULL, "phone" character varying(50), "avatar_url" character varying(500), "email_verified" boolean NOT NULL DEFAULT false, "email_verified_at" TIMESTAMP, "mfa_enabled" boolean NOT NULL DEFAULT false, "mfa_secret" character varying(255), "mfa_backup_codes" json, "mfa_setup_completed_at" TIMESTAMP, "last_login_at" TIMESTAMP, "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cf96ca0dc9c97fdc2ae06831d8" ON "users" ("email_verified") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_3676155292d72c67cd4e090514" ON "users" ("status") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_type_enum" AS ENUM('direct', 'group')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chats_status_enum" AS ENUM('active', 'archived', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_members_role_enum" AS ENUM('owner', 'admin', 'member')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."chat_members_status_enum" AS ENUM('active', 'left', 'removed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_type_enum" AS ENUM('text', 'image', 'file', 'audio', 'video', 'system')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read', 'deleted')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_sessions_type_enum" AS ENUM('audio', 'video')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_sessions_status_enum" AS ENUM('initiating', 'ringing', 'active', 'ended', 'cancelled', 'missed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."call_participants_status_enum" AS ENUM('invited', 'ringing', 'joined', 'left', 'declined', 'missed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "chats" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "type" "public"."chats_type_enum" NOT NULL, "name" character varying(255), "description" text, "avatar_url" character varying(500), "created_by" uuid NOT NULL, "status" "public"."chats_status_enum" NOT NULL DEFAULT 'active', "last_message_at" TIMESTAMP, "last_message_id" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9f0ab25c70993be9c8712741410" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chats_organization_id" ON "chats" ("organization_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chats_type" ON "chats" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chats_status" ON "chats" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chats_created_by" ON "chats" ("created_by") `,
    );
    await queryRunner.query(
      `CREATE TABLE "chat_members" ("id" SERIAL NOT NULL, "chat_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."chat_members_role_enum" NOT NULL DEFAULT 'member', "status" "public"."chat_members_status_enum" NOT NULL DEFAULT 'active', "last_read_at" TIMESTAMP, "unread_count" integer NOT NULL DEFAULT '0', "notifications_enabled" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_chat_members_chat_user" UNIQUE ("chat_id", "user_id"), CONSTRAINT "PK_chat_members" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_members_chat_id" ON "chat_members" ("chat_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_members_user_id" ON "chat_members" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chat_members_status" ON "chat_members" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chat_id" uuid NOT NULL, "sender_id" uuid NOT NULL, "type" "public"."messages_type_enum" NOT NULL DEFAULT 'text', "content" text, "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent', "reply_to_id" uuid, "is_edited" boolean NOT NULL DEFAULT false, "edited_at" TIMESTAMP, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_messages" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_chat_id" ON "messages" ("chat_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_sender_id" ON "messages" ("sender_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_created_at" ON "messages" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_messages_status" ON "messages" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "message_attachments" ("id" SERIAL NOT NULL, "message_id" uuid NOT NULL, "file_name" character varying(255) NOT NULL, "file_url" character varying(500) NOT NULL, "file_type" character varying(100) NOT NULL, "file_size" bigint NOT NULL, "thumbnail_url" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_message_attachments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_attachments_message_id" ON "message_attachments" ("message_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "message_reactions" ("id" SERIAL NOT NULL, "message_id" uuid NOT NULL, "user_id" uuid NOT NULL, "emoji" character varying(10) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_message_reactions_message_user_emoji" UNIQUE ("message_id", "user_id", "emoji"), CONSTRAINT "PK_message_reactions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_reactions_message_id" ON "message_reactions" ("message_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_message_reactions_user_id" ON "message_reactions" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "call_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chat_id" uuid NOT NULL, "initiated_by" uuid NOT NULL, "type" "public"."call_sessions_type_enum" NOT NULL, "status" "public"."call_sessions_status_enum" NOT NULL DEFAULT 'initiating', "started_at" TIMESTAMP, "ended_at" TIMESTAMP, "duration_seconds" integer, "webrtc_offer" character varying(500), "webrtc_answer" character varying(500), "ice_candidates" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_call_sessions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_sessions_chat_id" ON "call_sessions" ("chat_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_sessions_initiated_by" ON "call_sessions" ("initiated_by") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_sessions_status" ON "call_sessions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_sessions_created_at" ON "call_sessions" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "call_participants" ("id" SERIAL NOT NULL, "call_session_id" uuid NOT NULL, "user_id" uuid NOT NULL, "status" "public"."call_participants_status_enum" NOT NULL DEFAULT 'invited', "joined_at" TIMESTAMP, "left_at" TIMESTAMP, "audio_enabled" boolean NOT NULL DEFAULT false, "video_enabled" boolean NOT NULL DEFAULT false, "webrtc_connection_id" character varying(500), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_call_participants_call_user" UNIQUE ("call_session_id", "user_id"), CONSTRAINT "PK_call_participants" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_participants_call_session_id" ON "call_participants" ("call_session_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_participants_user_id" ON "call_participants" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_call_participants_status" ON "call_participants" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "roles" ADD CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_42d1dbb4d85dc3643fdc6560af0" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_e4950c4d6aa2236f5213538e01a" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_29b1cef6891d9b9d4e35f793b81" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" ADD CONSTRAINT "FK_fecdffec754fa4d5cea98709776" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_package_features" ADD CONSTRAINT "FK_572c29601a80c4b8df243af0424" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_package_features" ADD CONSTRAINT "FK_28facf3cb1f34e92ef00e83179c" FOREIGN KEY ("feature_id") REFERENCES "package_features"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" ADD CONSTRAINT "FK_68d007d564953c00ae74c13dc2b" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_5af5b0cc7f3012e9eb45d3df350" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_78252b40612aaddc2138eadc810" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_45bfedcbbe8c4031ce3bb50843d" FOREIGN KEY ("revoked_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" ADD CONSTRAINT "FK_e98ba40eae3f5b5f9d1dd80da01" FOREIGN KEY ("data_transferred_to") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" ADD CONSTRAINT "FK_a9e3486bb3e8509466d4c9d6c93" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" ADD CONSTRAINT "FK_c4f1838323ae1dff5aa00148915" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_chats_organization" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "FK_chats_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_members" ADD CONSTRAINT "FK_chat_members_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_members" ADD CONSTRAINT "FK_chat_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_sender" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_messages_reply_to" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" ADD CONSTRAINT "FK_message_attachments_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_message_reactions_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" ADD CONSTRAINT "FK_message_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" ADD CONSTRAINT "FK_call_sessions_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" ADD CONSTRAINT "FK_call_sessions_initiated_by" FOREIGN KEY ("initiated_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_participants" ADD CONSTRAINT "FK_call_participants_call_session" FOREIGN KEY ("call_session_id") REFERENCES "call_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_participants" ADD CONSTRAINT "FK_call_participants_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "call_participants" DROP CONSTRAINT "FK_call_participants_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_participants" DROP CONSTRAINT "FK_call_participants_call_session"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" DROP CONSTRAINT "FK_call_sessions_initiated_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "call_sessions" DROP CONSTRAINT "FK_call_sessions_chat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_message_reactions_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_reactions" DROP CONSTRAINT "FK_message_reactions_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "message_attachments" DROP CONSTRAINT "FK_message_attachments_message"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_reply_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_sender"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_messages_chat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_members" DROP CONSTRAINT "FK_chat_members_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_members" DROP CONSTRAINT "FK_chat_members_chat"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_created_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" DROP CONSTRAINT "FK_chats_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_cb7b1fb018b296f2107e998b2ff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_verifications" DROP CONSTRAINT "FK_c4f1838323ae1dff5aa00148915"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_a9e3486bb3e8509466d4c9d6c93"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sessions" DROP CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_e98ba40eae3f5b5f9d1dd80da01"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_45bfedcbbe8c4031ce3bb50843d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_78252b40612aaddc2138eadc810"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_5af5b0cc7f3012e9eb45d3df350"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_89bde91f78d36ca41e9515d91c6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_members" DROP CONSTRAINT "FK_7062a4fbd9bab22ffd918e5d3d9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organizations" DROP CONSTRAINT "FK_68d007d564953c00ae74c13dc2b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_package_features" DROP CONSTRAINT "FK_28facf3cb1f34e92ef00e83179c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_package_features" DROP CONSTRAINT "FK_572c29601a80c4b8df243af0424"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_fecdffec754fa4d5cea98709776"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_29b1cef6891d9b9d4e35f793b81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_e4950c4d6aa2236f5213538e01a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invitations" DROP CONSTRAINT "FK_42d1dbb4d85dc3643fdc6560af0"`,
    );
    await queryRunner.query(`ALTER TABLE "roles" DROP CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e"`);
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_17022daf3f885f7d35423e9971e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_178199805b901ccd220ab7740ec"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_call_participants_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_participants_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_participants_call_session_id"`);
    await queryRunner.query(`DROP TABLE "call_participants"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_sessions_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_sessions_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_sessions_initiated_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_call_sessions_chat_id"`);
    await queryRunner.query(`DROP TABLE "call_sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_message_reactions_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_message_reactions_message_id"`);
    await queryRunner.query(`DROP TABLE "message_reactions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_message_attachments_message_id"`);
    await queryRunner.query(`DROP TABLE "message_attachments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_sender_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_messages_chat_id"`);
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_members_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_members_user_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chat_members_chat_id"`);
    await queryRunner.query(`DROP TABLE "chat_members"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chats_created_by"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chats_status"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chats_type"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_chats_organization_id"`);
    await queryRunner.query(`DROP TABLE "chats"`);
    await queryRunner.query(`DROP TYPE "public"."call_participants_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."call_sessions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."call_sessions_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."messages_type_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chat_members_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chat_members_role_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chats_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."chats_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3676155292d72c67cd4e090514"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cf96ca0dc9c97fdc2ae06831d8"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_145f35b204c731ba7fc1a0be0e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7421efc125d95e413657efa3c6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2cd10fda8276bb995288acfbfb"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cee5459245f652b75eb2759b4c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_bd2726fd31b35443f2245b93ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_145f35b204c731ba7fc1a0be0e"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cb7b1fb018b296f2107e998b2f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8d19d2ba2fddbaca8c227048d5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77ee7b06d6f802000c0846f3a5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_77ee7b06d6f802000c0846f3a5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8d19d2ba2fddbaca8c227048d5"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cb7b1fb018b296f2107e998b2f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9a8a82462cab47c73d25f49261"`);
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_595be4c36e66b21d3fd14c73a2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c4f1838323ae1dff5aa0014891"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_44e5cfea68f87243cad38bb1b1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_44e5cfea68f87243cad38bb1b1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c4f1838323ae1dff5aa0014891"`);
    await queryRunner.query(`DROP TABLE "email_verifications"`);
    await queryRunner.query(`DROP TYPE "public"."email_verifications_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_085d540d9f418cfbdc7bd55bb1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a9e3486bb3e8509466d4c9d6c9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c862499023be8feec98129d4e9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9cfe37d28c3b229a350e086d94"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a9e3486bb3e8509466d4c9d6c9"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_085d540d9f418cfbdc7bd55bb1"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_89bde91f78d36ca41e9515d91c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5af5b0cc7f3012e9eb45d3df35"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e6ebf5aab7a65fdb7de52051f6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5af5b0cc7f3012e9eb45d3df35"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_89bde91f78d36ca41e9515d91c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7062a4fbd9bab22ffd918e5d3d"`);
    await queryRunner.query(`DROP TABLE "organization_members"`);
    await queryRunner.query(`DROP TYPE "public"."organization_members_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_963693341bd612aa01ddf3a4b6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4ad920935f4d4eb73fc58b40f7"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f3770f157bd77d83ab022e92fc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_68d007d564953c00ae74c13dc2"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_68d007d564953c00ae74c13dc2"`);
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(`DROP TYPE "public"."organizations_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_76c0407957e441a0f13b26926f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_28facf3cb1f34e92ef00e83179"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_572c29601a80c4b8df243af042"`);
    await queryRunner.query(`DROP TABLE "organization_package_features"`);
    await queryRunner.query(`DROP TYPE "public"."organization_package_features_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_472218c0cc935b5b820d0bca3b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa94e031b5dbb95b495e8f9580"`);
    await queryRunner.query(`DROP TABLE "package_features"`);
    // Note: Cannot remove enum value 'chat' from package_features_type_enum in PostgreSQL
    // The enum will remain but won't cause issues
    await queryRunner.query(`DROP TYPE "public"."package_features_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e577dcf9bb6d084373ed399850"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3afc80b5ecc0276428da3e3a87"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_56ce8d405de7cdcedd31d900ba"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_35f274748195ecebcc7c138b9c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fecdffec754fa4d5cea9870977"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fecdffec754fa4d5cea9870977"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_42d1dbb4d85dc3643fdc6560af"`);
    await queryRunner.query(`DROP TABLE "invitations"`);
    await queryRunner.query(`DROP TYPE "public"."invitations_status_enum"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c328a1ecd12a5f153a96df4509"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_917fb937fb332ed0c14846c9a6"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e9f58bffa9bdcc402c0438a60c"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c328a1ecd12a5f153a96df4509"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17022daf3f885f7d35423e9971"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_178199805b901ccd220ab7740e"`);
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d090ad82a0e97ce764c06c7b31"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aad80a27f0a425bfc3f092a732"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_aad80a27f0a425bfc3f092a732"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4fa4c83eda7c58fa0861721db1"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_174c1edc5687170b6ed98f576a"`);
    await queryRunner.query(`DROP TABLE "packages"`);
  }
}
