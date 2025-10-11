import {
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const authUsers = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
  },
  (table) => {
    return {
      //This is required by Drizzle to link to the auth schema
      $schema: 'auth',
    };
  }
);

export const usersTable = pgTable('users_table', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    plan: text('plan').notNull(),
    stripe_id: text('stripe_id').notNull(),
});

export const userProfilesTable = pgTable('user_profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  first_name: text('first_name'),
  last_name: text('last_name'),
  phone: text('phone'),
  location: text('location'),
  bio: text('bio'),
  avatar_url: text('avatar_url'),
  roles: text('roles').array(),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

export const postTypeEnum = pgEnum('post_type', [
  'Enquiry',
  'Information',
  'Finding Tutor',
  'Offering Tutor',
]);

export const postsTable = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content'),
  postType: postTypeEnum('post_type').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commentsTable = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  postId: uuid('post_id')
    .notNull()
    .references(() => postsTable.id, { onDelete: 'cascade' }),
  content: text('content'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const conversationsTable = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  user1Id: uuid('user1_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  user2Id: uuid('user2_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messagesTable = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversationsTable.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingsTable = pgTable('bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id')
    .notNull()
    .references(() => conversationsTable.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  tutorId: uuid('tutor_id')
    .notNull()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  scheduledStart: timestamp('scheduled_start', { withTimezone: true }).notNull(),
  scheduledEnd: timestamp('scheduled_end', { withTimezone: true }).notNull(),
  sessionLengthMinutes: integer('session_length_minutes'),
  hourlyRate: text('hourly_rate').notNull(), // Using text for numeric to avoid precision issues
  totalAmount: text('total_amount').notNull(), // Using text for numeric
  status: text('status').default('pending').notNull(), // e.g., 'pending', 'accepted', 'declined', 'modified'
  location: text('location'),
  meetingLink: text('meeting_link'),
  specialInstructions: text('special_instructions'),
  paymentIntentId: text('payment_intent_id'),
  paymentStatus: text('payment_status')
    .notNull()
    .default('requires_payment'),
  paymentAmountCents: integer('payment_amount_cents'),
  paymentCurrency: text('payment_currency').notNull().default('usd'),
  paymentVersion: integer('payment_version').notNull().default(1),
  lastPaymentEventAt: timestamp('last_payment_event_at', { withTimezone: true }),
  lastPaymentError: text('last_payment_error'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  paymentStatusCheck: check(
    'bookings_payment_status_check',
    sql`${table.paymentStatus} in ('requires_payment','authorization_pending','authorized','capturable','captured','refunding','refunded','canceled')`
  ),
}));

export const bookingPaymentsTable = pgTable(
  'booking_payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookingsTable.id, { onDelete: 'cascade' }),
    stripeEventId: text('stripe_event_id').notNull(),
    status: text('status').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    stripeEventIdUnique: uniqueIndex('booking_payments_stripe_event_id_idx').on(
      table.stripeEventId
    ),
  })
);

export type InsertPost = typeof postsTable.$inferInsert;
export type SelectPost = typeof postsTable.$inferSelect;
export type InsertComment = typeof commentsTable.$inferInsert;
export type SelectComment = typeof commentsTable.$inferSelect;
export type InsertConversation = typeof conversationsTable.$inferInsert;
export type SelectConversation = typeof conversationsTable.$inferSelect;
export type InsertMessage = typeof messagesTable.$inferInsert;
export type SelectMessage = typeof messagesTable.$inferSelect;
export type InsertBooking = typeof bookingsTable.$inferInsert;
export type SelectBooking = typeof bookingsTable.$inferSelect;
export type InsertBookingPayment = typeof bookingPaymentsTable.$inferInsert;
export type SelectBookingPayment = typeof bookingPaymentsTable.$inferSelect;

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type SelectUserProfile = typeof userProfilesTable.$inferSelect;
