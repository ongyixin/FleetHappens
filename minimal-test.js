// Minimal test mimicking Heat Map structure
"use strict";

// CRITICAL: Name should match the HTML filename (without extension)
// File: minimal-test.html -> geotab.addin.minimaltest or geotab.addin['minimal-test']
geotab.addin.minimaltest = function() {
    console.log('minimaltest Add-In loading...');

    return {
        initialize: function(api, state, callback) {
            console.log('🎉🎉🎉 minimaltest initialize() called!');

            document.body.innerHTML = '<h1>SUCCESS!</h1><pre id="output"></pre>';
            var output = document.getElementById('output');

            output.textContent = 'Initialize called!\n';

            if (api) {
                api.getSession(function(cred) {
                    output.textContent += 'User: ' + cred.userName + '\n';
                    output.textContent += 'Database: ' + cred.database + '\n';
                });

                api.call('Get', { typeName: 'Device' }, function(devices) {
                    output.textContent += 'Vehicles: ' + devices.length + '\n';
                });
            }

            callback();
        },

        focus: function(api, state) {
            console.log('minimaltest focus() called');
        }
    };
}();

console.log('minimaltest registered');
