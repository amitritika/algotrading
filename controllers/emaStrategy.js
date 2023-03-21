const express = require("express");
const axios = require("axios");
const fs = require('fs');
const { ma, ema } = require("moving-averages");
var RSI = require('technicalindicators').RSI
const { getLTP, getHistoricalData, nextThursday } = require("../helpers/instruments");
const TradeStatus = require("../models/tradeStatus");

exports.niftyPE = (req, res) => {
    var data = JSON.stringify({
        "exchange": "NSE",
        "tradingsymbol": "NIFTY",
        "symboltoken": "26000"
    
    });
    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken; 
    var config1 = {
        method: 'post',
        url: 'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData',
    
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

    axios(config1)
    .then((responseData)=> {
        console.log(responseData.data.data.ltp)
        const nifty = Math.round((responseData.data.data.ltp - 100) / 50) * 50
        const symbol = "NIFTY" + nextThursday() + nifty.toString() +"PE";
        axios.get(`http://0.0.0.0:3001/api/getInstrument/${symbol}`)
        .then((response)=>{
            console.log(response.data.token)
            const dataW = JSON.stringify({token: response.data.token, symbol: symbol})
            fs.writeFile('../niftyPE.txt', dataW, (err1) => {
                if (err1) throw err1;
                console.log('The response was written to the file!');
              });
        }).catch((err)=> {
            console.log(err)
        })
    }).catch((error)=> {
        console.log("Error in LTP API");
        console.log(error)
    })
}

exports.buyOrderStrategy5emaPE = (req, res)=>{
    cancelAllBuyOrder();
    const d1 = fs.readFileSync("../niftyPE.txt", "utf-8");
    var token = JSON.parse(d1)["token"];
    var symbol = JSON.parse(d1)["symbol"];
    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken;
    

    var currentTime = new Date();
    var fromD = new Date();
    fromD.setDate(fromD.getDate()-5);

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
    var fromDate = fromyear.toString() + "-" + frommonth.toString() + "-" + fromdate1.toString() + " 09:15";


    var config = {
        method: 'get',
        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition',
        headers: { 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'X-UserType': 'USER', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-PrivateKey': process.env.API_KEY
        }
        };

        axios(config)
        .then((response)=> {
            var position = false;
            var positionOpen = [];
            var positionClose = [];
            if(response.data.data){
                
                response.data.data.map((p)=> {
                    console.log(p)
                    if(p.buyqty ===  p.sellqty){
                        positionClose.push(p.tradingsymbol);
                    }else{
                        positionOpen.push(p.tradingsymbol);
                    }
                })
                if(positionOpen.length > 0){
                    position = true;
                }
            }

            console.log(position);
            if(response.data.data === null || !position){
                if(positionClose.length < 3){
                    var data = JSON.stringify({"exchange":"NFO","symboltoken":token,
                "interval":"FIVE_MINUTE","fromdate": fromDate,
                "todate":toDate});

                var config1 = {
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
                
                
                axios(config1)
                .then((response)=> {
                    var dates = [];
                    var high = [];
                    var low = [];
                    var close = [];
                    var open = [];
                    var volume = [];
                    var ema5 = [];
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
                        ema5 = ma(close, 5);
                        //rsi = calculateRSI(close);
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
                        ema5 = ema5.slice(-20);
                        rsi = rsi.slice(-20);
                        var fiveMinData = { dates, open, high, low, close, volume, ema5, rsi }

                        if (ema5[19] > high[19] && open[19]>close[19]){
                            //Buy Order
                            var price = high[19] + 0.10;
                            var triggerprice = high[19]+0.05;
                            var quantity = 50;
                            var targetprice = price + 5;
                            var exitprice = price - 5;
                            var data3 = JSON.stringify({
                                "variety":"STOPLOSS",
                                "tradingsymbol":symbol,
                                "symboltoken":token,
                                "transactiontype":"BUY",
                                "exchange":"NFO",
                                "ordertype":"STOPLOSS_LIMIT",
                                "producttype":"INTRADAY",
                                "duration":"DAY",
                                "price":price,
                                "triggerprice": triggerprice,
                                "squareoff":"0",
                                "quantity":quantity
                            });
        
                            var config3 = {
                            method: 'post',
                            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                            headers: { 
                                'Authorization': String(authtoken), 
                                'Content-Type': 'application/json', 
                                'Accept': 'application/json', 
                                'X-UserType': 'USER', 
                                'X-SourceID': 'WEB', 
                                'X-ClientLocalIP': '', 
                                'X-ClientPublicIP': '', 
                                'X-MACAddress': '', 
                                'X-PrivateKey': process.env.API_KEY
                            },
                            data : data3
                            };

                            axios(config3)
                            .then((orderResponse)=> {
                                
                                var tradeStatusData = { price, triggerprice, quantity, targetprice, exitprice, symbol, token }
                                TradeStatus.findOneAndUpdate({ name: "niftyOption5EMAPE" }, { $set: { "data": tradeStatusData, status: true  } }, {new: true}).exec((err, stock) =>{
                                    if (err || !stock) {
                                    console.log(err);
                                    }
                                    console.log("Buy Order Placed");
                                })
                            }).catch((orderError)=>{
                                console.log("Error in Placing Order");
                                console.log(orderError);
                            })
                        }else{
                            console.log("Ema Greater than High")
                        }
                    })
                }).catch((error)=>{
                    console.log("Error in Candle Stick Data")
                    console.log(error)
                })
                }
            }
            

        })
        .catch((positionError)=>{
            console.log(positionError);
        })

    
}


