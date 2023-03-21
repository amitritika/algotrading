const express = require("express");
const fs = require('fs');
const axios = require("axios");
const { nifty100 } = require("../helpers/nifty100");
const { niftyOption } = require("../helpers/instruments");
const Nifty100 = require("../models/nifty100");
const TradeStatus = require("../models/tradeStatus");
const Instruments = require("../models/instruments");

exports.createNifty100 = (req, res) => {
    
    nifty100.map((key, i) => {
        const name = key.name;
        const symbol = key.symbol;
        const token = key.token;

        stock = new Nifty100({ name, symbol, token });

        stock.save((err, data)=> {
            if(err){
                console.log(err);
            }
            console.log(data);
        })

    })
}

exports.createTradeStatus = (req, res) => {

    const name = req.params.id;
    status = new TradeStatus({ name });
    status.save((err, data)=> {
        if(err){
            console.log(err);
        }
        console.log(data);
    })
}

exports.createInstruments = (req, res) => {
    deleteFile('../instruments.txt');
    main();
    
    /* axios.get("https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json")
    .then((response)=> {
        console.log(response.data.length);
        response.data.map((list, i)=>{
            if(list.exch_seg === "NFO" && list.name === "NIFTY"){

                const content = JSON.stringify(list) + "\n";
                fs.appendFile('../instruments.txt', content, err => {
                    Instruments.updateOne({ name: list.name },
                        { $set: { token: list.token, symbol: list.symbol, expiry: list.expiry, strike: list.strike, 
                            lotsize: list.lotsize, instrumenttype: list.instrumenttype, exch_seg: list.exch_seg, tick_size: list.tick_size, name: list.name }},
                        { upsert: true }).exec((err, stock) =>{
                            if(err){
                                console.log(err)
                            }
                            console.log(i);
                        })
                    if (err) {
                    console.error(err);
                    }
                    // file written successfully
                });
            
            }
        })
        
    }) */
}

exports.getInstrument = (req, res) => {
    const id = req.params.id;
    niftyOption(id)
  .then(result => res.json(result))
  .catch(error => console.error(error));
}

async function deleteFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
      console.log('file deleted successfully');
    } catch (err) {
      throw err;
    }
  }
  

async function getInstrumentsData() {
  try {
    const response = await axios.get('https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json');
    return response.data;
  } catch (error) {
    console.error(error);
    return error;
  }
}

async function main() {
    const data = await getInstrumentsData();
    
    fs.open('../instruments.txt', 'a', (err, fd) => {
        if (err) throw err;
      
        data.forEach(list => {
        const content = JSON.stringify(list) + "\n";
        if(list.exch_seg === "NFO" && list.name === "NIFTY"){
          fs.write(fd, content, (err) => {
            if (err) throw err;
          });
        }
        });
      
        fs.close(fd, (err) => {
          if (err) throw err;
          console.log('File closed.');
        });
      });
    
    /* data.forEach(list => {
        if(list.exch_seg === "NFO" && list.name === "NIFTY"){
            console.log(list.symbol)
            const content = JSON.stringify(list) + "\n";
            fs.appendFile('../instruments.txt', content, err => {
                if (err) throw err;
                console.log('The data was appended to file.txt.');
              });
            
        }
      
    }); */

    //console.log(niftyOption("NIFTY09FEB2317800CE"));
  
  }