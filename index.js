const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_TEST_KEY);

// middleware
app.use(cors({
  origin: "http://localhost:5173", // Your frontend URL
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express.json());

app.get('/', async (req, res) => {
  res.send("Boss is on fire");
});

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.il352b3.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function initializeMongoClient() {
  try {
    // Connect the client to the server
    await client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    const database = client.db("bossRestarunt");
    const menuCollection = database.collection("menu");
    const cardCollection = database.collection("card");
    const usersCollection = database.collection("users");
    const paymentsCollection = database.collection("payments");

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send(token);
    });

    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization || req.headers.Authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "Forbidden access" });
      }
      const token = authHeader.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }
        req.decoded = decoded;
        console.log(decoded);
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.findOne(query);
      res.send(result);
    });

    app.patch("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          name: req.body.name,
          category: req.body.category,
          price: req.body.price,
          recipe: req.body.recipe,
          image: req.body.image
        }
      };
      const result = await menuCollection.updateOne(filter, updateDoc);
      res.send(result);
      console.log(result);
    });

    app.post("/menu", verifyToken, verifyAdmin, async (req, res) => {
      const menuItem = req.body;
      const result = await menuCollection.insertOne(menuItem);
      res.send(result);
    });

    app.delete("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await menuCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/card", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cardCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/card", async (req, res) => {
      const cardItem = req.body;
      const result = await cardCollection.insertOne(cardItem);
      res.send(result);
    });

    app.delete("/card/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cardCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', verifyToken, verifyAdmin, async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/users/admin/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin"
        }
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false; // Default to false if user or role is not found
      if (user && user.role === "admin") {
        admin = true;
      }
      res.send({ admin });
    });


    // Define routes here
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      // console.log(amount);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    // payment Apis
    app.post('/payments',async(req,res)=>{
      const payments=req.body;
      // console.log(paymentHistory)
      const paymentResult=await paymentsCollection.insertOne(payments)
      const query={_id:{
        $in:payments.itemCardId.map(id=>new ObjectId(id))
      }
      }
      const deleteResult=await cardCollection.deleteMany(query);
      res.send({paymentResult,deleteResult});
    })
    
    app.get('/payments/:email',async(req,res)=>{
      const query={email: req.params.email}
      if(req.params.email!==req.decoded.email){
        return res.status(403).send({massge: "forbidden access"});
      }
      const result=await paymentsCollection.find().toArray();

    })

  } catch (error) {
    console.error("An error occurred while connecting to MongoDB:", error);
  }
}

initializeMongoClient();

app.listen(port, () => {
  console.log(`Boss is setting up on port ${port}`);
});
