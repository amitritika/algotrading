const express = require("express");
const axios = require("axios");
const { weekNumberSun } = require('weeknumber');



exports.getSheet = (req, res) => {
    
    const id = req.params.id;

    var config = {
        url: `${process.env.SMARTSHEET_API}/${id}`,
        method: "get",
        headers: {
            "Authorization": `Bearer ${process.env.SMARTSHEET_API_TOKEN}`,
            "Content-Type": "application/json"
        }
    }

    
    axios(config)
    .then(function (response){
        res.json(response.data);
    }).catch(err => {
        console.log(err);
    })

   
}

exports.copyWorkLoad = (req, res) => {
    
    const id = req.params.id;
    var col = [];
    var rows = [];
    var resource_col_id = "";
    var week_col_id = "";
    var week_number_id = "";
    var weekNumber = "W"+ weekNumberSun(new Date()).toString();
    var row = [];

    console.log(weekNumber);
    

    var config = {
        url: `${process.env.SMARTSHEET_API}/${id}`,
        method: "get",
        headers: {
            "Authorization": `Bearer ${process.env.SMARTSHEET_API_TOKEN}`,
            "Content-Type": "application/json"
        }
    }

    
    axios(config)
    .then(function (response){
        col = response.data.columns;
        rows = response.data.rows;

        col.map((c, i)=> {
            if(c.title === "Resource Load This week"){
                resource_col_id = c.id;
            }
            if(c.title === weekNumber){
                week_col_id = c.id;
            }
        })

        rows.map((r,i)=> {
            r.cells.map((c, j)=> {
                if(c.columnId === resource_col_id && c.value){
                    row.push({
                        "id": r.id.toString(),
                        "cells": [
                            {
                              "columnId": week_col_id.toString(),
                              "value": c.value
                            }
                          ]
                    }
                )
                    

                }
            })
        })

        var config1 = {
            url: `${process.env.SMARTSHEET_API}/${id}/rows`,
            method: "put",
            headers: {
                "Authorization": `Bearer ${process.env.SMARTSHEET_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            data: row
        }

        axios(config1)
        .then(function(data){
            console.log("Success");
        }).catch(err => {
            console.log(err);
        })

        
    }).catch(err => {
        console.log(err);
    })

   
}

exports.copyResourceLoad = (req, res) => {
    
    const id = req.params.id;
    var col = [];
    var rows = [];
    var resource_col_id = "";
    var week_col_id = "";
    var week_number_id = "";
    var weekNumber = "W"+ weekNumberSun(new Date()).toString();
    var row = [];

    console.log(weekNumber);
    

    var config = {
        url: `${process.env.SMARTSHEET_API}/${id}`,
        method: "get",
        headers: {
            "Authorization": `Bearer ${process.env.SMARTSHEET_API_TOKEN}`,
            "Content-Type": "application/json"
        }
    }

    
    axios(config)
    .then(function (response){
        col = response.data.columns;
        rows = response.data.rows;

        col.map((c, i)=> {
            if(c.title === "Total Hours"){
                resource_col_id = c.id;
            }
            if(c.title === weekNumber){
                week_col_id = c.id;
            }
        })

        rows.map((r,i)=> {
            r.cells.map((c, j)=> {
                if(c.columnId === resource_col_id && c.value){
                    row.push({
                        "id": r.id.toString(),
                        "cells": [
                            {
                              "columnId": week_col_id.toString(),
                              "value": c.value
                            }
                          ]
                    }
                )
                    

                }
            })
        })

        var config1 = {
            url: `${process.env.SMARTSHEET_API}/${id}/rows`,
            method: "put",
            headers: {
                "Authorization": `Bearer ${process.env.SMARTSHEET_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            data: row
        }

        axios(config1)
        .then(function(data){
            console.log("Success");
        }).catch(err => {
            console.log(err);
        })

        
    }).catch(err => {
        console.log(err);
    })

   
}