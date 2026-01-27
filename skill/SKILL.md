---
name: geotab-zenith-design
description: Build UIs for Geotab applications using the Zenith design system and React component library. Use when creating MyGeotab Add-Ins, custom dashboards, or any Geotab-branded frontend interfaces that need consistent styling and accessible components.
license: Apache-2.0
metadata:
  author: Felipe Hoffa (https://www.linkedin.com/in/hoffa/)
  version: "1.0"
---

# Geotab Zenith Design System

## Purpose

This skill teaches AI assistants how to build professional, consistent UIs for Geotab applications using the Zenith design system. Zenith is Geotab's official React component library that provides accessible, pre-built components following Geotab's design standards.

## When to Use This Skill

- Building MyGeotab Add-Ins with professional UI
- Creating custom fleet management dashboards
- Developing React applications for Geotab integrations
- When you need accessible, WCAG 2.2 compliant components
- When consistency with MyGeotab's look and feel is required

## What is Zenith?

Zenith is Geotab's global design system built in React. It provides:

- **Pre-built React components** (buttons, inputs, tables, modals, etc.)
- **Design tokens** (colors, spacing, typography)
- **Accessibility built-in** (WCAG 2.2 compliant)
- **Consistent styling** matching MyGeotab interface

Internally, Geotab has seen Zenith pages **increase speed to production by over 40%**.

## Design System Hierarchy

Zenith organizes components into four levels:

### 1. Electrons (Foundation)
Building blocks that define fundamental design decisions:
- **Spacing** - Consistent margins and padding
- **Colors** - Geotab brand palette
- **Typography** - Font families, sizes, weights
- **Shadows** - Elevation system
- **Border radius** - Corner rounding

### 2. Atoms (Basic Components)
Simple, commonly used UI elements:
- Buttons
- Checkboxes
- Radio buttons
- Text inputs
- Dropdowns
- Badges
- Icons
- Links

### 3. Organisms (Complex Components)
Multiple atoms combined into sophisticated elements:
- Tables with sorting/filtering
- Toolbars
- Side panels
- Navigation menus
- Modal dialogs
- Form groups
- Cards

### 4. Templates (Page Layouts)
Generic page skeletons for common use cases:
- Dashboard layouts
- List views
- Detail views
- Settings pages

## Installation & Setup

### 1. Install the Package

```bash
npm install @geotab/zenith
```

### 2. Import Styles

Include the CSS file in your project. The styles are located at `@geotab/zenith/dist/index.css`.

**In JavaScript/React:**
```javascript
import '@geotab/zenith/dist/index.css';
```

**In LESS/SASS:**
```scss
@import '@geotab/zenith/dist/index.css';
```

### 3. Import Components

```javascript
import { Button, TextField, Table } from '@geotab/zenith';
```

Some components may need direct imports:
```javascript
import { SpecificComponent } from '@geotab/zenith/dist/components/SpecificComponent';
```

## Core Components

### Buttons

```jsx
import { Button } from '@geotab/zenith';

// Primary action button
<Button variant="primary" onClick={handleClick}>
  Save Changes
</Button>

// Secondary button
<Button variant="secondary" onClick={handleCancel}>
  Cancel
</Button>

// Danger/destructive action
<Button variant="danger" onClick={handleDelete}>
  Delete
</Button>

// Disabled state
<Button variant="primary" disabled>
  Processing...
</Button>

// With icon
<Button variant="primary" icon="save">
  Save
</Button>
```

### Text Fields

```jsx
import { TextField } from '@geotab/zenith';

// Basic input
<TextField
  label="Vehicle Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>

// With placeholder
<TextField
  label="Search"
  placeholder="Enter vehicle ID..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
/>

// With validation error
<TextField
  label="Email"
  value={email}
  error="Please enter a valid email address"
  onChange={(e) => setEmail(e.target.value)}
/>

// Required field
<TextField
  label="Driver ID"
  required
  value={driverId}
  onChange={(e) => setDriverId(e.target.value)}
/>
```

### Select/Dropdown

```jsx
import { Select } from '@geotab/zenith';

<Select
  label="Vehicle Group"
  value={selectedGroup}
  onChange={(value) => setSelectedGroup(value)}
  options={[
    { value: 'all', label: 'All Vehicles' },
    { value: 'trucks', label: 'Trucks' },
    { value: 'vans', label: 'Vans' },
    { value: 'cars', label: 'Cars' }
  ]}
/>
```

### Tables

```jsx
import { Table } from '@geotab/zenith';

const columns = [
  { key: 'name', header: 'Vehicle Name', sortable: true },
  { key: 'status', header: 'Status' },
  { key: 'driver', header: 'Assigned Driver' },
  { key: 'lastTrip', header: 'Last Trip', sortable: true }
];

const data = [
  { id: 1, name: 'Truck 001', status: 'Active', driver: 'John Smith', lastTrip: '2025-01-15' },
  { id: 2, name: 'Van 002', status: 'Idle', driver: 'Jane Doe', lastTrip: '2025-01-14' }
];

<Table
  columns={columns}
  data={data}
  onSort={(key, direction) => handleSort(key, direction)}
  onRowClick={(row) => handleRowClick(row)}
/>
```

### Checkboxes

```jsx
import { Checkbox } from '@geotab/zenith';

<Checkbox
  label="Enable notifications"
  checked={notificationsEnabled}
  onChange={(checked) => setNotificationsEnabled(checked)}
/>

// Indeterminate state (for "select all")
<Checkbox
  label="Select all vehicles"
  checked={allSelected}
  indeterminate={someSelected && !allSelected}
  onChange={handleSelectAll}
/>
```

### Modal Dialogs

```jsx
import { Modal } from '@geotab/zenith';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
>
  <p>Are you sure you want to delete this vehicle?</p>
  <div className="modal-actions">
    <Button variant="secondary" onClick={() => setShowModal(false)}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Delete
    </Button>
  </div>
</Modal>
```

### Loading States

```jsx
import { Spinner, Skeleton } from '@geotab/zenith';

// Spinner for async operations
<Spinner size="medium" />

// Skeleton for content loading
<Skeleton width="100%" height="40px" />
<Skeleton width="60%" height="20px" />
```

### Alerts/Banners

```jsx
import { Alert } from '@geotab/zenith';

// Success message
<Alert variant="success">
  Vehicle settings saved successfully.
</Alert>

// Warning message
<Alert variant="warning">
  This vehicle has pending maintenance.
</Alert>

// Error message
<Alert variant="error">
  Failed to load trip data. Please try again.
</Alert>

// Info message
<Alert variant="info">
  New features are available in this update.
</Alert>
```

## Design Tokens (Colors & Spacing)

### Color Palette

```css
/* Primary brand colors */
--zenith-primary: #0078D4;        /* Geotab blue */
--zenith-primary-dark: #005A9E;
--zenith-primary-light: #C7E0F4;

/* Semantic colors */
--zenith-success: #107C10;        /* Green - success states */
--zenith-warning: #FFB900;        /* Yellow - warnings */
--zenith-error: #D13438;          /* Red - errors */
--zenith-info: #0078D4;           /* Blue - information */

/* Neutral colors */
--zenith-neutral-900: #201F1E;    /* Darkest text */
--zenith-neutral-700: #3B3A39;
--zenith-neutral-500: #605E5C;
--zenith-neutral-300: #A19F9D;
--zenith-neutral-100: #EDEBE9;    /* Lightest backgrounds */
--zenith-white: #FFFFFF;
```

### Spacing Scale

```css
/* Spacing tokens */
--zenith-spacing-xs: 4px;
--zenith-spacing-sm: 8px;
--zenith-spacing-md: 16px;
--zenith-spacing-lg: 24px;
--zenith-spacing-xl: 32px;
--zenith-spacing-xxl: 48px;
```

### Typography

```css
/* Font family */
--zenith-font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;

/* Font sizes */
--zenith-font-size-xs: 10px;
--zenith-font-size-sm: 12px;
--zenith-font-size-md: 14px;      /* Default body text */
--zenith-font-size-lg: 16px;
--zenith-font-size-xl: 20px;
--zenith-font-size-xxl: 28px;     /* Page titles */

/* Font weights */
--zenith-font-weight-regular: 400;
--zenith-font-weight-semibold: 600;
--zenith-font-weight-bold: 700;
```

## Complete Example: Fleet Dashboard

```jsx
import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Table,
  Select,
  Alert,
  Spinner,
  Modal
} from '@geotab/zenith';
import '@geotab/zenith/dist/index.css';

function FleetDashboard({ api }) {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    setError(null);

    try {
      const devices = await new Promise((resolve, reject) => {
        api.call('Get', { typeName: 'Device' }, resolve, reject);
      });
      setVehicles(devices);
    } catch (err) {
      setError('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { key: 'name', header: 'Vehicle Name', sortable: true },
    { key: 'serialNumber', header: 'Serial Number' },
    { key: 'deviceType', header: 'Device Type' }
  ];

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: 'var(--zenith-spacing-lg)' }}>
      <h1 style={{
        fontSize: 'var(--zenith-font-size-xxl)',
        fontWeight: 'var(--zenith-font-weight-bold)',
        marginBottom: 'var(--zenith-spacing-lg)'
      }}>
        Fleet Dashboard
      </h1>

      {error && (
        <Alert variant="error" style={{ marginBottom: 'var(--zenith-spacing-md)' }}>
          {error}
        </Alert>
      )}

      <div style={{
        display: 'flex',
        gap: 'var(--zenith-spacing-md)',
        marginBottom: 'var(--zenith-spacing-lg)'
      }}>
        <TextField
          label="Search Vehicles"
          placeholder="Enter vehicle name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1 }}
        />

        <Select
          label="Filter by Group"
          value={selectedGroup}
          onChange={setSelectedGroup}
          options={[
            { value: 'all', label: 'All Groups' },
            { value: 'trucks', label: 'Trucks' },
            { value: 'vans', label: 'Vans' }
          ]}
        />

        <Button variant="primary" onClick={loadVehicles}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--zenith-spacing-xl)' }}>
          <Spinner size="large" />
          <p>Loading vehicles...</p>
        </div>
      ) : (
        <Table
          columns={columns}
          data={filteredVehicles}
          onRowClick={(vehicle) => {
            setSelectedVehicle(vehicle);
            setShowDetails(true);
          }}
        />
      )}

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={selectedVehicle?.name || 'Vehicle Details'}
      >
        {selectedVehicle && (
          <div>
            <p><strong>Name:</strong> {selectedVehicle.name}</p>
            <p><strong>Serial:</strong> {selectedVehicle.serialNumber}</p>
            <p><strong>Type:</strong> {selectedVehicle.deviceType}</p>
          </div>
        )}
        <div style={{ marginTop: 'var(--zenith-spacing-lg)', textAlign: 'right' }}>
          <Button variant="secondary" onClick={() => setShowDetails(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default FleetDashboard;
```

## Accessibility Guidelines

Zenith components are WCAG 2.2 compliant. Follow these practices:

### Keyboard Navigation
- All interactive elements are focusable via Tab
- Enter/Space activates buttons and controls
- Escape closes modals and dropdowns
- Arrow keys navigate within menus and tables

### Labels and ARIA
```jsx
// Always provide labels for form fields
<TextField label="Email Address" ... />  // ✅ Good

// Use aria-label when visual label isn't possible
<Button aria-label="Close dialog" icon="close" />  // ✅ Good

// Associate error messages with inputs
<TextField
  label="Email"
  error="Invalid email format"
  aria-describedby="email-error"
/>
```

### Color Contrast
- Text meets WCAG AA contrast ratios (4.5:1 for normal text)
- Don't rely solely on color to convey information
- Use icons or text alongside color indicators

### Focus Management
```jsx
// Return focus to trigger element when modal closes
const triggerRef = useRef();

<Button ref={triggerRef} onClick={() => setShowModal(true)}>
  Open Dialog
</Button>

<Modal
  isOpen={showModal}
  onClose={() => {
    setShowModal(false);
    triggerRef.current?.focus();  // Return focus
  }}
>
```

## Common Mistakes to Avoid

### ❌ Not Importing CSS
```jsx
// Missing styles - components won't look right
import { Button } from '@geotab/zenith';
```

### ✅ Always Import CSS
```jsx
import { Button } from '@geotab/zenith';
import '@geotab/zenith/dist/index.css';  // Required!
```

### ❌ Overriding Zenith Styles
```jsx
// Don't fight the design system
<Button style={{ backgroundColor: 'purple', borderRadius: '0' }}>
  Custom Button
</Button>
```

### ✅ Use Variants and Props
```jsx
// Use provided variants for consistency
<Button variant="primary">
  Standard Button
</Button>
```

### ❌ Ignoring Loading States
```jsx
// Bad UX - no feedback during loading
{data.map(item => <Row item={item} />)}
```

### ✅ Show Loading Feedback
```jsx
{loading ? (
  <Spinner />
) : (
  data.map(item => <Row item={item} />)
)}
```

## Using Zenith in MyGeotab Add-Ins

For MyGeotab Add-Ins using React with Zenith:

### Build Configuration

1. **Bundle React and Zenith** into your Add-In
2. **Include CSS** in your build output
3. **Use ES5-compatible output** for broader browser support

### Example webpack.config.js

```javascript
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'addin.js',
    path: __dirname + '/dist'
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

### Note on Non-React Add-Ins

If you cannot use React (e.g., embedded Add-Ins with vanilla JS), you cannot use Zenith components directly. Instead:

1. **Reference Zenith's design tokens** for colors and spacing
2. **Mimic Zenith's visual style** with CSS
3. **Use inline styles** that match Zenith's appearance

See the `geotab-addins` skill for vanilla JavaScript Add-In patterns.

## Resources

- **Official Documentation**: https://developers.geotab.com/zenith/introduction/
- **Storybook (Component Reference)**: https://developers.geotab.com/zenith-storybook/
- **NPM Package**: https://www.npmjs.com/package/@geotab/zenith
- **Setup Guide**: https://developers.geotab.com/zenith/setup/
- **Contact**: zenith@geotab.com