exports.sellOrderStrategy5emaPE = (req, res) => {
    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken;

    var config = {
        method: 'get',
        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition',
        headers: { 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'X-UserType': 'USER', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-PrivateKey': process.env.API_KEY
        }
        };
        axios(config)
        .then((response)=> {
            
            var position = false;
            var positionObj = {};
            var positionOpen = [];
            var positionClose = [];
            if(response.data.data){
                
                response.data.data.map((p)=> {
                    console.log(p)
                    if(p.buyqty ===  p.sellqty){
                        positionClose.push(p.tradingsymbol);
                    }else{
                        positionOpen.push(p.tradingsymbol);
                        positionObj = p;
                    }
                })
                if(positionOpen.length > 0){
                    position = true;
                }
            }

            if(position){
                var config2 = {
                    method: 'get',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
                    headers: { 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json', 
                        'Accept': 'application/json', 
                        'X-UserType': 'USER', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-PrivateKey': process.env.API_KEY
                    }
                    };

                    axios(config2)
                    .then((orderResponse)=>{
                        var buyOrderExecuted = false;
                        var sellOrderExecuted = false;
                        var tradingsymbol = [];
                        var orderid = "";
                        orderResponse.data.data.map((o)=>{
                            if(o.transactiontype === "SELL" && positionOpen.includes(o.tradingsymbol) && (o.status === "open" || o.status === "trigger pending")){
                                sellOrderExecuted = true;
                                tradingsymbol.push(o.tradingsymbol);
                                orderid = o.orderid;
                            }
                            if(o.transactiontype === "BUY" && positionOpen.includes(o.tradingsymbol)){
                                buyOrderExecuted = true;
                                tradingsymbol.push(o.tradingsymbol);
                            }

                        })
                        if(buyOrderExecuted && !sellOrderExecuted){
                            cancelAllBuyOrder();
                            TradeStatus.findOne({name : "niftyOption5EMAPE"}).exec((err, tradeStatus)=> {
                                if(err){
                                    console.log(err)
                                }
                                console.log("Placing Sell Order")
                                var orderPosted = tradeStatus.data;
                                if(tradingsymbol.includes(orderPosted.symbol)){
                                    var data3 = JSON.stringify({
                                        "variety":"STOPLOSS",
                                        "tradingsymbol":orderPosted.symbol,
                                        "symboltoken":orderPosted.token,
                                        "transactiontype":"SELL",
                                        "exchange":"NFO",
                                        "ordertype":"STOPLOSS_LIMIT",
                                        "producttype":"INTRADAY",
                                        "duration":"DAY",
                                        "price":orderPosted.exitprice,
                                        "triggerprice": orderPosted.exitprice+0.05,
                                        "squareoff":"0",
                                        "quantity":orderPosted.quantity
                                    });
                
                                    var config3 = {
                                    method: 'post',
                                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                                    headers: { 
                                        'Authorization': String(authtoken), 
                                        'Content-Type': 'application/json', 
                                        'Accept': 'application/json', 
                                        'X-UserType': 'USER', 
                                        'X-SourceID': 'WEB', 
                                        'X-ClientLocalIP': '', 
                                        'X-ClientPublicIP': '', 
                                        'X-MACAddress': '', 
                                        'X-PrivateKey': process.env.API_KEY
                                    },
                                    data : data3
                                    };

                                    axios(config3)
                                    .then((sellOrderResponse)=>{
                                        var data4 = JSON.stringify({
                                            "variety":"NORMAL",
                                            "tradingsymbol":orderPosted.symbol,
                                            "symboltoken":orderPosted.token,
                                            "transactiontype":"SELL",
                                            "exchange":"NFO",
                                            "ordertype":"LIMIT",
                                            "producttype":"INTRADAY",
                                            "duration":"DAY",
                                            "price":orderPosted.targetprice,
                                            "triggerprice": orderPosted.targetprice+0.05,
                                            "squareoff":"0",
                                            "quantity":orderPosted.quantity
                                        });
                    
                                        var config4 = {
                                        method: 'post',
                                        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                                        headers: { 
                                            'Authorization': String(authtoken), 
                                            'Content-Type': 'application/json', 
                                            'Accept': 'application/json', 
                                            'X-UserType': 'USER', 
                                            'X-SourceID': 'WEB', 
                                            'X-ClientLocalIP': '', 
                                            'X-ClientPublicIP': '', 
                                            'X-MACAddress': '', 
                                            'X-PrivateKey': process.env.API_KEY
                                        },
                                        data : data4
                                        };

                                        axios(config4)
                                        .then((sellOrderResponse2)=>{
                                            cancelAllBuyOrder();
                                        }).catch((sellOrderError1)=>{
                                            console.log(sellOrderError)
                                            console.log("Sell Order 2 Error")
                                        })
                                    }).catch((sellOrderError)=>{
                                        console.log(sellOrderError)
                                        console.log("Sell Order 1 Error")
                                    })
                                }
                                
                            })
                        }else if(sellOrderExecuted){
                            if(sellOrderExecuted){
                                TradeStatus.findOne({name : "niftyOption5EMAPE"}).exec((err, tradeStatus)=> {
                                    if(err){
                                        console.log(err)
                                    }
                                    var orderPosted = tradeStatus.data;
                                    if(tradingsymbol.includes(orderPosted.symbol)){
    
                                        var dataLTP = JSON.stringify({
                                            "exchange": "NFO",
                                            "tradingsymbol": orderPosted.symbol,
                                            "symboltoken": orderPosted.token
                                        
                                        });
                                        var configLTP = {
                                            method: 'post',
                                            url: 'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData',
                                        
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
                                            data : dataLTP
                                        };
    
                                        axios(configLTP)
                                        .then((responseLTP)=>{
                                            var ltp = responseLTP.data.data.ltp;
                                            var delta = orderPosted.triggerprice - orderPosted.exitprice;
                                            var exitprice = orderPosted.exitprice;
                                            var factor = 0;
                                            if(ltp < orderPosted.targetprice + 8 * delta){
                                                if(ltp > orderPosted.targetprice && ltp < orderPosted.targetprice + delta){
                                                    exitprice = orderPosted.triggerprice + 1;
                                                    factor = 0;
                                                }else if(ltp > orderPosted.targetprice + delta && ltp < orderPosted.targetprice + 2* delta){
                                                    exitprice = orderPosted.targetprice;
                                                    factor = 1;
                                                }else if(ltp > orderPosted.targetprice + 2 * delta && ltp < orderPosted.targetprice + 3 * delta){
                                                    exitprice = orderPosted.targetprice + delta;
                                                    factor = 2;
                                                }else if(ltp > orderPosted.targetprice + 3 * delta && ltp < orderPosted.targetprice + 4 * delta){
                                                    exitprice = orderPosted.targetprice + 2* delta;
                                                    factor = 3;
                                                }
                                                else if(ltp > orderPosted.targetprice + 4 * delta && ltp < orderPosted.targetprice + 5 * delta){
                                                    exitprice = orderPosted.targetprice + 3* delta;
                                                    factor = 4;
                                                }
                                                else if(ltp > orderPosted.targetprice + 5 * delta && ltp < orderPosted.targetprice + 6 * delta){
                                                    exitprice = orderPosted.targetprice + 4* delta;
                                                    factor = 5;
                                                }
                                                else if(ltp > orderPosted.targetprice + 6 * delta && ltp < orderPosted.targetprice + 7 * delta){
                                                    exitprice = orderPosted.targetprice + 5* delta;
                                                    factor = 6;
                                                }
                                                else if(ltp > orderPosted.targetprice + 7 * delta){
                                                    exitprice = orderPosted.targetprice + 6* delta;
                                                    factor = 7;
                                                }
    
                                                var data3 = JSON.stringify({
                                                    "variety":"STOPLOSS",
                                                    "orderid": orderid,
                                                    "tradingsymbol":orderPosted.symbol,
                                                    "symboltoken":orderPosted.token,
                                                    "exchange":"NFO",
                                                    "ordertype":"STOPLOSS_LIMIT",
                                                    "producttype":"INTRADAY",
                                                    "duration":"DAY",
                                                    "price":exitprice,
                                                    "triggerprice": exitprice+0.05,
                                                    "quantity":orderPosted.quantity
                                                });
                            
                                                var config3 = {
                                                method: 'post',
                                                url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/modifyOrder',
                                                headers: { 
                                                    'Authorization': String(authtoken), 
                                                    'Content-Type': 'application/json', 
                                                    'Accept': 'application/json', 
                                                    'X-UserType': 'USER', 
                                                    'X-SourceID': 'WEB', 
                                                    'X-ClientLocalIP': '', 
                                                    'X-ClientPublicIP': '', 
                                                    'X-MACAddress': '', 
                                                    'X-PrivateKey': process.env.API_KEY
                                                },
                                                data : data3
                                                };
                                                axios(config3)
                                                .then((trailingSLOrderResponse)=>{
                                                    console.log(`Trailing StopLoss Order Placed with Factor ${factor}`);
                                                })
                                                .catch((trailingSLOrderError)=>{
                                                    console.log("Error in Placing Trailing SL Order")
                                                })
    
                                            }else{
                                                cancelAllSellOrder();
                                                var data4 = JSON.stringify({
                                                    "variety":"NORMAL",
                                                    "tradingsymbol":orderPosted.symbol,
                                                    "symboltoken":orderPosted.token,
                                                    "transactiontype":"SELL",
                                                    "exchange":"NFO",
                                                    "ordertype":"MARKET",
                                                    "producttype":"INTRADAY",
                                                    "duration":"DAY",
                                                    "squareoff":"0",
                                                    "quantity":orderPosted.quantity
                                                });
                            
                                                var config4 = {
                                                method: 'post',
                                                url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                                                headers: { 
                                                    'Authorization': String(authtoken), 
                                                    'Content-Type': 'application/json', 
                                                    'Accept': 'application/json', 
                                                    'X-UserType': 'USER', 
                                                    'X-SourceID': 'WEB', 
                                                    'X-ClientLocalIP': '', 
                                                    'X-ClientPublicIP': '', 
                                                    'X-MACAddress': '', 
                                                    'X-PrivateKey': process.env.API_KEY
                                                },
                                                data : data4
                                                };
    
                                                axios(config4)
                                                .then((trailingSLOrderResponse)=>{
                                                    console.log("Market Order Placed with Factor more than 8")
                                                })
                                                .catch((trailingSLOrderError)=>{
                                                    console.log("Error in Placing Market Order with LTP more than of Factor 8")
                                                })
                                            }
    
                                            
                                        })
                                        .catch((errorLTP)=>{
                                            console.log("Error in Trailing Stop Loss LTP")
                                        })
    
                                        
                                    }
                                    
                                })
                            }
                        }
                        
                    })
                    .catch((orderError)=>{
                        console.log(orderError)
                    })
            }
            else if(!position){
                var config2 = {
                    method: 'get',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
                    headers: { 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json', 
                        'Accept': 'application/json', 
                        'X-UserType': 'USER', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-PrivateKey': process.env.API_KEY
                    }
                    };

                    axios(config2)
                    .then((orderResponse)=>{
                        if(orderResponse.data.data){
                            orderResponse.data.data.map((o)=>{
                                if(o.transactiontype === "SELL"){
                                    cancelAllSellOrder();
                                    var tradeStatusData = {}
                                    TradeStatus.findOneAndUpdate({ name: "niftyOption5EMAPE" }, { $set: { "data": tradeStatusData, status: false  } }, {new: true}).exec((err, stock) =>{
                                        if (err || !stock) {
                                        console.log(err);
                                        }
                                    })
                                }
    
                                else{
                                    console.log("No Sell Order")
                                }
                            })
                        }else{
                            console.log("No Order History")
                        }
                        
                    })
                    .catch((orderError)=>{
                        console.log(orderError)
                    })
            }
        })
        .catch((error)=> {
            console.log(error)
        })

}

