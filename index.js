require('dotenv').config(); // <-- Load .env at the very top

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: '*' }));

// Encode username and password to handle special characters
const user = encodeURIComponent(process.env.DB_USERNAME);
const pass = encodeURIComponent(process.env.DB_PASSWORD);

// Correct MongoDB URI format
const uri = `mongodb+srv://${user}:${pass}@xdecor.rrrsidw.mongodb.net/x-decor?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Helper function to format _id
function formatDoc(doc) {
    return { ...doc, _id: doc._id.toString() };
}

async function run() {
    try {
        // Connect to MongoDB
        await client.connect();
        const db = client.db('x-decor');
        const modelCollection = db.collection('models');

        // Get all artworks
        app.get('/Artify', async (req, res) => {
            const result = await modelCollection.find().toArray();
            res.json(result.map(formatDoc));
        });

        // Get artwork by ID
        app.get('/Artify/:id', async (req, res) => {
            const { id } = req.params;
            if (!ObjectId.isValid(id)) {
                return res.status(400).json({ success: false, message: "Invalid ID" });
            }
            const result = await modelCollection.findOne({ _id: new ObjectId(id) });
            if (!result) return res.status(404).json({ success: false, message: "Artwork not found" });
            res.json({ success: true, result: formatDoc(result) });
        });

        console.log("MongoDB connected");

    } catch (err) {
        console.error(err);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send("Server running"));
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
