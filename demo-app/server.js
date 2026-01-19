const express = require('express');
const path = require('path');



// Import ObservabilityJS from utils folder
const observabilitySetup = require('./utils/observability/setup');



const app = express();
const PORT = 3000;

app.use(express.json());


// Serve main app frontend
app.use(express.static(path.join(__dirname, 'public')));



// ---------- START OF OBSERVABILITY SET UP ----------

// All observability routes are mounted under /observability
app.use('/observability', observabilitySetup(app, PORT));

// ---------- END OF OBSERVABILITY SET UP ----------



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