exports.trailingSLStrategy5emaPE = (req, res) => {
    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken;

    var config = {
        method: 'get',
        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition',
        headers: { 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'X-UserType': 'USER', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-PrivateKey': process.env.API_KEY
        }
        };
        axios(config)
        .then((response)=> {
            
            var position = false;
            var positionObj = {};
            var positionOpen = [];
            var positionClose = [];
            if(response.data.data){
                
                response.data.data.map((p)=> {
                    console.log(p)
                    if(p.buyqty ===  p.sellqty){
                        positionClose.push(p.tradingsymbol);
                    }else{
                        positionOpen.push(p.tradingsymbol);
                        positionObj = p;
                    }
                })
                if(positionOpen.length > 0){
                    position = true;
                }
            }

            if(position){
                var config2 = {
                    method: 'get',
                    url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
                    headers: { 
                        'Authorization': String(authtoken), 
                        'Content-Type': 'application/json', 
                        'Accept': 'application/json', 
                        'X-UserType': 'USER', 
                        'X-SourceID': 'WEB', 
                        'X-ClientLocalIP': '', 
                        'X-ClientPublicIP': '', 
                        'X-MACAddress': '', 
                        'X-PrivateKey': process.env.API_KEY
                    }
                    };

                    axios(config2)
                    .then((orderResponse)=>{
                        var buyOrderExecuted = false;
                        var sellOrderExecuted = false;
                        var tradingsymbol = [];
                        var orderid = ""
                        orderResponse.data.data.map((o)=>{
                            if(o.transactiontype === "SELL" && positionOpen.includes(o.tradingsymbol) && (o.status === "open" || o.status === "trigger pending")){
                                sellOrderExecuted = true;
                                tradingsymbol.push(o.tradingsymbol);
                                orderid = o.orderid;
                            }

                        })
                        if(sellOrderExecuted){
                            TradeStatus.findOne({name : "niftyOption5EMAPE"}).exec((err, tradeStatus)=> {
                                if(err){
                                    console.log(err)
                                }
                                var orderPosted = tradeStatus.data;
                                if(tradingsymbol.includes(orderPosted.symbol)){

                                    var dataLTP = JSON.stringify({
                                        "exchange": "NFE",
                                        "tradingsymbol": orderPosted.symbol,
                                        "symboltoken": orderPosted.token
                                    
                                    });
                                    var configLTP = {
                                        method: 'post',
                                        url: 'https://apiconnect.angelbroking.com/order-service/rest/secure/angelbroking/order/v1/getLtpData',
                                    
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
                                        data : dataLTP
                                    };

                                    axios(configLTP)
                                    .then((responseLTP)=>{
                                        var ltp = responseLTP.data.data.ltp;
                                        var delta = orderPosted.triggerprice - orderPosted.exitprice;
                                        var exitprice = orderPosted.exitprice;
                                        var factor = 0;
                                        if(ltp < orderPosted.targetprice + 8 * delta){
                                            if(ltp > orderPosted.targetprice && ltp < orderPosted.targetprice + delta){
                                                exitprice = orderPosted.triggerprice + 1;
                                                factor = 0;
                                            }else if(ltp > orderPosted.targetprice + delta && ltp < orderPosted.targetprice + 2* delta){
                                                exitprice = orderPosted.targetprice;
                                                factor = 1;
                                            }else if(ltp > orderPosted.targetprice + 2 * delta && ltp < orderPosted.targetprice + 3 * delta){
                                                exitprice = orderPosted.targetprice + delta;
                                                factor = 2;
                                            }else if(ltp > orderPosted.targetprice + 3 * delta && ltp < orderPosted.targetprice + 4 * delta){
                                                exitprice = orderPosted.targetprice + 2* delta;
                                                factor = 3;
                                            }
                                            else if(ltp > orderPosted.targetprice + 4 * delta && ltp < orderPosted.targetprice + 5 * delta){
                                                exitprice = orderPosted.targetprice + 3* delta;
                                                factor = 4;
                                            }
                                            else if(ltp > orderPosted.targetprice + 5 * delta && ltp < orderPosted.targetprice + 6 * delta){
                                                exitprice = orderPosted.targetprice + 4* delta;
                                                factor = 5;
                                            }
                                            else if(ltp > orderPosted.targetprice + 6 * delta && ltp < orderPosted.targetprice + 7 * delta){
                                                exitprice = orderPosted.targetprice + 5* delta;
                                                factor = 6;
                                            }
                                            else if(ltp > orderPosted.targetprice + 7 * delta){
                                                exitprice = orderPosted.targetprice + 6* delta;
                                                factor = 7;
                                            }

                                            var data3 = JSON.stringify({
                                                "variety":"STOPLOSS",
                                                "orderid": orderid,
                                                "tradingsymbol":orderPosted.symbol,
                                                "symboltoken":orderPosted.token,
                                                "exchange":"NFO",
                                                "ordertype":"STOPLOSS_LIMIT",
                                                "producttype":"INTRADAY",
                                                "duration":"DAY",
                                                "price":exitprice,
                                                "triggerprice": exitprice+0.05,
                                                "quantity":orderPosted.quantity
                                            });
                        
                                            var config3 = {
                                            method: 'post',
                                            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/modifyOrder',
                                            headers: { 
                                                'Authorization': String(authtoken), 
                                                'Content-Type': 'application/json', 
                                                'Accept': 'application/json', 
                                                'X-UserType': 'USER', 
                                                'X-SourceID': 'WEB', 
                                                'X-ClientLocalIP': '', 
                                                'X-ClientPublicIP': '', 
                                                'X-MACAddress': '', 
                                                'X-PrivateKey': process.env.API_KEY
                                            },
                                            data : data3
                                            };
                                            axios(config3)
                                            .then((trailingSLOrderResponse)=>{
                                                console.log(`Trailing StopLoss Order Placed with Factor ${factor}`);
                                            })
                                            .catch((trailingSLOrderError)=>{
                                                console.log("Error in Placing Trailing SL Order")
                                            })

                                        }else{
                                            cancelAllSellOrder();
                                            var data4 = JSON.stringify({
                                                "variety":"NORMAL",
                                                "tradingsymbol":orderPosted.symbol,
                                                "symboltoken":orderPosted.token,
                                                "transactiontype":"SELL",
                                                "exchange":"NFO",
                                                "ordertype":"MARKET",
                                                "producttype":"INTRADAY",
                                                "duration":"DAY",
                                                "squareoff":"0",
                                                "quantity":orderPosted.quantity
                                            });
                        
                                            var config4 = {
                                            method: 'post',
                                            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                                            headers: { 
                                                'Authorization': String(authtoken), 
                                                'Content-Type': 'application/json', 
                                                'Accept': 'application/json', 
                                                'X-UserType': 'USER', 
                                                'X-SourceID': 'WEB', 
                                                'X-ClientLocalIP': '', 
                                                'X-ClientPublicIP': '', 
                                                'X-MACAddress': '', 
                                                'X-PrivateKey': process.env.API_KEY
                                            },
                                            data : data4
                                            };

                                            axios(config4)
                                            .then((trailingSLOrderResponse)=>{
                                                console.log("Market Order Placed with Factor more than 8")
                                            })
                                            .catch((trailingSLOrderError)=>{
                                                console.log("Error in Placing Market Order with LTP more than of Factor 8")
                                            })
                                        }

                                        
                                    })
                                    .catch((errorLTP)=>{
                                        console.log("Error in Trailing Stop Loss LTP")
                                    })

                                    
                                }
                                
                            })
                        }
                        
                    })
                    .catch((orderError)=>{
                        console.log(orderError)
                    })
            }
        })
        .catch((error)=> {
            console.log(error)
        })

}

