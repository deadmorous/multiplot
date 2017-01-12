var multiplot = (function() {
    function done(cb) { return function(data) { cb(null, data) } }
    function fail(cb) { return function(xhr) { cb(xhr) } }

    function computeDiagramData(multiplot, options, categoryInfo, cb)
    {
        cb('TODO')
    }

    function Multiplot()
    {
        this.cache = {}
    }

    Multiplot.prototype.dirInfo = function(dir, cb) {
        var self = this
        if (self.cache[dir])
            return done(cb)(self.cache[dir])
        $.get('/multiplot-dir-info', { curdir: dir })
            .done(function(data) {
                data = JSON.parse(data)
                self.cache[dir] = {
                    dirInfo: data,
                    categoryInfo: {},
                    curveData: {}
                }
                done(cb)(data)
            })
            .fail(fail(cb))
    }

    Multiplot.prototype.diagramData = function(options, cb) {
        var self = this
        _.defaults(options, {dir: '', categories: [], curveIndex: 0})
        self.dirInfo(options.dir, function(err, data) {
            if (err)
                return fail(cb)(err)
            var cathash = md5(JSON.stringify(options.categories))
            var categoryInfo = self.cache[options.dir].categoryInfo
            if (categoryInfo[cathash])
                return computeDiagramData(self, options, categoryInfo[cathash], cb)
            $.post('/multiplot-selection-info', {
                query: JSON.stringify({ curdir: options.dir, categories: options.categories })
            })
                .done(function(data) {
                    data = JSON.parse(data)
                    categoryInfo[cathash] = data
                    computeDiagramData(self, options, data, cb)
                })
                .fail(fail(cb))
        })
    }

    return function () { return new Multiplot }
})()
