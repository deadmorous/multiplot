(function() {
    return {
        inputFilter: '^curve(_[^_]+){2}\\.txt$',
        categoryFilter: '^curve_([^_]+)_([^_]+)\\.txt$',
        categoryNames: [
            'frequency',
            'position'
        ],
        processing: {
            curves: [{
                title: 'f(t)',
                x: {
                    value: 't',
                    scale: 'linear'
                },
                y: {
                    value: 'f',
                    scale: 'linear'
                }
            }]
        },
        presentation: {
            global: {
                useColors: true,
                useMarkers: true,
                markerSize: 5,
                dasharray: []
            }
        }
    }
})()
