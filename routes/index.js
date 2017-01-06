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
                        res.send({curdir: curdir, subdirs: result})
                })
            })
    })

    .get('/multiplot-info', function(req, res, next) {
        var curdir = req.query.curdir || ''
        multiplot.info(curdir, function(err, data) {
            if (err) {
                console.log(err)
                return res.sendStatus(500)
            }
            else
                res.send(data)
        })
    })

module.exports = router