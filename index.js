const express= require('express');
const app =  express();
const cors= require('cors');
const port =process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(cors({
  origin: "http://localhost:5173", // Your frontend URL
  credentials: true, // Allow credentials (cookies, authorization headers, etc.)
}));
app.use(express.json());

app.get('/', async(req,res)=>{
    res.send("Boss is on fire")
})



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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    const database = client.db("bossRestarunt");
    const menuCollaction = database.collection("menu");
    const cardCollaction=database.collection("card");
    const usersCollaction=database.collection("users");

    app.get("/menu",async(req,res)=>{
        const result=await menuCollaction.find().toArray();
        res.send(result);
    })

    app.get("/card",async (req,res)=>{
      const email=req.query.email;
      const query={email: email}
      // console.log(query);
      const result=await cardCollaction.find(query).toArray();
      // console.log(result);
      res.send(result);
    })
    app.post("/card",async(req,res)=>{
      const cardItem=req.body;
      const result= await cardCollaction.insertOne(cardItem);
      res.send(result)
    })
    app.delete("/card/:id",async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id) }
      // console.log(query);
      const result=await cardCollaction.deleteOne(query);
      res.send(result);
    })
    app.post('/users',async(req,res)=>{
      const user=req.body;
      console.log(user);
    })
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port,()=>{
    console.log(`Boss is setting up of prot ${port}`);
})