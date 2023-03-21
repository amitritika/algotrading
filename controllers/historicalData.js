const express = require("express");
const axios = require("axios");
const fs = require('fs');
const { ma } = require("moving-averages");
const Nifty100 = require("../models/nifty100");
const TradeStatus = require("../models/tradeStatus");
const { nifty100 } = require("../helpers/nifty100");
var RSI = require('technicalindicators').RSI

exports.getEndOfDay44maDailyData = (req, res) => {

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
    var fromDate = "2021-01-01 09:15"

    
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
                        //rsi = calculateRSI(close);
                        rsi = RSI.calculate({
                            values: close,
                            period:14
                        })
                        var data2 = { dates, open, high, low, close, volume, ma44, rsi }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "data": data2 } }, {new: true}).exec((err, stock) =>{
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

exports.backtest44maDailyData = (req, res) => {
    Nifty100.find().exec((err, list) => {
        if(err){
            console.log(err);
        }

        var dates = list[0].data.dates;

        var dailyStockList = [];

        Promise.all(dates.map((date, i)=> {
            var stockList = [date];
            list.forEach(function (stock) {
                if(stock.data.dates){
                    stock.data.dates.map((d, k)=>{
                        if(k> 55){
                            if(d == date){
                                var ma44 = stock.data.ma44
                                if(ma44[k] > ma44[k-1] && ma44[k-1] > ma44[k-2] && ma44[k-2] > ma44[k-3] && ma44[k-3] > ma44[k-4] && ma44[k-4] > ma44[k-5]
                                    && ma44[k-5] > ma44[k-6] && ma44[k-6] > ma44[k-7] && ma44[k-7] > ma44[k-8]){
                                    if(Math.abs(((stock.data.ma44[k] - stock.data.close[k])/stock.data.ma44[k])*100) < 1){
                                        stockList.push({
                                            date: stock.data.dates[k],
                                            token: stock.token,
                                            name: stock.name,
                                            entry:  stock.data.high[k],
                                            exit: stock.data.low[k],
                                            target: (stock.data.high[k] - stock.data.low[k])*2 + stock.data.high[k],
                                            ma44: stock.data.ma44[k],
                                            close: stock.data.close[k],
                                            high: stock.data.high[k],
                                            open: stock.data.open[k],
                                            low: stock.data.low[k],
                                            quantity: Math.floor(100/(stock.data.high[k] - stock.data.low[k])),
                                            nextdate: stock.data.dates[k+1],
                                            nextdateData: stock.data.dates
                                        });
                                    }
                                }
                            }
                        }
                            
                        
                    })
                }
                
            })
/*
            var d1 = new Date();
            d1.setDate(d1.getDate() - 20)
            var d2 = new Date(date)

            if(d2 > d1){
                dailyStockList.push(stockList);
            }
*/
            dailyStockList.push(stockList);

        }))
        .then(()=>{
            var trade_count = 0;
            var trade_status = false;
            var trade_success = 0;
            var trade_failure = 0;
            var token = false;
            var trade_target_price = null;
            var trade_exit_price = null;
            var dates_traded = null;

            var interval = 1000;
            var promise = Promise.resolve();
            var promise1 = Promise.resolve();

            
                dailyStockList.forEach(function (list, index) {
                promise = promise.then(function(){
                    
                  /* console.log(list.length);
                   return new Promise(function (resolve) {
                    setTimeout(resolve, 100);
                    });  */

                    if(list.length > 1 && index !== 0){
                        
                        list.forEach(function (stock){
                            promise = promise.then(function(){
                                console.log(stock.token);
                                if(!trade_status){
                                   if(stock.nextdate){
                                       var date = stock.nextdate.substr(0, stock.nextdate.indexOf('T00'));
                                       var fromDate = date + " 09:15";
                                       var toDate = date + " 15:30";
                                       
                                       fs.readFile('../token.txt', 'utf8', (err, d) => {
                       
                                           if (err) {
                                           console.error(err);
                                           return;
                                           }
                                           authtoken = JSON.parse(d)["data"]["jwtToken"];
                                           authtoken = "Bearer " + authtoken; 
                                           
                           
                                           var data = JSON.stringify({"exchange":"NSE","symboltoken":stock.token,
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
                                           .then(function (resp) {
                                               if(!trade_status){
                                                   var loop = true;
                                                   resp.data.data.map((cand, k)=> {
                                                       if(cand[2] > stock.entry && loop){
                                                           trade_status = true;
                                                           token = stock.token;
                                                           trade_target_price = stock.target;
                                                           trade_exit_price = stock.exit;
                                                           dates_traded = stock.nextdateData.splice(stock.nextdateData.indexOf(stock.date));
                                                           
                                                           if(trade_status){
                                                               if(cand[2] > stock.target){
                                                                   trade_status = false;
                                                                   trade_count++;
                                                                   trade_success++;
                                                                   trade_target_price = null;
                                                                   trade_exit_price = null;
                                                                   token = null;
                                                                   dates_traded = null;
                                                                   loop = false;
                                                               }
                                                               else if (cand[3] < stock.exit){
                                                                trade_status = false;
                                                                trade_count++;
                                                                trade_failure++;
                                                                trade_target_price = null;
                                                                trade_exit_price = null;
                                                                token = null;
                                                                dates_traded = null;
                                                                loop = false;
                                                               }
                                                           }
                                                       }
                                                   
                                                   }) 
                                               }
                                               
                                           }).catch(function (error) {
                                               console.log(error);
                                             });
   
                                             
                                       }) 
   
                                      
                                       
                                   }
                                   
                               }

                               else if(trade_status && token && list[0] && stock.nextdateData){
                                   
                                if(stock.nextdateData.includes(list[0])){
                                    var date = list[0].substr(0, list[0].indexOf('T00'));
                                    var fromDate = date + " 09:15";
                                    var toDate = date + " 15:30";
                                    
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
                                        .then(function (resp) {
                                            
                                            resp.data.data.map((cand, k)=> {
                                                 
                                                if(cand[2] > stock.target && trade_status){
                                                    trade_status = false;
                                                    trade_count++;
                                                    trade_success++;
                                                    trade_target_price = null;
                                                    trade_exit_price = null;
                                                    token = null;
                                                }
                                                else if (cand[3] < stock.exit && trade_status){
                                                    trade_status = false;
                                                    trade_count++;
                                                    trade_failure++;
                                                    trade_target_price = null;
                                                    trade_exit_price = null;
                                                    token = null;
                                                }
                                            }) 
                                            
                                            
                                        }).catch(function (error) {
                                            console.log(error);
                                          });

                                          
                                    }) 

                                   
                                    
                                } 
                                
                            } 
                                return new Promise(function (resolve) {
                                    setTimeout(resolve, interval);
                                    });
                            }) 
                        })

                        promise.then(function () {
                         console.log({ trade_count, trade_success, trade_failure });
                        });
                    }

                })

                })
            

            
            

            res.json({ trade_count, trade_success, trade_failure });
        })
        
    })
}

exports.backtest44maDailyStrategy = (req, res) => {
    axios.get('/backtest44maDailyData')
      .then(function (response) {
        res.json(response.data);
      })
  /*   axios({
        method: 'get',
        url: 'https://port-3001-dev-careeraplustraining167689.preview.codeanywhere.com/api/backtest44maDailyData',
        headers: { 
            'Accept': 'application/json',  
            'Content-Type': 'application/json'
        },
      })
        .then(function (response) {
          console.log(response);
        }); */
}

exports.get44maDailyStocks = (req, res) => {
    Nifty100.find().exec((err, list) => {
        if(err){
            console.log(err);
        }

        var dates = list[0].data.dates;

        var dailyStockList = [];

        Promise.all(dates.map((date, i)=> {
            var stockList = [date];
            list.forEach(function (stock) {
                if(stock.data.dates){
                    stock.data.dates.map((d, k)=>{
                        if(k> 55){
                            if(d == date){
                                var ma44 = stock.data.ma44
                                if(ma44[k] > ma44[k-1] && ma44[k-1] > ma44[k-2] && ma44[k-2] > ma44[k-3] && ma44[k-3] > ma44[k-4] && ma44[k-4] > ma44[k-5]
                                    && ma44[k-5] > ma44[k-6] && ma44[k-6] > ma44[k-7] && ma44[k-7] > ma44[k-8]){
                                    if(Math.abs(((stock.data.ma44[k] - stock.data.close[k])/stock.data.ma44[k])*100) < 1){
                                        stockList.push({
                                            date: stock.data.dates[k],
                                            token: stock.token,
                                            name: stock.name,
                                            entry:  stock.data.high[k],
                                            exit: stock.data.low[k],
                                            target: (stock.data.high[k] - stock.data.low[k])*2 + stock.data.high[k],
                                            ma44: stock.data.ma44[k],
                                            close: stock.data.close[k],
                                            high: stock.data.high[k],
                                            open: stock.data.open[k],
                                            low: stock.data.low[k],
                                            quantity: Math.floor(100/(stock.data.high[k] - stock.data.low[k])),
                                            nextdate: stock.data.dates[k+1]
                                        });
                                    }
                                }
                            }
                        }
                            
                        
                    })
                }
                
            })

            var d1 = new Date();
            d1.setDate(d1.getDate() - 5)
            var d2 = new Date(date)

            if(d2 > d1){
                dailyStockList.push(stockList);
            }

        }))

        res.json(dailyStockList);
})

}


exports.getEndOf15Min44maAnd200maData = (req, res) => {

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
                    var dates15Minute = [];
                    var high15Minute = [];
                    var low15Minute = [];
                    var close15Minute = [];
                    var open15Minute = [];
                    var volume15Minute = [];
                    var ma4415Minute = [];
                    var ma20015Minute = [];
                    var type = "sideways";
                    var rsi15Minute = [];
                    
                    Promise.all(response.data.data.map((c,i)=> {
                        dates15Minute.push(c[0]);
                        open15Minute.push(c[1]);
                        high15Minute.push(c[2]);
                        low15Minute.push(c[3]);
                        close15Minute.push(c[4]);
                        volume15Minute.push(c[5]);
                    }))
                    .then(()=>{
                        ma4415Minute = ma(close15Minute, 44);
                        ma20015Minute = ma(close15Minute, 200);
                        rsi15Minute = calculateRSI(close15Minute);
                        dates15Minute = dates15Minute.slice(-10);
                        open15Minute = open15Minute.slice(-10);
                        high15Minute = high15Minute.slice(-10);
                        low15Minute = low15Minute.slice(-10);
                        close15Minute = close15Minute.slice(-10);
                        volume15Minute = volume15Minute.slice(-10);
                        ma4415Minute = ma4415Minute.slice(-10);
                        ma20015Minute = ma20015Minute.slice(-10);
                        rsi15Minute = rsi15Minute.slice(-10);

                        if( ma4415Minute[9] > ma4415Minute[8] && 
                            ma4415Minute[8] > ma4415Minute[7] &&
                            ma4415Minute[7] > ma4415Minute[6] &&
                            ma4415Minute[6] > ma4415Minute[5] &&
                            ma4415Minute[5] > ma4415Minute[4] &&
                            ma4415Minute[4] > ma4415Minute[3] &&
                            ma4415Minute[3] > ma4415Minute[2] && 
                            ma4415Minute[2] > ma4415Minute[1] &&
                            ma4415Minute[1] > ma4415Minute[0] ){
                                if( ma20015Minute[9] > ma20015Minute[8] && 
                                    ma20015Minute[8] > ma20015Minute[7] &&
                                    ma20015Minute[7] > ma20015Minute[6] &&
                                    ma20015Minute[6] > ma20015Minute[5] &&
                                    ma20015Minute[5] > ma20015Minute[4] &&
                                    ma20015Minute[4] > ma20015Minute[3] &&
                                    ma20015Minute[3] > ma20015Minute[2] && 
                                    ma20015Minute[2] > ma20015Minute[1] &&
                                    ma20015Minute[1] > ma20015Minute[0]){
                                        if(Math.abs(((ma4415Minute[9] - close15Minute[9])/ma4415Minute[9])*100) < 0.5){
                                            if(close15Minute[8] > open15Minute[8]){
                                                type = "buy"
                                            }
                                            
                                        }
                                        
                                    }
                            }
                        
                        var data2 = { dates15Minute, open15Minute, high15Minute, low15Minute, close15Minute, volume15Minute, ma4415Minute, ma20015Minute, rsi15Minute }
                        Nifty100.findOneAndUpdate({ token }, { $set: { "data": data2, "type": type  } }, {new: true}).exec((err, stock) =>{
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

exports.get44ma200ma15MinStocksOrder = (req, res) => {
    Nifty100.find({ type: 'buy'}).exec((err, list) => {
        if(err){
            console.log(err);
        }

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
        })

        list.forEach(function (el, index) {
            promise = promise.then(function () {
                    var quantity = 1;
                    var price = el.data.high15Minute[8] + 0.05;
                    var triggerprice = el.data.high15Minute[8]+0;
                    var exitprice = el.data.low15Minute[8];
                    var targetprice = price + (price - exitprice)*2;
                    var symbol = el.symbol;
                    var token = el.token;
                    if(index < 9){
                        
                    
                        TradeStatus.findOne({name : "intraday44ma200ma"}).exec((err, tradeStatus)=> {
                            if(err){
                                console.log(err)
                            }

                            var tradeStatusData = tradeStatus.data;
                            
                            if(!tradeStatus.status){
                                //console.log(index);
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
                                        if(response.data.data && position){
                                            tradeStatus.positionData = response.data.data;
                                            TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": tradeStatusData, status: true  } }, {new: true}).exec((err, stock) =>{
                                                if (err || !stock) {
                                                console.log(err);
                                                }
                                                else{
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
                                                    .then((orderResponse)=> {
                                                        var orders = orderResponse.data.data;
                                                        cancelAllBuyOrder(orders);
                                                        
                                                    })
                                                    .catch((orderError)=>{
                                                        console.log(orderError)
                                                    })
                                                }
                                            })

                                        }else if(response.data.data === null || !position){
                                            console.log(positionOpen);
                                            if(!positionOpen.includes(symbol) || !positionClose.includes(symbol)){
                                                var data3 = JSON.stringify({
                                                    "variety":"STOPLOSS",
                                                    "tradingsymbol":symbol,
                                                    "symboltoken":token,
                                                    "transactiontype":"BUY",
                                                    "exchange":"NSE",
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
                                                    var obj = {
                                                        symbol: symbol,
                                                        token: token,
                                                        quantity: quantity,
                                                        price: price,
                                                        triggerprice: triggerprice,
                                                        exitprice: exitprice,
                                                        targetprice: targetprice,
                                                        orderid: orderResponse.data.data.orderid
                                                    }
    
                                                    tradeStatusData.orderPosted.push(obj);
    
                                                    TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": tradeStatusData  } }, {new: true}).exec((err, stock) =>{
                                                        if (err || !stock) {
                                                        console.log(err);
                                                        }
                                                        else{
                                                            console.log(stock);
                                                        }
                                                    })
                                                })
                                                .catch((orderError)=>{
                                                    console.log(orderError)
                                                })
                                            }
                                        }
                                    })
                                    .catch((error)=> {
                                        console.log(error)
                                    })
                            }

                            else{
                                var config4 = {
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

                                    axios(config4)
                                    .then((orderResponse)=> {
                                        var orders = orderResponse.data.data;
                                        cancelAllBuyOrder(orders);
                                    }).catch((orderError)=>{
                                        console.log(orderError)
                                    })
                            }
                        })
                    }
                    console.log(el.token);
                    return new Promise(function (resolve) {
                    setTimeout(resolve, interval);
                    })
                })
        })
})

}



