import { Router, Request, Response } from 'express';
import { commandService } from '../services/commandService';
import { AdminCommandRequest, AdminCommandResult } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// Define a custom Request type for the /command endpoint to correctly type req.body
interface CommandRequest extends Request {
  body: AdminCommandRequest;
}

/**
 * POST /api/admin/command
 * Executes an administrative command.
 * Request body: { commandName: string; parameters?: Record<string, any>; }
 * Response: AdminCommandResult
 */
// Fix: Use the imported `Response` type directly with an explicit generic for the response body
router.post('/command', async (req: CommandRequest, res: Response<AdminCommandResult>) => {
  const { commandName, parameters } = req.body;

  if (!commandName) {
    logger.warn('Received command request with missing commandName.');
    // Fix: `res.status` and `res.json` are now correctly typed
    return res.status(400).json({
      success: false,
      message: 'Command name is required.',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const result = await commandService.executeCommand(commandName, parameters);
    if (result.success) {
      // Fix: `res.json` is now correctly typed
      res.json(result);
    } else {
      // For failed commands, still send 200 OK but with success: false in body,
      // as the execution itself was handled, even if the command failed logically.
      // Specific HTTP errors (e.g., 404 for command not found) are handled within executeCommand.
      // Fix: `res.json` is now correctly typed
      res.json(result);
    }
  } catch (error: any) {
    logger.error(`Unhandled error during command execution for '${commandName}':`, error.message, error.stack);
    // Fix: `res.status` and `res.json` are now correctly typed
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/admin/commands
 * Retrieves a list of all available administration commands.
 * Response: Array<{ name: string; description: string }>
 */
// Fix: Use the imported `Request` and `Response` types directly with an explicit generic for the response body
router.get('/commands', (req: Request, res: Response<Array<{ name: string; description: string }>>) => {
  try {
    const commands = commandService.listCommands();
    // Fix: `res.json` is now correctly typed
    res.json(commands);
  } catch (error: any) {
    logger.error('Error listing commands:', error.message, error.stack);
    // Fix: `res.status` and `res.json` are now correctly typed
    res.status(500).json({
      success: false,
      message: `Internal server error: ${error.message}`,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;