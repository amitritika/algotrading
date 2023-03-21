const express = require("express");
const totp = require("totp-generator");
const mongoose = require("mongoose");
const fs = require('fs');
const path = require('path');
const { everyDayMorning, everyDayEvening, 
    everyFridaySmartsheet1, everyFridaySmartsheet2, intradayMarketStrategy } = require("./helpers/schedulers.js");
const schedule = require('node-schedule');
require("dotenv").config();

const app = express();

const db = process.env.DATABASE_CLOUD_DEV

mongoose
  .connect(db, {useNewUrlParser: true, useUnifiedTopology: true})
  .then(() => console.log("DB Connected"));

//routs
const authRoutes = require("./routes/auth");
const stockListCreationRoutes = require("./routes/stockListCreation");
const historicalDataRoutes = require("./routes/historicalData");
const historicalDataAnalysisRoutes = require("./routes/historicalDataAnalysis");
const swingTradingStrategyRoutes = require("./routes/swingTradingStrategy");
const emaStrategyRoutes = require("./routes/emaStrategy");
const smartsheetRoutes = require("./routes/smartsheet");

//routes Middleware
app.get("/", (req, res)=>{
  res.send("You are in Server Side")
});

app.use("/api", authRoutes);
app.use("/api", stockListCreationRoutes);
app.use("/api", historicalDataRoutes);
app.use("/api", historicalDataAnalysisRoutes);
app.use("/api", swingTradingStrategyRoutes);
app.use("/api", emaStrategyRoutes);
app.use("/api", smartsheetRoutes);

console.log(totp(process.env.TOTP_KEY));
everyDayMorning();
everyDayEvening();
everyFridaySmartsheet1();
everyFridaySmartsheet2();
intradayMarketStrategy();
const port = process.env.PORT || 8000;

// Create a writable stream to the file
const logStream = fs.createWriteStream(path.join(__dirname, 'logs.txt'), { flags: 'a' });

// Function to format the current timestamp
function getTimeStamp() {
    const now = new Date();
    const options = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    };
    const formatter = new Intl.DateTimeFormat([], options);
    return formatter.format(now);
  }

// Override console.log with a custom function that writes to the file
const originalLog = console.log;
console.log = function (message) {
  const timestamp = getTimeStamp();
  const formattedMessage = `[${timestamp}] ${message}\n`;
  logStream.write(formattedMessage);
  originalLog.call(console, formattedMessage);
};

app.listen(port, () => {
  console.log(`server started at ${port}`)
})

