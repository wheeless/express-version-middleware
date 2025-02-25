import { Request, Response, NextFunction } from 'express';
import { response } from '@trarn/middleware';

export interface VersionHandler {
    (req: Request, res: Response): void;
}

export interface VersionMap {
    [version: string]: VersionHandler;
}

/**
 * Normalize version string to consistent 'v1.0' style
 * @param version - Version string to normalize
 * @returns Normalized version string
 */
const normalizeVersion = (version: string): string => {
    // Remove 'v' or 'V' prefix if it exists
    version = version.toLowerCase().replace(/^v/, '');

    // Convert version to number for comparison
    const versionNum = parseFloat(version);

    // Format to consistent 'v1.0' style
    return `v${versionNum.toFixed(1)}`;
};

/**
 * Compare two version strings
 * @param a - First version string
 * @param b - Second version string
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
const compareVersions = (a: string, b: string): number => {
    const aNum = a.toLowerCase().replace('v', '').split('.').map(Number);
    const bNum = b.toLowerCase().replace('v', '').split('.').map(Number);

    // Pad shorter version with zeros to match longer version length
    while (aNum.length < bNum.length) aNum.push(0);
    while (bNum.length < aNum.length) bNum.push(0);

    for (let i = 0; i < aNum.length; i++) {
        if (aNum[i] !== bNum[i]) {
            return bNum[i] - aNum[i];
        }
    }
    return 0;
};

/**
 * Middleware to handle API versioning
 * @param versions - An object where keys are version strings and values are handler functions
 * @returns Express middleware function
 */
export const versionMiddleware = (versions: VersionMap) => {
    return (req: Request & { version?: string }, res: Response, next: NextFunction): void => {
        try {
            const requestedVersion = req.params.version || req.version;

            // Handle x.x or major.x format
            if (requestedVersion && requestedVersion.toLowerCase().includes('x')) {
                const normalizedVersion = normalizeVersion(requestedVersion);
                const majorVersion = parseInt(normalizedVersion.replace('v', ''));
                const sortedVersions = Object.keys(versions)
                    .map((v) => ({
                        version: v,
                        num: parseFloat(v.replace('v', '')),
                    }))
                    .sort((a, b) => b.num - a.num); // Sort in descending order

                // Find highest version matching the major version
                const highestMatchingVersion = sortedVersions.find(
                    (v) => Math.floor(v.num) === majorVersion, // Compare major version numbers
                )?.version;

                if (highestMatchingVersion) {
                    return versions[highestMatchingVersion](req, res);
                }
            }

            // Continue with existing logic for specific versions
            const normalizedRequestVersion = requestedVersion
                ? normalizeVersion(requestedVersion)
                : null;

            // If no version specified, use latest version
            // if (!normalizedRequestVersion) {
            //     const latestVersion = Object.keys(versions).sort((a, b) => {
            //         const aNum = parseFloat(a.replace('v', ''));
            //         const bNum = parseFloat(b.replace('v', ''));
            //         return bNum - aNum;
            //     })[0];
            //     return versions[latestVersion](req, res);
            // }

            if (!normalizedRequestVersion) {
                const latestVersion = Object.keys(versions).sort(compareVersions)[0];
                return versions[latestVersion](req, res);
            }

            if (versions[normalizedRequestVersion]) {
                return versions[normalizedRequestVersion](req, res);
            }

            // If no exact match, sort and find latest compatible version
            // const sortedVersions = Object.keys(versions).sort((a, b) => {
            //     const aNum = parseFloat(a.replace('v', ''));
            //     const bNum = parseFloat(b.replace('v', ''));
            //     return bNum - aNum;
            // });
            const sortedVersions = Object.keys(versions).sort(compareVersions);

            // Find the highest version that's lower than or equal to requested version
            const compatibleVersion = sortedVersions.find(
                (v) =>
                    parseFloat(v.replace('v', '')) <=
                    parseFloat(normalizedRequestVersion.replace('v', '')),
            );

            if (compatibleVersion) {
                return versions[compatibleVersion](req, res);
            } else {
                // If no compatible version found, use the latest version
                const mostRecentVersion = sortedVersions[0];
                if (mostRecentVersion) {
                    return versions[mostRecentVersion](req, res);
                }
                return response(res as any, 400, {
                    message: 'Invalid API version and no fallback version available',
                });
            }
        } catch (error) {
            console.error('Error handling version', error);
            return response(res as any, 500, {
                message: 'Error handling version',
                error: (error as Error).message,
            });
        }
    };
};

export default versionMiddleware;
