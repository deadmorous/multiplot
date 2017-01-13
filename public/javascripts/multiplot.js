var multiplot = (function() {
    function done(cb) { return function(data) { cb(null, data) } }
    function fail(cb) { return function(err) { cb(err) } }

    function computeValueColumnForCurve(processingInfo, curveData, valueName, knownColumns) {
        var d = curveData.data
        if (d.length === 0)
            return  // Empty dataset
        var n = d.length
        knownColumns = knownColumns || {}
        if (_.isEmpty(knownColumns)) {
            // Determine which columns are already known
            knownColumns = {}
            for (var columnName in d[0])
                knownColumns[columnName] = 1
        }

        function computeExtent() {
            if (!curveData.extent[valueName])
                curveData.extent[valueName] = d3.extent(d, function(d) {return d[valueName]})
        }

        if (valueName in knownColumns)
            return computeExtent() // Value is known

        var recipe = processingInfo.computedValues[valueName]
        if (!recipe)
            throw new Error('No recipe for computing value ' + valueName)
        var dependencies = recipe.dependencies || []
        dependencies.forEach(function(dependencyName) {
            if (!(dependencyName in knownColumns))
                computeValueColumnForCurve(processingInfo, curveData, dependencyName, knownColumns)
        })
        var op = recipe.operation
        var i
        switch(op.type) {
        case 'derivative':
            if (n < 2)
                d[0][valueName] = 0  // Unable to really compute derivative
            else {
                for (i=1; i<n; ++i)
                    d[i-1][valueName] = (d[i][op.func] - d[i-1][op.func]) / (d[i][op.arg] - d[i-1][op.arg])
                d[n-1][valueName] = d[n-2][valueName] // Pad the trailing element with the last value of the derivative
            }
            break
        case 'formula':
            var funcCtorArgs = [].concat(dependencies)
            funcCtorArgs.push('return ' + op.formula)
            var formula = Function.apply(Function, funcCtorArgs)
            for (i=0; i<n; ++i) {
                var funcArgs = []
                dependencies.forEach(function(name) {
                    funcArgs.push(d[i][name])
                })
                d[i][valueName] = formula.apply(null, funcArgs)
            }
            break
        default:
            throw new Error('Unsupported operation type "' + op.type + '" in recipe for value ' + valueName)
        }
        computeExtent()
        knownColumns[valueName] = 1
    }

    function computeDiagramData(multiplot, options, categoryInfo, cb)
    {
        var cacheItem = multiplot.cache[options.dir]
        var allCurveData = cacheItem.curveData
        async.eachLimit(
            categoryInfo,
            10,
            function(item, cb) {
                async.waterfall(
                    [
                        function(cb) {
                            var curveData = allCurveData[item.name]
                            if (curveData)
                                return done(cb)(curveData)
                            $.get('/multiplot-file', { curdir: options.dir, name: item.name })
                                .done(function(data) {
                                    curveData = allCurveData[item.name] = {
                                        data: d3.tsvParse(data, function(d) {
                                            for(var col in d)
                                                d[col] = +d[col]
                                            return d
                                        }),
                                        extent: {}
                                    }
                                    done(cb)(curveData)
                                })
                                .fail(fail(cb))
                            },
                        function(curveData, cb) {
                            var curveInfo = cacheItem.dirInfo.processing.curves[options.curveIndex]
                            var knownColumns = {}
                            var processingInfo = multiplot.cache[options.dir].dirInfo.processing
                            computeValueColumnForCurve(processingInfo, curveData, curveInfo.x.value, knownColumns)
                            computeValueColumnForCurve(processingInfo, curveData, curveInfo.y.value, knownColumns)
                            done(cb)()
                        }
                    ],
                    function(err) {
                        (err? fail: done)(cb)()
                    }
                )
            },
            function(err) {
                (err? fail: done)(cb)(categoryInfo)
            })
    }

    function Multiplot()
    {
        this.cache = {}
    }

    Multiplot.prototype.dirInfo = function(dir, cb) {
        var self = this
        if (self.cache[dir])
            return done(cb)(self.cache[dir].dirInfo)
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
