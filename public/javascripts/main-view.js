$(document).ready(function() {
    var recentDirs = []
    var curdir = ''
    var dirinfo
    var curdirHasCategories = false
    var currentCurveIndex = 0
    var currentDiagramData

    function subdirLinkElement(path, title) {
        var result = $('<a>')
            .attr('href', '/view-dir?' + $.param({ curdir: path }))
            .text(title)
            .addClass('subdir')
        if (title === '/')
            result.addClass('subdirs-root')
        return result
    }

    function selectedCategories() {
        var result = []
        $('.category').each(function() {
            var values = []
            $(this).find('.category-value:checked').parent().children('.category-value-text').each(function() {
                values.push($(this).text())
            })
            result.push(values)
        })
        return result
    }

    function categoryNames() {
        var result = []
        $('.category-title-text').each(function() {
            result.push($(this).text())
        })
        return result
    }

    function renderCurrentPath() {
        var container = $('#curdir')
        container.html('')
        var items = curdir? curdir.split('/'): []
        for (var i=0; i<=items.length; ++i) {
            var path = items.slice(0, i).join('/')
            var title
            if (i > 0) {
                if (i > 1)
                    $('<span>').text('/').addClass('subdirs-sep').appendTo(container)
                title = items[i-1]
            }
            else
                title = '/'
            if (i > 0   &&   i === items.length)
                $('<span>').text(title).appendTo(container)
            else
                $('<span>').append(subdirLinkElement(path, title)).appendTo(container)
        }
    }

    function renderSubdirs(subdirs) {
        var container = $('#main-view')
        container.html('')
        for (var i=0; i<subdirs.length; ++i) {
            var subdir = subdirs[i]
            var path = (curdir? curdir+'/': '') + subdir
            $('<div>').append(subdirLinkElement(path, subdir)).appendTo(container)
        }
    }

    function toobj(data) {
        return typeof data === 'string' ?   JSON.parse(data) :   data
    }

    function computeValueColumnForCurve(item, valueName, knownColumns) {
        if (item.length === 0)
            return  // Empty dataset

        var d = item.data
        var n = d.length
        if (knownColumns === undefined) {
            // Determine which columns are already known
            knownColumns = {}
            for (var columnName in d[0])
                knownColumns[columnName] = 1
        }

        if (valueName in knownColumns)
            return  // Value is known

        var recipe = dirinfo.processing.computedValues[valueName]
        if (!recipe)
            throw new Error('No recipe for computing value ' + valueName)
        var dependencies = recipe.dependencies || []
        dependencies.forEach(function(dependencyName) {
            if (!(dependencyName in knownColumns))
                computeValueColumnForCurve(item, dependencyName, knownColumns)
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
        item.extent[valueName] = d3.extent(item.data, function(d) {return d[valueName]})
        knownColumns[valueName] = 1
    }

    function processDiagramData() {
        var curveInfo = dirinfo.processing.curves[currentCurveIndex]
        currentDiagramData.forEach(function(item, index) {
            computeValueColumnForCurve(item, curveInfo.x.value)
            computeValueColumnForCurve(item, curveInfo.y.value)
        })
    }

    function renderDiagram(data) {
        currentDiagramData = data = toobj(data)
        var container = $('#main-view')
        if (!(data.length > 0))
            return container
                .html('')
                .append($('<h1>').text('No curves are selected') )
        async.eachLimit(
            data,
            10,
            function(item, cb) {
                $.get('/multiplot-file', { curdir: curdir, name: item.name })
                    .done(function(data) {
                        item.data = d3.tsvParse(data, function(d) {
                            for(var col in d)
                                d[col] = +d[col]
                            return d
                        })
                        item.extent = {}
                        item.data.columns.forEach(function(column) {
                            item.extent[column] = d3.extent(item.data, function(d) {return d[column]})
                        })
                        cb()
                    })
                    .fail(function(xhr) {
                        cb(new Error(xhr.statusText || xhr.status))
                    })
            },
            function(err) {
                if (err)
                    return popups.errorMessage(xhr)

                // Stuff container with sub-container for diagram and legend
                container.html('')
                var svg = d3.select($('<svg xmlns:svg="http://www.w3.org/2000/svg">').addClass('diagram').appendTo(container)[0])
                var legend = $('<div>').addClass('diagram-legend').appendTo(container)

                var colorScale = d3.scaleLinear()
                    .domain([0, data.length])
                    .range([0, 360])

                // Generate legend first - then we will be able to find the height of the diagram
                ;(function() {
                    var cnames = categoryNames()
                    var fixedCategories = []
                    var varyingCategoryIndices = []
                    var varyingCategoryNames = []
                    selectedCategories().forEach(function(categories, index) {
                        if (categories.length === 1)
                            fixedCategories.push(cnames[index] + ' = ' + categories[0])
                        else {
                            varyingCategoryIndices.push(index)
                            varyingCategoryNames.push(cnames[index])
                        }
                    })
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
                    data.forEach(function(item, index) {
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

                var curveInfo = dirinfo.processing.curves[currentCurveIndex]

                // Process data
                processDiagramData()

                // Now generate the diagram
                var xColumnName = curveInfo.x.value
                var yColumnName = curveInfo.y.value
                function columnExtent(columnName) {
                    var x = []
                    data.forEach(function(item) {
                        x = x.concat(item.extent[columnName])
                    })
                    return d3.extent(x)
                }
                var extentX = columnExtent(xColumnName)
                var extentY = columnExtent(yColumnName)

                var margin = {top: 20, right: 20, bottom: 30, left: 50}

                var width = $(svg.node()).width() - margin.left - margin.right
                var height = $(svg.node()).height() - margin.top - margin.bottom

                var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")

                function makeScale(scaleType) {
                    return d3[{'linear': 'scaleLinear', 'log': 'scaleLog'}[scaleType] || 'scaleLinear']()
                }

                var x = makeScale(curveInfo.x.scale)
                    .rangeRound([0, width])
                    .domain(extentX)

                var y = makeScale(curveInfo.y.scale)
                    .rangeRound([height, 0])
                    .domain(extentY)

                var line = d3.line()
                    .x(function(d) { return x(d[xColumnName]) })
                    .y(function(d) { return y(d[yColumnName]) })

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

                data.forEach(function(item, index) {
                    var color = d3.hsl(colorScale(index), 0.5, 0.5).toString()
                    var path = g.append("path")
                        .datum(item.data)
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
            }
        )
    }

    function plotRequest() {
        popups.infoMessage('Requesting diagram data...', 300)
        $.post('/multiplot-selection-info', {
                   query: JSON.stringify({ curdir: curdir, categories: selectedCategories() })
        })
            .done(renderDiagram)
            .fail(popups.errorMessage)
    }

    function makeLazyRequest(request, timeout) {
        var requestCount = 0
        return function() {
            ++requestCount
            setTimeout(function() {
                if (--requestCount == 0)
                    request()
            }, timeout)
        }
    }
    var lazyPlotRequest = makeLazyRequest(plotRequest, 1500)

    function labeledCheckbox(labelText, checkBoxClass, textSpanClass) {
        var labelTextElement = $('<span>').text(labelText)
        if(textSpanClass)
            labelTextElement.addClass(textSpanClass)
        return $('<label>')
            .append($('<input>').attr('type', 'checkbox').addClass(checkBoxClass))
            .append(labelTextElement)
    }

    function renderCategories(data) {
        var container = $('#left-panel')
        currentDiagramData = undefined
        switch (data.status) {
        case 'normal':
            container.html('')
            var n = data.categoryNames.length
            for (var icat=0; icat<n; ++icat) {
                var catElement = $('<div>').addClass('category').appendTo(container)
                catElement.append(labeledCheckbox(data.categoryNames[icat], 'category-title', 'category-title-text'))
                var catValuesElement = $('<div>').addClass('category-values').appendTo(catElement)
                var catVals = data.categories[icat]
                for (var ival=0, nvals=catVals.length; ival<nvals; ++ival)
                    $('<div>').addClass('category-value-container')
                        .append(labeledCheckbox(catVals[ival], 'category-value', 'category-value-text'))
                        .appendTo(catValuesElement)
            }
            $('.category-title').change(function() {
                $(this).closest('.category').find('.category-value').prop('checked', $(this).prop('checked'))
                lazyPlotRequest()
            })
            $('.category-value').change(function() {
                var cat = $(this).closest('.category')
                var title = cat.find('.category-title')
                if (cat.find('.category-value:checked').length === 0)
                    title.prop('indeterminate', false).prop('checked', false)
                else if (cat.find('.category-value:not(:checked)').length === 0)
                    title.prop('indeterminate', false).prop('checked', true)
                else
                    title.prop('indeterminate', true)
                lazyPlotRequest()
            })
            curdirHasCategories = n > 0
            break
        case 'empty':
            container.text('No files are available')
            curdirHasCategories = false
            break
        default:
            container.text('Unrecognized server response')
            curdirHasCategories = false
            break
        }
    }

    $('#curve-selector')
        .mouseenter(function() {
            $('#curve-selector-items').show().offset($(this).offset())
        } )
        .mouseleave(function() { $('#curve-selector-items').hide() } )

    function renderCurveSelector(data) {
        var container = $('#curve-selector-items')
        container.html('')
        var hasCurves = data.status === 'normal' && data.processing && data.processing.curves && data.processing.curves.length > 0
        if (hasCurves) {
            currentCurveIndex = 0
            var curveList = $('<ul>').appendTo(container)
            data.processing.curves.forEach(function(curve, index) {
                $('<li>').append(
                    $('<a>').attr('href', '')
                        .text(curve.title)
                        .click(function(e) {
                            e.preventDefault()
                            currentCurveIndex = index
                            $('#curve-title').text(curve.title)
                            if (currentDiagramData)
                                renderDiagram(currentDiagramData)
                            else
                                plotRequest()
                        })
                ).appendTo (curveList)
            })
            $('#curve-title').text(data.processing.curves[currentCurveIndex].title)
            $('#curve-selector').show()
        }
        else
            $('#curve-selector').hide()
    }

    function onSubdirsReceived(data) {
        data = toobj(data)
        curdir = data.curdir
        renderCurrentPath()
        renderSubdirs(data.subdirs)
        $('a.subdir').click(function(e) {
            e.preventDefault()
            viewDirByUrl($(this).attr('href'))
        })
        $.get('/multiplot-dir-info', { curdir: curdir })
            .done(function(data) {
                dirinfo = data = toobj(data)
                renderCategories(data)
                renderCurveSelector(data)
                if (curdirHasCategories) {
                    // Automatically check categories to show one curve
                    $('.category-value-container:first-child .category-value').prop('checked', true)
                    $('#main-view')
                        .append($('<span>')
                            .append($('<input>')
                                .attr('type', 'button')
                                .val('Show diagram')
                                .click(lazyPlotRequest)
                            )
                        )
                }
            })
            .fail(popups.errorMessage)
    }

    onSubdirsReceived({curdir: '', subdirs: []})

    function viewDirByUrl(url) {
        $.get(url)
            .done(onSubdirsReceived)
            .fail(popups.errorMessage)
    }

    function viewDir(path) {
        viewDirByUrl('/view-dir?' + $.param({ curdir: path }))
    }

    $('#chdir').click(viewDir.bind(this, curdir))
})
