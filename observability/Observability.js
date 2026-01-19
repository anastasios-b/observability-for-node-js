// ObservabilityJS
// What this system does guarantee:
// 1. 
// 2. 
// 3. 

// What this system does not guarantee:
// 1.
// 2.
// 3.

const fs = require('fs');
const path = require('path');



// START - Helper functions

function generateSimpleId() {
    return `snap_${Date.now()}_${Math.floor(Math.random() * 10000).toString(36)}`;
}

function ensureDirectoryExists(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error(`Error creating directory ${dirPath}:`, error);
        return false;
    }
}

// END - Helper functions



// START - Main class

class ObservabilityJS {
    constructor({
        appToObserve = null,
        logFilePrefix = 'observability',
        maxEntriesPerLogFile = 100,
        ignorePaths = []
    } = {}) {
        this.appToObserve = appToObserve;
        this.logFilePrefix = logFilePrefix;
        this.maxEntriesPerLogFile = maxEntriesPerLogFile;
        this.ignorePaths = ignorePaths;

        this.currentFileIndex = 1;
        this.currentEntryCount = 0;

        this.logFilePath = this.getLogFilePath(this.currentFileIndex);

        this.ensureLogDirectoryExists(this.logFilePath);

        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '');
        }

        if (this.appToObserve && typeof this.appToObserve.use === 'function') {
            this.attachExpressMiddleware();
        }
    }

    getLogFilePath(index) {
        return path.resolve(`${this.logFilePrefix}_${index}.log`);
    }

    incrementLogFileIndexIfNeeded() {
        if (this.currentEntryCount < this.maxEntriesPerLogFile) return;

        this.currentFileIndex++;
        this.currentEntryCount = 0;
        this.logFilePath = this.getLogFilePath(this.currentFileIndex);

        this.ensureLogDirectoryExists(this.logFilePath);

        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '');
        }
    }

    ensureLogDirectoryExists(filePath) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    writeLog(entry) {
        this.incrementLogFileIndexIfNeeded();

        try {
            const filePath = this.logFilePath;
            let existing = '';
            if (fs.existsSync(filePath)) {
                existing = fs.readFileSync(filePath, 'utf8');
            }

            const lines = existing.split('\n').filter(Boolean);
            const lastLine = lines[lines.length - 1];
            let shouldOverwriteLast = false;

            if (lastLine) {
                try {
                    const lastEntry = JSON.parse(lastLine);
                    const sameRequest =
                        lastEntry.method === entry.method &&
                        lastEntry.endpoint === entry.endpoint &&
                        lastEntry.statusCode === entry.statusCode;

                    if (sameRequest) {
                        const t1 = new Date(lastEntry.timestamp).getTime();
                        const t2 = new Date(entry.timestamp).getTime();
                        const diffMs = Math.abs(t2 - t1);

                        if (diffMs <= 10) { // 10ms threshold
                            shouldOverwriteLast = true;
                        }
                    }
                } catch {
                    // ignore parse errors
                }
            }

            if (shouldOverwriteLast) {
                // remove last line and append new one
                lines[lines.length - 1] = JSON.stringify(entry);
                fs.writeFileSync(filePath, lines.join('\n') + '\n');
            } else {
                // append normally
                fs.appendFileSync(filePath, JSON.stringify(entry) + '\n');
            }

            this.currentEntryCount++;
        } catch (err) {
            console.error('Failed to write log:', err);
        }
    }

    /* ===============================
       CORE OBSERVABILITY API
       =============================== */

    startSpan({ method, endpoint }) {
        return {
            method,
            endpoint,
            startTime: Date.now()
        };
    }

    endSpan(span, { statusCode, errorMessage = null }) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            method: span.method,
            endpoint: span.endpoint,
            statusCode,
            latencyMs: Date.now() - span.startTime,
            errorMessage
        });
    }

    log(event) {
        this.writeLog({
            timestamp: new Date().toISOString(),
            ...event
        });
    }

    /* ===============================
       EXPRESS SUPPORT
       =============================== */

    attachExpressMiddleware() {
        if (this._attached) return;
        this._attached = true;

        this.appToObserve.use((req, res, next) => {
            // Skip ignored paths
            if (this.ignorePaths.some(p => req.originalUrl.startsWith(p))) return next();

            const span = this.startSpan({
                method: req.method,
                endpoint: req.originalUrl
            });

            // Track if we've logged already
            res.__observabilitySpanLogged = false;

            const logOnce = () => {
                if (res.__observabilitySpanLogged) return;
                res.__observabilitySpanLogged = true;
                this.endSpan(span, { statusCode: res.statusCode });
            };

            res.on('finish', logOnce);
            res.on('close', logOnce); // catch edge cases where connection closes early

            next();
        });
    }

    /* ===============================
       STATS
       =============================== */

    readLogs() {
        const logs = [];

        // Iterate files from newest to oldest
        for (let i = this.currentFileIndex; i >= 1; i--) {
            const file = this.getLogFilePath(i);
            if (!fs.existsSync(file)) continue;

            try {
                const content = fs.readFileSync(file, 'utf8');
                if (!content) continue; // skip empty files

                const lines = content
                    .split('\n')
                    .filter(Boolean)
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null; // skip invalid lines
                        }
                    })
                    .filter(Boolean)
                    .reverse(); // newest first

                logs.push(...lines);
            } catch (err) {
                console.error(`Failed to read log file ${file}:`, err);
                continue;
            }
        }

        return logs;
    }

    readLogsPaginated({ page = 1, perPage = 50 } = {}) {
        const logs = [];
        let collected = 0;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;

        // Iterate files from newest to oldest
        for (let i = this.currentFileIndex; i >= 1; i--) {
            const file = this.getLogFilePath(i);
            if (!fs.existsSync(file)) continue;

            let lines;
            try {
                const content = fs.readFileSync(file, 'utf8');
                if (!content) continue;

                lines = content
                    .split('\n')
                    .filter(Boolean)
                    .map(line => {
                        try {
                            return JSON.parse(line);
                        } catch {
                            return null;
                        }
                    })
                    .filter(Boolean)
                    .reverse();
            } catch (err) {
                console.error(`Failed to read log file ${file}:`, err);
                continue;
            }

            for (const line of lines) {
                if (collected >= endIndex) return logs;
                if (collected >= startIndex) logs.push(line);
                collected++;
            }
        }

        return logs;
    }

    getSlowRequests({ thresholdMs = 500, page = 1, perPage = 20 } = {}) {
        const logs = this.readLogs(); // already newest first
        const slowLogs = logs.filter(l => l.latencyMs > thresholdMs);

        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;

        return slowLogs.slice(startIndex, endIndex);
    }

    getStats() {
        const logs = this.readLogs();

        const total = logs.length;
        const successes = logs.filter(l => l.statusCode >= 200 && l.statusCode < 400).length;
        const failures = logs.filter(l => l.statusCode >= 400).length;

        return {
            total,
            successes,
            failures,
            successRate: total ? ((successes / total) * 100).toFixed(2) : 0,
            failureRate: total ? ((failures / total) * 100).toFixed(2) : 0,
            timestamp: new Date().toISOString()
        };
    }

    /* ===============================
       EXPORT FUNCTIONALITY
       =============================== */

    /**
     * Export all data (logs, stats, slow endpoints) as a JSON object
     * @param {Object} options - Export options
     * @param {number} [options.slowThresholdMs=500] - Threshold in ms for slow requests
     * @param {number} [options.limit=1000] - Maximum number of log entries to include
     * @returns {Object} Exported data
     */
    exportData({ slowThresholdMs = 500, limit = 1000 } = {}) {
        const logs = this.readLogs().slice(0, limit);
        const stats = this.getStats();
        const slowEndpoints = this.getSlowRequests({ thresholdMs: slowThresholdMs, page: 1, perPage: 100 });

        return {
            metadata: {
                exportedAt: new Date().toISOString(),
                logCount: logs.length,
                slowRequestCount: slowEndpoints.length,
                slowThresholdMs
            },
            stats,
            slowEndpoints,
            logs
        };
    }

    /**
     * Export data to a JSON file
     * @param {string} filePath - Path to save the export file
     * @param {Object} options - Export options
     * @returns {string} Path to the exported file
     */
    exportToFile(filePath, options = {}) {
        const data = this.exportData(options);
        const dir = path.dirname(filePath);

        this.ensureLogDirectoryExists(filePath);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

        return filePath;
    }

    /* ===============================
       SNAPSHOT FUNCTIONALITY
       =============================== */

    /**
     * Get the path to the snapshots directory
     * @returns {string} Path to snapshots directory
     */
    getSnapshotsDir() {
        return path.join(__dirname, 'snapshots');
    }

    /**
     * Create a snapshot of the current state
     * @param {string} [name] - Optional name for the snapshot. If not provided, a timestamp will be used.
     * @returns {Object} Snapshot metadata
     */
    createSnapshot(name) {
        try {
            const snapshotsDir = this.getSnapshotsDir();

            // Ensure the directory exists before proceeding
            if (!ensureDirectoryExists(snapshotsDir)) {
                throw new Error('Failed to create snapshots directory');
            }

            const snapshotId = generateSimpleId();
            const timestamp = new Date().toISOString();
            const snapshotName = name || `snapshot_${timestamp.replace(/[:.]/g, '-')}`;

            const snapshotData = this.exportData();
            snapshotData.metadata = snapshotData.metadata || {};
            snapshotData.metadata.snapshotId = snapshotId;
            snapshotData.metadata.name = snapshotName;
            snapshotData.metadata.createdAt = timestamp;

            const fileName = `${snapshotName}.json`;
            const filePath = path.join(snapshotsDir, fileName);

            // Ensure the file can be written
            fs.writeFileSync(filePath, JSON.stringify(snapshotData, null, 2));

            return {
                id: snapshotId,
                name: snapshotName,
                path: filePath,
                createdAt: timestamp,
                stats: snapshotData.stats
            };
        } catch (error) {
            console.error('Error in createSnapshot:', error);
            throw new Error(`Failed to create snapshot: ${error.message}`);
        }
    }

    /**
     * List all available snapshots
     * @returns {Array<Object>} List of snapshots with metadata
     */
    listSnapshots() {
        const snapshotsDir = this.getSnapshotsDir();
        if (!fs.existsSync(snapshotsDir)) {
            return [];
        }

        return fs.readdirSync(snapshotsDir)
            .filter(file => file.endsWith('.json'))
            .map(file => {
                try {
                    const filePath = path.join(snapshotsDir, file);
                    const content = fs.readFileSync(filePath, 'utf8');
                    const data = JSON.parse(content);
                    return {
                        id: data.metadata.snapshotId,
                        name: data.metadata.name || path.basename(file, '.json'),
                        path: filePath,
                        createdAt: data.metadata.createdAt || fs.statSync(filePath).birthtime.toISOString(),
                        stats: data.stats
                    };
                } catch (err) {
                    console.error(`Error reading snapshot file ${file}:`, err);
                    return null;
                }
            })
            .filter(Boolean)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    /**
     * Get a specific snapshot by ID or name
     * @param {string} idOrName - Snapshot ID or name
     * @returns {Object|null} Snapshot data or null if not found
     */
    getSnapshot(idOrName) {
        const snapshots = this.listSnapshots();
        const snapshot = snapshots.find(s => s.id === idOrName || s.name === idOrName);

        if (!snapshot) return null;

        try {
            const content = fs.readFileSync(snapshot.path, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            console.error(`Error reading snapshot ${idOrName}:`, err);
            return null;
        }
    }

    /**
     * Delete a snapshot by ID or name
     * @param {string} idOrName - Snapshot ID or name
     * @returns {boolean} True if deleted, false if not found
     */
    deleteSnapshot(idOrName) {
        const snapshots = this.listSnapshots();
        const snapshot = snapshots.find(s => s.id === idOrName || s.name === idOrName);

        if (!snapshot) return false;

        try {
            fs.unlinkSync(snapshot.path);
            return true;
        } catch (err) {
            console.error(`Error deleting snapshot ${idOrName}:`, err);
            return false;
        }
    }
}

// END - Main class


// Export the main class
module.exports = ObservabilityJS;
