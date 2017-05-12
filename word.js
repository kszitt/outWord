const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
var logModel=require('../../utils/logs/logModel');
const http = require('http');
const Img = require('./img');


router.post('/', function (req, res) {
    const officegen = require('officegen');
    var docx = officegen('docx');
    var params = req.body;
    var evalStr = params.evalStr;
    var fileName = params.fileName;
    var imgUrl = params.imgUrl;
    docx.on('finalize', function (written) {
        console.log("创建文件");
    });
    docx.on('error', function (err) {
        res.send(err);
        console.log(err);
    });
    if (imgUrl && imgUrl !== '') {
        // 下载图片
        imgUrl = imgUrl.split(',');
        Img.downImg(imgUrl, function (err) {
            if (err) {
                res.send({
                    msg: '下载图片失败',
                    error: err,
                    evalStr: imgUrl
                });
            } else {
                outWordHtml();
            }
        });
    } else {
        outWordHtml();
    }

    // 导出word
    function outWordHtml() {
        try {
            console.log(evalStr);
            eval(evalStr);
            // 创建文件
            var out = fs.createWriteStream(path.resolve(__dirname, '../../public/outWord/' + decodeURI(fileName) + ".docx"));
            docx.generate(out, false, function () {
                new logModel({
                    operationType:'导出',
                    product:'资源库',
                    objectType:'导出word',
                    objectTab:'',
                    name:req.session.user.name,
                    code:'',
                    time:new Date().getTime()
                }).save();
                res.send({
                    msg: 'success'
                });
            });
        } catch (err) {
            res.send({
                msg: '解析docx时报错',
                error: err.toString(),
                evalStr: evalStr
            });
        }
    }
});


module.exports = router;

























