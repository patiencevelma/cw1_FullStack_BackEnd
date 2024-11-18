const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// Middleware
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
app.use(express.json());
app.set("json spaces", 3);

// Serve static files (HTML, CSS, JS) from the "public" directory
app.use(express.static(path.join(__dirname)));  // If you have a public folder for static assets

// OR serve a specific HTML file when visiting the root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "app.html"));  // Replace 'app.html' with your HTML file name
});

// Load properties from the file
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
const properties = PropertiesReader(propertiesPath);

// Extract database connection details from properties
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// MongoDB connection URL
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Declare database variable

// Connect to the database
async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    db1 = client.db(dbName); // Use the database name from properties
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

connectDB(); // Establish database connection

// Middleware to attach collection to the request
app.param("collectionName", (req, res, next, collectionName) => {
  try {
    req.collection = db1.collection(collectionName);
    next();
  } catch (err) {
    res.status(500).json({ error: "Failed to access collection" });
  }
});

// Routes

// Get all documents from a collection
app.get("/collections/:collectionName", async (req, res) => {
  try {
    const data = await req.collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    console.error("Error fetching documents:", err);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

// Update a document (e.g., updating spaces)
app.put("/collections/:collectionName/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: req.body }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ message: "Document updated" });
  } catch (err) {
    console.error("Error updating document:", err);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// Add a new order
app.post("/collections/:collectionName", async (req, res) => {
  try {
    const result = await req.collection.insertOne(req.body);
    res.status(201).json({ id: result.insertedId });
  } catch (err) {
    console.error("Error saving data:", err);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Serve images
const imagesPath = path.resolve(__dirname, "images");
app.use("/images", express.static(imagesPath));

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