exports.squareOffOrderStrategy5emaPE= (req, res) => {
    var interval = 3000; // how much time should the delay between two iterations be (in milliseconds)?
    var promise = Promise.resolve();
    var authtoken = ""

    fs.readFile('../token.txt', 'utf8', (err, d) => {
            
        if (err) {
        console.error(err);
        return;
        }
        authtoken = JSON.parse(d)["data"]["jwtToken"];
        authtoken = "Bearer " + authtoken;

        var config = {
            method: 'get',
            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getPosition',
            headers: { 
                'Authorization': String(authtoken), 
                'Content-Type': 'application/json', 
                'Accept': 'application/json', 
                'X-UserType': 'USER', 
                'X-SourceID': 'WEB', 
                'X-ClientLocalIP': '', 
                'X-ClientPublicIP': '', 
                'X-MACAddress': '', 
                'X-PrivateKey': process.env.API_KEY
            }
            };
            axios(config)
            .then((response)=> {
                var position = false;
                var positionObj = [];
                var positionOpen = [];
                var positionClose = [];
                if(response.data.data){
                    
                    response.data.data.map((p)=> {
                        console.log(p)
                        if(p.buyqty ===  p.sellqty){
                            positionClose.push(p.tradingsymbol);
                        }else{
                            positionOpen.push(p.tradingsymbol);
                            positionObj.push(p);
                        }
                    })
                    if(positionOpen.length > 0){
                        position = true;
                    }
                }
    
                if(position){
                    
                    var config2 = {
                        method: 'get',
                        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
                        headers: { 
                            'Authorization': String(authtoken), 
                            'Content-Type': 'application/json', 
                            'Accept': 'application/json', 
                            'X-UserType': 'USER', 
                            'X-SourceID': 'WEB', 
                            'X-ClientLocalIP': '', 
                            'X-ClientPublicIP': '', 
                            'X-MACAddress': '', 
                            'X-PrivateKey': process.env.API_KEY
                        }
                        };
    
                        axios(config2)
                        .then((orderResponse)=>{
                            cancelAllSellOrder();
                            console.log("Hi I am here");
                            positionObj.map((p)=>{
                                console.log(p);
                                var data3 = JSON.stringify({
                                    "variety":"NORMAL",
                                    "tradingsymbol":p.tradingsymbol,
                                    "symboltoken":p.symboltoken,
                                    "transactiontype":"SELL",
                                    "exchange":"NFO",
                                    "ordertype":"MARKET",
                                    "producttype":"INTRADAY",
                                    "duration":"DAY",
                                    "squareoff":"0",
                                    "quantity":p.buyqty
                                });
            
                                var config3 = {
                                method: 'post',
                                url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/placeOrder',
                                headers: { 
                                    'Authorization': String(authtoken), 
                                    'Content-Type': 'application/json', 
                                    'Accept': 'application/json', 
                                    'X-UserType': 'USER', 
                                    'X-SourceID': 'WEB', 
                                    'X-ClientLocalIP': '', 
                                    'X-ClientPublicIP': '', 
                                    'X-MACAddress': '', 
                                    'X-PrivateKey': process.env.API_KEY
                                },
                                data : data3
                                };
    
    
                                axios(config3)
                                .then((orderResponse)=>{
                                    console.log(orderResponse.data)
                                })
                                .catch((orderError)=> {
                                    console.log(orderError.data)
                                })
                            })
    
                        })
                        .catch((orderError)=>{
                            console.log(orderError)
                        })
                }
            })
            .catch((error)=>{
                console.log(error);
            })
    })
    
}


