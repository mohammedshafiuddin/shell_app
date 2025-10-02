import { pgTable, integer, varchar, date, unique, boolean, text, timestamp, numeric, json, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const usersTable = pgTable(
	"users",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: varchar({ length: 255 }).notNull(),
		username: varchar({ length: 255 }),  // Optional, will be null for regular users
		email: varchar({ length: 255 }),
		mobile: varchar({ length: 255 }).notNull().unique(),
		joinDate: date("join_date").notNull().default("now()"),
		address: varchar({ length: 500 }),
		profilePicUrl: varchar("profile_pic_url", { length: 255 }),
		isSuspended: boolean("is_suspended").notNull().default(false)
	},
	(t) => ({
		unq_mobile: unique("unique_mobile").on(t.mobile),
		unq_email: unique("unique_email").on(t.email),
		unq_username: unique("unique_username").on(t.username),
	})
);

export const roleInfoTable = pgTable(
	"role_info",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		name: varchar({ length: 255 }).notNull(),
		description: varchar({ length: 500 }),
		displayName: varchar("display_name", { length: 255 }).notNull(),
	}
);

export const userRolesTable = pgTable(
	"user_roles",
	{
		userId: integer("user_id").notNull().references(() => usersTable.id),
		roleId: integer("role_id").notNull().references(() => roleInfoTable.id),
		addDate: date("add_date").notNull().default("now()"),
	},
	(t) => ({
		pk: unique("user_role_pk").on(t.userId, t.roleId),
	})
);

// Add relations for roleInfoTable
export const roleInfoTableRelations = relations(roleInfoTable, ({ many }) => ({
	userRoles: many(userRolesTable)
}));

// Add relations for userRolesTable
export const userRolesTableRelations = relations(userRolesTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userRolesTable.userId],
		references: [usersTable.id]
	}),
	role: one(roleInfoTable, {
		fields: [userRolesTable.roleId],
		references: [roleInfoTable.id]
	})
}));

export const usersTableRelations = relations(usersTable, ({ many, one }) => ({
	roles: many(userRolesTable),
	userInfo: one(userInfoTable),
}));

export const userInfoTable = pgTable(
	"user_info",
	{
		userId: integer("user_id").notNull().references(() => usersTable.id).primaryKey(),
		password: varchar("password", { length: 255 }).notNull(),
		isSuspended: boolean("is_suspended").notNull().default(false),
		activeTokenVersion: integer("active_token_version").notNull().default(1),
	}
);

export const userInfoRelations = relations(userInfoTable, ({ one }) => ({
	user: one(usersTable, {
		fields: [userInfoTable.userId],
		references: [usersTable.id],
	}),
}));


export const paymentInfoTable = pgTable(
	"payment_info",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		status: varchar({ length: 50 }).notNull(),
		gateway: varchar({ length: 50 }).notNull(),
		orderId: varchar('order_id',{ length: 500 }),
		merchantOrderId: varchar('merchant_order_id', { length: 255 }).notNull().unique(),
		payload: json("payload"),
	}
);

export const paymentInfoRelations = relations(paymentInfoTable, ({ one }) => ({}));



export const notifCredsTable = pgTable("notif_creds", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  pushToken: varchar("push_token", { length: 255 }).notNull(),
  addedOn: timestamp("added_on", {withTimezone: true}).notNull().defaultNow(),
})

export const notifCredsTableRelations = relations(notifCredsTable, ({ one }) => ({
  userId: one(usersTable, { fields: [notifCredsTable.userId], references: [usersTable.id] }),
}))

export const notificationTable = pgTable("notifications", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  body: varchar("body", { length: 512 }).notNull(),
  imageUrl: varchar("image_url", { length: 255 }),
  redirectUrl: varchar("redirect_url", { length: 255 }),
  addedOn: timestamp("added_on", {withTimezone:true}).notNull().defaultNow(),
  payload: jsonb("payload"),
})
export const notificationTableRelations = relations(notificationTable, ({ one }) => ({
  user: one(usersTable, { fields: [notificationTable.userId], references: [usersTable.id] }), 
}))

export const keyValueTable = pgTable("key_value", { 
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  key: varchar({ length: 255 }).notNull().unique(),
  value: varchar({ length: 255 }).notNull(),
  comment: varchar({ length: 255 }),
  addedOn: timestamp("added_on", {withTimezone:true}).notNull().defaultNow(),
})

