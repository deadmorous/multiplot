var path = require('path')
var fs = require('fs')
var _ = require('lodash')
var async = require('async')
var firstline = require('firstline')
var dataRootDir = require('./data-root-dir')

var dirInfoCache = {}

function fileCategories(di, fileName) {
    var m = fileName.match(di.info.categoryFilter)
    if (!m)
        throw new Error('Incorrect file name')
    var n = di.info.categoryNames.length
    var result = []
    for(var i=0; i<n; ++i)
        result[i] = m[i+1]
    return result
}

function computeAllCategories(di)
{
    var n = di.info.categoryNames.length
    var allCats = []
    _.each(di.files, function(file, index) {
        var m = file.match(di.info.categoryFilter)
        for (var i=0; i<n; ++i) {
            var cats = allCats[i]
            if (!cats)
                cats = allCats[i] = {}
            cats[m[i+1]] = true
        }
    })
    di.categoryMaps = allCats
    di.categories = _.map(allCats, _.keys)
}

function dirInfo(subdir, cb) {
    var di = dirInfoCache[subdir]
    if (di)
        return cb(null, di)
    var dir = path.join(dataRootDir, subdir)
    var infoFilePath = path.join(dir, '.multiplot-info.json')
    fs.readFile(infoFilePath, 'utf8', function(err, data) {
        di = {}
        if(err) {
            di.status = 'empty'
            dirInfoCache[subdir] = di
            return cb(null, di)
        }
        di.info = JSON.parse(data)
        di.info.inputFilter = new RegExp(di.info.inputFilter)
        di.info.categoryFilter = new RegExp(di.info.categoryFilter)
        di.status = 'normal'
        fs.readdir(dir, function(err, files) {
            if (err)
                return cb(err)
            _.remove(files, function(file) {
                return file.match(di.info.inputFilter) === null
            })
            di.files = files
            computeAllCategories(di)
            dirInfoCache[subdir] = di
            cb(null, di)
        })
    })
}

function selectionInfo(query, cb) {
    // console.log(query)
    dirInfo(query.curdir, function(err, di) {
        if (err)
            return cb(err, null)

        if (di.status === 'empty')
            return cb(null, [])

        // Filter files by categories in the query
        var files = di.files.slice()
        var categoryMaps = _.map(query.categories, x => _.countBy(x))
        _.remove(files, function(file) {
            return !_.every(fileCategories(di, file), function(cat, index) {
                return cat in categoryMaps[index]
            })
        })

        // Collect categories from each file name
        files = _.map(files, function(fileName) { return {
                name: fileName,
                categories: fileCategories(di, fileName)
            } } )

        // Invoke callback
        cb(null, files)
    })
}

function primaryValues(subdir, cb) {
    dirInfo(subdir, function(err, di) {
        if (err)
            return cb(err, null)

        if (di.status === 'empty')
            return cb(null, [])

        var values = {}
        async.eachLimit(
            di.files, 20,
            function(fileName, cb) {
                var filePath = path.join(dataRootDir, subdir, fileName)
                firstline(filePath).then(function(text) {
                    _.each(text.trim().split('\t'), function(value) {
                        values[value] = 1
                    })
                    cb()
                })
            },
            function(err) {
                if (err)
                    return cb(err)
                cb(null, _.keys(values).sort())
            }
        )
    })
}

module.exports = {
    dirInfo: dirInfo,
    selectionInfo: selectionInfo,
    primaryValues: primaryValues
}
