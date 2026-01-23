/**
 * Fleet Dashboard Add-In
 * This Add-In works when hosted on GitHub Pages or any HTTPS server
 */

// Global API reference
let geotabApi = null;
let debugLog = null;

/**
 * Log debug messages
 */
function log(message, type = 'info') {
    console.log(message);

    if (!debugLog) {
        debugLog = document.getElementById('debug-log');
    }

    if (debugLog) {
        const p = document.createElement('p');
        p.textContent = new Date().toLocaleTimeString() + ' - ' + message;
        if (type === 'error') p.classList.add('error-log');
        if (type === 'success') p.classList.add('success-log');
        debugLog.appendChild(p);
        debugLog.scrollTop = debugLog.scrollHeight;
    }
}

/**
 * LIFECYCLE METHOD 1: initialize
 * Called once when the Add-In first loads
 */
function initialize(api, state, callback) {
    log('🚀 Initialize called', 'success');
    log('API object: ' + (api ? 'EXISTS' : 'NULL'));

    // Store the API reference globally
    geotabApi = api;

    if (!api) {
        log('ERROR: No API object provided', 'error');
        showError('API not available');
        callback();
        return;
    }

    // Load initial data
    loadUserInfo();
    loadVehicles();

    // Signal that initialization is complete
    log('Calling callback()');
    callback();
}

/**
 * LIFECYCLE METHOD 2: focus
 * Called when the user navigates to this Add-In
 */
function focus(api, state) {
    log('👁️ Focus called');

    // Refresh data when user comes back to this page
    if (api) {
        loadVehicles();
        updateTimestamp();
    }
}

/**
 * LIFECYCLE METHOD 3: blur
 * Called when user navigates away from this Add-In
 */
function blur(api, state) {
    log('😴 Blur called');
}

/**
 * Load and display user information
 */
function loadUserInfo() {
    log('Loading user info...');

    if (!geotabApi) {
        log('ERROR: API not available', 'error');
        return;
    }

    try {
        geotabApi.getSession(function(credentials, server) {
            log('Got session: ' + credentials.userName, 'success');
            document.getElementById('user-name').textContent = credentials.userName || 'N/A';
            document.getElementById('database').textContent = credentials.database || 'N/A';
        }, function(error) {
            log('getSession error: ' + error, 'error');
            document.getElementById('user-name').textContent = 'Error';
            document.getElementById('database').textContent = 'Error';
        });
    } catch (e) {
        log('Exception in loadUserInfo: ' + e.message, 'error');
    }
}

/**
 * Load and display vehicle data
 */
function loadVehicles() {
    log('Loading vehicles...');

    if (!geotabApi) {
        log('ERROR: API not available', 'error');
        return;
    }

    try {
        geotabApi.call('Get', {
            typeName: 'Device'
        }, function(devices) {
            log('Loaded ' + devices.length + ' vehicles', 'success');

            // Update vehicle count
            document.getElementById('vehicle-count').textContent = devices.length;
            updateTimestamp();

            // Display vehicle list (first 10)
            displayVehicles(devices.slice(0, 10));
        }, function(error) {
            log('Error loading vehicles: ' + error, 'error');
            showError('Failed to load vehicles: ' + error);
        });
    } catch (e) {
        log('Exception in loadVehicles: ' + e.message, 'error');
        showError('Exception: ' + e.message);
    }
}

/**
 * Display vehicles in the UI
 */
function displayVehicles(devices) {
    const container = document.getElementById('vehicles-list');

    if (!devices || devices.length === 0) {
        container.innerHTML = '<p class="loading">No vehicles found</p>';
        return;
    }

    container.innerHTML = devices.map(device => `
        <div class="vehicle-item">
            <div class="vehicle-name">${escapeHtml(device.name || 'Unknown Vehicle')}</div>
            <div class="vehicle-serial">Serial: ${escapeHtml(device.serialNumber || 'N/A')}</div>
        </div>
    `).join('');

    log('Displayed ' + devices.length + ' vehicles');
}

/**
 * Update the timestamp
 */
function updateTimestamp() {
    const now = new Date();
    document.getElementById('last-update').textContent = now.toLocaleTimeString();
}

/**
 * Display error message
 */
function showError(message) {
    log('ERROR: ' + message, 'error');
    const container = document.getElementById('vehicles-list');
    container.innerHTML = `<div class="error">⚠️ ${escapeHtml(message)}</div>`;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Log when page loads
log('📄 Page loaded (app.js executed)');
log('Waiting for MyGeotab to call initialize()...');
