import { Hono, type Context, type Next } from "hono";
import { MongoClient, Db, ObjectId } from "mongodb";

const app = new Hono();
const port = 3000;

// MongoDB connection
let db: Db;

// Connect to MongoDB
async function connectToMongo(uri: string): Promise<void> {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db("crud_demo");
    console.log("Connected to MongoDB Atlas");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  }
}

// Middleware to ensure we have a name
const validateItem = async (c: Context, next: Next) => {
  const item = await c.req.json();
  if (!item.name || typeof item.name !== "string") {
    return c.json(
      { error: "Invalid item: name is required and must be a string" },
      400
    );
  }
  // Add more validation as needed
  await next();
};

// Middleware to connect to MongoDB
app.use("*", async (c, next) => {
  const MONGODB_URI = Bun.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }
  if (!db) {
    await connectToMongo(MONGODB_URI);
  }
  return next();
});

// Create
app.post("/items", validateItem, async (c) => {
  try {
    const item = await c.req.json();
    const result = await db.collection("items").insertOne(item);
    return c.json({ id: result.insertedId }, 201);
  } catch (error) {
    return c.json({ error: "Failed to create item" }, 500);
  }
});

// Read (all)
app.get("/items", async (c) => {
  try {
    const items = await db.collection("items").find().toArray();
    return c.json(items);
  } catch (error) {
    return c.json({ error: "Failed to retrieve items" }, 500);
  }
});

// Read (single)
app.get("/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const item = await db
      .collection("items")
      .findOne({ _id: new ObjectId(id) });
    if (!item) return c.json({ error: "Item not found" }, 404);
    return c.json(item);
  } catch (error) {
    return c.json({ error: "Failed to retrieve item" }, 500);
  }
});

// Update
app.put("/items/:id", validateItem, async (c) => {
  try {
    const id = c.req.param("id");
    const updates = await c.req.json();
    const result = await db
      .collection("items")
      .updateOne({ _id: new ObjectId(id) }, { $set: updates });
    if (result.matchedCount === 0)
      return c.json({ error: "Item not found" }, 404);
    return c.json({ message: "Item updated successfully" });
  } catch (error) {
    return c.json({ error: "Failed to update item" }, 500);
  }
});

// Delete
app.delete("/items/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await db
      .collection("items")
      .deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0)
      return c.json({ error: "Item not found" }, 404);
    return c.json({ message: "Item deleted successfully" });
  } catch (error) {
    return c.json({ error: "Failed to delete item" }, 500);
  }
});

// This export controls the server start
export default {
  port,
  fetch: app.fetch,
};
