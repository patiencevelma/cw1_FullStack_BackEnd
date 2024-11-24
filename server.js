const express = require("express");
const cors = require("cors");
const path = require("path");
const PropertiesReader = require("properties-reader");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) to allow requests from specified origin
app.use(cors({
  origin: "https://patiencevelma.github.io", // Frontend origin
  methods: "GET,POST,PUT,DELETE",           // Allowed HTTP methods
  allowedHeaders: "Content-Type"            // Allowed headers in requests
}));

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Set JSON formatting for the response
app.set("json spaces", 3);

// Load properties from a configuration file for database connection
const propertiesPath = path.resolve(__dirname, "./dbconnection.properties");
const properties = PropertiesReader(propertiesPath);

// Extract database connection details from the properties file
const dbPrefix = properties.get("db.prefix");
const dbHost = properties.get("db.host");
const dbName = properties.get("db.name");
const dbUser = properties.get("db.user");
const dbPassword = properties.get("db.password");
const dbParams = properties.get("db.params");

// Construct the MongoDB connection URI
const uri = `${dbPrefix}${dbUser}:${dbPassword}${dbHost}${dbParams}`;
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

let db1; // Variable to hold the database instance

// Function to connect to the MongoDB database
async function connectDB() {
  try {
    await client.connect(); // Establish a connection
    console.log("Connected to MongoDB");
    db1 = client.db(dbName); // Assign the database instance using the name from the properties
  } catch (err) {
    console.error("MongoDB connection error:", err); // Log connection errors
  }
}

// Initialize the database connection
connectDB();

// Middleware to attach a specific collection to the request object based on route parameter
app.param("collectionName", (req, res, next, collectionName) => {
  try {
    req.collection = db1.collection(collectionName); // Access the collection dynamically
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    res.status(500).json({ error: "Failed to access collection" }); // Handle errors gracefully
  }
});

// Routes

// Get all documents from the specified collection
app.get("/collections/:collectionName", async (req, res) => {
  try {
    const data = await req.collection.find({}).toArray(); // Retrieve all documents
    res.json(data); // Respond with the retrieved data
  } catch (err) {
    console.error("Error fetching documents:", err); // Log errors
    res.status(500).json({ error: "Failed to fetch documents" }); // Send error response
  }
});

// Update a specific document in the collection
app.put("/collections/:collectionName/:id", async (req, res) => {
  const { id } = req.params; // Extract the document ID from route parameters
  try {
    const result = await req.collection.updateOne(
      { _id: new ObjectId(id) }, // Match the document by its unique ObjectId
      { $set: req.body }         // Update the document with data from the request body
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Document not found" }); // Handle case where no document was matched
    }
    res.json({ message: "Document updated" }); // Respond with success message
  } catch (err) {
    console.error("Error updating document:", err); // Log errors
    res.status(500).json({ error: "Failed to update document" }); // Send error response
  }
});

// Add a new document to the specified collection
app.post("/collections/:collectionName", async (req, res) => {
  try {
    const result = await req.collection.insertOne(req.body); // Insert the document
    res.status(201).json({ id: result.insertedId }); // Respond with the ID of the inserted document
  } catch (err) {
    console.error("Error saving data:", err); // Log errors
    res.status(500).json({ error: "Failed to save data" }); // Send error response
  }
});

// Serve static image files from the "images" directory
const imagesPath = path.resolve(__dirname, "images");
app.use("/images", express.static(imagesPath)); // Serve files at /images route

// Start the Express server on the specified port
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`); // Log server startup
});
