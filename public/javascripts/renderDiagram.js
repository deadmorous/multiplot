function renderDiagram(m, curdir, categorySelection, curve, filters) {
    var container = $('#main-view')
    m.diagramData({dir: curdir, categories: categorySelection, curve: curve}, function(err, categoryInfo, problems) {
        if (err)
            return popups.errorMessage(err)
        if (!_.isEmpty(problems.messages)) {
            popups.warningMessage(
                '<h1>Failed to compute some curves</h1>' +
                '<p>' + _.keys(problems.failedCurves).join(', ') + '</p>' +
                '<h2>Messages</h2>' +
                '<p>' + _.map(problems.messages, (v, name) => name + ' (' + v + ')').join('<br/>') + '</p>',
                {format: 'html'})
        }
        var failedCurves = []
        if (!(categoryInfo.length > 0))
            return container
                .html('')
                .append($('<h1>').text('No curves are selected') )

        var dirInfo = m.cache[curdir].dirInfo

        // Stuff container with sub-containers for diagram and legend
        container.html('')
        var svg = d3.select($('<svg xmlns:svg="http://www.w3.org/2000/svg">').addClass('diagram').appendTo(container)[0])
        var legend = $('<div>').addClass('diagram-legend').appendTo(container)

        var colorScale = d3.scaleLinear()
            .domain([0, categoryInfo.length])
            .range([0, 360])

        // Generate legend first - then we will be able to find the height of the diagram
        ;(function() {
            var cnames = dirInfo.categoryNames
            var ncats = cnames.length
            var fixedCategories = []
            var varyingCategoryIndices = []
            var varyingCategoryNames = []
            var actualCategories = []
            for (var i=0; i<ncats; ++i) {
                var categories = _(categoryInfo).countBy((item) => item.categories[i]).keys().value()
                if (categories.length > 1) {
                    varyingCategoryIndices.push(i)
                    varyingCategoryNames.push(cnames[i])
                }
                else
                    fixedCategories.push(cnames[i] + ' = ' + categories[0])
            }

            function varyingCategoryValues(allCategoryValues) {
                return varyingCategoryIndices.map(function(categoryIndex) {
                    return allCategoryValues[categoryIndex]
                })
            }

            var diagramSummary = $('<div>').addClass('diagram-legend-summary').appendTo(legend)
            if (fixedCategories.length > 0)
                diagramSummary.append($('<div>').addClass('diagram-legend-summary-item').text('Fixed categories: ' + fixedCategories.join(', ')))
            if (varyingCategoryNames.length > 0)
                diagramSummary.append($('<div>').addClass('diagram-legend-summary-item').text('Varying categories: ' + varyingCategoryNames.join(', ')))
            categoryInfo.forEach(function(item, index) {
                if (problems.failedCurves[item.name])
                    return
                var color = d3.hsl(colorScale(index), 0.5, 0.5).toString()
                legend.append(
                    $('<div>')
                        .addClass('diagram-legend-item')
                        .append($('<span>')
                            .css('background-color', color)
                            .addClass('diagram-legend-item-mark')
                            .html('&nbsp;')
                        )
                        .append($('<span>')
                            .addClass('diagram-legend-item-text')
                            .text(varyingCategoryValues(item.categories).join(', '))
                        )
                        .attr('id', 'diagram-legend-item-' + index)
                        .hover(
                            function() {
                                var hoverCurveSelector = '#diagram-curve-' + index
                                $(hoverCurveSelector).addClass('line-hover')
                                $('.line:not(' + hoverCurveSelector + ')').addClass('line-dimmed')
                            },
                            function() {
                                $('.line').removeClass('line-hover line-dimmed')
                            }
                        )
                    )
            })
        })()

        // Now generate the diagram
        var xColumnName = curve.x.value
        var yColumnName = curve.y.value
        var allCurveData = m.cache[curdir].curveData

        function filteredData(data) {
            if (filters.length === 0)
                return data
            return _.filter(data, function(item) {
                return filters.every(function(filter) {
                    var d = item[filter.name]
                    return filter.values.some(x => x(d))
                })
            })
        }
        var filteredCurveData
        if (filters.length === 0)
            filteredCurveData = allCurveData
        else {
            filteredCurveData = {}
            categoryInfo.forEach(function(item) {
                var d = filteredData(allCurveData[item.name].data)
                var extent = {}
                filteredCurveData[item.name] = {
                    data: d,
                    extent: extent
                }
                extent[xColumnName] = multiplot.dataColumnExtent(d, xColumnName)
                extent[yColumnName] = multiplot.dataColumnExtent(d, yColumnName)
            })
        }

        function columnExtent(columnName, scaleType) {
            var x = []
            var hasZeros = false
            categoryInfo.forEach(function(item) {
                if (problems.failedCurves[item.name])
                    return
                if (scaleType === 'log') {
                    var extent = filteredCurveData[item.name].extent[columnName]
                    x = x.concat(extent.absNonzero)
                    hasZeros = hasZeros || extent.hasZeros
                }
                else
                    x = x.concat(filteredCurveData[item.name].extent[columnName].total)
            })
            var result = d3.extent(x)
            if (hasZeros) {
                if (result[0] === undefined)
                    result = [1, 10]
                else
                    result[0] /= 1000
            }

            return result
        }
        var extentX = columnExtent(xColumnName, curve.x.scale)
        var extentY = columnExtent(yColumnName, curve.y.scale)

        var coordFunc = {
            linear: function (columnName, extent, d) { return d[columnName] },
            log: function (columnName, extent, d) { return Math.max(Math.abs(d[columnName]), extent[0]) }
        }
        var xCoord = coordFunc[curve.x.scale].bind(this, xColumnName, extentX)
        var yCoord = coordFunc[curve.y.scale].bind(this, yColumnName, extentY)

        var margin = {top: 20, right: 20, bottom: 30, left: 50}

        var width = $(svg.node()).width() - margin.left - margin.right
        var height = $(svg.node()).height() - margin.top - margin.bottom

        var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")

        function makeScale(scaleType) {
            return d3[{'linear': 'scaleLinear', 'log': 'scaleLog'}[scaleType] || 'scaleLinear']()
        }

        var x = makeScale(curve.x.scale)
            .rangeRound([0, width])
            .domain(extentX)

        var y = makeScale(curve.y.scale)
            .rangeRound([height, 0])
            .domain(extentY)

        var line = d3.line()
            .x(function(d) { return x(xCoord(d)) })
            .y(function(d) { return y(yCoord(d)) })

        // X axis
        g.append("g")
            .attr("class", "axis axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(x))
          .append("text")
            .attr("transform", "translate(" + width + ", 0)")
            .attr("fill", "#000")
            .attr("y", -12)
            .attr("dy", "0.71em")
            .style("text-anchor", "end")
            .text(xColumnName)

        // Y axis
        g.append("g")
            .attr("class", "axis axis--y")
            .call(d3.axisLeft(y))
          .append("text")
            .attr("fill", "#000")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", "0.71em")
            .style("text-anchor", "end")
            .text(yColumnName)

        // grid lines X = const
        g.append("g")
            .classed("grid", true)
            .attr("transform", "translate(0, " + height + ")")
            .call(d3.axisTop(x).tickSize(height).tickFormat(""))

        // grid lines Y = const
        g.append("g")
            .classed("grid", true)
            .attr("transform", "translate(" + width + ", 0)")
            .call(d3.axisRight(y).tickSize(-width).tickFormat(""))

        categoryInfo.forEach(function(item, index) {
            if (problems.failedCurves[item.name])
                return
            var color = d3.hsl(colorScale(index), 0.5, 0.5).toString()
            var path = g.append("path")
                .datum(filteredCurveData[item.name].data)
                .attr("class", "line")
                .attr('stroke', color)
                .attr("d", line)
                .attr('id', 'diagram-curve-' + index)
            $(path.node())
                .hover(
                    function() {
                        $('.line:not(#diagram-curve-' + index + ')').addClass('line-dimmed')
                        $('#diagram-legend-item-' + index).addClass('diagram-legend-item-hover')
                    },
                    function() {
                        $('.line').removeClass('line-dimmed')
                        $('.diagram-legend-item').removeClass('diagram-legend-item-hover')
                    }
                )
        })
    })
}
