; (function () {
    var m = multiplot()

    var hasDiagram = false  // Not very accurate because of #chdir

    function onDirChanged(curdir) {
        hasDiagram = false
        m.dirInfo(curdir, function (err, data) {
            if (err)
                popups.errorMessage(err)
            categorySelector.render(data)
            categorySelector.makeInitialSelection()
            curveSelector.render(curdir, data)
            filters.render(curdir, data)
            if (categorySelector.hasCategories())
                $('#main-view')
                    .append($('<span>')
                        .append($('<input>')
                            .attr('type', 'button')
                            .val('Show diagram')
                            .click(diagramRequest)
                        )
                    )
        })
    }

    folderNavigator(onDirChanged)

    function diagramRequest() {
        // popups.infoMessage('Requesting diagram data...', 300)
        hasDiagram = true
        renderDiagram(m, folderNavigator.curdir(), categorySelector.current(), curveSelector.current(), filters.current())
    }

    categorySelector(util.makeLazyRequest(diagramRequest, 1500))
    curveSelector(diagramRequest)
    filters(diagramRequest)

    folderNavigator.cd('')

    $(window)
        .resize(util.makeLazyRequest(function () {
            if (hasDiagram)
                diagramRequest()
        }, 300))
        .keypress(function (e) {
            if (e.charCode === '~'.charCodeAt(0))
                $('#saveSvg').click()
        })

    $('#saveSvg').click(function () {
        var svgElement = $('svg.diagram')[0]
        if (!svgElement)
            return popups.errorMessage('The diagram is not found')
        var svgData = svgElement.outerHTML
        var blob = new Blob([svgData], { type: "image/svg+xml" });
        saveAs(blob, "diagram.svg");
    })
    $('#saveLegend').click(function() {
        function text2name(text) {
            return text.replace(/\s+/, '-').replace(/\//, '-') + '.svg'
        }
        let nItemsFound = 0
        $('.diagram-legend-item').each(function() {
            let w = $(this)
            let svg = w.find('svg')
            if (svg.length == 0)
                return
            let text = w.find('.diagram-legend-item-text').text()
            let svgData = svg[0].outerHTML
            let blob = new Blob([svgData], { type: "image/svg+xml" });
            saveAs(blob, text2name(text));
            ++nItemsFound;
        })
        if (nItemsFound === 0)
            return popups.errorMessage('No svg legend items were found')
    })
})()
