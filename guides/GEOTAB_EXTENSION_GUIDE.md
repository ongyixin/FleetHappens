# Building Extensions for Geotab: A Business Guide

**Turn your fleet solution into a Geotab Marketplace partner.**

If you've built software, hardware, or services that help fleet operators—video telematics, maintenance systems, fuel cards, routing software, compliance tools—Geotab's open platform lets you integrate and reach 4.7 million+ connected vehicles worldwide.

This guide walks you through why, what, and how to build on Geotab.

---

## Why Build on Geotab?

### The Opportunity

| Metric | Scale |
|--------|-------|
| Connected vehicles | 4.7 million+ |
| Daily data points collected | 75 billion+ |
| Marketplace partners | 250+ |
| Available solutions | 350+ |
| Geographic reach | 160+ countries |

Geotab is the world's largest commercial telematics platform. When you integrate, your solution becomes available to fleet operators who already trust Geotab with their data.

### What Partners Say

> "There's a tremendous sense of collaboration between the partners, the resellers, and Geotab that's incredibly unique—and we don't see it anywhere else in the market."
> — Aaron Howell, Director of Sales, Uptake

> "By working together with Geotab and other Partners, we're able to find out the true needs of the customer, pool our resources together, and exceed expectations."
> — Caleb Alburn, Account Manager, eSquared Communications Consulting

### The Ecosystem Effect

Unlike building a standalone product, Marketplace integrations benefit from:

- **Existing customer base** — Fleet operators already using Geotab can add your solution instantly
- **Unified data** — Access to vehicle location, trips, driver behavior, diagnostics, and more
- **Trusted environment** — Solutions vetted by Geotab carry credibility
- **Co-marketing** — Geotab promotes partners at events like Geotab Connect
- **Reseller network** — Geotab's global reseller channel can sell your solution

---

## Types of Integrations

There are four main ways to integrate with Geotab:

### 1. MyGeotab Add-Ins (Software)

Custom pages that run inside the MyGeotab interface. Users access your functionality without leaving the platform they already use.

**Best for:**
- Dashboards and reporting tools
- Workflow management
- Data visualization
- Third-party data integration (CRM, ERP, accounting)

**Examples:**
- Video telematics viewers that play dashcam footage alongside trip data
- Maintenance scheduling that combines Geotab diagnostics with work orders
- Dispatch tools that show routes and driver locations on custom maps

**Technology:** HTML/JavaScript using the MyGeotab SDK. No server required for basic Add-Ins.

**→ [Learn how to build Add-Ins](./GEOTAB_ADDINS.md)**

### 2. API Integration (Software)

Direct integration with Geotab's REST API from your own servers. Pull data into your system or push data to Geotab.

**Best for:**
- Backend systems that process fleet data
- Enterprise software that needs to sync with Geotab
- Custom analytics and machine learning pipelines
- Mobile apps that work with Geotab data

**Examples:**
- Fuel card systems that match transactions to trips
- Insurance platforms that score driving behavior
- ERP systems that track vehicle costs and utilization

**Technology:** REST API, available in any language. Official SDKs for C# and JavaScript.

### 3. Hardware Integration (IOX)

Physical devices that connect to Geotab's GO device via the IOX (Input/Output Expander) port.

**Best for:**
- Cameras and video systems
- Asset tracking sensors
- Specialized sensors (temperature, humidity, door status)
- Driver identification hardware

**Examples:**
- Dashcams that upload footage when Geotab detects harsh braking
- Temperature sensors for cold chain compliance
- BLE beacons for trailer and equipment tracking

**Technology:** Hardware development following Geotab's IOX specifications.

### 4. Data Feed Integration

Automated export of Geotab data to external systems using Data Feeds.

**Best for:**
- Data warehouses and business intelligence
- Compliance reporting systems
- Real-time monitoring platforms

**Technology:** Continuous polling of the GetFeed API endpoint for streaming data.

---

## Marketplace Partnership Tiers

Once you've built an integration, you can apply to join the Geotab Marketplace at different levels:

| Tier | Description | Vetting Level |
|------|-------------|---------------|
| **Basic** | Uses Geotab's open platform and SDK | Minimal review |
| **Standard** | Solid integrations that enhance Geotab | Quality & security vetted |
| **Premier** | Best-in-class, deeply integrated solutions | High standards, significant customer value |
| **Order Now** | Seamless purchase and activation experience | Exceeds stringent quality benchmarks |

### What Changes at Higher Tiers

