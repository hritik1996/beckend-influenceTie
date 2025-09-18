import { Express } from 'express';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import influencersRouter from './routes/influencers';
import campaignsRouter from './routes/campaigns';
import messagesRouter from './routes/messages';
import adminRouter from './routes/admin';
import { API } from './constants';

// Central place to mount all API routes with versioning
export function registerApiRoutes(app: Express) {
  const base = `${API.BASE_PATH}/${API.CURRENT_VERSION}`; // e.g., /api/v1

  app.use(`${base}/auth`, authRouter);
  app.use(`${base}/users`, usersRouter);
  app.use(`${base}/influencers`, influencersRouter);
  app.use(`${base}/campaigns`, campaignsRouter);
  app.use(`${base}/messages`, messagesRouter);
  app.use(`${base}/admin`, adminRouter);
}


