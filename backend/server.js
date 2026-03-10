const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(cors());

// ใช้ MongoDB จาก Environment Variable
const uri = process.env.MONGO_URI;

const client = new MongoClient(uri);

let db;

// เชื่อม MongoDB
async function start() {
  try {
    await client.connect();
    db = client.db("qr_system");
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

start();


// API สร้าง QR
app.post("/create", async (req, res) => {

  try {

    const { url, days } = req.body;

    const id = Math.random().toString(36).substring(2,8);

    const expire = new Date();
    expire.setDate(expire.getDate() + Number(days));

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
    res.status(500).json({ error: "สร้าง QR ไม่สำเร็จ" });
  }

});


// redirect
app.get("/r/:id", async (req, res) => {

  try {

    const data = await db.collection("qr_links").findOne({
      _id: req.params.id
    });

    if (!data) {
      return res.send("QR ไม่ถูกต้อง");
    }

    if (new Date() > new Date(data.expireAt)) {
      return res.send("QR Code หมดอายุแล้ว");
    }

    res.redirect(data.url);

  } catch (err) {
    res.status(500).send("Server error");
  }

});


// เปิด server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});