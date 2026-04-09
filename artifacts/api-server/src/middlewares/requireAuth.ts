import { type Request, type Response, type NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session.userId) {
    res.status(401).json({ error: "Unauthorized", message: "로그인이 필요합니다." });
    return;
  }
  next();
}

export function requireRole(roles: ("student" | "council" | "admin")[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session.userId) {
      res.status(401).json({ error: "Unauthorized", message: "로그인이 필요합니다." });
      return;
    }
    if (!req.session.role || !roles.includes(req.session.role)) {
      res.status(403).json({ error: "Forbidden", message: "접근 권한이 없습니다." });
      return;
    }
    next();
  };
}
