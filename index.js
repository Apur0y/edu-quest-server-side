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
    const bookedCollection = client.db("Eduquest").collection("booked");
    const noteCollection = client.db("Eduquest").collection("notes");

    app.get("/users", async (req, res) => {

      // const search = req.body
     
      // if(search){
      //   const filteredUsers = users.filter((user) =>
      //     user.name.toLowerCase().includes(search.toLowerCase())
      //   );
      
      //   res.json(filteredUsers);
      // }

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
      const { filter } = req.query; // Get the status from query parameters
      let query = {};
    
      // If a specific status is provided, filter by it
      if (filter) {
        const filterArray = filter.split(","); 
        query = { status: { $nin: filterArray } }; // Support multiple statuses
      }
    
      const result = await sessionCollection.find(query).toArray();
      res.send(result);
    });
    

    app.post('/sessions',async(req,res)=>{
      const user = req.body
      const result = await sessionCollection.insertOne(user)
      res.send(result)
    })



    app.put('/sessions/:id', async (req, res) => {
      const { id } = req.params; // Extract session ID from URL parameters
      const { status, isFree, amount } = req.body; // Extract new status, isFree, and amount from request body
    
      try {
        // Prepare the fields to be updated
        const updateFields = { status };
    
        // If the session is free, set the fee to 0; otherwise, set it to the provided amount
        updateFields.registrationFee = isFree ? 0 : amount;
    
        // Update the session in the database
        const result = await sessionCollection.updateOne(
          { _id: new ObjectId(id) }, // Find the session by its ID
          { $set: updateFields } // Update the specified fields
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: 'Session not found' });
        }
    
        res.send({
          message: 'Session updated successfully',
          updatedFields: updateFields, // Send back the updated fields for confirmation
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: 'An error occurred', error });
      }
    });
    
    app.get('/sessions/:id', async (req,res)=>{
      const id = req.params.id
      const result= await sessionCollection.findOne({_id:new ObjectId(id)})
      res.send(result)
    })

    app.get('/booked', async(req,res)=>{
      const result = await bookedCollection.find().toArray()
      res.send(result)
    } )

    app.get("/booked/:id",async (req, res) => {
      const { id } = req.params;
      console.log("This the id",id);
      const data =await bookedCollection.findOne({_id:new ObjectId(id)}) 
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ message: "Data not found" });
      }
    });
    

    app.post('/booked', async (req,res)=>{
      const booked = req.body
   
      const result = await bookedCollection.insertOne(booked)
      res.send(result)
    })


    app.get("/notes", async(req,res)=>{
      const result = await noteCollection.find().toArray()
      res.send(result)
    })

    app.post('/notes', async(req,res)=>{
      const note = req.body;
      const result = await noteCollection.insertOne(note)
      res.send(result)
    })
    
    app.put("/notes/:id", async (req, res) => {
      const { id } = req.params;
      const { title, description } = req.body;
    
      if (!title || !description) {
        return res.status(400).json({ message: "Title and description are required" });
      }
    
      try {
        const updatedNote = await Note.findByIdAndUpdate(
          id,
          { title, description },
          { new: true }
        );
    
        if (!updatedNote) {
          return res.status(404).json({ message: "Note not found" });
        }
    
        res.status(200).json({ message: "Note updated successfully", note: updatedNote });
      } catch (error) {
        res.status(500).json({ message: "Error updating note", error });
      }
    });
    
    // Delete a note
    app.delete("/notes/:id", async (req, res) => {
      const { id } = req.params;
    
      try {
        const deletedNote = await Note.findByIdAndDelete({_id : new ObjectId(id)});
    
        if (!deletedNote) {
          return res.status(404).json({ message: "Note not found" });
        }
    
        res.status(200).json({ message: "Note deleted successfully", note: deletedNote });
      } catch (error) {
        res.status(500).json({ message: "Error deleting note", error });
      }
    });


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
