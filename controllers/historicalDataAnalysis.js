const express = require("express");
const axios = require("axios");
const fs = require('fs');
const { ma } = require("moving-averages");
const Nifty100 = require("../models/nifty100");
const TradeStatus = require("../models/tradeStatus");
const { nifty100 } = require("../helpers/nifty100");
var RSI = require('technicalindicators').RSI

exports.getDailyDataAnalysis = (req, res) => {
    var authtoken = "";

    
    
    var currentTime = new Date();

    var currentOffset = currentTime.getTimezoneOffset();

    var ISTOffset = 330;   // IST offset UTC +5:30 

    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);

    // ISTTime now represents the time in IST coordinates

    var hoursIST = ('0'+(ISTTime.getHours()+1)).slice(-2)
    var minutesIST = ('0'+(ISTTime.getMinutes()+1)).slice(-2)
    var year = ISTTime.getFullYear()
    var month = ('0'+(ISTTime.getMonth()+1)).slice(-2)
    var date = ('0'+(ISTTime.getDate())).slice(-2)

    var toDate = year.toString() + "-" + month.toString() + "-" + date.toString() + " " + hoursIST.toString() + ":" + minutesIST.toString();
    var fromDate = "2020-01-01 09:15"

    
    var interval = 1000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    nifty100.forEach(function (el) {
        promise = promise.then(function () {
            const token = el.token;

            fs.readFile('../token.txt', 'utf8', (err, d) => {
                
                if (err) {
                console.error(err);
                return;
                }
                authtoken = JSON.parse(d)["data"]["jwtToken"];
                authtoken = "Bearer " + authtoken; 
                

                var data = JSON.stringify({"exchange":"NSE","symboltoken":token,
                "interval":"ONE_DAY","fromdate": fromDate,
                "todate":toDate});

                var config = {
                    method: 'post',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
                
                    headers: { 
                        'X-PrivateKey': process.env.API_KEY, 
                        'Accept': 'application/json', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-UserType': 'USER', 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                
                
                axios(config)
                .then(function (response) {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ma44 = [];
                    var ma200 = [];
                    var rsi = [];

                    Promise.all(response.data.data.map((c,i)=> {
                        dates.push(c[0]);
                        open.push(c[1]);
                        high.push(c[2]);
                        low.push(c[3]);
                        close.push(c[4]);
                        volume.push(c[5]);
                    }))
                    .then(()=>{
                        ma44 = ma(close, 44);
                        ma200 = ma(close, 200);
                        //rsi = calculateRSI(close);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        var monthlyData = monthlyDataFormat(dates, open, high, low, close);
                        var weeklyData = weeklyDataFormat(dates, open, high, low, close);

                        dates = dates.slice(-20);
                        open = open.slice(-20);
                        high = high.slice(-20);
                        low = low.slice(-20);
                        close = close.slice(-20);
                        volume = volume.slice(-20);
                        ma44 = ma44.slice(-20);
                        ma200 = ma200.slice(-20);
                        rsi = rsi.slice(-20);
                        var dailyData = { dates, open, high, low, close, volume, ma44, rsi }
                        
                        Nifty100.findOneAndUpdate({ token }, { $set: { "monthlyData": monthlyData, "weeklyData": weeklyData, "dailyData": dailyData } }, {new: true}).exec((err, stock) =>{
                            if (err || !stock) {
                              console.log(err);
                              }
                            else{
                                console.log(stock);
                            }
                          })

                    })
                    
                })
                .catch(function (error) {
                    console.log(error);
                })
            })

            console.log(el.token);
            return new Promise(function (resolve) {
            setTimeout(resolve, interval);
            });
        });
    });

    promise.then(function () {
    console.log('Loop finished.');
    })
}

exports.get15MinuteDataAnalysis = (req, res) => {

    var authtoken = "";

    
    
    var currentTime = new Date();
    var fromD = new Date();
    fromD.setDate(fromD.getDate()-100);

    var currentOffset = currentTime.getTimezoneOffset();
    var fromOffset = fromD.getTimezoneOffset();

    var ISTOffset = 330;   // IST offset UTC +5:30 

    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var fromISTTime = new Date(fromD.getTime() + (ISTOffset + fromOffset)*60000);

    // ISTTime now represents the time in IST coordinates

    var hoursIST = ('0'+(ISTTime.getHours()+1)).slice(-2)
    var minutesIST = ('0'+(ISTTime.getMinutes()+1)).slice(-2)
    var year = ISTTime.getFullYear()
    var month = ('0'+(ISTTime.getMonth()+1)).slice(-2)
    var date = ('0'+(ISTTime.getDate())).slice(-2)

  
    var fromyear = fromISTTime.getFullYear()
    var frommonth = ('0'+(fromISTTime.getMonth()+1)).slice(-2)
    var fromdate1 = ('0'+(fromISTTime.getDate())).slice(-2)

    var toDate = year.toString() + "-" + month.toString() + "-" + date.toString() + " " + hoursIST.toString() + ":" + minutesIST.toString();
    var fromDate = fromyear.toString() + "-" + frommonth.toString() + "-" + fromdate1.toString() + " 09:15"

    
    var interval = 1000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    nifty100.forEach(function (el) {
        promise = promise.then(function () {
            const token = el.token;

            fs.readFile('../token.txt', 'utf8', (err, d) => {
                
                if (err) {
                console.error(err);
                return;
                }
                authtoken = JSON.parse(d)["data"]["jwtToken"];
                authtoken = "Bearer " + authtoken; 
                

                var data = JSON.stringify({"exchange":"NSE","symboltoken":token,
                "interval":"FIFTEEN_MINUTE","fromdate": fromDate,
                "todate":toDate});

                var config = {
                    method: 'post',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
                
                    headers: { 
                        'X-PrivateKey': process.env.API_KEY, 
                        'Accept': 'application/json', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-UserType': 'USER', 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                
                
                axios(config)
                .then(function (response) {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ma44 = [];
                    var ma200 = [];
                    var rsi = [];

                    Promise.all(response.data.data.map((c,i)=> {
                        dates.push(c[0]);
                        open.push(c[1]);
                        high.push(c[2]);
                        low.push(c[3]);
                        close.push(c[4]);
                        volume.push(c[5]);
                    }))
                    .then(()=>{
                        ma44 = ma(close, 44);
                        ma200 = ma(close, 200);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        dates = dates.slice(-20);
                        open = open.slice(-20);
                        high = high.slice(-20);
                        low = low.slice(-20);
                        close = close.slice(-20);
                        volume = volume.slice(-20);
                        ma44 = ma44.slice(-20);
                        ma200 = ma200.slice(-20);
                        rsi = rsi.slice(-20);

                        var data2 = { dates, open, high, low, close, volume, ma44, ma200, rsi }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "fifteenMinData": data2  } }, {new: true}).exec((err, stock) =>{
                            if (err || !stock) {
                              console.log(err);
                              }
                            else{
                                console.log(stock);
                            }
                          })

                    })
                    
                })
                .catch(function (error) {
                    console.log(error);
                })
            })

            console.log(el.token);
            return new Promise(function (resolve) {
            setTimeout(resolve, interval);
            });
        });
    });

promise.then(function () {
  console.log('Loop finished.');
})
    
};

