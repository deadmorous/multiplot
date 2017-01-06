var path = require('path')
var fs = require('fs')

var multiplot = {
    info: function(curdir, cb) {
        var infoFilePath = path.join(process.env.MULTIPLOT_DATA_ROOT, curdir, '.multiplot-info.json')
        fs.readFile(infoFilePath, 'utf8', function(err, data) {
            cb(null, err? '': data)
        })
    }
}

module.exports = multiplot
