import type { RequestHandler } from 'express';
import { UnauthorizedError } from '../http/errors.js';
import { UserService, type User } from './UserService.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export function authMiddleware(service: UserService = new UserService()): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError('Token ausente'));
    try {
      req.user = service.verify(header.slice('Bearer '.length));
      next();
    } catch (err) {
      next(err);
    }
  };
}
