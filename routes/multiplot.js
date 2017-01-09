var path = require('path')
var fs = require('fs')
var _ = require('lodash')
// var async = require('async')

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

        /*
        // Turn elements of the files array from strings into objects
        files = _.map(files, function(fileName) { return { name: fileName } } )

        // Process all files matching the filter
        var maxFileReads = 10
        var dir = path.join(process.env.MULTIPLOT_DATA_ROOT, query.curdir)
        async.eachLimit(files, maxFileReads,
            function(file, cb) {
                // Read file
                fs.readFile(path.join(dir, file.name), 'utf8', function(err, data) {
                    if(err)
                        return cb(err)
                    // Compute file categories
                    file.categories = fileCategories(di, file.name)

                    // Parse file content such that file content is an object with properties
                    // valid    - true if there is at least one column, and there are at least
                    //            one line of values, and the total number of values is a multiple
                    //            of the number of columns;
                    // headings - column headings (array of strings);
                    // values   - values (array of numbers in the row-wise order).
                    var content = file.content = {}
                    var lines = data.split(/\r?\n/)
                    if (lines.length > 1) {
                        content.headings = lines[0].split('\t')
                        lines.splice(0,1)
                        _.remove(lines, function(line) { return line.length === 0   ||   line.match(/^(#|\/\/)/) })
                        content.values = _.map(lines.join('\t').split('\t'), parseFloat)
                        content.valid =
                                content.headings.length > 0   &&
                                content.values.length > 0   &&
                                content.values.length % content.headings.length === 0
                    }
                    else
                        content.valid = false
                    cb()
                })
            },
            function(err) {
                if (err)
                    return cb(err)
                var dd = files
                cb(null, dd)
            }
        )
        */
    })
}

module.exports = {
    dirInfo: dirInfo,
    selectionInfo: selectionInfo
}
