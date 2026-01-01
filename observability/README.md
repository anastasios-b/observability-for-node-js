# Observability JS
Observability JS is an open-source library to monitor actions happening on a service.
For example, your service sends a POST HTTP request to a third-party source and receives a 421 error.
It gets documented and you can view exactly what happened and when via the dashboard.

## Installation
1. Download this repo.
2. Extract it.
3. Get the folder ```observability``` and copy it in a desired location inside your Express app's file system (we recommend ```/utils```, but you can use any path you like).
4. Import the library at the top of your Express app's index file:
```const ObservabilityJS = require('/path/to/observability-js/ObservabilityJS')```

## Example Node.js App
```
const http = require('http');
const obs = new ObservabilityJS();

http.createServer((req, res) => {
    const span = obs.startSpan({
        method: req.method,
        endpoint: req.url
    });

    res.statusCode = 200;
    res.end('OK');

    obs.endSpan(span, { statusCode: res.statusCode });
}).listen(3000);
```

## Example Express App
```
const express = require('express');
const path = require('path');

// Import ObservabilityJS from utils folder
const ObservabilityJS = require('./utils/observability/ObservabilityJS');

const app = express();
const PORT = 3000;

app.use(express.json());

// ---------- START OF OBSERVABILITY SET UP ----------

// Initialize observability and automatically attach to app
const obs = new ObservabilityJS({
    appToObserve: app,
    logFilePrefix: './utils/observability/logs/observability',
    maxEntriesPerFile: 100
});

// Serve dashboard from the observability folder
app.use('/observability/dashboard', express.static(path.join(__dirname, 'utils/observability')));

// API endpoint for stats
app.get('/observability/stats', (req, res) => {
    res.json(obs.getStats());
});

// ---------- END OF OBSERVABILITY SET UP ----------

// Your existing routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

```