exports.get44ma200ma15MinStocksSellOrder = (req, res) => {
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
                            orderResponse.data.data.map((o)=>{
                                if(o.transactiontype === "SELL" && positionOpen.includes(o.tradingsymbol) && (o.status === "open" || o.status === "trigger pending")){
                                    sellOrderExecuted = true;
                                }
                                if(o.transactiontype === "BUY" && positionOpen.includes(o.tradingsymbol)){
                                    buyOrderExecuted = true;
                                    tradingsymbol.push(o.tradingsymbol);
                                }

                            })
                            if(buyOrderExecuted && !sellOrderExecuted){
                                cancelAllBuyOrder(orderResponse.data.data);
                                TradeStatus.findOne({name : "intraday44ma200ma"}).exec((err, tradeStatus)=> {
                                    if(err){
                                        console.log(err)
                                    }
                                    console.log("Placing Sell Order")
                                    var orderPosted = tradeStatus.data.orderPosted;
                                    orderPosted.map((p)=>{
                                        if(tradingsymbol.includes(p.symbol)){
                                            var data3 = JSON.stringify({
                                                "variety":"STOPLOSS",
                                                "tradingsymbol":p.symbol,
                                                "symboltoken":p.token,
                                                "transactiontype":"SELL",
                                                "exchange":"NSE",
                                                "ordertype":"STOPLOSS_LIMIT",
                                                "producttype":"INTRADAY",
                                                "duration":"DAY",
                                                "price":p.exitprice,
                                                "triggerprice": p.exitprice+0.05,
                                                "squareoff":"0",
                                                "quantity":p.quantity
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
                                                    "tradingsymbol":p.symbol,
                                                    "symboltoken":p.token,
                                                    "transactiontype":"SELL",
                                                    "exchange":"NSE",
                                                    "ordertype":"LIMIT",
                                                    "producttype":"INTRADAY",
                                                    "duration":"DAY",
                                                    "price":p.targetprice,
                                                    "triggerprice": p.targetprice+0.05,
                                                    "squareoff":"0",
                                                    "quantity":p.quantity
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
                                                    cancelAllBuyOrder(orderResponse.data.data);
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
                                })
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
                            orderResponse.data.data.map((o)=>{
                                if(o.transactiontype === "SELL"){
                                    cancelAllSellOrder(orderResponse.data.data);
                                    var tradeStatusData = {
                                        positionData: [],
                                        orderPosted: []
                                    }
                                    TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": tradeStatusData, status: false  } }, {new: true}).exec((err, stock) =>{
                                        if (err || !stock) {
                                        console.log(err);
                                        }
                                    })
                                }
    
                                else{
                                    console.log("No Sell Order")
                                }
                            })
                        })
                        .catch((orderError)=>{
                            console.log(orderError)
                        })
                }
            })
            .catch((error)=> {
                console.log(error)
            })
    })

    
}

