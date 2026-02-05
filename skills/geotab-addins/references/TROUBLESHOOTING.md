# Troubleshooting & Common Mistakes

## Debugging Checklist

When an Add-In doesn't work:

1. **Check browser console** (F12) for JavaScript errors
2. **Check callback** - are you calling `callback()` in initialize?
3. **Check GitHub Pages** - is the URL accessible? Wait 2-3 minutes after push
4. **Test the URL** - open it directly in browser, does it load?
5. **Check configuration** - valid JSON? Correct URL?
6. **Hard refresh** - Clear cache with Ctrl+Shift+R

## Common Mistakes

### 1. Forgetting to Call callback()

**Problem:** Add-In hangs during initialization

```javascript
// ❌ Wrong - callback never called
initialize: function(api, state, callback) {
    loadData(api);
    // Missing callback()!
}

// ✅ Correct
initialize: function(api, state, callback) {
    loadData(api);
    callback();
}

// ✅ Also correct - call after async work
initialize: function(api, state, callback) {
    api.call("Get", {typeName: "Device"}, function(devices) {
        displayDevices(devices);
        callback();  // Called when async work completes
    });
}
```

### 2. Not Handling Errors

**Problem:** API calls fail silently

```javascript
// ❌ No error handling
api.call("Get", {typeName: "Device"}, function(devices) {
    displayDevices(devices);
});

// ✅ With error handling
api.call("Get", {typeName: "Device"},
    function(devices) {
        displayDevices(devices);
    },
    function(error) {
        console.error("Failed to load devices:", error);
        showErrorMessage("Could not load vehicles. Please try again.");
    }
);
```

### 3. Using Immediate Invocation

**Problem:** Using `}();` instead of `};` when registering

```javascript
// ❌ Wrong - invokes the function immediately
geotab.addin["name"] = function() { return {...}; }();

// ✅ Correct - assigns the function for MyGeotab to call
geotab.addin["name"] = function() { return {...}; };
```

### 4. Using Modern JS Features

**Problem:** MyGeotab may run in older browsers

```javascript
// ❌ Modern JavaScript (may not work)
const devices = [];
api.call("Get", {typeName: "Device"}, (devices) => {
    console.log(`Found ${devices.length} vehicles`);
});

// ✅ ES5 JavaScript (always works)
var devices = [];
api.call("Get", {typeName: "Device"}, function(devices) {
    console.log("Found " + devices.length + " vehicles");
});
```

### 5. Variable Name Collisions with 'state'

**Problem:** Using `state` as both parameter AND global variable

```javascript
// ❌ Wrong - 'state' parameter collides with global
var state = { data: [] };

geotab.addin["name"] = function() {
    return {
        initialize: function(api, state, callback) {
            // Which 'state'? Confusion!
            state.data = [];  // Modifies parameter, not your variable!
            callback();
        }
    };
};

// ✅ Correct - use different names
var appState = { data: [] };

geotab.addin["name"] = function() {
    return {
        initialize: function(api, pageState, callback) {
            // Clear: appState is yours, pageState is from MyGeotab
            appState.data = [];
            callback();
        }
    };
};
```

### 6. Using resultsLimit for Counting

**Problem:** Only getting partial count

```javascript
// ❌ Wrong - only returns up to 100
api.call("Get", {
    typeName: "Device",
    resultsLimit: 100
}, function(devices) {
    // devices.length will be at most 100!
});

// ✅ Correct - returns all for accurate count
api.call("Get", {
    typeName: "Device"
}, function(devices) {
    console.log("Total vehicles: " + devices.length);
});
```

### 7. Using typeName: "Driver" Directly

**Problem:** Causes InvalidCastException in many databases

```javascript
// ❌ Wrong - causes errors in many databases
api.call("Get", {typeName: "Driver"}, ...);

// ✅ Correct - always works
api.call("Get", {
    typeName: "User",
    search: { isDriver: true }
}, function(drivers) {
    console.log("Total drivers: " + drivers.length);
});
```

## GitHub Pages Issues

### Changes Not Appearing

1. **Wait 2-3 minutes** after pushing for deployment
2. **Check GitHub Actions** if deployment takes too long: go to `https://github.com/YOUR-USERNAME/YOUR-REPO/actions` to see deployment status and whether GitHub is being slow
3. **Add cache buster** to URL:
   ```json
   "url": "https://username.github.io/repo/addin.html?v=2"
   ```
4. **Hard refresh** browser: Ctrl+Shift+R

### 404 Errors

1. Verify GitHub Pages is enabled in repo settings
2. Check branch is set correctly (usually `main`)
3. Ensure files are in root or correct path
4. Check filename case sensitivity (Linux is case-sensitive)

## CORS Issues

**Symptom:** Add-In won't load, console shows CORS errors

**Solution:** Your hosting must include `Access-Control-Allow-Origin: *` header

**Platforms with proper CORS:**
- GitHub Pages
- Replit
- Netlify
- Firebase Hosting
- Vercel

## Testing Checklist for Users

1. Wait 2-3 minutes after pushing to GitHub
2. Open the HTML file directly in browser to verify it loads
3. Check browser console for errors
4. Hard refresh MyGeotab (Ctrl+Shift+R)
5. Verify the Add-In appears in menu
6. Check console for "registered" and "initializing" messages

## Working with Speed Data and ExceptionEvents

Common issues when building speeding dashboards and safety Add-Ins.

### 8. Wrong Diagnostic IDs for Speed

**Problem:** Speed data returns empty or 0

