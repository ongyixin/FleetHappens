# Zenith Component Quick Reference

Quick copy-paste examples for common Zenith components.

## Setup (Required)

```jsx
import '@geotab/zenith/dist/index.css';
```

## Buttons

```jsx
import { Button } from '@geotab/zenith';

<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="danger">Delete</Button>
<Button variant="primary" disabled>Disabled</Button>
<Button variant="primary" icon="refresh">With Icon</Button>
```

## Text Input

```jsx
import { TextField } from '@geotab/zenith';

<TextField
  label="Label"
  value={value}
  onChange={(e) => setValue(e.target.value)}
  placeholder="Placeholder text"
  required
  error="Error message"
/>
```

## Select/Dropdown

```jsx
import { Select } from '@geotab/zenith';

<Select
  label="Choose option"
  value={selected}
  onChange={setSelected}
  options={[
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ]}
/>
```

## Checkbox

```jsx
import { Checkbox } from '@geotab/zenith';

<Checkbox
  label="Enable feature"
  checked={isChecked}
  onChange={setIsChecked}
/>
```

## Table

```jsx
import { Table } from '@geotab/zenith';

const columns = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'value', header: 'Value' }
];

const data = [
  { id: 1, name: 'Item 1', value: 100 },
  { id: 2, name: 'Item 2', value: 200 }
];

<Table
  columns={columns}
  data={data}
  onRowClick={(row) => console.log(row)}
/>
```

## Modal

```jsx
import { Modal, Button } from '@geotab/zenith';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Modal Title"
>
  <p>Modal content here</p>
  <Button variant="primary" onClick={() => setShowModal(false)}>
    Close
  </Button>
</Modal>
```

## Alert/Banner

```jsx
import { Alert } from '@geotab/zenith';

<Alert variant="success">Success message</Alert>
<Alert variant="warning">Warning message</Alert>
<Alert variant="error">Error message</Alert>
<Alert variant="info">Info message</Alert>
```

## Spinner/Loading

```jsx
import { Spinner } from '@geotab/zenith';

<Spinner size="small" />
<Spinner size="medium" />
<Spinner size="large" />
```

## Common Layout Pattern

```jsx
<div style={{ padding: '24px' }}>
  {/* Page header */}
  <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>
    Page Title
  </h1>

  {/* Toolbar */}
  <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
    <TextField label="Search" ... />
    <Select label="Filter" ... />
    <Button variant="primary">Action</Button>
  </div>

  {/* Content */}
  {loading ? <Spinner /> : <Table ... />}
</div>
```

## CSS Variables (Design Tokens)

```css
/* Colors */
--zenith-primary: #0078D4;
--zenith-success: #107C10;
--zenith-warning: #FFB900;
--zenith-error: #D13438;

/* Spacing */
--zenith-spacing-sm: 8px;
--zenith-spacing-md: 16px;
--zenith-spacing-lg: 24px;
--zenith-spacing-xl: 32px;

/* Typography */
--zenith-font-size-md: 14px;
--zenith-font-size-lg: 16px;
--zenith-font-size-xxl: 28px;
```