- **Visibility:** Higher tiers get better placement in the Marketplace
- **Trust signals:** Premier and Order Now badges signal quality to customers
- **Support:** Closer relationship with Geotab's partner team
- **Co-marketing:** Opportunities for joint announcements and event presence

### Geotab Extensions

Geotab also offers "Geotab Extensions"—official guides and reference implementations that help you build specific types of integrations. These serve as templates and best-practice examples.

---

## Solution Categories

The Marketplace organizes solutions into 15 categories. Find where your product fits:

| Category | Description | Example Solutions |
|----------|-------------|-------------------|
| **Asset & Trailer Tracking** | Track non-powered equipment | BLE trackers, GPS tags |
| **Cameras & ADAS** | Video telematics and driver assistance | Dashcams, AI cameras |
| **Compliance** | Regulatory requirements | ELD, DVIR, HOS |
| **Connected Sensors & Hardware** | IOX accessories | Temperature, fuel level |
| **Fleet Management** | Operations and dispatching | Route planning, job management |
| **Fuel Management** | Fuel tracking and optimization | Fuel cards, tank monitoring |
| **Hardware Device Management** | GO device and IOX management | Installation, configuration |
| **Insurance** | Usage-based insurance | Risk scoring, claims |
| **Integration & Consulting** | Professional services | Custom development, support |
| **Maintenance & Diagnostics** | Vehicle health | Predictive maintenance, shop integration |
| **Mobile Workflow** | Field operations | Forms, proof of delivery |
| **Risk Management** | Safety and driver behavior | Coaching, alerts |
| **Routing & Dispatch** | Route optimization | Scheduling, ETAs |
| **Sustainability** | Environmental tracking | EV management, carbon reporting |
| **TMS & Logistics** | Transportation management | Load planning, freight |

---

## Real Partner Examples

### Video Telematics: Brigade Electronics + Streamax

**The integration:**
- MyGeotab Map page Add-In for multi-camera live video streaming
- Trip History Add-In for on-demand footage retrieval
- "Driving events" portal with consolidated violations and video clips
- Automatic footage upload when Geotab detects harsh braking or steering

**The result:** Fleet managers see video evidence directly in the same interface where they review trips and exceptions.

### Video Telematics: Lytx

**The integration:**
- Lytx video and DOT compliance combined with Geotab telematics
- Single platform view of video events alongside fleet data
- Includes Geotab GO Anywhere for asset tracking

**The result:** "All-in-one" fleet safety without switching between systems.

### Asset Tracking: Link Labs

**The integration:**
- BLE and cellular asset tracking through the IOX port
- Custom Add-In for viewing and managing tracked assets
- Real-time visibility for trailers, containers, tools, and equipment

**The result:** Fleet operators track powered vehicles and non-powered assets in one system.

### Safety: White Cap + Holman

**The integration:**
- Geotab telematics data feeding safety analytics
- Camera integration via Netradyne
- Driver behavior monitoring and coaching

**The result:**
- 97% reduction in speeding and seatbelt violations
- 62% reduction in aggressive driving

---

## Getting Started: Technical Path

### Step 1: Get SDK Access

Everything starts with the Geotab SDK:

