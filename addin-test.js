// Geotab Add-In - Testing with internal ID
console.log('addin-test.js v12.0 loading...');

// Create the addin object structure
var addinImpl = function() {
    let output = '';

    function log(msg) {
        output += msg + '\n';
        console.log(msg);
        try {
            document.getElementById('output').textContent = output;
        } catch(e) {
            // Ignore
        }
    }

    log('v12.0 - Testing internal ID name...');

    return {
        initialize: function(api, state, callback) {
            log('🎉🎉🎉 initialize() CALLED!!!');
            log('API: ' + (api ? 'EXISTS' : 'NULL'));

            if (api) {
                log('API type: ' + typeof api);

                api.getSession(function(cred) {
                    log('✅ SUCCESS! User: ' + cred.userName);
                    log('✅ Database: ' + cred.database);
                }, function(err) {
                    log('❌ Session error: ' + err);
                });

                api.call('Get', {
                    typeName: 'Device'
                }, function(devices) {
                    log('✅ Loaded ' + devices.length + ' vehicles!');
                }, function(err) {
                    log('❌ Device error: ' + err);
                });
            }

            callback();
        },

        focus: function(api, state) {
            log('FOCUS called, API: ' + (api ? 'YES' : 'NO'));
        },

        blur: function(api, state) {
            log('BLUR called');
        }
    };
};

// Try the internal ID that appeared in the error message
geotab.addin['githubpagestest-addin-test'] = addinImpl();
geotab.addin.apitest = addinImpl();
geotab.addin['api-test'] = addinImpl();

console.log('v12.0 - Registered under githubpagestest-addin-test and others');
console.log('Available addins:', Object.keys(geotab.addin));
