# CSS Class Reference Guide

This document explains all semantic CSS classes used in the Flux Frontend application.

## 📋 Table of Contents

- [Layout Components](#layout-components)
- [Cards & Containers](#cards--containers)
- [Tables](#tables)
- [Buttons](#buttons)
- [Forms](#forms)
- [Badges & Status](#badges--status)
- [Signal Strength](#signal-strength)
- [States](#states)
- [Typography](#typography)

---

## Layout Components

### App Container
```css
.app-container          /* Main application wrapper */
```

### Header
```css
.app-header             /* Header container */
.app-header-content     /* Header content wrapper (max-width) */
.app-header-inner       /* Header flex container */
.app-header-branding    /* Logo + title area */
.app-header-logo        /* Logo icon */
.app-header-titles      /* Title + subtitle wrapper */
.app-header-title       /* Main title */
.app-header-subtitle    /* Subtitle text */
.app-header-actions     /* Right-side actions */
.app-header-meta        /* Metadata (last updated, etc.) */
```

### Main Content
```css
.app-main               /* Main content area (max-width container) */
.section-spacing        /* Spacing between sections (mb-8) */
```

### Footer
```css
.app-footer             /* Footer container */
.app-footer-content     /* Footer content wrapper */
.app-footer-text        /* Footer text styling */
```

---

## Cards & Containers

### Basic Card
```css
.card                   /* Base card component */
.card-header            /* Card header with title */
.card-header-icon       /* Icon in card header */
```

### Statistics Cards
```css
.stat-card              /* Statistics card with gradient */
.stat-card-content      /* Card content layout */
.stat-card-info         /* Text information area */
.stat-card-label        /* Stat label text */
.stat-card-value        /* Large stat value */
.stat-card-icon         /* Stat icon */
.stats-grid             /* Grid layout for stats (responsive 1/2/4 cols) */
```

---

## Tables

### Structure
```css
.table-container        /* Scrollable table wrapper */
.table                  /* Table element */
.table-head             /* Table header */
.table-header-cell      /* Header cell styling */
.table-body             /* Table body */
.table-row              /* Table row with hover */
```

### Cells
```css
.table-cell             /* Standard table cell */
.table-cell-mono        /* Monospace cell (MAC addresses) */
.table-cell-muted       /* Muted text cell (timestamps) */
```

---

## Buttons

### Base Buttons
```css
.btn                    /* Base button styles */
.btn-primary            /* Primary action button (blue) */
.btn-secondary          /* Secondary action button (gray) */
.btn-icon               /* Button with icon (flex layout) */
```

### Icons in Buttons
```css
.icon-sm                /* Small icon (w-4 h-4) */
```

---

## Forms

### Inputs
```css
.input                  /* Text input field */
.form-label             /* Form field label */
.form-group             /* Form field container */
```

### Toggle Switch
```css
.toggle-switch          /* Toggle switch base */
.toggle-switch-active   /* Active state (blue) */
.toggle-switch-inactive /* Inactive state (gray) */
.toggle-switch-knob     /* Switch knob/slider */
.toggle-switch-knob-active   /* Knob position when on */
.toggle-switch-knob-inactive /* Knob position when off */
.toggle-label           /* Label with toggle layout */
```

### Sliders
```css
.channel-slider         /* Range input slider */
.channel-slider-labels  /* Min/max labels for slider */
```

---

## Badges & Status

### Badges
```css
.badge                  /* Base badge style */
.badge-connected        /* Connected device status (green) */
.badge-probe            /* Probe-only status (gray) */
.badge-secure           /* Secure encryption (green) */
.badge-open             /* Open network (red) */
.badge-channel          /* Channel number badge (blue) */
```

---

## Signal Strength

### RSSI Colors
```css
.signal-excellent       /* > -50 dBm (green) */
.signal-good            /* -50 to -70 dBm (yellow) */
.signal-weak            /* < -70 dBm (red) */
.signal-unknown         /* N/A (gray) */
```

---

## States

### Loading & Empty
```css
.loading-state          /* Loading message */
.empty-state            /* No data message */
.loading-spinner        /* Animated spinner */
```

### Messages
```css
.message-success        /* Success message (green) */
.message-error          /* Error message (red) */
```

### Status Indicators
```css
.status-active          /* Active status text (green) */
```

---

## Typography

### Text Utilities
```css
.text-muted             /* Muted text (slate-400) */
.text-info              /* Info text (slate-300) */
.text-highlight         /* Highlighted text (white, bold) */
.text-xs-muted          /* Extra small muted text */
.text-sm-info           /* Small info text */
```

---

## Charts

### Chart Components
```css
.chart-container        /* Chart wrapper */
.chart-header           /* Chart header with title + controls */
.chart-toggle-group     /* Toggle button group */
```

---

## Channel Control

### Channel Hopping Specific
```css
.channel-control-grid   /* Channel control form layout */
.channel-preset-grid    /* Preset buttons grid (2 cols) */
.channel-status-panel   /* Status display panel */
.channel-status-info    /* Status information text */
```

---

## Header Metadata

### Last Updated & Controls
```css
.last-updated-text      /* Last updated timestamp */
.auto-refresh-controls  /* Auto-refresh toggle controls */
.auto-refresh-label     /* Auto-refresh label text */
```

---

## Usage Examples

### Card with Header
```jsx
<div className="card">
  <h2 className="card-header">
    <Icon className="card-header-icon" />
    Title
  </h2>
  {/* Content */}
</div>
```

### Table Structure
```jsx
<div className="table-container">
  <table className="table">
    <thead className="table-head">
      <tr>
        <th className="table-header-cell">Header</th>
      </tr>
    </thead>
    <tbody className="table-body">
      <tr className="table-row">
        <td className="table-cell">Data</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Toggle Switch
```jsx
<div className="toggle-label">
  <label className="form-label">Label</label>
  <button 
    className={`toggle-switch ${enabled ? 'toggle-switch-active' : 'toggle-switch-inactive'}`}
  >
    <span className={`toggle-switch-knob ${
      enabled ? 'toggle-switch-knob-active' : 'toggle-switch-knob-inactive'
    }`} />
  </button>
</div>
```

### Badges
```jsx
<span className="badge badge-connected">Connected</span>
<span className="badge badge-probe">Probe</span>
<span className="badge badge-secure">WPA2</span>
<span className="badge badge-open">Open</span>
<span className="badge-channel">6</span>
```

### Signal Strength
```jsx
const signalClass = rssi > -50 ? 'signal-excellent' :
                   rssi > -70 ? 'signal-good' : 'signal-weak';

<td className={`table-cell ${signalClass}`}>
  {rssi} dBm
</td>
```

### Buttons
```jsx
<button className="btn btn-primary btn-icon">
  <Icon className="icon-sm" />
  Text
</button>
```

---

## File Location

All classes are defined in:
```
frontend/src/index.css
```

Classes use Tailwind's `@apply` directive, so they're processed at build time and include all Tailwind utilities.

---

## Naming Convention

We follow this pattern:

- **Component prefix** - `app-`, `stat-`, `table-`, `channel-`, etc.
- **Element descriptor** - `header`, `content`, `cell`, `icon`, etc.
- **State suffix** - `-active`, `-inactive`, `-muted`, etc.

Examples:
- `app-header-content` - Header content area
- `toggle-switch-active` - Active toggle state
- `table-cell-mono` - Monospace table cell
- `signal-excellent` - Excellent signal strength

---

