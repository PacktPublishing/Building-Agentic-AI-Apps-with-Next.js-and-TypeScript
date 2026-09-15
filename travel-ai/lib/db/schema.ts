import { pgTable, uuid, text, timestamp, numeric, jsonb, date, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
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
  // Trip planner fields
  numPeople: integer("num_people"),
  departureCity: text("departure_city"),
  arrivalCity: text("arrival_city"),
  departureDate: date("departure_date"),
  stayDuration: integer("stay_duration"),
  flights: jsonb("flights"),
  hotels: jsonb("hotels"),
  activities: jsonb("activities"),
  status: text("status").default("draft"),
  threadId: text("thread_id"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const tripIndexJobs = pgTable("trip_index_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Deliberately not an FK: delete jobs must survive the source trip deletion.
  tripId: uuid("trip_id").notNull().unique(),
  operation: text("operation").notNull().default("upsert"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  version: integer("version").notNull().default(1),
  lastError: text("last_error"),
  availableAt: timestamp("available_at").defaultNow().notNull(),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
