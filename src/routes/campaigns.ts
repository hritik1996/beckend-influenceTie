import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  res.json({ items: [], total: 0 });
});

router.post('/', (req: Request, res: Response) => {
  res.status(201).json({ id: 'cmp_1', ...req.body });
});

router.get('/:id', (req: Request, res: Response) => {
  res.json({ id: req.params.id, status: 'Draft' });
});

export default router;


