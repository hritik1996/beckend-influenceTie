import { Router, Request, Response } from 'express';

const router = Router();

router.get('/dashboard', (_req: Request, res: Response) => {
  res.json({ usersPendingKYC: 0, disputesOpen: 0 });
});

export default router;


