const express = require('express');
const ObservabilityJS = require('./ObservabilityJS');
const path = require('path');

module.exports = (app, port) => {
    const router = express.Router();

    // Initialize observability instance
    const obs = new ObservabilityJS({
        appToObserve: app,
        logFilePrefix: path.join(__dirname, 'logs/observability'),
        maxEntriesPerLogFile: 100, // max log entries to be written in each file
        ignorePaths: [
            '/observability',           // ignore observability routes
            '/.well-known/appspecific'  // ignore certain browser requests
        ]
    });

    // Serve observability dashboard static files
    router.use(
        '/dashboard',
        express.static(__dirname)
    );

    // Stats endpoint
    router.get('/stats', (req, res) => {
        res.json(obs.getStats());
    });

    // Paginated slow requests (>500ms)
    router.get('/slow', (req, res) => {
        const page = parseInt(req.query.page || '1', 10);
        const perPage = parseInt(req.query.perPage || '20', 10);

        const logs = obs.getSlowRequests({ thresholdMs: 500, page, perPage });
        res.json({ logs });
    });

    // Paginated logs
    router.get('/logs', (req, res) => {
        const page = parseInt(req.query.page || '1', 10);
        const perPage = parseInt(req.query.perPage || '50', 10);

        const logs = obs.readLogsPaginated({ page, perPage });
        res.json({ page, perPage, logs });
    });

    // Create a new snapshot
    router.post('/snapshots', express.json(), (req, res) => {
        try {
            const { name } = req.body;
            const snapshot = obs.createSnapshot(name);
            res.status(201).json(snapshot);
        } catch (error) {
            console.error('Error creating snapshot:', error);
            res.status(500).json({
                error: 'Failed to create snapshot',
                details: error.message
            });
        }
    });

    // List all snapshots
    router.get('/snapshots', (req, res) => {
        try {
            const snapshots = obs.listSnapshots();
            res.json(snapshots);
        } catch (error) {
            console.error('Error listing snapshots:', error);
            res.status(500).json({
                error: 'Failed to list snapshots',
                details: error.message
            });
        }
    });

    // Get a specific snapshot
    router.get('/snapshots/:id', (req, res) => {
        try {
            const { id } = req.params;
            const snapshot = obs.getSnapshot(id);

            if (!snapshot) {
                return res.status(404).json({ error: 'Snapshot not found' });
            }

            res.json(snapshot);
        } catch (error) {
            console.error('Error getting snapshot:', error);
            res.status(500).json({
                error: 'Failed to get snapshot',
                details: error.message
            });
        }
    });

    // Export a snapshot as a file
    router.get('/snapshots/:id/export', (req, res) => {
        try {
            const snapshot = obs.getSnapshot(req.params.id);
            if (!snapshot) {
                return res.status(404).json({ error: 'Snapshot not found' });
            }
            const fileName = `snapshot_${snapshot.metadata.snapshotId || snapshot.metadata.name || req.params.id}.json`;
            res.setHeader('Content-disposition', `attachment; filename=${fileName}`);
            res.setHeader('Content-type', 'application/json');
            res.send(JSON.stringify(snapshot, null, 2));
        } catch (error) {
            console.error(`Error exporting snapshot ${req.params.id}:`, error);
            res.status(500).json({
                error: 'Failed to export snapshot',
                details: error.message
            });
        }
    });

    // Delete a snapshot
    router.delete('/snapshots/:id', (req, res) => {
        try {
            const success = obs.deleteSnapshot(req.params.id);
            if (!success) {
                return res.status(404).json({ error: 'Snapshot not found' });
            }
            res.status(204).send();
        } catch (error) {
            console.error(`Error deleting snapshot ${req.params.id}:`, error);
            res.status(500).json({
                error: 'Failed to delete snapshot',
                details: error.message
            });
        }
    });

    return router;
};
