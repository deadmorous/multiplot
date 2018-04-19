var renderDiagram = (function () {

    var markerShapes = [
        [-1, -1, 1, -1, 0, 1],          // triaUp
        [1, 1, -1, 1, 0, -1],         // triaDn
        [-0.707, -0.707, 0.707, -0.707, 0.707, 0.707, -0.707, 0.707], // square
        [0, -1, 1, 0, 0, 1, -1, 0],   // diamond
        [1.000, 0.000, 0.924, 0.383, 0.707, 0.707, 0.383, 0.924,
            0.000, 1.000, -0.383, 0.924, -0.707, 0.707, -0.924, 0.383,
            -1.000, 0.000, -0.924, -0.383, -0.707, -0.707, -0.383, -0.924,
            0.000, -1.000, 0.383, -0.924, 0.707, -0.707, 0.924, -0.383], // circ
        [0.000, 1.000, -0.217, 0.125, -0.866, -0.500,
            0.000, -0.250, 0.866, -0.500, 0.217, 0.125], // star3u
        [0.000, -1.000, 0.217, -0.125, 0.866, 0.500,
            0.000, 0.250, -0.866, 0.500, -0.217, -0.125], // star3d
        [0.000, 1.000, -0.283, 0.283, -1.000, 0.000, -0.283, -0.283,
            0.000, -1.000, 0.283, -0.283, 1.000, 0.000, 0.283, 0.283], // star4
        [0.707, 0.707, 0.000, 0.400, -0.707, 0.707, -0.400, 0.000,
            -0.707, -0.707, 0.000, -0.400, 0.707, -0.707, 0.400, 0.000], // star4x
        [0.000, 1.000, -0.294, 0.405, -0.951, 0.309, -0.476, -0.155, -0.588, -0.809,
            0.000, -0.500, 0.588, -0.809, 0.476, -0.155, 0.951, 0.309, 0.294, 0.405], // star5
        [0.200, 0.200, 0.200, 0.980, -0.200, 0.980, -0.200, 0.200,
            -0.980, 0.200, -0.980, -0.200, -0.200, -0.200, -0.200, -0.980,
            0.200, -0.980, 0.200, -0.200, 0.980, -0.200, 0.980, 0.200], // plus
        [0.000, 0.283, -0.551, 0.834, -0.834, 0.551, -0.283, 0.000,
            -0.834, -0.551, -0.551, -0.834, 0.000, -0.283, 0.551, -0.834,
            0.834, -0.551, 0.283, 0.000, 0.834, 0.551, 0.551, 0.834], // cross
        [1.000, 0.000, 0.924, 0.383, 0.707, 0.707, 0.383, 0.924, 0.000, 1.000,
            -0.383, 0.924, -0.707, 0.707, -0.924, 0.383, -1.000, 0.000], // circ50u
        [0.000, 1.000, -0.383, 0.924, -0.707, 0.707, -0.924, 0.383, -1.000, 0.000,
            -0.924, -0.383, -0.707, -0.707, -0.383, -0.924, 0.000, -1.000], // circ50l
        [-1.000, 0.000, -0.924, -0.383, -0.707, -0.707, -0.383, -0.924, 0.000, -1.000,
            0.383, -0.924, 0.707, -0.707, 0.924, -0.383, 1.000, 0.000], // circ50d
        [0.000, -1.000, 0.383, -0.924, 0.707, -0.707, 0.924, -0.383, 1.000, 0.000,
            0.924, 0.383, 0.707, 0.707, 0.383, 0.924, 0.000, 1.000] // circ50r
    ]

    function markerShape(index) {
        return markerShapes[index % markerShapes.length].join(',')
    }

    function itemSpecificStyle(name, pre) {
        function match(matches) {
            switch (typeof matches) {
                case 'string':
                    return name.match(new RegExp(matches)) ? true : false
                case 'object':
                    if (matches.and) {
                        if (!(matches.and instanceof Array))
                            throw new Error('and requires an array as property value')
                        return _.every(matches.and, match)
                    }
                    else if (matches.or) {
                        if (!(matches.or instanceof Array))
                            throw new Error('or requires an array as property value')
                        return _.some(matches.or, match)
                    }
                    else if (matches.not)
                        return !match(matches.not)
                    else
                        throw new Error('Unrecognized operation')
                default:
                    throw new Error('Unrecognized match type')
            }
        }
        var result = {}
        if (pre.specialStyles)
            pre.specialStyles.forEach(function (item, index) {
                if (match(item.matches))
                    $.extend(result, item.style)
            })
        return result;
    }

    function MarkerIndexMan() {
        this.names = {}
        this.current = 0
    }

    MarkerIndexMan.prototype.index = function (name, pre, itemStyle) {
        if (itemStyle.hasOwnProperty('marker'))
            return itemStyle.marker
        if (pre.nameForMarker) {
            if (typeof pre.nameForMarker !== 'object')
                throw new Error('Invalid nameForMarker option')
            if (!pre.nameForMarker.replace)
                throw new Error('Invalid nameForMarker option')
            var replaceArgs = pre.nameForMarker.replace
            if (!(replaceArgs instanceof Array && replaceArgs.length === 2))
                throw new Error('Invalid nameForMarker.replace argument')
            name = name.replace(new RegExp(replaceArgs[0]), replaceArgs[1])
        }
        var index = this.names[name]
        if (typeof index !== 'number')
            index = this.names[name] = this.current++
        return index
    }

    var svgTag = '<svg xmlns:svg="http://www.w3.org/2000/svg">'

    function appendMarkerSvgShape(parentSvg, index, pre, color) {
        parentSvg.append('g').attr('transform', 'scale(' + pre.global.markerSize / 2 + ',' + pre.global.markerSize / 2 + ')')
            .append('g').attr('transform', 'translate(1,1)')
            .append('polygon')
            .attr('points', markerShape(index))
            .attr('fill', color)
        parentSvg.append('g').attr('transform', 'scale(' + pre.global.markerSize / 4 + ',' + pre.global.markerSize / 4 + ')')
            .append('g').attr('transform', 'translate(2,2)')
            .append('polygon')
            .attr('points', markerShape(index))
            .attr('fill', '#fff')
    }

    return function renderDiagram(m, curdir, categorySelection, curve, filters) {
        var container = $('#main-view')
        var mxman = new MarkerIndexMan
        m.diagramData({ dir: curdir, categories: categorySelection, curve: curve }, function (err, categoryInfo, problems) {
            if (err)
                return popups.errorMessage(err)
            var pre = m.dirInfo(curdir).presentation
            if (!pre.global)
                pre.global = {}
            _.defaults(pre.global, {
                width: 1.5, useColors: true, useMarkers: true, markerSize: 5, dasharray: [],
                showLabels: true, outerTicks: true, xticks: 5, yticks: 5
            })
            if (!pre.specialStyles)
                pre.specialStyles = []
            if (!_.isEmpty(problems.messages)) {
                popups.warningMessage(
                    '<h1>Failed to compute some curves</h1>' +
                    '<p>' + _.keys(problems.failedCurves).join(', ') + '</p>' +
                    '<h2>Messages</h2>' +
                    '<p>' + _.map(problems.messages, (v, name) => name + ' (' + v + ')').join('<br/>') + '</p>',
                    { format: 'html' })
            }
            var failedCurves = []
            if (!(categoryInfo.length > 0))
                return container
                    .html('')
                    .append($('<h1>').text('No curves are selected'))

            var dirInfo = m.cache[curdir].dirInfo

            // Stuff container with sub-containers for diagram and legend
            container.html('')
            var svg = d3.select($(svgTag).addClass('diagram').appendTo(container)[0])
            var legend = $('<div>').addClass('diagram-legend').appendTo(container)

            var colorScale = d3.scaleLinear()
                .domain([0, categoryInfo.length])
                .range([0, 360])
            var curveColor = pre.global.useColors ? function (index) {
                return d3.hsl(colorScale(index), 0.5, 0.5).toString()
            } : function (index) {
                return '#000'
            }

            var cnames = dirInfo.categoryNames
            var ncats = cnames.length
            var fixedCategories = []
            var varyingCategoryIndices = []
            var varyingCategoryNames = []
            for (var i = 0; i < ncats; ++i) {
                var categories = _(categoryInfo).countBy((item) => item.categories[i]).keys().value()
                if (categories.length > 1) {
                    varyingCategoryIndices.push(i)
                    varyingCategoryNames.push(cnames[i])
                }
                else
                    fixedCategories.push(cnames[i] + ' = ' + categories[0])
            }

            function varyingCategoryValues(allCategoryValues) {
                return varyingCategoryIndices.map(function (categoryIndex) {
                    return allCategoryValues[categoryIndex]
                })
            }

            function legendItemText(item) {
                return varyingCategoryValues(item.categories).join(', ')
            }

            // Sort categories by legend text
            var sortedCategoryInfo = (function () {
                var result = categoryInfo.slice()
                if (_.every(categoryInfo, function (item) { return !isNaN(legendItemText(item)) }))
                    result.sort(function (a, b) { return legendItemText(a) - legendItemText(b) })
                else
                    result.sort(function (a, b) {
                        a = legendItemText(a)
                        b = legendItemText(b)
                        return a < b ? -1 : a > b ? 1 : 0
                    })
                return result
            })()

                // Generate legend first - then we will be able to find the height of the diagram
                ; (function () {
                    var diagramSummary = $('<div>').addClass('diagram-legend-summary').appendTo(legend)
                    if (fixedCategories.length > 0)
                        diagramSummary.append($('<div>').addClass('diagram-legend-summary-item').text('Fixed categories: ' + fixedCategories.join(', ')))
                    if (varyingCategoryNames.length > 0)
                        diagramSummary.append($('<div>').addClass('diagram-legend-summary-item').text('Varying categories: ' + varyingCategoryNames.join(', ')))
                    sortedCategoryInfo.forEach(function (item, index) {
                        if (problems.failedCurves[item.name])
                            return
                        var itemStyle = itemSpecificStyle(item.name, pre)
                        var color = curveColor(index)
                        if (itemStyle.color)
                            color = itemStyle.color
                        var legendItem = $('<div>')
                            .addClass('diagram-legend-item')
                            .attr('id', 'diagram-legend-item-' + index)
                            .hover(
                                function () {
                                    var hoverCurveSelector = '#diagram-curve-' + index
                                    $(hoverCurveSelector).addClass('line-hover')
                                    $('.line:not(' + hoverCurveSelector + ')').addClass('line-dimmed')
                                },
                                function () {
                                    $('.line').removeClass('line-hover line-dimmed')
                                }
                            )
                            .appendTo(legend)
                        var useMarkersForLegendItem = pre.global.useMarkers
                        if (itemStyle.hasOwnProperty('useMarkers'))
                            useMarkersForLegendItem = itemStyle.useMarkers
                        var legendItemMarker = $('<span>')
                            .addClass('diagram-legend-item-mark')
                            .html('&nbsp;').appendTo(legendItem)
                        $('<span>')
                            .addClass('diagram-legend-item-text')
                            .text(legendItemText(item))
                            .appendTo(legendItem)
                        if (useMarkersForLegendItem) {
                            var legendItemSvg = d3.select($(svgTag).appendTo(legendItemMarker)[0])
                            appendMarkerSvgShape(legendItemSvg, mxman.index(item.name, pre, itemStyle), pre, color)
                        }
                        else
                            legendItemMarker.css('background-color', color)
                    })
                })()

            // Now generate the diagram
            var xColumnName = curve.x.value
            var yColumnName = curve.y.value
            var allCurveData = m.cache[curdir].curveData

            function filteredData(data) {
                if (filters.length === 0)
                    return data
                return _.filter(data, function (item) {
                    return filters.every(function (filter) {
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
                sortedCategoryInfo.forEach(function (item) {
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
                sortedCategoryInfo.forEach(function (item) {
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
            function curveAxisExtent(curveAxis, columnName) {
                var extent = curveAxis.range || columnExtent(columnName, curveAxis.scale)
                if (curveAxis.hasOwnProperty('rangeMin'))
                    extent[0] = curveAxis.rangeMin
                if (curveAxis.hasOwnProperty('rangeMax'))
                    extent[1] = curveAxis.rangeMax
                return extent
            }
            var extentX = curveAxisExtent(curve.x, xColumnName)
            var extentY = curveAxisExtent(curve.y, yColumnName)

            var coordFunc = {
                linear: function (columnName, extent, d) { return d[columnName] },
                log: function (columnName, extent, d) { return Math.max(Math.abs(d[columnName]), extent[0]) }
            }
            var xCoord = coordFunc[curve.x.scale].bind(this, xColumnName, extentX)
            var yCoord = coordFunc[curve.y.scale].bind(this, yColumnName, extentY)

            var margin = { top: 20, right: 20, bottom: 30, left: 50 }

            function overrideSize(normalSize, overrideOption) {
                switch (typeof overrideOption) {
                    case 'undefined':
                        return normalSize
                    case 'number':
                        return overrideOption
                    case 'string':
                        return (function(){
                            var m = overrideOption.match(/^((\d+)|(\d+\.)|(\d*\.\d+))(%)?$/)
                            if (!m)
                                throw new Error('Invalid size option format')
                            var x = +m[1],   percent = m[5] === '%'
                            return percent? x*normalSize/100: x
                        })()
                    default:
                        throw new error('Unrecognized type of size option')
                }
            }
            var width = overrideSize($(svg.node()).width(), pre.global.canvasWidth) - margin.left - margin.right
            var height = overrideSize($(svg.node()).height(), pre.global.canvasHeight) - margin.top - margin.bottom

            var svgDefs = svg.append('defs')

            var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")

            function makeScale(scaleType) {
                return d3[{ 'linear': 'scaleLinear', 'log': 'scaleLog' }[scaleType] || 'scaleLinear']()
            }

            var x = makeScale(curve.x.scale)
                .rangeRound([0, width])
                .domain(extentX)
            if (pre.global.outerTicks)
                x.nice()

            var y = makeScale(curve.y.scale)
                .rangeRound([height, 0])
                .domain(extentY)
            if (pre.global.outerTicks)
                y.nice()

            var line = d3.line()
                .x(function (d) { return x(xCoord(d)) })
                .y(function (d) { return y(yCoord(d)) })

            // X axis
            var g2 = g.append("g")
            g2
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x).ticks(pre.global.xticks))
            if (pre.global.showLabels)
                g2.append("text")
                    .attr("transform", "translate(" + width + ", 0)")
                    .attr("fill", "#000")
                    .attr("y", -12)
                    .attr("dy", "0.71em")
                    .style("text-anchor", "end")
                    .text(xColumnName)

            // Y axis
            g2 = g.append("g")
            g2
                .attr("class", "axis axis--y")
                .call(d3.axisLeft(y).ticks(pre.global.yticks))
            if (pre.global.showLabels)
                g2.append("text")
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

            // Style grid lines and ticks
            g.selectAll('line,path').style('stroke', '#aaa').style('stroke-width', 0.5)

            // Add curves
            sortedCategoryInfo.forEach(function (item, index) {
                if (problems.failedCurves[item.name])
                    return
                var color = curveColor(index)
                var data = filteredCurveData[item.name].data
                var itemStyle = itemSpecificStyle(item.name, pre)
                if (itemStyle.color)
                    color = itemStyle.color
                var dasharray = pre.global.dasharray
                if (itemStyle.hasOwnProperty('dasharray'))
                    dasharray = itemStyle.dasharray
                var path = g.append("path")
                    .datum(data)
                    .attr("class", "line")
                    .attr('stroke', color)
                    .attr('stroke-width', itemStyle.width || pre.global.width)
                    .attr('fill', 'none')
                    .attr("d", line)
                    .attr('id', 'diagram-curve-' + index)
                if (dasharray instanceof Array && dasharray.length > 0)
                    path.attr('stroke-dasharray', dasharray.join(','))

                $(path.node())
                    .hover(
                        function () {
                            $('.line:not(#diagram-curve-' + index + ')').addClass('line-dimmed')
                            $('#diagram-legend-item-' + index).addClass('diagram-legend-item-hover')
                        },
                        function () {
                            $('.line').removeClass('line-dimmed')
                            $('.diagram-legend-item').removeClass('diagram-legend-item-hover')
                        }
                    )
            })

            if (pre.global.useMarkers)
                // Add markers on curves
                sortedCategoryInfo.forEach(function (item, index) {
                    if (problems.failedCurves[item.name])
                        return
                    var itemStyle = itemSpecificStyle(item.name, pre)
                    if (itemStyle.useMarkers === false)
                        return
                    var color = curveColor(index)
                    if (itemStyle.color)
                        color = itemStyle.color
                    var data = filteredCurveData[item.name].data

                    // Create curve marker
                    var markerId = 'marker-' + index
                    var markerUrl = 'url(#' + markerId + ')'
                    var marker = svgDefs.append('marker')
                        .attr('id', markerId)
                        .attr('markerWidth', pre.global.markerSize)
                        .attr('markerHeight', pre.global.markerSize)
                        .attr('refX', pre.global.markerSize / 2)
                        .attr('refY', pre.global.markerSize / 2)
                    appendMarkerSvgShape(marker, mxman.index(item.name, pre, itemStyle), pre, color)

                    // Add markers to the path (TODO better)
                    var markerCount = 10
                    var stride = Math.ceil(data.length / markerCount)
                    var offset = Math.floor((index + 0.5) * stride / sortedCategoryInfo.length)
                    var markerData = []
                    for (var markerIndex = offset; markerIndex < data.length; markerIndex += stride)
                        markerData.push(data[markerIndex])
                    var markerPath = g.append("path")
                        .datum(markerData)
                        .attr("class", "line")
                        .attr('stroke', 'none')
                        .attr('fill', 'none')
                        .attr("d", line)
                        .attr('marker-start', markerUrl)
                        .attr('marker-end', markerUrl)
                        .attr('marker-mid', markerUrl)
                })
        })
    }
})()
