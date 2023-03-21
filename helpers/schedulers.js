const schedule = require('node-schedule');
const axios = require("axios");
exports.everyDayMorning = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 06;
    rule.minute = 30;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/signin")
        .then(function(response){
            axios.get("http://0.0.0.0:3001/api/clearTheIntradayStatus")
            .then((res)=>{
                
            }).catch((err)=> {

            })
        }).catch(function(error){
            console.log(error);
        })
    console.log('A new day has begun in the UTC timezone!');
    });
}



exports.everyDayEvening = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 07;
    rule.minute = 00;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/getEndOfDay44maDailyData")
        .then(function(response){
            axios.get("http://0.0.0.0:3001/api/getDailyDataAnalysis")
            .then((res)=>{

            }).catch((err)=>{

            })
        }).catch(function(error){
            console.log(error);
        })
    console.log('A new day has end in the UTC timezone!');
    });
}


exports.everyFridaySmartsheet1 = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 23;
    rule.minute = 30;
    rule.dayOfWeek = 5;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/smartsheet/copyResourceLoad/7017689781692292")
        .then(function(response){
            console.log(response.data)
        }).catch(function(error){
            console.log(error);
        })
    console.log('A new day has end in the Smartsheet!');
    });
}

exports.everyFridaySmartsheet2 = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 23;
    rule.minute = 35;
    rule.dayOfWeek = 5;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/smartsheet/copyWorkLoad/3640514047174532")
        .then(function(response){
            console.log(response.data)
        }).catch(function(error){
            console.log(error);
        })
    console.log('A new day has end in the Smartsheet');
    });
}

exports.intradayMarketStrategy = () => {
    every5Minute();
    every15MinutePE();
    everyDay30SecondsPE();
    everyDayMorningClearStatusPE();
    everyDayClosingMarketSquareOff();
}

const everyDayMorningClearStatus = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 06;
    rule.minute = 31;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/clearTheIntradayStatus")
            .then((res)=>{
                console.log('A new day has begun in the UTC timezone!');
            }).catch((err)=> {
                console.log(err)
            })
    
    });
}

const everyDayMorningClearStatusPE = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 06;
    rule.minute = 31;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/clearTheIntradayStatusPE")
            .then((res)=>{
                console.log('A new day has begun in the UTC timezone!');
            }).catch((err)=> {
                console.log(err)
            })
    
    });
}

const every15MinuteData = () => {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 09;
    rule.minute = 58;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 3600000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/getEndOf15Min44maAnd200maData")
            .then(function(response){
                console.log('A new day has end in the Smartsheet'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 900000); 

                                              
    });
}

const every15MinuteOrder = () => {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 10;
    rule.minute = 00;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 3600000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/get44ma200ma15MinStocksOrderQuantity")
            .then(function(response){
                console.log('A new day has end in the Smartsheet'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 900000); 

                                              
    });
}

const everyDay30Seconds = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 10;
    rule.minute = 00;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 14400000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/get44ma200ma15MinStocksSellOrder")
            .then(function(response){
                console.log('A new day has end in the Smartsheet'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 30000); 

                                              
    });
}

const everyDayClosingMarketSquareOff = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 15;
    rule.minute = 15;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){
        axios.get("http://0.0.0.0:3001/api/get44ma200ma15MinStocksSquareOffOrder")
        .then(function(response){
            console.log(response.data)
        }).catch(function(error){
            console.log(error);
        })
    console.log('Postion Squared Off!');
    });
}


const every5Minute = () => {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 09;
    rule.minute = 44;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 14400000){
            clearInterval(interval);
            return;
        }
        setTimeout( function() { 
            axios.get("http://0.0.0.0:3001/api/buyOrderStrategy5emaPE")
            .then(function(response){
                console.log('A new day has end in the Smartsheet'); 
            }).catch(function(error){
                console.log(error);
            }) 
         }, 50000);
        
          
            //do whatever here..
        }, 300000); 

                                              
    });
}

const every15MinutePE = () => {
    const rule = new schedule.RecurrenceRule();
    rule.hour = 09;
    rule.minute = 30;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 14400000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/niftyPE")
            .then(function(response){
                console.log('NIFTY OPtion Updated'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 900000); 

                                              
    });
}

const everyDay30SecondsPE = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 09;
    rule.minute = 45;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 18000000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/sellOrderStrategy5emaPE")
            .then(function(response){
                console.log('Sell Order'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 20000); 

                                              
    });
}

const everyDay10SecondsPE = () => {

    const rule = new schedule.RecurrenceRule();
    rule.hour = 09;
    rule.minute = 45;
    rule.tz = 'Asia/Calcutta';

    const job = schedule.scheduleJob(rule, function(){

        var startTime = new Date().getTime();
        var interval = setInterval(function(){
        if(new Date().getTime() - startTime > 18000000){
            clearInterval(interval);
            return;
        }
        axios.get("http://0.0.0.0:3001/api/trailingSLStrategy5emaPE")
            .then(function(response){
                console.log('Sell Order'); 
            }).catch(function(error){
                console.log(error);
            }) 
          
            //do whatever here..
        }, 10000); 

                                              
    });
}