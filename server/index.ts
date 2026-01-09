import express, { Application, Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import adminRoutes from './routes/adminRoutes';
import { logger } from './utils/logger';
import { AdminCommandResult } from './types'; // Import AdminCommandResult for error handler

const app: Application = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Middleware
// Fix: Explicitly cast middleware functions to RequestHandler to help TypeScript inference
app.use(cors() as RequestHandler); // No overload matches this call.
app.use(bodyParser.json() as RequestHandler); // Parse JSON request bodies

// API Routes
app.use('/api/admin', adminRoutes);

// Root endpoint for health check
// Fix: Use the imported `Request` and `Response` types directly with an explicit generic for the response body
app.get('/', (req: Request, res: Response<string>) => {
  res.status(200).send('Admin Command & Control Server is running.');
});

// New: GET /api/admin/health endpoint
// Fix: Use the imported `Request` and `Response` types directly with an explicit generic for the response body
app.get('/api/admin/health', (req: Request, res: Response<{ status: string; timestamp: string }>) => {
  res.status(200).json({
    status: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Basic error handling middleware
// Fix: Explicitly type the error handling middleware and use imported types directly with an explicit generic for the response body
app.use(((err: Error, req: Request, res: Response<AdminCommandResult>, next: NextFunction) => {
  logger.error('Unhandled server error:', err.message, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.',
    error: err.message,
    timestamp: new Date().toISOString(),
  });
}) as ErrorRequestHandler); // No overload matches this call.

// Start the server
app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
  logger.info('API endpoints available:');
  logger.info(`  POST http://localhost:${PORT}/api/admin/command`);
  logger.info(`  GET http://localhost:${PORT}/api/admin/commands`);
  logger.info(`  GET http://localhost:${PORT}/api/admin/health`);
});

export default app; // Export for testing purposes