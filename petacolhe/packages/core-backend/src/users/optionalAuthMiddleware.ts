import type { RequestHandler } from 'express';
import { UserService } from './UserService.js';

/**
 * Igual ao authMiddleware, mas não exige token: apenas decodifica se vier.
 * Útil enquanto a tela de login ainda não existe — endpoints aceitam
 * cadastros anônimos com `created_by = null`.
 */
export function optionalAuthMiddleware(service: UserService = new UserService()): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    try {
      req.user = service.verify(header.slice('Bearer '.length));
    } catch {
      // token inválido => trata como anônimo
    }
    next();
  };
}
