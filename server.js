// var http = require('http'),
//     fs = require('fs');

var http = require('http');
var express = require('express')
var request = require('request');
var bodyParser = require('body-parser')
var cors = require('cors')
var app = express()
var qs = require('querystring');
var fs = require("fs");

app.set('view engine','html');

fs.readFile('index.html', function (err, html) {
    if (err) {
        throw err; 
    }       
    http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        response.write(html);  
        response.end();  
    }).listen(8000);
});

app.get('/rahul',function(req,res){
res.render('index');
});