exports.get30MinuteDataAnalysis = (req, res) => {

    var authtoken = "";

    
    
    var currentTime = new Date();
    var fromD = new Date();
    fromD.setDate(fromD.getDate()-100);

    var currentOffset = currentTime.getTimezoneOffset();
    var fromOffset = fromD.getTimezoneOffset();

    var ISTOffset = 330;   // IST offset UTC +5:30 

    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var fromISTTime = new Date(fromD.getTime() + (ISTOffset + fromOffset)*60000);

    // ISTTime now represents the time in IST coordinates

    var hoursIST = ('0'+(ISTTime.getHours()+1)).slice(-2)
    var minutesIST = ('0'+(ISTTime.getMinutes()+1)).slice(-2)
    var year = ISTTime.getFullYear()
    var month = ('0'+(ISTTime.getMonth()+1)).slice(-2)
    var date = ('0'+(ISTTime.getDate())).slice(-2)

  
    var fromyear = fromISTTime.getFullYear()
    var frommonth = ('0'+(fromISTTime.getMonth()+1)).slice(-2)
    var fromdate1 = ('0'+(fromISTTime.getDate())).slice(-2)

    var toDate = year.toString() + "-" + month.toString() + "-" + date.toString() + " " + hoursIST.toString() + ":" + minutesIST.toString();
    var fromDate = fromyear.toString() + "-" + frommonth.toString() + "-" + fromdate1.toString() + " 09:15"

    
    var interval = 1000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    nifty100.forEach(function (el) {
        promise = promise.then(function () {
            const token = el.token;

            fs.readFile('../token.txt', 'utf8', (err, d) => {
                
                if (err) {
                console.error(err);
                return;
                }
                authtoken = JSON.parse(d)["data"]["jwtToken"];
                authtoken = "Bearer " + authtoken; 
                

                var data = JSON.stringify({"exchange":"NSE","symboltoken":token,
                "interval":"THIRTY_MINUTE","fromdate": fromDate,
                "todate":toDate});

                var config = {
                    method: 'post',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
                
                    headers: { 
                        'X-PrivateKey': process.env.API_KEY, 
                        'Accept': 'application/json', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-UserType': 'USER', 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                
                
                axios(config)
                .then(function (response) {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ma44 = [];
                    var ma200 = [];
                    var rsi = [];

                    Promise.all(response.data.data.map((c,i)=> {
                        dates.push(c[0]);
                        open.push(c[1]);
                        high.push(c[2]);
                        low.push(c[3]);
                        close.push(c[4]);
                        volume.push(c[5]);
                    }))
                    .then(()=>{
                        ma44 = ma(close, 44);
                        ma200 = ma(close, 200);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        dates = dates.slice(-20);
                        open = open.slice(-20);
                        high = high.slice(-20);
                        low = low.slice(-20);
                        close = close.slice(-20);
                        volume = volume.slice(-20);
                        ma44 = ma44.slice(-20);
                        ma200 = ma200.slice(-20);
                        rsi = rsi.slice(-20);

                        var data2 = { dates, open, high, low, close, volume, ma44, ma200, rsi }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "thirtyMinData": data2  } }, {new: true}).exec((err, stock) =>{
                            if (err || !stock) {
                              console.log(err);
                              }
                            else{
                                console.log(stock);
                            }
                          })

                    })
                    
                })
                .catch(function (error) {
                    console.log(error);
                })
            })

            console.log(el.token);
            return new Promise(function (resolve) {
            setTimeout(resolve, interval);
            });
        });
    });

