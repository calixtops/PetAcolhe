import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../db/pool.js';
import { ConflictError, UnauthorizedError } from '../http/errors.js';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'moderator' | 'admin';
}

export interface AuthResult {
  user: User;
  token: string;
}

const ROUNDS = 10;

export class UserService {
  constructor(private readonly secret: string = process.env.JWT_SECRET ?? 'dev-secret') {}

  async register(email: string, password: string, displayName: string): Promise<AuthResult> {
    const hash = await bcrypt.hash(password, ROUNDS);
    try {
      const { rows } = await getPool().query<{
        id: string; email: string; display_name: string; role: User['role'];
      }>(
        `INSERT INTO users (email, password_hash, display_name)
         VALUES ($1, $2, $3)
         RETURNING id, email, display_name, role`,
        [email.toLowerCase(), hash, displayName],
      );
      const row = rows[0]!;
      const user: User = { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
      return { user, token: this.sign(user) };
    } catch (err: unknown) {
      if (isUniqueViolation(err)) throw new ConflictError('E-mail já cadastrado');
      throw err;
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const { rows } = await getPool().query<{
      id: string; email: string; display_name: string; role: User['role']; password_hash: string;
    }>(
      `SELECT id, email, display_name, role, password_hash
         FROM users WHERE email = $1`,
      [email.toLowerCase()],
    );
    const row = rows[0];
    if (!row) throw new UnauthorizedError('Credenciais inválidas');
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) throw new UnauthorizedError('Credenciais inválidas');
    const user: User = { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
    return { user, token: this.sign(user) };
  }

  verify(token: string): User {
    try {
      const payload = jwt.verify(token, this.secret) as User & { iat: number; exp: number };
      return { id: payload.id, email: payload.email, displayName: payload.displayName, role: payload.role };
    } catch {
      throw new UnauthorizedError('Token inválido');
    }
  }

  private sign(user: User): string {
    return jwt.sign(user, this.secret, { expiresIn: '7d' });
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505';
}
