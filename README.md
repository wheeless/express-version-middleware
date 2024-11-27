# Version Middleware

A flexible Express middleware for handling API versioning in Node.js applications.

## Features

- Automatic version normalization (e.g., "v1", "1.0", "V1.0" → "v1.0")
- Exact version matching
- Fallback to latest compatible version
- Default to most recent version if no compatible version found
- Type-safe with TypeScript support

## Installation 

```bash
npm install @trarn/express-version-middleware
```

## Usage

There are two main ways to use this middleware:

### Option 1: Route-Level Version Parameter
```typescript
import express from 'express';
import { versionMiddleware } from '@trarn/express-version-middleware';
import { response } from '@trarn/middleware'; // Optional, for response handling

const app = express();

// In your route file (routes/mailRoute.js)
router.get('/:version?/email', versionMiddleware({
    'v1.0': endpointV1,
    'v1.1': endpointV11,
    'v2.0': endpointV2
}));

// In your app.js
app.use('/api/mail', require('./routes/mailRoute'));

// URLs will look like: /api/mail/v1/email
```

### Option 2: Global Version Parameter (Recommended)
```typescript
import express from 'express';
import { versionMiddleware } from '@trarn/express-version-middleware';

const app = express();

// Set up version parameter middleware
app.param('version', (req, res, next, version) => {
    req.version = version;
    next();
});

// Main route with version parameter
app.use('/api/:version?/mail', require('./routes/mailRoute'));
// Or
app.use('/api/mail/:version?', require('./routes/mailRoute'));

// In your route file (routes/mailRoute.js)
router.get('/email', versionMiddleware({
    'v1.0': endpointV1,
    'v1.1': endpointV11,
    'v2.0': endpointV2
}));

// URLs will look like: /api/v1/mail/email
// Or
// URLs will look like: /api/mail/v1/email respectively

// Or use the middleware directly
const versions = {
    'v1.0': (req, res) => {
        response(res, 200, { version: 'v1.0', message: 'Hello from V1' });
    },
    'v2.0': (req, res) => {
        response(res, 200, { version: 'v2.0', message: 'Hello from V2' });
    }
};
// Use the middleware
app.use(versionMiddleware(versions));
// Example route
app.get('/api/version?', (req, res) => {
    // Middleware will handle version routing
});
```

### Example Handlers
```typescript
const versions = {
    'v1.0': (req, res) => {
        response(res, 200, { version: 'v1.0', message: 'Hello from V1' });
    },
    'v2.0': (req, res) => {
        response(res, 200, { version: 'v2.0', message: 'Hello from V2' });
    }
};
```

## Version Handling

The middleware handles versions in the following order:

1. Checks for wildcard versions (e.g., "1.x" will use the latest 1.x version)
2. Attempts exact version match
3. Finds the latest compatible version (highest version number that's lower than or equal to requested version)
4. Falls back to the most recent version if no compatible version is found

## Version Format

Versions are normalized to the format `v{major}.{minor}` (e.g., "v1.0"). The middleware accepts various input formats:

- "v1.0" - Exact version
- "1.0" - Exact version without 'v' prefix
- "v1" - Shorthand (normalizes to v1.0)
- "V1.0" - Case insensitive
- "1" - Shorthand (normalizes to v1.0)
- "1.x" - Latest version within major version 1
- "2.x" - Latest version within major version 2

### Wildcard Examples
```typescript
// In your route file
router.get('/email', versionMiddleware({
    'v1.0': endpointV1,
    'v1.1': endpointV11,
    'v1.2': endpointV12,
    'v2.0': endpointV2
}));

// Request to /api/1.x/mail/email will use v1.2 (latest v1.x)
// Request to /api/2.x/mail/email will use v2.0 (latest v2.x)
// Request without version will use v2.0 (latest overall)
```

## Error Handling

The middleware includes built-in error handling:

- Returns 400 if no valid version handlers are available
- Returns 500 for internal processing errors

## Types

The middleware is fully typed with TypeScript, ensuring type safety and improved developer experience.

```typescript
interface VersionHandler {
    (req: Request, res: Response): void;
}
interface VersionMap {
    [version: string]: VersionHandler;
}
```


## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
