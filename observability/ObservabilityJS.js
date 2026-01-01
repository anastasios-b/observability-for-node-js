const fs = require('fs');
const path = require('path');

class ObservabilityJS {
    constructor({
        appToObserve = null,
        logFilePrefix = 'observability',
        maxEntriesPerFile = 100,
        ignorePaths = []
    } = {}) {
        this.appToObserve = appToObserve;
        this.logFilePrefix = logFilePrefix;
        this.maxEntriesPerFile = maxEntriesPerFile;
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

    rotateIfNeeded() {
        if (this.currentEntryCount < this.maxEntriesPerFile) return;

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
        this.rotateIfNeeded();

        fs.appendFile(
            this.logFilePath,
            JSON.stringify(entry) + '\n',
            err => err && console.error('Failed to write log:', err)
        );

        this.currentEntryCount++;
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
       EXPRESS SUPPORT (OPTIONAL)
       =============================== */

    attachExpressMiddleware() {
        if (this._attached) return;
        this._attached = true;

        const loggedResponses = new WeakSet();

        this.appToObserve.use((req, res, next) => {
            // Skip ignored paths
            if (this.ignorePaths.some(p => req.originalUrl.startsWith(p))) return next();

            const span = this.startSpan({
                method: req.method,
                endpoint: req.originalUrl
            });

            res.on('finish', () => {
                if (loggedResponses.has(res)) return; // already logged
                loggedResponses.add(res);

                this.endSpan(span, { statusCode: res.statusCode });
            });

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
            failureRate: total ? ((failures / total) * 100).toFixed(2) : 0
        };
    }
}

module.exports = ObservabilityJS;