exports.get44ma200ma15MinStocksSquareOffOrder= (req, res) => {
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
                            cancelAllSellOrder(orderResponse.data.data);
                            console.log("Hi I am here");
                            positionObj.map((p)=>{
                                console.log(p);
                                var data3 = JSON.stringify({
                                    "variety":"NORMAL",
                                    "tradingsymbol":p.tradingsymbol,
                                    "symboltoken":p.symboltoken,
                                    "transactiontype":"SELL",
                                    "exchange":"NSE",
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

exports.clearTheIntradayStatus = (req, res) => {
    var data = {
        orderPosted : []
    }

    TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": data, status: false  } }, {new: true}).exec((err, stock) =>{
        if (err || !stock) {
        console.log(err);
        }

        console.log(stock);
    })
}

exports.get44ma200ma15MinStocksOrderQuantity = (req, res) => {
    Nifty100.find({ type: 'buy'}).exec((err, list) => {
        if(err){
            console.log(err);
        }
        var funds = 4500;
        var stopLoss = 50;
        
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
        })

        list.forEach(function (el, index) {
            promise = promise.then(function () {
                    var tradeFlag = false;
                    var price = el.data.high15Minute[8] + 0.05;
                    var triggerprice = el.data.high15Minute[8]+0;
                    var exitprice = el.data.low15Minute[8];
                    var targetprice = price + (price - exitprice)*2;
                    var symbol = el.symbol;
                    var token = el.token;
                    var quantity = Math.floor(stopLoss/(price-exitprice));
                    if(price*quantity*0.2 < funds){
                        tradeFlag = true;
                    }
                    if(index < 9){
                        
                    
                        TradeStatus.findOne({name : "intraday44ma200ma"}).exec((err, tradeStatus)=> {
                            if(err){
                                console.log(err)
                            }

                            var tradeStatusData = tradeStatus.data;
                            
                            if(!tradeStatus.status){
                                //console.log(index);
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
                                        if(response.data.data && position){
                                            tradeStatus.positionData = response.data.data;
                                            TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": tradeStatusData, status: true  } }, {new: true}).exec((err, stock) =>{
                                                if (err || !stock) {
                                                console.log(err);
                                                }
                                                else{
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
                                                    .then((orderResponse)=> {
                                                        var orders = orderResponse.data.data;
                                                        cancelAllBuyOrder(orders);
                                                        
                                                    })
                                                    .catch((orderError)=>{
                                                        console.log(orderError)
                                                    })
                                                }
                                            })

                                        }else if(response.data.data === null || !position){
                                            console.log(positionOpen);
                                            if((!positionOpen.includes(symbol) || !positionClose.includes(symbol)) && tradeFlag){
                                                var data3 = JSON.stringify({
                                                    "variety":"STOPLOSS",
                                                    "tradingsymbol":symbol,
                                                    "symboltoken":token,
                                                    "transactiontype":"BUY",
                                                    "exchange":"NSE",
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
                                                    var obj = {
                                                        symbol: symbol,
                                                        token: token,
                                                        quantity: quantity,
                                                        price: price,
                                                        triggerprice: triggerprice,
                                                        exitprice: exitprice,
                                                        targetprice: targetprice,
                                                        orderid: orderResponse.data.data.orderid
                                                    }
    
                                                    tradeStatusData.orderPosted.push(obj);
    
                                                    TradeStatus.findOneAndUpdate({ name: "intraday44ma200ma" }, { $set: { "data": tradeStatusData  } }, {new: true}).exec((err, stock) =>{
                                                        if (err || !stock) {
                                                        console.log(err);
                                                        }
                                                        else{
                                                            console.log(stock);
                                                        }
                                                    })
                                                })
                                                .catch((orderError)=>{
                                                    console.log(orderError)
                                                })
                                            }
                                        }
                                    })
                                    .catch((error)=> {
                                        console.log(error)
                                    })
                            }

                            else{
                                var config4 = {
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

                                    axios(config4)
                                    .then((orderResponse)=> {
                                        var orders = orderResponse.data.data;
                                        cancelAllBuyOrder(orders);
                                    }).catch((orderError)=>{
                                        console.log(orderError)
                                    })
                            }
                        })
                    }
                    console.log(el.token);
                    return new Promise(function (resolve) {
                    setTimeout(resolve, interval);
                    })
                })
        })
})

}

