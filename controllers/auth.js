const express = require("express");
const fs = require('fs');
const axios = require("axios");
const totp = require("totp-generator");

exports.signin = (req, res) => {
    
    var data = JSON.stringify({
        "clientcode":process.env.CLIENT_ID,
        "password":process.env.PASSWORD,
        "totp":totp(process.env.TOTP_KEY)
    });
    
    var config = {
      method: 'post',
      url: 'https://apiconnect.angelbroking.com/rest/auth/angelbroking/user/v1/loginByPassword',
    
      headers : {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': '',
        'X-ClientPublicIP': '',
        'X-MACAddress': '',
        'X-PrivateKey': process.env.API_KEY
      },

      data : data
    };
    
    axios(config)
    .then(function (response) {
        const content = JSON.stringify(response.data);
        fs.writeFile('../token.txt', content, err => {
            if (err) {
              console.error(err);
            }
            // file written successfully
          });
      //console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
}

exports.getProfile = (req, res) => {

    var token = "";

    fs.readFile('../token.txt', 'utf8', (err, data) => {
        if (err) {
          console.error(err);
          return;
        }
        token = JSON.parse(data)["data"]["jwtToken"];
        token = "Bearer " + token; 
        console.log(token);
        var config = {
            method: 'get',
            url: 'https://apiconnect.angelbroking.com/rest/secure/angelbroking/user/v1/getProfile',
          
            headers : {
              'Authorization': String(token),
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
          .then(function (response) {
            res.json(response.data);
          })
          .catch(function (error) {
            console.log(error);
          });
      });

      
}