```javascript
// ❌ Wrong - DiagnosticPostedSpeedId doesn't exist
api.call("Get", {
    typeName: "StatusData",
    search: {
        diagnosticSearch: { id: "DiagnosticPostedSpeedId" },  // WRONG!
        fromDate: ex.activeFrom,
        toDate: ex.activeTo
    }
});

// ✅ Correct diagnostic IDs for speed
// Vehicle speed (GPS-based):
diagnosticSearch: { id: "DiagnosticSpeedId" }

// Posted road speed limit:
diagnosticSearch: { id: "DiagnosticPostedRoadSpeedId" }

// Engine-reported road speed:
diagnosticSearch: { id: "DiagnosticEngineRoadSpeedId" }
```

**All speed-related diagnostic IDs:**

| Diagnostic ID | Description | Unit |
|--------------|-------------|------|
| `DiagnosticSpeedId` | GPS-based vehicle speed | km/h |
| `DiagnosticPostedRoadSpeedId` | Posted road speed limit | km/h |
| `DiagnosticEngineRoadSpeedId` | Engine-reported speed | km/h |
| `DiagnosticEngineSpeedId` | Engine RPM | RPM |

### 9. Time Window Too Narrow for StatusData

**Problem:** Speeding exceptions can be very short (seconds), and StatusData may not have readings at those exact timestamps.

```javascript
// ❌ Wrong - time window may be too narrow
api.call("Get", {
    typeName: "StatusData",
    search: {
        deviceSearch: { id: ex.device.id },
        diagnosticSearch: { id: "DiagnosticSpeedId" },
        fromDate: ex.activeFrom,  // Exact exception start
        toDate: ex.activeTo       // Exact exception end
    }
});

// ✅ Correct - add 30-second buffer before and after
var startTime = new Date(ex.activeFrom);
var endTime = new Date(ex.activeTo || ex.activeFrom);
startTime.setSeconds(startTime.getSeconds() - 30);
endTime.setSeconds(endTime.getSeconds() + 30);

api.call("Get", {
    typeName: "StatusData",
    search: {
        deviceSearch: { id: ex.device.id },
        diagnosticSearch: { id: "DiagnosticSpeedId" },
        fromDate: startTime.toISOString(),
        toDate: endTime.toISOString()
    }
});
```

### 10. ExceptionEvent.details May Be Undefined

**Problem:** For speeding rules, `ExceptionEvent` can have a `details` object with `maxSpeed` and `speedLimit`, but it's not always populated (especially for recent events still being processed).

```javascript
// ❌ Wrong - crashes if details is undefined
card.innerHTML = "Top Speed: " + Math.round(ex.details.maxSpeed);

// ✅ Correct - defensive null checks
var topSpeed = (ex.details && ex.details.maxSpeed)
    ? Math.round(ex.details.maxSpeed) : 0;
var speedLimit = (ex.details && ex.details.speedLimit)
    ? Math.round(ex.details.speedLimit) : 0;

// ✅ Even better - fallback to StatusData if details missing
if (ex.details && ex.details.maxSpeed) {
    displaySpeed(ex.details.maxSpeed, ex.details.speedLimit);
} else {
    // Query StatusData as fallback
    fetchSpeedFromStatusData(api, ex);
}
```

### 11. Posted Speed Limit Shows 0 or N/A

**Problem:** `DiagnosticPostedRoadSpeedId` returns 0 for some locations

**Reason:** Not all road segments have posted speed limit data in Geotab's map database. Rural roads, private property, or certain regions may lack this data.

**Solutions:**
1. Display "N/A" instead of 0 when no limit data exists
2. Fall back to rule threshold if available
3. Clearly indicate when limit data is unavailable

```javascript
var limit = (limits && limits.length > 0) ? limits[0].data : 0;
var limitDisplay = limit > 0 ? Math.round(limit) + " km/h" : "N/A";
```

### 12. Complete Pattern for Speeding Dashboard

```javascript
function fetchSpeedData(api, ex) {
    // Add time buffer
    var startTime = new Date(ex.activeFrom);
    var endTime = new Date(ex.activeTo || ex.activeFrom);
    startTime.setSeconds(startTime.getSeconds() - 30);
    endTime.setSeconds(endTime.getSeconds() + 30);

    api.multiCall([
        ["Get", {
            typeName: "StatusData",
            search: {
                deviceSearch: { id: ex.device.id },
                diagnosticSearch: { id: "DiagnosticSpeedId" },
                fromDate: startTime.toISOString(),
                toDate: endTime.toISOString()
            }
        }],
        ["Get", {
            typeName: "StatusData",
            search: {
                deviceSearch: { id: ex.device.id },
                diagnosticSearch: { id: "DiagnosticPostedRoadSpeedId" },
                fromDate: startTime.toISOString(),
                toDate: endTime.toISOString()
            }
        }]
    ], function(results) {
        var speeds = results[0] || [];
        var limits = results[1] || [];

        // Find max speed
        var maxSpeed = 0;
        speeds.forEach(function(s) {
            if (s.data > maxSpeed) maxSpeed = s.data;
        });

        // Get posted limit (first reading in window)
        var limit = (limits.length > 0) ? limits[0].data : 0;

        displaySpeedData(ex.id, maxSpeed, limit);
    }, function(error) {
        console.error("Speed data error:", error);
        displaySpeedError(ex.id);
    });
}
```

---

## When Helping Users

### Always Include:
1. The correct pattern without `()`
2. All three lifecycle methods
3. The `callback()` call in initialize
4. Error handling for API calls
5. ES5 JavaScript syntax
6. Clear comments explaining each part

### Always Warn About:
1. The immediate invocation mistake
2. Forgetting to call callback()
3. Name mismatches between files
4. GitHub Pages deployment wait time (2-3 minutes)
5. Browser cache (suggest hard refresh)