const cancelAllBuyOrder = (orderList) =>{

    var authtoken = ""

    fs.readFile('../token.txt', 'utf8', (err, d) => {
            
        if (err) {
        console.error(err);
        return;
        }
        authtoken = JSON.parse(d)["data"]["jwtToken"];
        authtoken = "Bearer " + authtoken;

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
    })
}

const cancelAllSellOrder = (orderList) =>{

    var authtoken = ""

    fs.readFile('../token.txt', 'utf8', (err, d) => {
            
        if (err) {
        console.error(err);
        return;
        }
        authtoken = JSON.parse(d)["data"]["jwtToken"];
        authtoken = "Bearer " + authtoken;

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
    })
    
}

const calculateRSI = (close) => {
    var gain = [];
    var loss = [];
    var rsi = [];

    for(i=0; i<close.length; i++){
        if(i == 0){
            gain[i] = 0;
            loss[i] = 0;
        }else{
            if(close[i]>=close[i-1]){
                gain[i] = Math.abs((close[i]-close[i-1])/close[i-1]);
                loss[i] = 0;
            }else{
                loss[i] = Math.abs((close[i]-close[i-1])/close[i-1]);
                gain[i] = 0;
            }
        }
    }

    var avgGain = ma(gain, 14);
    var avgLoss = ma(loss, 14);

    for(i=0; i<close.length; i++){
        if(i < 14){
            rsi[i] = 0;
        }else{
            if(avgLoss[i-1] == 0 && loss[i]==0)
            {
                rsi[i] = 0;
            }else{
                rsi[i] = 100 - (100/(1+((13*avgGain[i]+ gain[i])/(13*avgLoss[i] + loss[i]))));
            }
        }
    }

    return rsi;
    

}