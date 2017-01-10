$(document).ready(function() {
    var recentDirs = []
    var curdir = ''

    function subdirLinkElement(path, title) {
        var result = $('<a>')
            .attr('href', '/view-dir?' + $.param({ curdir: path }))
            .text(title)
            .addClass('subdir')
        if (title === '/')
            result.addClass('subdirs-root')
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
                container.html('')

                var margin = {top: 20, right: 20, bottom: 30, left: 50}
                var svg = d3.select($('<svg xmlns:svg="http://www.w3.org/2000/svg">').appendTo(container)[0])
                var width = 600
                var height = 400
//                svg
//                    .attr('left', 0)
//                    .attr('top', 0)
//                    .attr('width', width)
//                    .attr('height', height)

                var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                var x = d3.scaleLog()
                    .rangeRound([0, width])
                    .domain(extentX)

                var y = d3.scaleLog()
                    .rangeRound([height, 0])
                    .domain(extentY)

                var line = d3.line()
                    .x(function(d) {
                        return x(d.step)
                    })    // TODO
                    .y(function(d) {
                        return y(d.error)
                    })   // TODO

                g.append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + height + ")")
                    .call(d3.axisBottom(x));

                g.append("g")
                    .attr("class", "axis axis--y")
                    .call(d3.axisLeft(y))
                  .append("text")
                    .attr("fill", "#000")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 6)
                    .attr("dy", "0.71em")
                    .style("text-anchor", "end")
                    .text("error");

                g.append("path")
                    .datum(data[0].data)
                    .attr("class", "line")
                    .attr("d", line);
            }
        )
    }

    function plotRequest() {
        var query = {
            curdir: curdir,
            categories: []
        }
        $('.category').each(function() {
            var values = []
            $(this).find('.category-value:checked').parent().children('.category-value-text').each(function() {
                values.push($(this).text())
            })
            query.categories.push(values)
        })
        popups.infoMessage('Requesting diagram data...')
        $.post('/multiplot-selection-info', { query: JSON.stringify(query) })
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
                catElement.append(labeledCheckbox(data.categoryNames[icat], 'category-title'))
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
            break
        case 'empty':
            container.text('No files are available')
            break
        default:
            container.text('Unrecognized server response')
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
