const express= require('express');
const app =  express();
const cors= require('cors');
const jwt = require('jsonwebtoken');
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

    app.post("/jwt",async(req,res)=>{
      const user=req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN,{expiresIn: '1h'});
      res.send(token);
      // console.log(req.headers);
    })
    // varyfy middleware of jwt
    const verifyToken = (req, res, next) => {
      // console.log("inside the verifyToken", req.headers.authorization);
      
      const authHeader = req.headers.authorization || req.headers.Authorization;
    
      if (!authHeader) {
        return res.status(401).send({ message: "Forbidden access" });
      }
    
      const token = authHeader.split(' ')[1];
    
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" });
        }
        // we set this email as decoded
        req.decoded = decoded;
        next();
      });
    }
    const verifyAdmin = async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email: email};
      const user=await usersCollaction.findOne(query);
      const isAdmin=user?.role==="admin";
      if(!isAdmin){
        return res.status(403).send({massage: "forbidden access"})
      }
      next();
    }
    // MENU RELATED API
    app.get("/menu",async(req,res)=>{
        const result=await menuCollaction.find().toArray();
        res.send(result);
    })
    app.get("/menu/:id",async(req,res)=>{
      const id= req.params.id;
      // console.log(id);
      const query={_id: new ObjectId(id)};
      const result=await menuCollaction.findOne();
      res.send(result)
    })
    app.patch("/menu/:id",async(req,res)=>{
      const id =req.params.id;
      const filter={_id: new ObjectId(id)};
      const updateDoc={
        $set:{
          name: req.body.name,
          category: req.body.category,
          price: req.body.price,
          recipe: req.body.recipe,
          image: req.body.image
        }
      }
      const result=await menuCollaction.updateOne(filter,updateDoc);
      res.send(result);
      // const text=req.body;
      console.log(result);

    })
    app.post("/menu",verifyToken,verifyAdmin,async(req,res)=>{
      const menuItem = req.body;
      // console.log(menuItem);
      const result=await menuCollaction.insertOne(menuItem);
      res.send(result);
    })
    app.delete("/menu/:id", async(req,res)=>{
      const id=req.params.id;
      // console.log(id);
      const query={_id: new ObjectId(id)}
      // console.log(id);
      const result=await menuCollaction.deleteOne(query);
      res.send(result)
    })
    // card reladet apis or order related apis
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
    // user related apis
    app.get("/users", async(req,res)=>{
      const result= await usersCollaction.find().toArray();
      res.send(result);
      // console.log(req.headers);
    })
    app.post('/users',verifyToken,verifyAdmin,async(req,res)=>{
      const user=req.body;
      // console.log(user);
      const result=await usersCollaction.insertOne(user);
      res.send(result);
    })
    app.delete("/users/:id",verifyToken,verifyAdmin,async(req,res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)}
      // console.log(id);
      const result=await usersCollaction.deleteOne(query);
      res.send(result);
    })
    // admin related apis
    // app.patch("users/admin/:id",async (req,res)=>{
    //   const id =req.params.id;
    //   console.log(id);
    // })
    app.patch("/users/admin/:id",verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const filter={_id: new ObjectId(id)}
      const updatedDoc={
        $set: {
          role: "admin"
        }
      }
     const result=await usersCollaction.updateOne(filter,updatedDoc);
     res.send(result);
    });
    // chacheking admin
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "unauthorized access" });
      }
      const query = { email: email };
      const user = await usersCollaction.findOne(query);
      let admin = false; // Default to false if user or role is not found
      if (user && user.role === "admin") {
        admin = true;
      }
      res.send({ admin });
    });
    
    
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