import { pgTable, uuid, text, timestamp, numeric, jsonb, date } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  destination: text("destination").notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  budget: numeric("budget"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const activities = pgTable("activities", {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id").references(() => trips.id).notNull(),
    type: text("type").notNull(), // flight, hotel, activity, restaurant, other
    title: text("title").notNull(),
    description: text("description"),
    location: jsonb("location"), // { city: "Tokyo", lat: 35.6, lon: 139.7 }
    price: numeric("price"),
    startTime: timestamp("start_time", { withTimezone: true }),
    endTime: timestamp("end_time", { withTimezone: true }),
    createdAt: timestamp("created_at").defaultNow(),
  });
  
  export const preferences = pgTable("preferences", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    travelStyle: text("travel_style"), // adventure, luxury, budget...
    preferredAirlines: text("preferred_airlines").array(), // array text
    notes: text("notes"),
  });
  
  export const aiSessions = pgTable("ai_sessions", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    tripId: uuid("trip_id").references(() => trips.id),
    prompt: text("prompt").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  });
