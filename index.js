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

// Users route
app.post('/users', async (req, res) => {
  try {
    const user = req.body;
    user.role = 'user';
    user.createdAt = new Date();

    const email = user.email;
    const userExists = await usersCollection.findOne({ email }); // ✅ use correct collection
    if (userExists) {
      return res.send({ message: 'User already exists' }); // ✅ fixed typo
    }

    const result = await usersCollection.insertOne(user);
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      insertedId: result.insertedId.toString()
    });
  } catch (err) {
    console.error('Failed to create user:', err);
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});


   // -------------------------------
    // Services Routes
    // -------------------------------
    // Add new service
// UPDATE service
    app.put('/services/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

      const updatedData = req.body; // Can contain serviceName, serviceType, price, description, image

      try {
        const result = await serviceCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ success: false, message: 'Service not found' });
        }

        res.json({ success: true, modifiedCount: result.modifiedCount });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });

    // DELETE service
    app.delete('/services/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

      try {
        const result = await serviceCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'Service not found' });
        }
        res.json({ success: true, deletedCount: result.deletedCount });
      } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
      }
    });


    app.post('/services', async (req, res) => {
  try {
    const { serviceName, serviceType, price, description, image } = req.body;

    if (!serviceName || !serviceType || !price || !description || !image) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const newService = {
      serviceName,
      serviceType,
      price,
      description,
      image, // This is the URL from ImgBB
    };

    const result = await serviceCollection.insertOne(newService);

    res.status(201).json({ success: true, service: { ...newService, _id: result.insertedId } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

    app.get('/services', async (req, res) => {
      const result = await serviceCollection.find().toArray();
      res.json(result.map(formatDoc));
    });

    app.get('/services/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid ID" });
      const result = await serviceCollection.findOne({ _id: new ObjectId(id) });
      if (!result) return res.status(404).json({ success: false, message: "Service not found" });
      res.json({ success: true, result: formatDoc(result) });
    });

    app.post('/services', async (req, res) => {
      const data = req.body;
      const result = await serviceCollection.insertOne(data);
      res.json({ ...data, _id: result.insertedId.toString() });
    });

    app.put('/services/:id', async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;
      const result = await serviceCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
      res.json(result);
    });

    app.delete('/services/:id', async (req, res) => {
      const { id } = req.params;
      const result = await serviceCollection.deleteOne({ _id: new ObjectId(id) });
      res.json(result);
    });