exports.clearTheIntradayStatusPE = (req, res) => {
    var data = {}

    TradeStatus.findOneAndUpdate({ name: "niftyOption5EMAPE" }, { $set: { "data": data, status: false  } }, {new: true}).exec((err, stock) =>{
        if (err || !stock) {
        console.log(err);
        }

        console.log(stock);
    })
}


const cancelAllBuyOrder = () =>{

    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken;

    var config1 = {
        method: 'get',
        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
        headers: { 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'X-UserType': 'USER', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-PrivateKey': process.env.API_KEY
        }
        };
        axios(config1)
        .then((response)=>{
            const orderList = response.data.data
            if(orderList){
                orderList.map((o)=>{

                    if(o.transactiontype === "BUY" && o.status === "trigger pending"){
                        var data = JSON.stringify({
                            "variety":o.variety,
                            "orderid":o.orderid
                        });
                        
                        var config = {
                            method: 'post',
                            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder',
                            headers: { 
                                'Authorization': String(authtoken), 
                                'Content-Type': 'application/json', 
                                'Accept': 'application/json', 
                                'X-UserType': 'USER', 
                                'X-SourceID': 'WEB', 
                                'X-ClientLocalIP': '', 
                                'X-ClientPublicIP': '', 
                                'X-MACAddress': '', 
                                'X-PrivateKey': process.env.API_KEY
                            },
                            data: data
                        };
        
                        axios(config)
                        .then((response)=>{
                            console.log(response);
                        })
                        .catch((error)=>{
                            console.log(error)
                        })
                    }
                    
                })
            }
        })
        .catch((error)=>{
            console.log(error)
        })

        
    
}