promise.then(function () {
  console.log('Loop finished.');
})
    
};

exports.get5MinuteDataAnalysis = (req, res) => {

    var authtoken = "";

    
    
    var currentTime = new Date();
    var fromD = new Date();
    fromD.setDate(fromD.getDate()-90);

    var currentOffset = currentTime.getTimezoneOffset();
    var fromOffset = fromD.getTimezoneOffset();

    var ISTOffset = 330;   // IST offset UTC +5:30 

    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var fromISTTime = new Date(fromD.getTime() + (ISTOffset + fromOffset)*60000);

    // ISTTime now represents the time in IST coordinates

    var hoursIST = ('0'+(ISTTime.getHours()+1)).slice(-2)
    var minutesIST = ('0'+(ISTTime.getMinutes()+1)).slice(-2)
    var year = ISTTime.getFullYear()
    var month = ('0'+(ISTTime.getMonth()+1)).slice(-2)
    var date = ('0'+(ISTTime.getDate())).slice(-2)

  
    var fromyear = fromISTTime.getFullYear()
    var frommonth = ('0'+(fromISTTime.getMonth()+1)).slice(-2)
    var fromdate1 = ('0'+(fromISTTime.getDate())).slice(-2)

    var toDate = year.toString() + "-" + month.toString() + "-" + date.toString() + " " + hoursIST.toString() + ":" + minutesIST.toString();
    var fromDate = fromyear.toString() + "-" + frommonth.toString() + "-" + fromdate1.toString() + " 09:15"

    
    var interval = 1000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    nifty100.forEach(function (el) {
        promise = promise.then(function () {
            const token = el.token;

            fs.readFile('../token.txt', 'utf8', (err, d) => {
                
                if (err) {
                console.error(err);
                return;
                }
                authtoken = JSON.parse(d)["data"]["jwtToken"];
                authtoken = "Bearer " + authtoken; 
                

                var data = JSON.stringify({"exchange":"NSE","symboltoken":token,
                "interval":"FIVE_MINUTE","fromdate": fromDate,
                "todate":toDate});

                var config = {
                    method: 'post',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
                
                    headers: { 
                        'X-PrivateKey': process.env.API_KEY, 
                        'Accept': 'application/json', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-UserType': 'USER', 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                
                
                axios(config)
                .then(function (response) {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ma44 = [];
                    var ma200 = [];
                    var rsi = [];

                    Promise.all(response.data.data.map((c,i)=> {
                        dates.push(c[0]);
                        open.push(c[1]);
                        high.push(c[2]);
                        low.push(c[3]);
                        close.push(c[4]);
                        volume.push(c[5]);
                    }))
                    .then(()=>{
                        ma44 = ma(close, 44);
                        ma200 = ma(close, 200);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        dates = dates.slice(-20);
                        open = open.slice(-20);
                        high = high.slice(-20);
                        low = low.slice(-20);
                        close = close.slice(-20);
                        volume = volume.slice(-20);
                        ma44 = ma44.slice(-20);
                        ma200 = ma200.slice(-20);
                        rsi = rsi.slice(-20);

                        var data2 = { dates, open, high, low, close, volume, ma44, ma200, rsi }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "fiveMinData": data2  } }, {new: true}).exec((err, stock) =>{
                            if (err || !stock) {
                              console.log(err);
                              }
                            else{
                                console.log(stock);
                            }
                          })

                    })
                    
                })
                .catch(function (error) {
                    console.log(error);
                })
            })

            console.log(el.token);
            return new Promise(function (resolve) {
            setTimeout(resolve, interval);
            });
        });
    });

