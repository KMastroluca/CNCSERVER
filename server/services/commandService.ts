import { CommandDefinition, AdminCommandResult, CommandHandler } from '../types';
import { logger } from '../utils/logger';

/**
 * Interface for a queued command task.
 */
interface QueuedCommandTask {
  commandName: string;
  parameters?: Record<string, any>;
  resolve: (result: AdminCommandResult) => void;
  reject: (error: any) => void;
}

/**
 * A service to manage and execute administrative commands with a concurrency limit.
 */
class CommandService {
  private commands: Map<string, CommandDefinition>;
  private commandQueue: QueuedCommandTask[];
  private concurrentExecutions: number;
  private readonly MAX_CONCURRENT_COMMANDS: number = 5; // Max 5 concurrent commands

  constructor() {
    this.commands = new Map<string, CommandDefinition>();
    this.commandQueue = [];
    this.concurrentExecutions = 0;
    this.registerDefaultCommands();
    logger.info(`CommandService initialized with a maximum of ${this.MAX_CONCURRENT_COMMANDS} concurrent commands.`);
  }

  /**
   * Registers a new command with its description and handler.
   * @param name The unique name of the command.
   * @param description A description of what the command does.
   * @param handler The asynchronous function that executes the command logic.
   */
  public registerCommand(name: string, description: string, handler: CommandHandler): void {
    if (this.commands.has(name)) {
      logger.warn(`Command '${name}' is already registered. Overwriting.`);
    }
    this.commands.set(name, { description, handler });
    logger.info(`Command '${name}' registered.`);
  }

  /**
   * Enqueues a command for execution, respecting the concurrency limit.
   * Returns a Promise that resolves with the command's result.
   * @param commandName The name of the command to execute.
   * @param parameters Optional parameters for the command.
   * @returns A promise that resolves to an AdminCommandResult.
   */
  public async executeCommand(commandName: string, parameters?: Record<string, any>): Promise<AdminCommandResult> {
    return new Promise<AdminCommandResult>((resolve, reject) => {
      this.commandQueue.push({ commandName, parameters, resolve, reject });
      logger.debug(`Command '${commandName}' enqueued. Queue size: ${this.commandQueue.length}`);
      this.processQueue();
    });
  }

  /**
   * Processes the command queue, executing commands up to the concurrency limit.
   */
  private async processQueue(): Promise<void> {
    // Only proceed if there's capacity and commands in the queue
    while (this.concurrentExecutions < this.MAX_CONCURRENT_COMMANDS && this.commandQueue.length > 0) {
      const task = this.commandQueue.shift(); // Get the next task from the queue

      if (!task) { // Should not happen if length > 0, but good for type safety
        break;
      }

      this.concurrentExecutions++;
      // Fix: Define commandStartTime at the beginning of the task processing
      const commandStartTime = Date.now();
      logger.info(`Starting command '${task.commandName}' (ID: ${task.commandName}-${commandStartTime}). Parameters: ${JSON.stringify(task.parameters || {})}. Concurrent: ${this.concurrentExecutions}/${this.MAX_CONCURRENT_COMMANDS}. Queue remaining: ${this.commandQueue.length}`);

      const command = this.commands.get(task.commandName);
      // Fix: Use a consistent timestamp for the result objects
      const resultTimestamp = new Date().toISOString();

      if (!command) {
        const result: AdminCommandResult = {
          success: false,
          message: `Command '${task.commandName}' not found.`,
          timestamp: resultTimestamp,
        };
        logger.warn(`Unknown command '${task.commandName}' encountered in queue. Resolving with error.`);
        task.resolve(result); // Resolve the promise for the unknown command
        this.concurrentExecutions--;
        this.processQueue(); // Try to process next command
        continue; // Move to the next iteration of the while loop
      }

      // Execute the command handler
      try {
        logger.debug(`Executing handler for command '${task.commandName}' at ${new Date(commandStartTime).toISOString()}...`);
        const result = await command.handler(task.parameters);
        const duration = Date.now() - commandStartTime;
        logger.info(`Command '${task.commandName}' finished. Success: ${result.success}. Duration: ${duration}ms.`, result.data);
        task.resolve({ ...result, timestamp: resultTimestamp });
      } catch (error: any) {
        // Fix: Use commandStartTime for duration calculation in the catch block
        const duration = Date.now() - commandStartTime;
        logger.error(`Error executing command '${task.commandName}': ${error.message}. Duration: ${duration}ms. Stack:`, error.stack);
        task.reject({
          success: false,
          message: `Error executing command '${task.commandName}': ${error.message}`,
          data: { error: error.message, stack: error.stack },
          timestamp: resultTimestamp,
        } as AdminCommandResult); // Reject the promise with the error
      } finally {
        this.concurrentExecutions--;
        logger.debug(`Concurrent commands after '${task.commandName}' completion: ${this.concurrentExecutions}/${this.MAX_CONCURRENT_COMMANDS}`);
        this.processQueue(); // Always try to process the next command after one finishes
      }
    }
  }

  /**
   * Retrieves a list of all registered commands with their descriptions.
   * @returns An array of objects containing command names and descriptions.
   */
  public listCommands(): Array<{ name: string; description: string }> {
    return Array.from(this.commands.entries()).map(([name, def]) => ({
      name,
      description: def.description,
    }));
  }

  /**
   * Registers a set of default administrative commands.
   */
  private registerDefaultCommands(): void {
    // Example: Get service status
    this.registerCommand(
      'getServiceStatus',
      'Retrieves the current operational status of the administration service.',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate async work
        const status = {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuLoad: '5%', // Dummy value
          lastRestart: new Date(Date.now() - process.uptime() * 1000).toISOString(),
        };
        return {
          success: true,
          message: 'Service is operational.',
          data: status,
          timestamp: new Date().toISOString(),
        };
      }
    );

    // Example: Restart a (simulated) component of the service
    this.registerCommand(
      'restartComponent',
      'Simulates restarting a specified service component.',
      async (params) => {
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)); // Simulate variable async work
        const componentName = params?.component || 'Default Component';
        if (componentName === 'fail') {
          throw new Error('Component restart failed intentionally.');
        }
        return {
          success: true,
          message: `Component '${componentName}' restarted successfully.`,
          data: { component: componentName, status: 'restarted' },
          timestamp: new Date().toISOString(),
        };
      }
    );

    // Example: List active sessions
    this.registerCommand(
      'listActiveSessions',
      'Lists all active user or admin sessions.',
      async () => {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async work
        const sessions = [
          { id: 'sess_123', user: 'admin_user', ip: '192.168.1.10', duration: '2h 15m' },
          { id: 'sess_456', user: 'dev_user', ip: '10.0.0.5', duration: '30m' },
        ];
        return {
          success: true,
          message: 'Active sessions retrieved.',
          data: sessions,
          timestamp: new Date().toISOString(),
        };
      }
    );

    // New: List Registered Commands
    this.registerCommand(
      'listRegisteredCommands',
      'Retrieves a list of all commands currently registered with the service.',
      async () => {
        // No explicit delay needed for this internal operation
        const commands = this.listCommands();
        return {
          success: true,
          message: 'Registered commands retrieved successfully.',
          data: commands,
          timestamp: new Date().toISOString(),
        };
      }
    );

    // Example: Echo command
    this.registerCommand(
      'echo',
      'Echoes back the provided message and parameters.',
      async (params) => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate async work
        return {
          success: true,
          message: `Echo successful!`,
          data: params,
          timestamp: new Date().toISOString(),
        };
      }
    );
  }
}

export const commandService = new CommandService();