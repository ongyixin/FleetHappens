# Fleet Dashboard - GitHub Pages Add-In Example

This is a **working Geotab Add-In** that you can deploy to GitHub Pages and install in MyGeotab.

## ✅ What Works

- ✅ Accesses MyGeotab API
- ✅ Shows user info and database name
- ✅ Loads and displays vehicles
- ✅ Lifecycle methods (initialize, focus, blur)
- ✅ Debug logging
- ✅ Clean, modern UI

## 🚀 Quick Start (5 Minutes)

### Step 1: Create a GitHub Repository

1. Go to https://github.com and create a new repository
2. Name it something like `geotab-fleet-dashboard`
3. Make it **Public**
4. **Don't** initialize with README (we have files already)

### Step 2: Upload Files

**Option A: Using Git (if you have it)**
```bash
cd /path/to/this/folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

**Option B: Using GitHub Web Interface**
1. Click "uploading an existing file"
2. Drag and drop all 4 files:
   - index.html
   - styles.css
   - app.js
   - config.json
3. Commit the files

### Step 3: Enable GitHub Pages

1. Go to your repository → **Settings** → **Pages**
2. Under "Source", select **main** branch
3. Click **Save**
4. Wait 1-2 minutes for deployment
5. GitHub will show you a URL like: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

### Step 4: Update Config File

1. Edit `config.json` in your repository
2. Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your actual values
3. Example:
   ```json
   {
       "url": "https://johndoe.github.io/geotab-fleet-dashboard/"
   }
   ```
4. Commit the change

### Step 5: Install in MyGeotab

1. Open your `config.json` file on GitHub
2. Click the **Raw** button
3. Copy the entire JSON
4. Go to MyGeotab → **Administration → System → System Settings → Add-Ins**
5. Click **"New Add-In"**
6. Switch to **"Configuration"** tab
7. Paste the JSON
8. Click **"Save"**
9. **Refresh your browser page**

### Step 6: See It Work!

1. Look for **"Fleet Dashboard"** in the left navigation menu
2. Click it
3. You should see:
   - Your username and database
   - Total vehicle count
   - List of your vehicles
   - Debug log showing API calls

🎉 **Success!** You now have a working Add-In that accesses your fleet data!

## 🔧 Customizing Your Add-In

### Change the Title

Edit `index.html` line 10:
```html
<h1>🚗 Your Custom Title</h1>
```

### Add More Data

Edit `app.js` and add a new function:
```javascript
function loadTrips() {
    geotabApi.call('Get', {
        typeName: 'Trip',
        search: {
            fromDate: new Date(Date.now() - 7*24*60*60*1000).toISOString()
        }
    }, function(trips) {
        console.log('Loaded trips:', trips);
        // Display trips in your UI
    }, function(error) {
        console.error('Error:', error);
    });
}
```

Then call it from `initialize()`:
```javascript
loadUserInfo();
loadVehicles();
loadTrips(); // Add this line
```

### Change Colors

Edit `styles.css`:
```css
background: linear-gradient(135deg, #your-color-1 0%, #your-color-2 100%);
```

## 🐛 Troubleshooting

### Add-In doesn't appear in menu
- Did you refresh the browser page after saving?
- Check the config.json is valid JSON (use https://jsonlint.com)

### "Issue Loading This Page" error
- Is your GitHub Pages URL correct?
- Did you wait 2-3 minutes for GitHub Pages to deploy?
- Test the URL in a regular browser tab first

### No data loading
- Open browser console (F12)
- Look for errors in the console
- Check the Debug Log section in the Add-In

### Vehicles showing as "Loading..."
- Check browser console for errors
- Make sure `initialize()` is being called (check debug log)
- Verify you have vehicles in your MyGeotab account

## 📚 Next Steps

### Use Claude to Modify It

```text
Modify my Geotab Add-In to:
1. Show a map of vehicle locations using Leaflet.js
2. Add a refresh button
3. Color-code vehicles by status (moving, idle, stopped)

Here are my current files:
[paste index.html, styles.css, and app.js]
```

### Add Features

Ideas for enhancements:
- **Map view**: Add Leaflet.js to show vehicle locations
- **Filters**: Filter by vehicle group or type
- **Charts**: Add Chart.js for visualizations
- **Real-time**: Auto-refresh every 30 seconds
- **Export**: Download vehicle list as CSV
- **Search**: Add a search box to find vehicles

### Learn More

- [Geotab Add-Ins Guide](../../../guides/GEOTAB_ADDINS.md) - Complete tutorial
- [MyGeotab API Reference](https://geotab.github.io/sdk/software/api/reference/)
- [Geotab SDK Documentation](https://geotab.github.io/sdk/)

## 📁 File Structure

```
github-pages-example/
├── index.html      # Main HTML structure
├── styles.css      # Styling
├── app.js          # JavaScript with lifecycle methods
├── config.json     # MyGeotab Add-In configuration
└── README.md       # This file
```

## ⚠️ Important Notes

1. **Use GitHub Pages** - Embedded Add-Ins (in the JSON) don't have API access
2. **HTTPS Required** - All Add-In URLs must use HTTPS
3. **Public Repo** - GitHub Pages requires a public repository (free accounts)
4. **Refresh After Changes** - After updating files, wait 1-2 min then hard refresh (Ctrl+Shift+R)

## 🎓 Key Lessons

### Why This Works

- **External hosting** = Full API access ✅
- **Lifecycle methods** work when hosted externally ✅
- **GitHub Pages** = Free HTTPS hosting ✅

### Why Embedded Add-Ins Don't Work

- **No API access** ❌
- **Lifecycle methods not called** ❌
- **Only good for static content** ⚠️

**Always use GitHub Pages (or other hosting) for Add-Ins that need API access!**

## 🤝 Contributing

Found a bug or have an improvement? Feel free to modify and share!

Remember: **Vibe coding** means you don't need to understand every line. Use Claude or another AI to make changes. Just describe what you want!
