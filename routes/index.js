var express = require('express')
var path = require('path')
var fs = require('fs')
var async = require('async')
var multiplot = require('./multiplot')

var router = express.Router()

if (!process.env.MULTIPLOT_DATA_ROOT)
    throw new Error('Please specify the MULTIPLOT_DATA_ROOT environment variable')

/* GET home page. */
router
    .get('/', function(req, res, next) {
        res.render('index');
    })

    .get('/view-dir', function(req, res, next) {
        var curdir = req.query.curdir || ''
        var dir = path.join(process.env.MULTIPLOT_DATA_ROOT, curdir)
        fs.readdir(dir, function(err, files) {
            if (err) {
                console.log(err)
                return res.send(400, 'Failed to read directory')
            }

            async.filter(
                files,
                function(file, cb) {
                    fs.stat(path.join(dir, file), function(err, stats) {
                        cb(err, !err && stats.isDirectory())
                    })
                },
                function(err, result) {
                    if (err) {
                        console.log(err)
                        return res.sendStatus(500)
                    }
                    else
                        res.send(JSON.stringify({curdir: curdir, subdirs: result}))
                })
            })
    })

    .get('/multiplot-dir-info', function(req, res, next) {
        var curdir = req.query.curdir || ''
        multiplot.dirInfo(curdir, function(err, di) {
            if (err) {
                console.log(err)
                return res.sendStatus(500)
            }
            var result = {
                status: di.status
            }
            if (di.status === 'normal') {
                result.categoryNames = di.info.categoryNames
                result.categories = di.categories
                result.processing = di.info.processing
            }
            res.send(JSON.stringify(result))
        })
    })

    .post('/multiplot-selection-info', function(req, res, next) {
        var query = JSON.parse(req.body.query)
        multiplot.selectionInfo(query, function(err, dd) {
            if (err) {
                console.log(err)
                return res.sendStatus(500)
            }
            res.send(JSON.stringify(dd))
        })
    })

    .get('/multiplot-file', function(req, res, next) {
        var curdir = req.query.curdir || ''
        var fileName = req.query.name
        var filePath = path.join(process.env.MULTIPLOT_DATA_ROOT, curdir, fileName)
        res.sendFile(filePath)
    })

module.exports = router