promise.then(function () {
  console.log('Loop finished.');
})
    
};

exports.get60MinuteDataAnalysis = (req, res) => {

    var authtoken = "";

    
    
    var currentTime = new Date();
    var fromD = new Date();
    fromD.setDate(fromD.getDate()-100);

    var currentOffset = currentTime.getTimezoneOffset();
    var fromOffset = fromD.getTimezoneOffset();

    var ISTOffset = 330;   // IST offset UTC +5:30 

    var ISTTime = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    var fromISTTime = new Date(fromD.getTime() + (ISTOffset + fromOffset)*60000);

    // ISTTime now represents the time in IST coordinates

    var hoursIST = ('0'+(ISTTime.getHours()+1)).slice(-2)
    var minutesIST = ('0'+(ISTTime.getMinutes()+1)).slice(-2)
    var year = ISTTime.getFullYear()
    var month = ('0'+(ISTTime.getMonth()+1)).slice(-2)
    var date = ('0'+(ISTTime.getDate())).slice(-2)

  
    var fromyear = fromISTTime.getFullYear()
    var frommonth = ('0'+(fromISTTime.getMonth()+1)).slice(-2)
    var fromdate1 = ('0'+(fromISTTime.getDate())).slice(-2)

    var toDate = year.toString() + "-" + month.toString() + "-" + date.toString() + " " + hoursIST.toString() + ":" + minutesIST.toString();
    var fromDate = fromyear.toString() + "-" + frommonth.toString() + "-" + fromdate1.toString() + " 09:15"

    
    var interval = 1000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    nifty100.forEach(function (el) {
        promise = promise.then(function () {
            const token = el.token;

            fs.readFile('../token.txt', 'utf8', (err, d) => {
                
                if (err) {
                console.error(err);
                return;
                }
                authtoken = JSON.parse(d)["data"]["jwtToken"];
                authtoken = "Bearer " + authtoken; 
                

                var data = JSON.stringify({"exchange":"NSE","symboltoken":token,
                "interval":"ONE_HOUR","fromdate": fromDate,
                "todate":toDate});

                var config = {
                    method: 'post',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/historical/v1/getCandleData',
                
                    headers: { 
                        'X-PrivateKey': process.env.API_KEY, 
                        'Accept': 'application/json', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-UserType': 'USER', 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json'
                    },
                    data : data
                };
                
                
                axios(config)
                .then(function (response) {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ma44 = [];
                    var ma200 = [];
                    var rsi = [];

                    Promise.all(response.data.data.map((c,i)=> {
                        dates.push(c[0]);
                        open.push(c[1]);
                        high.push(c[2]);
                        low.push(c[3]);
                        close.push(c[4]);
                        volume.push(c[5]);
                    }))
                    .then(()=>{
                        ma44 = ma(close, 44);
                        ma200 = ma(close, 200);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        dates = dates.slice(-20);
                        open = open.slice(-20);
                        high = high.slice(-20);
                        low = low.slice(-20);
                        close = close.slice(-20);
                        volume = volume.slice(-20);
                        ma44 = ma44.slice(-20);
                        ma200 = ma200.slice(-20);
                        rsi = rsi.slice(-20);

                        var data2 = { dates, open, high, low, close, volume, ma44, ma200, rsi }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "hourlyData": data2  } }, {new: true}).exec((err, stock) =>{
                            if (err || !stock) {
                              console.log(err);
                              }
                            else{
                                console.log(stock);
                            }
                          })

                    })
                    
                })
                .catch(function (error) {
                    console.log(error);
                })
            })

            console.log(el.token);
            return new Promise(function (resolve) {
            setTimeout(resolve, interval);
            });
        });
    });

promise.then(function () {
  console.log('Loop finished.');
})
    
};

