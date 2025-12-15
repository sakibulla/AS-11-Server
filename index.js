require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb/mongodb');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const app = express();
const port = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// MongoDB connection
const client = new MongoClient(
  `mongodb+srv://${encodeURIComponent(process.env.DB_USERNAME)}:${encodeURIComponent(
    process.env.DB_PASSWORD
  )}@xdecor.rrrsidw.mongodb.net/x-decor?retryWrites=true&w=majority`,
  { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true } }
);

let bookingsCollection, serviceCollection, paymentCollection;

async function run() {
  try {
    const db = client.db('x-deco');
    serviceCollection = db.collection('services');
    bookingsCollection = db.collection('bookings');
    paymentCollection = db.collection('payments'); // ✅ Initialize payment collection
    usersCollection=db.collections('users')
    const formatDoc = (doc) => ({ ...doc, _id: doc._id.toString() });

// Initialize users collection
usersCollection = db.collection('users');
// Get user profile
app.get('/users/:email', async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });

  if (!user) {
    // auto-create user if missing
    const newUser = {
      email,
      displayName: "",
      photoURL: "",
      role: "user",
      createdAt: new Date(),
    };
    await usersCollection.insertOne(newUser);
    return res.json({ user: newUser });
  }

  res.json({ user });
});

// Update profile
app.put('/users/:email', async (req, res) => {
  const email = req.params.email;
  const body = req.body;

  const result = await usersCollection.updateOne(
    { email },
    { $set: body },
    { upsert: true }
  );

  res.json({ success: true, updated: result });
});
app.get("/users/:email/role", async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });

  res.send({ role: user?.role || "user" });
});



