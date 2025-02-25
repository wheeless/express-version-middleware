import { Request, Response, NextFunction } from 'express';
export interface VersionHandler {
    (req: Request, res: Response): void;
}
export interface VersionMap {
    [version: string]: VersionHandler;
}
/**
 * Middleware to handle API versioning
 * @param versions - An object where keys are version strings and values are handler functions
 * @returns Express middleware function
 */
export declare const versionMiddleware: (versions: VersionMap) => (req: Request & {
    version?: string;
}, res: Response, next: NextFunction) => void;
export default versionMiddleware;