const cancelAllSellOrder = () =>{

    const d = fs.readFileSync("../token.txt", "utf-8");
    var authtoken = JSON.parse(d)["data"]["jwtToken"];
    authtoken = "Bearer " + authtoken;

    var config1 = {
        method: 'get',
        url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/getOrderBook',
        headers: { 
            'Authorization': String(authtoken), 
            'Content-Type': 'application/json', 
            'Accept': 'application/json', 
            'X-UserType': 'USER', 
            'X-SourceID': 'WEB', 
            'X-ClientLocalIP': '', 
            'X-ClientPublicIP': '', 
            'X-MACAddress': '', 
            'X-PrivateKey': process.env.API_KEY
        }
        };
        axios(config1)
        .then((response)=>{
            const orderList = response.data.data;
            if(orderList){
                orderList.map((o)=>{

                    if(o.transactiontype === "SELL" && (o.status === "trigger pending" || o.status === "open")){
                        var data = JSON.stringify({
                            "variety":o.variety,
                            "orderid":o.orderid
                        });
                        
                        var config = {
                            method: 'post',
                            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/order/v1/cancelOrder',
                            headers: { 
                                'Authorization': String(authtoken), 
                                'Content-Type': 'application/json', 
                                'Accept': 'application/json', 
                                'X-UserType': 'USER', 
                                'X-SourceID': 'WEB', 
                                'X-ClientLocalIP': '', 
                                'X-ClientPublicIP': '', 
                                'X-MACAddress': '', 
                                'X-PrivateKey': process.env.API_KEY
                            },
                            data: data
                        };
        
                        axios(config)
                        .then((response)=>{
                            //console.log(response);
                        })
                        .catch((error)=>{
                            console.log(error)
                        })
                    }
                    
                })
            }
        })
        .catch((error)=>{
            console.log(error)
        })

        
    
    
}