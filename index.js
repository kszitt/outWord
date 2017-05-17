var express = require('express');
var path = require('path');
var fs = require('fs')
var bodyParser = require('body-parser');
var app = express();
var word = require('./routers/word');
 
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  	res.sendfile('index.html');
});

app.use(bodyParser());

app.use('/outWord', word);

// 清空下载的文件
function deleteFolderRecursive(path) {
    var files = [];
    if( fs.existsSync(path) ) {
        files = fs.readdirSync(path);
        files.forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
    }
};
deleteFolderRecursive(path.resolve(__dirname, './public/word'));
 
app.listen(7777, function(err){
	if(err) throw err;
	console.log('localhost:7777');
});