import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { authRouter } from './routes/auth';
import { salesRouter } from './routes/sales';
import { purchasesRouter } from './routes/purchases';
import { partiesRouter } from './routes/parties';
import { productsRouter } from './routes/products';
import { vehiclesRouter } from './routes/vehicles';
import { ledgerRouter } from './routes/ledger';
import { quarryRouter } from './routes/quarry';
import { maintenanceRouter } from './routes/maintenance';
import { wagesRouter } from './routes/wages';
import { reportsRouter } from './routes/reports';
import { invoicesRouter } from './routes/invoices';
import { usersRouter } from './routes/users';
import { configRouter } from './routes/config';
import { notificationsRouter } from './routes/notifications';
import { weighbridgeRouter } from './routes/weighbridge';
import { camerasRouter } from './routes/cameras';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGINS?.split(',') || '*' }));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
app.use(limiter);

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/config', configRouter);
app.use('/api/products', productsRouter);
app.use('/api/parties', partiesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/purchases', purchasesRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/quarry', quarryRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/wages', wagesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/weighbridge', weighbridgeRouter);
app.use('/api/cameras', camerasRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;
