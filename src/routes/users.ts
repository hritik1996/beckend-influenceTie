import { Router, Request, Response } from 'express';

const router = Router();

router.get('/me', (_req: Request, res: Response) => {
  res.json({ id: 'user_1', role: 'influencer', name: 'Demo User' });
});

export default router;


