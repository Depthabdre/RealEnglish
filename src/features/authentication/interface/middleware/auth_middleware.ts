import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

// By default, TypeScript's `Request` type doesn't know about a `user` property.
// We'll create a custom interface that extends it, telling TypeScript that
// after this middleware runs, the `req` object *might* have a `user` property.
export interface AuthenticatedRequest extends Request {
    user?: { id: string; email: string };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    // 1. Get the 'authorization' header from the incoming request.
    const authHeader = req.headers['authorization'];

    // 2. The header format is "Bearer TOKEN". We split the string and get the token part.
    const token = authHeader && authHeader.split(' ')[1];

    // 3. If no token was provided, block the request immediately.
    if (!token) {
        // 401 Unauthorized: The user needs to log in to get a token.
        return res.status(401).json({ error: 'Access token is missing or invalid.' });
    }

    // 4. Verify the token is valid (not expired, and signed with our secret key).
    jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
        if (err) {
            // 403 Forbidden: The user has a token, but it's not valid (e.g., it's expired).
            return res.status(403).json({ error: 'Token is not valid.' });
        }

        // 5. SUCCESS: The token is valid. Attach the user payload to the request object.
        req.user = user;

        // 6. Call `next()` to pass control to the next function in the chain (our controller).
        next();
    });
}