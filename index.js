const multer = require("multer");
const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

//middleware
app.use(cors({
  origin:  ["http://localhost:5173", "https://edu-quest-aa2b3.web.app"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

const storage = multer.memoryStorage(); // Or use diskStorage for saving files to disk
const upload = multer({ storage });

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: axios } = require("axios");
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
    // await client.connect();

    const userCollection = client.db("Eduquest").collection("users");
    const sessionCollection = client.db("Eduquest").collection("sessions");
    const bookedCollection = client.db("Eduquest").collection("booked");
    const noteCollection = client.db("Eduquest").collection("notes");
    const materialCollection = client.db("Eduquest").collection("materials");
    const reviewCollection = client.db("Eduquest").collection("reviews");
    
    
    
     const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      console.log("Inside the auth",authHeader);
      if (!authHeader) {
        return res.status(401).json({ message: "Forbidden Access: No token provided" });
      }
    
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: "Forbidden Access: Invalid token" });
        }
        req.decoded = decoded; // Store decoded user info in request
        next();
      });
    };
    
    // Unified role verification function
    const verifyRole = (role) => async (req, res, next) => {
      try {
        const email = req.user.email;
        const user = await userCollection.findOne({ email });
    
        if (!user || user.role !== role) {
          return res.status(403).json({ message: "Forbidden Access: Unauthorized role" });
        }
        next();
      } catch (error) {
        res.status(500).json({ message: "Server error", error });
      }
    };


    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    app.get("/users",verifyToken,verifyRole("admin"), async (req, res) => {
   

      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.put("/users/:id", async (req, res) => {
      const { id } = req.params;
      const { role } = req.body;

      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      try {
        const result = await userCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role } }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User role updated successfully" });
      } catch (error) {
        res.status(500).json({ message: "Failed to update user role", error });
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

    app.post("/sessions", async (req, res) => {
      const user = req.body;
      const result = await sessionCollection.insertOne(user);
      res.send(result);
    });

    app.put("/sessions/:id", async (req, res) => {
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
          return res.status(404).send({ message: "Session not found" });
        }

        res.send({
          message: "Session updated successfully",
          updatedFields: updateFields, // Send back the updated fields for confirmation
        });
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "An error occurred", error });
      }
    });

    app.get("/sessions/:id", async (req, res) => {
      const id = req.params.id;
      const result = await sessionCollection.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    app.delete("/sessions/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await sessionCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/booked", async (req, res) => {
      const result = await bookedCollection.find().toArray();
      res.send(result);
    });

    app.get("/booked/:id", async (req, res) => {
      const { id } = req.params;

      const data = await bookedCollection.findOne({ _id: new ObjectId(id) });
      if (data) {
        res.json(data);
      } else {
        res.status(404).json({ message: "Data not found" });
      }
    });

    app.post("/booked",verifyToken,verifyRole("student"), async (req, res) => {
      const booked = req.body;

      const result = await bookedCollection.insertOne(booked);
      res.send(result);
    });

    app.get("/notes",verifyToken,verifyRole("student"), async (req, res) => {
      const result = await noteCollection.find().toArray();
      res.send(result);
    });

    app.post("/notes",verifyToken,verifyRole("student"), async (req, res) => {
      const note = req.body;
      const result = await noteCollection.insertOne(note);
      res.send(result);
    });

    app.put("/notes/:id",verifyToken,verifyRole("student"), async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedNote = req.body;

      const setNotes = {
        $set: {
          title: updatedNote.title,
          description: updatedNote.description,
        },
      };
      const result = await noteCollection.updateOne(filter, setNotes);
      res.send(result);
    });

    // Delete a note
    app.delete("/notes/:id",verifyToken,verifyRole("student"), async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await noteCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/materials", upload.single("image"), async (req, res) => {
      try {
        const material = {
          title: req.body.title,
          sessionId: req.body.sessionId,
          tutorEmail: req.body.tutorEmail,
          link: req.body.link,
          // image: req.file ? req.file.buffer.toString('base64') : null, // Storing file as base64 string
        };

        const result = await materialCollection.insertOne(material);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error inserting material:", error);
        res.status(500).send({ message: "Failed to upload material", error });
      }
    });

    app.get("/materials", async (req, res) => {
      try {
        const materials = await materialCollection.find({}).toArray();
        res.status(200).send(materials);
      } catch (error) {
        console.error("Error fetching materials:", error);
        res.status(500).send({ message: "Failed to fetch materials", error });
      }
    });

    app.delete("/materials/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await materialCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/reviews",verifyToken, async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    app.post("/reviews",verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.post('/create-ssl-payment', async(req,res)=>{
      const payment = req.body;
      console.log("payment-info", payment);

      const trxId=new ObjectId().toString()

      const initiate ={
        store_id:"eduqu67a83aebd8483",
        store_passwd:"eduqu67a83aebd8483@ssl",
        total_amount: payment.registrationFee,
        currency: 'BDT',
        tran_id: trxId, // use unique tran_id for each api call
        success_url: 'http://localhost:3030/success',
        fail_url: 'http://localhost:3030/fail',
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: 'Computer.',
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: 'Customer Name',
        cus_email: 'customer@example.com',
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh'
      }

      const inResponce = await axios.post('https://sandbox.sslcommerz.com/gwprocess/v4/api.php',initiate)

      console.log("In res",inResponce);
    })

    // Send a ping to confirm a successful connections
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
