const express = require("express");
const axios = require("axios");
const fs = require('fs');
const { ma } = require("moving-averages");
const Nifty100 = require("../models/nifty100");
const TradeStatus = require("../models/tradeStatus");
const { nifty100 } = require("../helpers/nifty100");
var RSI = require('technicalindicators').RSI;
const { rawListeners } = require("../models/tradeStatus");

exports.rsiM60W60D40Suppot = (req, res) => {
    Nifty100.find().exec((err, list) => {
        if(err){
            console.log(err);
        }

        list.map((stock, index)=>{
            var monthlyRSI = stock.monthlyData.rsi.slice(-5);
            var weeklyRSI = stock.weeklyData.rsi.slice(-5);
            var dailyRSI = stock.dailyData.rsi.slice(-2);
            var open = stock.dailyData.open.slice(-1)[0];
            var close = stock.dailyData.close.slice(-1)[0];
            var monthlyRSIFlag = true;
            var weeklyRSIFlag = true;
            var dailylyRSIFlag = false;

            var token = stock.token;
            var type = "sideways";

            monthlyRSI.map((rsi)=> {
                if(rsi < 60){
                    monthlyRSIFlag = false;
                }
            })

            weeklyRSI.map((rsi)=> {
                if(rsi < 60){
                    weeklyRSIFlag = false;
                }
            })

            if(nearbyFunction(dailyRSI[0], 2, 40) || nearbyFunction(dailyRSI[0], 2, 80)){
                if(dailyRSI[1] > dailyRSI[0]){
                    if(close > open){
                        dailylyRSIFlag = true;
                        //console.log(stock.symbol);
                    }
                }
            }

            if(monthlyRSIFlag){
                if(weeklyRSIFlag){
                    if(dailylyRSIFlag){
                        type = "buy"
                        console.log(stock.symbol);
                    }
                }
            }

            Nifty100.findOneAndUpdate({ token }, { $set: { "type": type  } }, {new: true}).exec((err, stock) =>{
                if (err || !stock) {
                  console.log(err);
                  }
                else{
                    //console.log(stock);
                }
              })
        })
    })
}


exports.rsiD60H6015Min40Suppot = (req, res) => {
    Nifty100.find().exec((err, list) => {
        if(err){
            console.log(err);
        }

        list.map((stock, index)=>{
            var dailyRSI = stock.dailyData.rsi.slice(-5);
            var hourlyRSI = stock.hourlyData.rsi.slice(-5);
            var fifteenMinRSI = stock.fifteenMinData.rsi.slice(-2);
            var open = stock.fifteenMinData.open.slice(-1)[0];
            var close = stock.fifteenMinData.close.slice(-1)[0];
            var dailyRSIFlag = true;
            var hourlyRSIFlag = true;
            var fifteenMinlyRSIFlag = false;

            var token = stock.token;
            var type = "sideways";

            dailyRSI.map((rsi)=> {
                if(rsi < 60){
                    dailyRSIFlag = false;
                }
            })

            hourlyRSI.map((rsi)=> {
                if(rsi < 60){
                    hourlyRSIFlag = false;
                }
            })

            if(nearbyFunction(fifteenMinRSI[0], 2, 40)){
                if(fifteenMinRSI[1] > fifteenMinRSI[0]){
                    if(close > open){
                        fifteenMinlyRSIFlag = true;
                        
                    }
                }
            }

            if(dailyRSIFlag){
                if(hourlyRSIFlag){
                    if(fifteenMinlyRSIFlag){
                        type = "buy"
                        console.log(stock.symbol);
                    }
                }
            }

            Nifty100.findOneAndUpdate({ token }, { $set: { "type": type  } }, {new: true}).exec((err, stock) =>{
                if (err || !stock) {
                  console.log(err);
                  }
                else{
                    //console.log(stock);
                }
              })
        })
    })
}

const nearbyFunction = (number, range, target) => {
    var min = target - range;
    var max = target + range;

    if(number > min && number < max){
        return true
    }else{
        return false
    }
}