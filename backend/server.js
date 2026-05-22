const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 3000;

/* CORS CONFIG */
const allowedOrigins = [
  "https://en-qr.vercel.app",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
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
      console.error("❌ Database connection not established");
      return res.status(500).json({ error: "Database not ready" });
    }

    const { url, days } = req.body;
    console.log(`📩 Request received: url=${url}, days=${days}`);

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // สร้าง ID 6 หลัก (ใช้แบบเดิมแต่เพิ่มการเช็ค)
    const id = Math.random().toString(36).substring(2, 8);

    const expire = new Date();
    const daysToAdd = Number(days) || 1;
    expire.setDate(expire.getDate() + daysToAdd);

    console.log(`⏳ Setting expiration to: ${expire}`);

    const result = await db.collection("qr_links").insertOne({
      _id: id,
      url: url,
      expireAt: expire,
      createdAt: new Date()
    });

    if (result.acknowledged) {
      console.log(`✅ Link saved to DB: ${id}`);
    } else {
      console.error("❌ Failed to acknowledge insertion");
    }

    // แก้ไข: ให้ใช้ Host จาก Request ถ้าไม่ได้ตั้งค่า BASE_URL ไว้
    // เพื่อให้เวลาแสกนผ่านมือถือในวงแลนเดียวกันจะใช้งานได้ (ไม่ใช่ localhost)
    const host = req.get("host"); 
    const protocol = req.protocol;
    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    const qrUrl = `${baseUrl}/r/${id}`;

    res.json({ qrUrl });

  } catch (err) {
    console.error("❌ Error in /create:", err);
    res.status(500).json({
      error: "สร้าง QR ไม่สำเร็จ: " + err.message
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