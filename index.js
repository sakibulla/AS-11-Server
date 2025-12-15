require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const app = express();
const port = 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

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
    paymentCollection = db.collection('payments'); 
    usersCollection=db.collections('users')
    const formatDoc = (doc) => ({ ...doc, _id: doc._id.toString() });

usersCollection = db.collection('users');
app.get('/users/:email', async (req, res) => {
  const email = req.params.email;
  const user = await usersCollection.findOne({ email });

  if (!user) {
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


app.post('/users', async (req, res) => {
  try {
    const user = req.body;
    user.role = 'user';
    user.createdAt = new Date();

    const email = user.email;
    const userExists = await usersCollection.findOne({ email }); 
    if (userExists) {
      return res.send({ message: 'User already exists' }); 
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




    app.put('/services/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID' });

      const updatedData = req.body; 

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
      image, 
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


app.get('/bookings', async (req, res) => {
  const { userEmail } = req.query;
  const query = userEmail ? { userEmail } : {};
  const bookings = await bookingsCollection.find(query).toArray();

  res.json(
    bookings.map(doc => ({
      ...formatDoc(doc),
      bookingStatus: doc.bookingStatus || 'Pending', 
      status: doc.status || 'pending',               
    }))
  );
});





app.delete('/bookings/:id', async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid booking ID" });
  }

  const result = await bookingsCollection.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  res.json({ success: true, message: "Booking removed successfully" });
});

    app.get('/bookings/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid booking ID" });
      const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
      if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
      res.json({ success: true, result: formatDoc(booking) });
    });


app.post('/bookings', async (req, res) => {
  const booking = req.body;

  if (!booking.userName || !booking.userEmail || !booking.serviceId || !booking.bookingDate || !booking.location) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  booking.status = 'pending';           
  booking.bookingStatus = 'unpaid';     

  const result = await bookingsCollection.insertOne(booking);

  res.json({ ...booking, _id: result.insertedId.toString() });
});

app.get('/bookings/decorator/:decoratorId', async (req, res) => {
  try {
    const { decoratorId } = req.params;

    if (!ObjectId.isValid(decoratorId)) {
      return res.status(400).json({ success: false, message: 'Invalid decorator ID' });
    }

    const bookings = await bookingsCollection.find({ assignedTo: decoratorId }).toArray();
    res.json(bookings.map(doc => ({ ...doc, _id: doc._id.toString() })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

app.patch('/bookings/:id/assign-decorator', async (req, res) => {
  const { id } = req.params;
  let { assignedTo } = req.body;

  if (!ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });

  try {
    if (!assignedTo || assignedTo === 'unassigned') assignedTo = null;

    const booking = await bookingsCollection.findOne({ _id: new ObjectId(id) });
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const bookingStatus = assignedTo ? 'Decorator Assigned' : 'Pending';

    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { assignedTo, bookingStatus } }
    );

    if (assignedTo) {
      const decorator = await decoratorCollection.findOne({ _id: new ObjectId(assignedTo) });
      if (decorator) {
        const newEarnings = (decorator.earnings || 0) + (booking.price || 0);
        await decoratorCollection.updateOne(
          { _id: new ObjectId(assignedTo) },
          { $set: { earnings: newEarnings } }
        );
      }
    }

    if (result.modifiedCount === 1) {
      res.json({ success: true, message: 'Decorator assignment updated and earnings added successfully' });
    } else {
      res.json({ success: false, message: 'No changes made' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get("/analytics/service-demand", async (req, res) => {
  try {
    const result = await bookingsCollection.aggregate([
      {
        $group: {
          _id: { $ifNull: ["$serviceName", "Unknown Service"] },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          serviceName: "$_id",
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]).toArray();

    res.json(result); 
  } catch (error) {
    console.error("Service Demand Error:", error);
    res.status(500).json({ message: error.message });
  }
});





app.patch('/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { bookingStatus } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: 'Invalid booking ID' });
  }

  if (!bookingStatus) {
    return res.status(400).json({ success: false, message: 'bookingStatus is required' });
  }

  try {
    const result = await bookingsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { bookingStatus } }
    );

    if (result.modifiedCount === 1) {
      res.json({ success: true, message: 'Booking status updated successfully' });
    } else {
      res.json({ success: false, message: 'No changes made' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});




    app.post('/create-checkout-session', async (req, res) => {
      const { id, cost, parcelName, parcelId, senderEmail } = req.body;
      const amount = parseInt(cost) * 100;

      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'USD',
                product_data: { name: parcelName },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          customer_email: senderEmail,
          metadata: { bookingId: id, parcelName, parcelId }, 
          success_url: `${process.env.SITE_DOMAIN}/dashboard/payment-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${process.env.SITE_DOMAIN}/dashboard/payment-cancelled`,
        });

        await bookingsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { sessionId: session.id, status: 'pending' } }
        );

        res.json({ url: session.url });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create checkout session' });
      }
    });


    app.patch('/payment-success', async (req, res) => {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.status(400).json({ message: 'No session ID provided' });

      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status === 'paid') {
          const bookingId = session.metadata.bookingId;

          const result = await bookingsCollection.updateOne(
            { _id: new ObjectId(bookingId) },
            { $set: { status: 'paid',bookingStatus:'Pending' } }
          );

          const trackingId = 'TRK' + Date.now();

          const payment = {
            amount: session.amount_total / 100,
            currency: session.currency,
            customerEmail: session.customer_email,
            parcelId: session.metadata.parcelId,
            parcelName: session.metadata.parcelName,
            transactionId: session.payment_intent,
            paymentStatus: session.payment_status,
            paidAt: new Date(),
            trackingId: trackingId
          };

          const existingPayment = await paymentCollection.findOne({ transactionId: session.payment_intent });
          if (!existingPayment) {
            await paymentCollection.insertOne(payment);
          }

          return res.json({
            success: true,
            modifyParcel: result,
            trackingId: trackingId,
            transactionId: session.payment_intent,
            paymentInfo: payment
          });
        } else {
          return res.status(400).json({ success: false, message: 'Payment not completed' });
        }
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update payment status' });
      }
    });

    app.post(
      "/webhook",
      express.raw({ type: "application/json" }),
      async (req, res) => {
        const sig = req.headers["stripe-signature"];
        let event;
        try {
          event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
        } catch (err) {
          console.error(err.message);
          return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        if (event.type === "checkout.session.completed") {
          const session = event.data.object;
          await bookingsCollection.updateOne(
            { sessionId: session.id },
            { $set: { status: "paid" } }
          );
          console.log(`Booking updated to paid for sessionId: ${session.id}`);
        }

        res.json({ received: true });
      }
    );

app.get('/payments', async (req, res) => {
  const { customerEmail } = req.query;

  if (!customerEmail) {
    return res.status(400).json({ message: 'customerEmail is required' });
  }

  const payments = await paymentCollection.find({ customerEmail }).toArray();
  res.json(
    payments.map(payment => ({
      ...payment,
      _id: payment._id.toString(),
      paidAt: payment.paidAt ? payment.paidAt.toISOString() : null,
    }))
  );
});

let decoratorCollection = db.collection('decorators');

app.get('/decorators', async (req, res) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const decorators = await decoratorCollection.find(query).toArray();
    res.send(decorators);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Failed to load decorators' });
  }
});


app.patch('/decorators/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        const query = { _id: new ObjectId(id) };

        const decorator = await decoratorCollection.findOne(query);
        if (!decorator) return res.status(404).json({ message: 'Decorator not found' });

        const updatedDoc = { $set: { status } };
        const result = await decoratorCollection.updateOne(query, updatedDoc);

        if (status === 'approved') {
            await usersCollection.updateOne({ email: decorator.email }, { $set: { role: 'decorator' } });
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update decorator status' });
    }
});
app.delete('/decorators/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid ID' });
    }

    const result = await decoratorCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Decorator not found' });
    }

    res.json({ success: true, message: 'Decorator deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ message: 'Failed to delete decorator' });
  }
});


