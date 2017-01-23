var curveSelector = (function() {

    var global = {
        cb: function() {},
        current: {}    // Current curve
    }

    var changeCurve

    function renderCurveSelector(curdir, data) {
        var container = $('#curve-selector-items')
        container.html('')
        var hasCurves = data.status === 'normal' && data.processing && data.processing.curves && data.processing.curves.length > 0
        if (hasCurves) {
            changeCurve = function(index) {
                global.current = data.processing.curves[index]
                $('#curve-title').text(global.current.title)
                global.cb(global.current)
            }
            global.current = data.processing.curves[0]
            var curveList = $('<ul>').addClass('top-panel-popup-content').appendTo(container)
            data.processing.curves.forEach(function(curve, index) {
                $('<li>').append(
                    $('<a>').attr('href', '')
                        .text(curve.title)
                        .click(function(e) {
                            e.preventDefault()
                            changeCurve(index)
                        })
                ).appendTo (curveList)
            })
            $('<li>').html(
                        '<div>' +
                            '<div><a href="" id="custom-curve-link">Custom</a></div>' +
                            '<div class="custom-curve-input">' +
                                '<span id="custom-curve-x"><span>X</span><select></select><label><input type="checkbox"></input>log</label></span>' +
                                '<span id="custom-curve-y"><span>Y</span><select></select><label><input type="checkbox"></input>log</label></span>' +
                            '</div>' +
                        '</div>')
                .appendTo (curveList)
            var computedValues = data.processing.computedValues
            function CustomCurveCol(selector) {
                var w = $(selector)
                this.value = w.find('select')
                this.logScale = w.find('input')
            }
            CustomCurveCol.prototype.curveColumn = function() {
                return {
                    value: this.value.val(),
                    scale: this.logScale.prop('checked')? 'log': 'linear'
                }
            }
            CustomCurveCol.prototype.inputs = function() {
                return this.value.add(this.logScale)
            }
            var customX = new CustomCurveCol('#custom-curve-x')
            var customY = new CustomCurveCol('#custom-curve-y')
            if (computedValues) {
                for (var name in computedValues) {
                    customX.value.append($('<option>').val(name).text(name))
                    customY.value.append($('<option>').val(name).text(name))
                }
            }
            $.get('/multiplot-primary-values', {curdir: curdir})
                .done(function(v) {
                    v = JSON.parse(v)
                    _(v).reverse().each(function(name) {
                        customX.value.prepend($('<option>').val(name).text(name))
                        customY.value.prepend($('<option>').val(name).text(name))
                    })
                })
            function selectCustomCurve() {
                global.current = {
                    title: 'Custom (x=' + customX.value.val() + ', y=' + customY.value.val() + ')',
                    x: customX.curveColumn(),
                    y: customY.curveColumn()
                }
                $('#curve-title').text(global.current.title)
                global.cb(global.current)
            }
            customX.inputs().add(customY.inputs()).change(selectCustomCurve)
            $('#custom-curve-link').click(function(e) {
                e.preventDefault()
                selectCustomCurve()
            })
            $('#curve-title').text(global.current.title)
            $('#curve-selector').show()
        }
        else {
            $('#curve-selector').hide()
            changeCurve = function() {}
        }
    }

    $(document).ready(function() {
        var curveSelectorItems = $('#curve-selector-items')
        $('#curve-selector')
            .mouseenter(function() {
                curveSelectorItems.stop().fadeIn('fast').offset($(this).offset())
            } )
            .mouseleave(function() {
                curveSelectorItems.fadeOut(1200) }
            )
    })

    function result(cb) {
        global.cb = cb
        global.current = {}
    }
    result.render = renderCurveSelector
    result.current = function() { return global.current }
    result.change = changeCurve

    return result
})()
