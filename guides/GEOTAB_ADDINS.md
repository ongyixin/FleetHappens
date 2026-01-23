# Building Geotab Add-Ins (Vibe Guide)

**Tell AI what you want. Get a custom page in MyGeotab.**

This guide shows you how to use AI to build Add-Ins that extend MyGeotab with custom pages.

---

## Try It Right Now

Copy-paste this into MyGeotab to see a working Add-In:

**1. Go to:** Administration → System → System Settings → Add-Ins
**2. Click:** "New Add-In" → "Configuration" tab
**3. Paste this:**

```json
{
  "name": "Simple Fleet Test",
  "supportEmail": "test@example.com",
  "version": "1.0.0",
  "items": [{
    "url": "https://fhoffa.github.io/geotab-vibe-guide/simple-test.html",
    "path": "ActivityLink/",
    "menuName": {
      "en": "Fleet Stats"
    }
  }]
}
```

**4. Save and refresh MyGeotab**
**5. Look for "Fleet Stats" in the left menu**

You'll see your username, database, and vehicle count. This proves Add-Ins work!

---

## What Are Add-Ins?

Custom pages that appear in MyGeotab's menu. They can:
- Show dashboards combining MyGeotab data with external APIs
- Display specialized reports for your workflow
- Create custom tools specific to your business

**Example:** A safety dashboard showing today's speeding events, ranked drivers, and export to CSV.

---

## How to Build One (The Vibe Way)

### Step 1: Use the Skill

When working with Claude or other AI assistants, tell them:

```
Use the geotab-addins skill to help me build a Geotab Add-In
```

The skill file (`/skills/geotab-addins.md`) teaches AIs the correct patterns and common mistakes.

### Step 2: Describe What You Want

Be specific about what your Add-In should do:

```
Create a Geotab Add-In that shows:
1. A count of vehicles currently active (moving in the last hour)
2. A list of the 5 most recent trips with vehicle name and distance
3. Total fleet mileage for today
4. A "Refresh" button to reload the data

Host it on GitHub Pages and give me the configuration JSON to paste into MyGeotab.
```

### Step 3: Let AI Build It

The AI will:
- Create the HTML and JavaScript files
- Use the correct pattern (no immediate invocation!)
- Set up GitHub Pages hosting
- Give you the JSON configuration to install

### Step 4: Test and Iterate

Try it in MyGeotab. If something doesn't work or you want changes:

```
The vehicle count isn't showing. Can you add error handling?
```

```
Add a date picker so I can see trips from different days
```

```
Make it look nicer with a modern card-based layout
```

---

## Example Prompts to Try

### Simple Dashboard
```
Build a Geotab Add-In that displays my fleet overview:
- Total vehicles
- Active vehicles today
- Total trips this week
- Use cards with icons and nice styling
```

### Vehicle Finder
```
Create a Geotab Add-In with a search box.
When I type a vehicle name, show matching vehicles.
Add a button next to each that navigates to that vehicle's detail page in MyGeotab.
```

### Safety Report
```
Build a Geotab Add-In showing speeding events from the last 7 days.
Group them by driver and show:
- Driver name
- Number of speeding events
- Date of most recent event
Add an "Export CSV" button
```

### Custom Map
```
Create a Geotab Add-In with a Leaflet map showing:
- Current location of all vehicles
- Color-coded by group (red for Group A, blue for Group B, etc.)
- Click a vehicle to see its name and last update time
```

---

## Key Pattern (Important!)

The #1 mistake when building Add-Ins is using **immediate function invocation**.

**❌ Wrong:**
```javascript
geotab.addin["my-addin"] = function() {
    return {...};
}();  // Don't do this!
```

**✅ Correct:**
```javascript
geotab.addin["my-addin"] = function() {
    return {...};
};  // No () at the end
```

**The AI skill knows this**, but if you're debugging, check for this mistake first.

---

## Try the Official Heat Map

Want to see a production-quality example? Try Geotab's Heat Map:

**Configuration:**
```json
{
  "name": "Heat Map",
  "version": "1.0.0",
  "items": [{
    "url": "https://cdn.jsdelivr.net/gh/Geotab/sdk-addin-samples@master/addin-heatmap/dist/heatmap.html",
    "path": "ActivityLink/",
    "menuName": {"en": "Heat Map"}
  }]
}
```

Install it, see how it works, then tell your AI:

```
I like the Heat Map Add-In. Build me something similar but instead of a heat map,
show vehicle locations as pins on a map with different colors for each group.
```

**[View Heat Map source code](https://github.com/Geotab/sdk-addin-samples/tree/master/addin-heatmap)** - great for learning!

---

## Security & Permissions

**HTTPS Required:** Add-Ins must be hosted on HTTPS (GitHub Pages provides this free)

**User Permissions:** Add-Ins inherit the logged-in user's permissions
- If the user can't see driver salaries, the Add-In can't either
- Test with different user roles

**Code is Public:** GitHub Pages is public - anyone can view your source
- Don't hardcode API keys or secrets
- Use server-side APIs for sensitive operations

**Cross-Origin:** The MyGeotab API handles CORS for you
- Calls to MyGeotab API work automatically
- External APIs you call may have their own CORS policies

---

## Debugging

**Add-In doesn't appear?**
- Check you saved the configuration
- Hard refresh: `Ctrl+Shift+R`

**"Issue Loading This Page"?**
- Verify the URL is accessible
- Check GitHub Pages is enabled (Settings → Pages)
- Wait 2-3 minutes after pushing changes

**initialize() never called?**
- Most common: You used `}();` instead of `};`
- Check browser console (F12) for errors

**API calls fail?**
- Make sure you called `callback()` in initialize
- Check the error callback for permission issues

---

## Resources

**Working Examples:**
- `simple-test.html` / `simple-test.js` in this repo (tested ✅)
- [Heat Map Add-In](https://github.com/Geotab/sdk-addin-samples/tree/master/addin-heatmap) (official example)
- [All SDK Samples](https://github.com/Geotab/sdk-addin-samples) (browse more examples)

**Documentation:**
- [Geotab Add-In Developer Guide](https://developers.geotab.com/myGeotab/addIns/developingAddIns/)
- [Geotab API Reference](https://geotab.github.io/sdk/software/api/reference/)

**Tools:**
- [GitHub Pages](https://pages.github.com/) - Free HTTPS hosting
- `/skills/geotab-addins.md` - AI skill file (use this when prompting)

---

## Quick Start Template

Tell your AI:

```
Use the geotab-addins skill.

Create a Geotab Add-In that [describe your feature].

Requirements:
- Host on GitHub Pages
- Use the MyGeotab API to fetch [specify data types]
- Display it with [describe UI]
- Give me the JSON configuration to install it

Make sure to use the correct pattern (no immediate function invocation).
```

Then copy-paste the configuration into MyGeotab and you're done!

---

**That's it. Describe what you want, let AI build it, paste the config, and you have a custom MyGeotab page.**
