const express = require('express');
const path = require('path');



// Import ObservabilityJS from utils folder
const ObservabilityJS = require('./utils/observability/ObservabilityJS');



const app = express();
const PORT = 3000;

app.use(express.json());



// ---------- START OF OBSERVABILITY SET UP ----------

const obs = new ObservabilityJS({
    appToObserve: app,
    logFilePrefix: './utils/observability/logs/observability',
    maxEntriesPerFile: 100,
    ignorePaths: [
        '/observability',
        '/observability/stats',
        '/.well-known/appspecific'
    ]
});

// Serve observability dashboard
app.use(
    '/observability/dashboard',
    express.static(path.join(__dirname, 'utils/observability'))
);

// Stats endpoint
app.get('/observability/stats', (req, res) => {
    res.json(obs.getStats());
});

// Paginated slow requests (>500ms)
app.get('/observability/slow', (req, res) => {
    const page = parseInt(req.query.page || '1');
    const perPage = parseInt(req.query.perPage || '20');

    const logs = obs.getSlowRequests({ thresholdMs: 500, page, perPage });
    res.json({ logs });
});

// Read logs
app.get('/observability/logs', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 50;

    const logs = obs.readLogsPaginated({ page, perPage });
    res.json({ page, perPage, logs });
});

// ---------- END OF OBSERVABILITY SET UP ----------



// Serve main app frontend
app.use(express.static(path.join(__dirname, 'public')));



// ---------- TEST ROUTES ----------

// Slow endpoint for testing
app.get('/slow-endpoint', (req, res) => {
    const delayMs = 1000; // 1 second delay

    setTimeout(() => {
        res.status(200).json({ message: `Responded after ${delayMs}ms` });
    }, delayMs);
});

// Misdirected Request 421
app.get('/request-421', (req, res) => {
    res.status(421).json({ message: 'Misdirect request called' });
});

// Unauthorized 401
app.get('/request-401', (req, res) => {
    res.status(401).json({ message: 'Not authorized request called' });
});

// GET route
app.get('/get-something', (req, res) => {
    res.status(200).json({ message: 'GET something' });
});

// POST route
app.post('/post-something', (req, res) => {
    res.status(201).json({ message: 'POSTed something' });
});

// PUT route
app.put('/put-something', (req, res) => {
    res.status(200).json({ message: 'PUT something' });
});

// PATCH route
app.patch('/patch-something', (req, res) => {
    
    res.status(200).json({ message: 'PATCHed something' });
});

// DELETE  something
app.delete('/delete-something', (req, res) => {
    res.status(200).json({ message: 'Deleted something' });
});

// ---------- END OF TEST ROUTES ----------



// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
