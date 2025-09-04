import { Router, Request, Response } from 'express';

const router = Router();

router.get('/threads', (_req: Request, res: Response) => {
  res.json({ threads: [] });
});

router.get('/threads/:id', (req: Request, res: Response) => {
  res.json({ id: req.params.id, messages: [] });
});

export default router;


