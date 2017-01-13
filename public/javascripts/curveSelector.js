var curveSelector = (function() {

    var global = {
        cb: function() {},
        index: 0    // Current curve index
    }

    function renderCurveSelector(data) {
        var container = $('#curve-selector-items')
        container.html('')
        var hasCurves = data.status === 'normal' && data.processing && data.processing.curves && data.processing.curves.length > 0
        if (hasCurves) {
            global.index = 0
            var curveList = $('<ul>').appendTo(container)
            data.processing.curves.forEach(function(curve, index) {
                $('<li>').append(
                    $('<a>').attr('href', '')
                        .text(curve.title)
                        .click(function(e) {
                            e.preventDefault()
                            global.index = index
                            $('#curve-title').text(curve.title)
                            global.cb(index)
                        })
                ).appendTo (curveList)
            })
            $('#curve-title').text(data.processing.curves[global.index].title)
            $('#curve-selector').show()
        }
        else
            $('#curve-selector').hide()
    }

    $(document).ready(function() {
        $('#curve-selector')
            .mouseenter(function() {
                $('#curve-selector-items').show().offset($(this).offset())
            } )
            .mouseleave(function() { $('#curve-selector-items').hide() } )
    })

    function result(cb) {
        global.cb = cb
        global.index = 0
    }
    result.render = renderCurveSelector
    result.current = function() { return global.index }
    result.change = function(index) {
        index = +index
        if(global.index !== index) {
            global.index = index
            var curveTitle = $('#curve-selector-items li:nth-child(' + (index+1) + ') a').text()
            $('#curve-title').text(curveTitle)
            global.cb(index)
        }
    }

    return result
})()