- **SDK Documentation:** [developers.geotab.com](https://developers.geotab.com/myGeotab/introduction/)
- **SDK GitHub:** [github.com/Geotab/sdk](https://github.com/Geotab/sdk)
- **API Reference:** [geotab.github.io/sdk/software/api/reference/](https://geotab.github.io/sdk/software/api/reference/)

The SDK is free and open. No approval required to start building.

### Step 2: Create a Test Account

Sign up for a demo database:

- Go to [my.geotab.com/registration.html](https://my.geotab.com/registration.html)
- Create a free account
- You'll get access to sample vehicles and data

### Step 3: Build a Prototype

Start simple. Prove your concept works:

**For Add-Ins:**
```
Create a Geotab Add-In that [your core feature].
Use the MyGeotab SDK to access [Device, Trip, StatusData, etc.].
```

**For API integrations:**
```python
# Quick test: authenticate and fetch devices
import requests, os
from dotenv import load_dotenv

load_dotenv()
url = f"https://{os.getenv('GEOTAB_SERVER')}/apiv1"

# Authenticate
auth = requests.post(url, json={
    "method": "Authenticate",
    "params": {
        "database": os.getenv('GEOTAB_DATABASE'),
        "userName": os.getenv('GEOTAB_USERNAME'),
        "password": os.getenv('GEOTAB_PASSWORD')
    }
})
creds = auth.json()["result"]["credentials"]

# Fetch vehicles
devices = requests.post(url, json={
    "method": "Get",
    "params": {"typeName": "Device", "credentials": creds}
})
print(f"Found {len(devices.json()['result'])} vehicles")
```

**→ [API patterns and examples](./GEOTAB_API_REFERENCE.md)**

### Step 4: Test with Real Data

Once your prototype works with demo data:

1. Find a customer or partner willing to test
2. Get access to their database (or a subset)
3. Verify your integration handles real-world data volumes and edge cases

### Step 5: Apply to Marketplace

When your integration is solid:

1. Visit [marketplace.geotab.com/integrate-geotab/](https://marketplace.geotab.com/integrate-geotab/)
2. Complete the partner application
3. Geotab reviews your integration
4. If approved, your solution appears in the Marketplace

---

## Development Tools

| Tool | Purpose | Link |
|------|---------|------|
| **SDK Runner** | Test API calls against your database | [geotab.github.io/sdk](https://geotab.github.io/sdk/) |
| **Add-In Generator** | Scaffold and test Add-Ins locally | Part of SDK |
| **CheckMate API** | Video integration API | Contact Geotab |
| **IOX Protocol Docs** | Hardware integration specs | Contact Geotab |

---

## Common Data Types You'll Use

| TypeName | What It Contains | Common Use |
|----------|------------------|------------|
| `Device` | Vehicles and assets | Fleet inventory |
| `Trip` | Individual trips with start/end times | Trip history, utilization |
| `LogRecord` | GPS breadcrumbs | Location tracking, replay |
| `StatusData` | Engine data (speed, fuel, odometer) | Diagnostics, fuel analysis |
| `ExceptionEvent` | Rule violations | Safety reporting |
| `FuelTransaction` | Fuel purchases | Fuel management |
| `User` | Drivers and operators | Driver management |
| `Zone` | Geographic areas | Geofencing |
| `Diagnostic` | Engine diagnostic definitions | Maintenance |

---

## Architecture Considerations

### Data Volume

Geotab generates massive amounts of data. Plan for:

- **Polling frequency:** Use GetFeed for continuous sync, not repeated Get calls
- **Pagination:** Large fleets have thousands of vehicles; paginate requests
- **Caching:** Cache slowly-changing data (device info, zones) locally
- **Time ranges:** Always scope queries with fromDate/toDate

### Security

- Never hardcode credentials
- Use OAuth or session-based auth for production
- Store API tokens securely (environment variables, secrets manager)
- Implement rate limiting in your application

### User Experience

- If building an Add-In, match MyGeotab's UI patterns
- Handle loading states—API calls take time
- Gracefully handle permission errors (users may not have access to all data)
- Support multiple languages if targeting global customers

---

## Next Steps

### If You're Ready to Build

1. **Get the SDK:** [github.com/Geotab/sdk](https://github.com/Geotab/sdk)
2. **Create a demo account:** [my.geotab.com/registration.html](https://my.geotab.com/registration.html)
3. **Build an Add-In:** [GEOTAB_ADDINS.md](./GEOTAB_ADDINS.md)
4. **Study the API:** [API_REFERENCE_FOR_AI.md](./API_REFERENCE_FOR_AI.md)

### If You Want to Learn More

- **Geotab Connect 2026:** Annual partner conference (Las Vegas, Feb 10-12, 2026)
- **Marketplace Hub:** Partner content, case studies, testimonials
- **SDK Support:** [Geotab SDK discussions on GitHub](https://github.com/Geotab/sdk/discussions)

### If You're Ready to Partner

- **Apply here:** [marketplace.geotab.com/integrate-geotab/](https://marketplace.geotab.com/integrate-geotab/)
- **Partner overview:** [geotab.com/partners/overview/](https://www.geotab.com/partners/overview/)

---

## Resources

**Official:**
- [Geotab SDK](https://geotab.github.io/sdk/) — Developer documentation
- [Geotab Marketplace](https://marketplace.geotab.com/) — Browse existing solutions
- [Partner Program](https://www.geotab.com/partners/overview/) — Partnership information
- [Geotab Extensions](https://marketplace.geotab.com/partner/geotab-extensions/) — Reference implementations

**From This Repository:**
- [GEOTAB_ADDINS.md](./GEOTAB_ADDINS.md) — Build Add-Ins step by step
- [API_REFERENCE_FOR_AI.md](./API_REFERENCE_FOR_AI.md) — API patterns for any AI tool
- [CREDENTIALS.md](./CREDENTIALS.md) — Set up your .env file
- [HACKATHON_IDEAS.md](./HACKATHON_IDEAS.md) — Project ideas to inspire your integration

---

**Have a fleet solution? Build on Geotab and reach millions of vehicles.**
