# Observability Dashboard

A lightweight, self-hosted observability solution for Node.js applications. Monitor requests, track errors, and analyze performance metrics in real-time through an intuitive dashboard.

## Features

- 📊 Real-time request monitoring
- ⚡ Performance metrics and slow request tracking
- 🔍 Detailed request/response logging
- 📦 Snapshot functionality for state preservation
- 🎨 Dark/Light mode support
- 📱 Responsive design for all devices

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Dashboard Features](#dashboard-features)
- [Snapshots](#snapshots)
- [Dependencies](#dependencies)
- [Guarantees](#guarantees)
- [License](#license)

## Installation

1. Copy the `observability` folder to your project's `utils` directory:
   ```
   your-project/
   ├── node_modules/
   ├── utils/
   │   └── observability/     # Copy this folder
   ├── app.js
   └── package.json
   ```

2. The observability module is now ready to be imported in your project.

## Quick Start

### For Express.js Applications

```javascript
const express = require('express');
const path = require('path');
const ObservabilityJS = require('./utils/observability/ObservabilityJS');

const app = express();
const PORT = 3000;

// Initialize observability
const obs = new ObservabilityJS({
    appToObserve: app,
    logFilePrefix: './logs/observability',
    maxEntriesPerFile: 100,
    ignorePaths: ['/health', '/metrics']
});

// Serve the dashboard
app.use('/observability', express.static(path.join(__dirname, 'utils/observability')));
app.use('/observability/api', require('./utils/observability/setup')(app));

// Your routes here
app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Dashboard available at http://localhost:${PORT}/observability`);
});
```

### For Non-Express Applications

```javascript
const ObservabilityJS = require('./utils/observability/ObservabilityJS');
const obs = new ObservabilityJS();

// Manual span creation
const span = obs.startSpan({
    method: 'GET',
    endpoint: '/api/data'
});

// Your code here...

// End the span when done
obs.endSpan(span, { statusCode: 200 });
```

## Configuration

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `appToObserve` | `Express App` | `null` | Optional Express app to automatically monitor |
| `logFilePrefix` | `String` | `'./logs/observability'` | Path prefix for log files |
| `maxEntriesPerFile` | `Number` | `100` | Maximum entries per log file before rotation |
| `ignorePaths` | `Array<String>` | `[]` | Paths to exclude from monitoring |

## API Reference

### Core Methods

#### `startSpan(options)`
Start a new monitoring span.

```javascript
const span = obs.startSpan({
    method: 'GET',
    endpoint: '/api/users',
    metadata: { userId: 123 } // Optional additional data
});
```

#### `endSpan(span, options)`
End a monitoring span.

```javascript
obs.endSpan(span, {
    statusCode: 200,
    error: errorObject // Optional error object
});
```

#### `log(event)`
Log a custom event.

```javascript
obs.log({
    level: 'info', // 'info', 'warn', 'error'
    message: 'User logged in',
    metadata: { userId: 123 }
});
```

### Dashboard Endpoints

- `GET /observability` - Dashboard UI
- `GET /observability/api/stats` - Get current statistics
- `GET /observability/api/logs` - Get paginated logs
- `GET /observability/api/slow` - Get slow requests
- `POST /observability/api/snapshots` - Create a new snapshot
- `GET /observability/api/snapshots` - List all snapshots
- `GET /observability/api/snapshots/:id` - Get a specific snapshot
- `GET /observability/api/snapshots/:id/export` - Export a snapshot
- `DELETE /observability/api/snapshots/:id` - Delete a snapshot

## Dashboard Features

### Real-time Monitoring
View request metrics, success/failure rates, and response times in real-time.

### Request Logs
Detailed logs of all monitored requests with filtering capabilities.

### Performance Analysis
Identify slow endpoints and performance bottlenecks.

### Snapshots
Create point-in-time snapshots of your application's state for later analysis.

## Snapshots

### Creating Snapshots

1. Click the "Create Snapshot" button in the dashboard
2. Optionally provide a name
3. The snapshot will include:
   - Current statistics
   - Recent logs
   - Slow request data

### Managing Snapshots

- **View**: Click on a snapshot to view its details
- **Download**: Export snapshot data as JSON
- **Delete**: Remove old snapshots to save space

## Dependencies

- Node.js 14+
- Express 4.x (optional, for automatic request monitoring)
- No external database required (uses file system for storage)

## Guarantees

### What We Guarantee

- **Performance**: Minimal impact on application performance
- **Reliability**: Built-in error handling and recovery
- **Security**: No external dependencies or data collection
- **Privacy**: All data stays within your infrastructure

### Non-Guarantees

- **Persistence**: Logs and snapshots are stored on the local filesystem
- **Scalability**: Best suited for small to medium applications
- **Backup**: No automatic backup of logs or snapshots

## License

MIT 

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) before submitting pull requests.

## Author

 **Anastasios Bolkas**

- GitHub: [@anastasios-b](https://github.com/anastasios-b)
- Portfolio: [anastasios-bolkas.tech](https://anastasios-bolkas.tech)
