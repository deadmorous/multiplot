var path = require('path')

var dataRootDir = process.env.MULTIPLOT_DATA_ROOT

if (!dataRootDir) {
    console.log('Note: please specify the MULTIPLOT_DATA_ROOT environment variable in order to visualize your specific data')
    dataRootDir = path.normalize(path.join(__dirname, '..', 'example_data'))
}

module.exports = dataRootDir
