import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id?: string;
  tenant_name?: string;
  crusher_id?: string;
  crusher_name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function requireCrusher(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.crusher_id) {
    return res.status(400).json({ error: 'No crusher selected. Call /auth/select-crusher first.' });
  }
  next();
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.tenant_id) {
    return res.status(400).json({ error: 'No tenant selected. Call /auth/select-tenant first.' });
  }
  next();
}
