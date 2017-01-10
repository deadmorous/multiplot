$(document).ready(function() {
    var recentDirs = []
    var curdir = ''
    var curdirHasCategories = false

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

    function renderDiagram(data) {
        data = toobj(data)
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

                function columnExtent(columnNumber) {
                    var x = []
                    data.forEach(function(item) {
                        var columnName = item.data.columns[columnNumber]
                        x = x.concat(item.extent[columnName])
                    })
                    return d3.extent(x)
                }
                var extentX = columnExtent(0)
                var extentY = columnExtent(1)
                var xColumnName = data[0].data.columns[0]
                var yColumnName = data[0].data.columns[1]
                container.html('')

                var margin = {top: 20, right: 20, bottom: 30, left: 50}
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

                var width = $(svg.node()).width() - margin.left - margin.right
                var height = $(svg.node()).height() - margin.top - margin.bottom

                var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                var x = d3.scaleLog()
                // var x = d3.scaleLinear()
                    .rangeRound([0, width])
                    .domain(extentX)

                var y = d3.scaleLog()
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
        popups.infoMessage('Requesting diagram data...')
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
                renderCategories(toobj(data))
                if (curdirHasCategories) {
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