app.get('/decorators/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const decorator = await decoratorCollection.findOne({ _id: new ObjectId(id) });

        if (!decorator) return res.status(404).json({ message: 'Decorator not found' });

        res.json(decorator);
    } catch (err) {
        res.status(400).json({ message: 'Invalid ID format' });
    }
});



app.post('/decorator', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const newApplication = {
      name,
      email,
      status: 'pending',      
      createdAt: new Date(),  
      earnings: 0
    };

    const result = await decoratorCollection.insertOne(newApplication);

    res.status(201).json({
      success: true,
      message: 'Decorator application submitted successfully',
      applicationId: result.insertedId.toString()
    });
  } catch (err) {
    console.error('Failed to submit decorator application:', err);
    res.status(500).json({ success: false, message: 'Failed to submit decorator application' });
  }
});




    app.get('/bookings/session/:sessionId', async (req, res) => {
      const { sessionId } = req.params;
      const booking = await bookingsCollection.findOne({ sessionId });
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      res.json({ status: booking.status, _id: booking._id.toString(), ...booking });
    });

    console.log("✅ MongoDB Connected and API routes ready!");
  } finally {
 
  }
}

run().catch(console.dir);

app.get('/', (req, res) => res.send("Server running"));
app.listen(port, () => console.log(`🚀 Server listening on port ${port}`));
