require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/DataBaseConfig");
const adminRoutes = require('./routes/adminAuthRoutes');
const workItemRoutes = require('./routes/workItemRoutes');



const app = express();


connectDB();


const corsOptions = {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true
};

app.use(cors(corsOptions))

app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString(),
        mongodb: "connected"
    });
});

app.get("/", (req, res) => {
    res.send("🚴 Welcome to the Heunets tracking System!");
});

app.use('/api/admin', adminRoutes);
app.use('/api/workitems', workItemRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
