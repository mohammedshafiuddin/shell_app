CREATE TABLE "key_value" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "key_value_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"key" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"comment" varchar(255),
	"added_on" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "key_value_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "notif_creds" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notif_creds_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer,
	"push_token" varchar(255) NOT NULL,
	"added_on" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer,
	"title" varchar(255) NOT NULL,
	"body" varchar(512) NOT NULL,
	"image_url" varchar(255),
	"redirect_url" varchar(255),
	"added_on" timestamp with time zone DEFAULT now() NOT NULL,
	"payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "payment_info" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "payment_info_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"status" varchar(50) NOT NULL,
	"gateway" varchar(50) NOT NULL,
	"order_id" varchar(500),
	"merchant_order_id" varchar(255) NOT NULL,
	"payload" json,
	CONSTRAINT "payment_info_merchant_order_id_unique" UNIQUE("merchant_order_id")
);
--> statement-breakpoint
CREATE TABLE "role_info" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "role_info_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"display_name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_info" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"password" varchar(255) NOT NULL,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"active_token_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"add_date" date DEFAULT 'now()' NOT NULL,
	CONSTRAINT "user_role_pk" UNIQUE("user_id","role_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"username" varchar(255),
	"email" varchar(255),
	"mobile" varchar(255) NOT NULL,
	"join_date" date DEFAULT 'now()' NOT NULL,
	"address" varchar(500),
	"profile_pic_url" varchar(255),
	"is_suspended" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile"),
	CONSTRAINT "unique_mobile" UNIQUE("mobile"),
	CONSTRAINT "unique_email" UNIQUE("email"),
	CONSTRAINT "unique_username" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "notif_creds" ADD CONSTRAINT "notif_creds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_info" ADD CONSTRAINT "user_info_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_role_info_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."role_info"("id") ON DELETE no action ON UPDATE no action;