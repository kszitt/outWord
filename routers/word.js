const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const http = require('http');
const Img = require('./img');
const Docx = require('./officegenDocx');


router.post('/', function (req, res) {
    var params = req.body;
    var evalStr = params.evalStr;
    var fileName = params.fileName;
    var imgUrl = params.imgUrl;
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
            var docx = new Docx();
            eval(evalStr);
            docx.toXml();
            var xml = docx.xml;
            var outWordPath = path.resolve(__dirname, '../public/word/'+ decodeURI(fileName) +'.xml');
            fs.writeFile(outWordPath, xml, function (err) {
               if(err) res.send(err.toString());
               console.log('写入成功');
                fs.rename(outWordPath, outWordPath.replace(/xml$/, 'doc'), function (err) {
                    if (err) res.send(err.toString());
                    res.send({
                        msg: 'success'
                    });
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

























