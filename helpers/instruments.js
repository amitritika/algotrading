const fs = require('fs');

const axios = require("axios");

exports.getLTP = async function (data) {

        const d = fs.readFileSync("../token.txt", "utf-8");
        var authtoken = JSON.parse(d)["data"]["jwtToken"];
        authtoken = "Bearer " + authtoken; 
        const url = "https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData";
        const headers =  { 
            'X-PrivateKey': process.env.API_KEY, 
            'Accept': 'application/json', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-UserType': 'USER', 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json'
        }
        try {
        const response = await axios.post(url, data, { headers });
        console.log(response.data);
        return response.data;
        } catch (error) {
        console.error(error);
        }
  };

  exports.getHistoricalData = async function (data) {

    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken; 
    const url = "https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData";
    const headers =  { 
        'X-PrivateKey': process.env.API_KEY, 
        'Accept': 'application/json', 
        'X-SourceID': 'WEB', 
        'X-ClientLocalIP': '', 
        'X-ClientPublicIP': '', 
        'X-MACAddress': '', 
        'X-UserType': 'USER', 
        'Authorization': String(authtoken), 
        'Content-Type': 'application/json'
    }
    try {
    const response = await axios.post(url, data, { headers });
    return response.data;
    } catch (error) {
    console.error(error);
    }
};

exports.niftyOption = (symbol) => {
    return new Promise((resolve, reject) => {
      fs.readFile('../instruments.txt', 'utf-8', (err, data) => {
        if (err) reject(err);
        
        if (data.trim().length === 0) {
          reject(new Error('File is empty'));
        }
        
        const lines = data.split('\n');
        const objects = [];
        for (const line of lines) {
          try {
            objects.push(JSON.parse(line));
          } catch (error) {
            console.error(`Failed to parse line: ${line}`);
          }
        }
  
        const foundObject = objects.find(obj => obj.symbol === symbol);
        if (!foundObject) {
          reject(new Error(`No object found with symbol ${symbol}`));
        }
  
        resolve(foundObject);
      });
    });
  }
  

const findTokenBySymbol = (objects, symbol) => {
    const object = objects.find(obj => obj.symbol === symbol);
    return object ? object.token : null;
  };

  exports.nextThursday =()=> {
    const targetDay = "Thursday";
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 5);
  currentDate.setMinutes(currentDate.getMinutes() + 30);
  const currentDay = currentDate.toLocaleString('en-IN', { weekday: 'long' });
    console.log(currentDay);
    let daysUntilTargetDay = (7 + (4 - currentDate.getUTCDay())) % 7;
    
    if (currentDay === "Wednesday" || currentDay === targetDay) {
      daysUntilTargetDay += 7;
    }
    
    let nextTargetDay = new Date(currentDate.getTime() + (daysUntilTargetDay * 24 * 60 * 60 * 1000));
    const options = { day: '2-digit', month: 'short' };
    let nextTargetDayString = nextTargetDay.toLocaleDateString('en-IN', options).toUpperCase();
    nextTargetDayString = nextTargetDayString.replace(/ /g, '');
    nextTargetDayString += nextTargetDay.getFullYear().toString().slice(-2);
    console.log(nextTargetDayString);
    return nextTargetDayString;
  }
  
  