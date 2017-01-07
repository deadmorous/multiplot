var path = require('path')
var fs = require('fs')
var _ = require('lodash')

var dirInfoCache = {}

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
    _.each(allCats, function(cats, index) {
        allCats[index] = _.keys(cats)
    })
    di.categories = allCats
}

function dirInfo(subdir, cb) {
    var di = dirInfoCache[subdir]
    if (di)
        cb(null, di)
    else {
        var dir = path.join(process.env.MULTIPLOT_DATA_ROOT, subdir)
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
                var rx =
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
}

module.exports = {
    info: dirInfo
}
