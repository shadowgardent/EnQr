const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

/* CORS CONFIG */
app.use(cors({
  origin: ["https://en-qr.vercel.app"],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));



app.use(express.json());

/* CHECK ENV */
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGO_URI);

let db;

/* CONNECT DATABASE */
async function start() {
  try {

    await client.connect();

    db = client.db("qr_system");

    await db.collection("qr_links").createIndex(
      { expireAt: 1 },
      { expireAfterSeconds: 0 }
    );

    console.log("✅ MongoDB connected");

  } catch (error) {

    console.error("MongoDB connection error:", error);

  }
}

start();


/* CREATE QR */
app.post("/create", async (req, res) => {

  try {

    if (!db) {
      return res.status(500).json({ error: "Database not ready" });
    }

    const { url, days } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const id = Math.random().toString(36).substring(2, 8);

    const expire = new Date();
    expire.setDate(expire.getDate() + Number(days || 1));

    await db.collection("qr_links").insertOne({
      _id: id,
      url: url,
      expireAt: expire,
      createdAt: new Date()
    });

    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;

    res.json({
      qrUrl: `${baseUrl}/r/${id}`
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "สร้าง QR ไม่สำเร็จ"
    });

  }

});


/* REDIRECT */
app.get("/r/:id", async (req, res) => {

  try {

    if (!db) {
      return res.status(500).send("Database not ready");
    }

    const data = await db.collection("qr_links").findOne({
      _id: req.params.id
    });

    if (!data) {
      return res.status(404).send("QR ไม่ถูกต้อง");
    }

    if (new Date() > new Date(data.expireAt)) {
      return res.send("QR Code หมดอายุแล้ว");
    }

    res.redirect(data.url);

  } catch (err) {

    console.error(err);

    res.status(500).send("Server error");

  }

});


/* TEST ROUTE */
app.get("/", (req, res) => {
  res.send("QR API running 🚀");
});


/* START SERVER */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});