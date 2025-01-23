const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@thelaststand.sh6jy.mongodb.net/?retryWrites=true&w=majority&appName=thelaststand`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("Eduquest").collection("users");
    const sessionCollection = client.db("Eduquest").collection("sessions");

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post('/users',async(req,res)=>{
      const user = req.body
      const result = await userCollection.insertOne(user)
      res.send(result)
    })


    app.put('/users/:id', async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;
    
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: 'Invalid user ID' });
      }
    
      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        res.status(200).json({ message: 'User role updated successfully' });
      } catch (error) {
        res.status(500).json({ message: 'Failed to update user role', error });
      }
    });
    

    app.get("/sessions", async (req, res) => {
      const result = await sessionCollection.find().toArray();
      res.send(result);
    });

    app.post('/sessions',async(req,res)=>{
      const user = req.body
      const result = await sessionCollection.insertOne(user)
      res.send(result)
    })



    // Send a ping to confirm a successful connections
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Class is online");
});

app.listen(port, () => {
  console.log(`Education is Running ${port}`);
});
