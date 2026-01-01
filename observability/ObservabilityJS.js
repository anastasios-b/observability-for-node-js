const fs = require('fs');
const path = require('path');

class ObservabilityJS {
    constructor({
        appToObserve = null,
        logFilePrefix = 'observability',
        maxEntriesPerFile = 100
    } = {}) {
        this.appToObserve = appToObserve;
        this.logFilePrefix = logFilePrefix;
        this.maxEntriesPerFile = maxEntriesPerFile;
        this.currentFileIndex = 1;
        this.currentEntryCount = 0;

        this.logFilePath = this.getLogFilePath(this.currentFileIndex);

        // Ensure initial log file exists
        if (!fs.existsSync(this.logFilePath)) {
            fs.writeFileSync(this.logFilePath, '');
        } else {
            // If file exists, count existing entries to continue rotation properly
            const lines = fs.readFileSync(this.logFilePath, 'utf8').split('\n').filter(Boolean);
            this.currentEntryCount = lines.length;
        }

        // Bind middleware if app (Express-like) is provided
        if (this.appToObserve) {
            this.attachMiddleware();
        }
    }

    getLogFilePath(index) {
        return path.resolve(`${this.logFilePrefix}_${index}.log`);
    }

    // Middleware for Express-like apps
    attachMiddleware() {
        if (!this.appToObserve || !this.appToObserve.use) return;

        this.appToObserve.use(async (req, res, next) => {
            const startTime = Date.now();

            res.on('finish', () => {
                const logEntry = {
                    timestamp: new Date().toISOString(),
                    method: req.method,
                    endpoint: req.originalUrl || req.url,
                    statusCode: res.statusCode,
                    latencyMs: Date.now() - startTime,
                    requestBody: req.body,
                    requestHeaders: req.headers
                };
                this.writeLog(logEntry);
            });

            next();
        });
    }

    log({ service, endpoint, method, statusCode, errorMessage = null, latencyMs = null }) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            service,
            endpoint,
            method,
            statusCode,
            latencyMs,
            errorMessage
        };
        this.writeLog(logEntry);
    }

    writeLog(entry) {
        const line = JSON.stringify(entry);

        // Rotate file if current entry count reached max
        if (this.currentEntryCount >= this.maxEntriesPerFile) {
            this.currentFileIndex++;
            this.logFilePath = this.getLogFilePath(this.currentFileIndex);
            this.currentEntryCount = 0;
            // Ensure the new file exists
            if (!fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, '');
            }
        }

        fs.appendFile(this.logFilePath, line + '\n', (err) => {
            if (err) console.error('Failed to write log:', err);
        });

        this.currentEntryCount++;
    }

    readLogs({ filter = null } = {}) {
        let allLogs = [];

        // Read all files in sequence
        for (let i = 1; i <= this.currentFileIndex; i++) {
            const filePath = this.getLogFilePath(i);
            if (!fs.existsSync(filePath)) continue;

            const raw = fs.readFileSync(filePath, 'utf8');
            const lines = raw.split('\n').filter(Boolean).map(JSON.parse);
            allLogs = allLogs.concat(lines);
        }

        if (!filter) return allLogs;

        return allLogs.filter(log =>
            Object.entries(filter).every(([key, value]) => log[key] === value)
        );
    }

    getStats() {
        const logs = this.readLogs();
        const total = logs.length;
        const successes = logs.filter(l => l.statusCode >= 200 && l.statusCode < 300).length;
        const failures = logs.filter(l => l.statusCode >= 400).length;

        return {
            total,
            successes,
            failures,
            successRate: total ? ((successes / total) * 100).toFixed(2) : 0,
            failureRate: total ? ((failures / total) * 100).toFixed(2) : 0
        };
    }
}

module.exports = ObservabilityJS;