const monthlyDataFormat = (dates, open, high, low, close) => {
    var monthName = [];
    var monthHigh = [];
    var monthLow = [];
    var monthOpen = [open[0]];
    var monthClose = [];
    var dailyHighArray = [];
    var dailyLowArray = [];
    var firstDate = new Date(dates[0]);
    var month_counter = firstDate.getMonth();
    var year_counter = firstDate.getFullYear();
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    dates.map((date,i)=> {
        
        var d = new Date(date);
        var month_number = d.getMonth();
        if(month_counter > 11){
            month_counter = 0;
            year_counter++
        }
        if(month_number === month_counter){
            dailyHighArray.push(high[i]);
            dailyLowArray.push(low[i]);
            if(i == dates.length -1){
                monthName.push(month[month_counter] + year_counter.toString());
                monthClose.push(close[i]);
                var max = dailyHighArray[0];
                var min = dailyLowArray[0];
                dailyHighArray.map((h, j)=> {
                    if(h > max){
                        max = h;
                    }
                    if(dailyLowArray[j] < min){
                        min = dailyLowArray[j];
                    }
                })
                monthHigh.push(max);
                monthLow.push(min);
            }
        }else{
            month_counter++;
            monthName.push(month[month_counter-1] + year_counter.toString());
            monthClose.push(close[i-1]);
            monthOpen.push(open[i]);
            var max = dailyHighArray[0];
            var min = dailyLowArray[0];
            dailyHighArray.map((h, j)=> {
                if(h > max){
                    max = h;
                }
                if(dailyLowArray[j] < min){
                    min = dailyLowArray[j];
                }
            })
            monthHigh.push(max);
            monthLow.push(min);
            dailyHighArray = [];
            dailyLowArray = [];

            dailyHighArray.push(high[i]);
            dailyLowArray.push(low[i]);
        }

        
    })

    var rsi = RSI.calculate({
        values: monthClose,
        period:14
    })

    var ma44 = ma(monthClose, 44)
    var ma200 = ma(monthClose, 200)

    ma200 = ma200.slice(-20);
    ma44 = ma44.slice(-20);
    monthOpen = monthOpen.slice(-20);
    monthClose = monthClose.slice(-20);
    monthLow = monthLow.slice(-20);
    monthHigh = monthHigh.slice(-20);

    return({ month: monthName, 
        open : monthOpen, 
        high : monthHigh, 
        low : monthLow, 
        close : monthClose,
        ma44: ma44,
        ma200: ma200,
        rsi : rsi })
}

const weeklyDataFormat = (dates, open, high, low, close) => {
    var weekDate = [];
    var weekHigh = [];
    var weekLow = [];
    var weekOpen = [];
    var weekClose = [];
    var dailyHighArray = [];
    var dailyLowArray = [];
    var firstDate = new Date(dates[0]);
    var day_counter = 0;
    
    dates.map((date, i)=> {
        var lastDay = false;
        if(i< dates.length-1){
            var d1 = new Date(dates[i]);
            var d2 = new Date(dates[i+1]);

            if(d1.getDay() > 3 && d2.getDay() < 3){
                lastDay = true;
            }else{
                lastDay = false;
            }
        }else{
            lastDay = true;
        }

        if(!lastDay){
            if(day_counter == 0){
                weekOpen.push(open[i]);
                weekDate.push(dates[i]);
                dailyHighArray.push(high[i]);
                dailyLowArray.push(low[i]);
                day_counter++
            }else{
                dailyHighArray.push(high[i]);
                dailyLowArray.push(low[i]);
                day_counter++
            }
        }else{
            if(i == 0){
                weekOpen.push(open[i]);
                weekDate.push(dates[i]);
            }
            day_counter = 0;
            weekClose.push(close[i]);
            dailyHighArray.push(high[i]);
            dailyLowArray.push(low[i]);
            var max = dailyHighArray[0];
            var min = dailyLowArray[0];
            dailyHighArray.map((h, j)=> {
                if(h > max){
                    max = h;
                }
                if(dailyLowArray[j] < min){
                    min = dailyLowArray[j];
                }
            })
            dailyHighArray = [];
            dailyLowArray = [];
            weekHigh.push(max);
            weekLow.push(min);
        }
    })

    var rsi = RSI.calculate({
        values: weekClose,
        period:14
    })

    var ma44 = ma(weekClose, 44)
    var ma200 = ma(weekClose, 200)

    ma200 = ma200.slice(-20);
    ma44 = ma44.slice(-20);
    weekOpen = weekOpen.slice(-20);
    weekClose = weekClose.slice(-20);
    weekLow = weekLow.slice(-20);
    weekHigh = weekHigh.slice(-20);

    return({  week: weekDate,
        open : weekOpen, 
        high : weekHigh, 
        low : weekLow, 
        close : weekClose,
        ma44: ma44,
        ma200: ma200,
        rsi : rsi })
}