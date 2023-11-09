const yargs = require('yargs');

const argv = yargs
    .options(
        {
            'https': {
                description: 'Set https port',
                alias: 'p',
                type: 'number'
            },
            'vehicleServer': {
                description: 'Set vehicle server',
                alias: 'v',
                type: 'string'
            },
            'vehicleMqttPort': {
                description: 'Set vehicle mqtt port',
                alias: 'm',
                type: 'number'
            }, 'vehicleHttpsPort': {
                description: 'Set vehicle https port',
                alias: 't',
                type: 'number'
            }
        }
    ).parse()


module.exports = argv