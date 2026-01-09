
/**
 * Interface for a generic command to be executed by the admin service.
 */
export interface AdminCommandRequest {
  commandName: string;
  parameters?: Record<string, any>;
}

/**
 * Interface for the result of an executed command.
 */
export interface AdminCommandResult {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Interface for defining a command handler.
 * Each command handler is an asynchronous function that takes parameters and returns an AdminCommandResult.
 */
export interface CommandHandler {
  (parameters?: Record<string, any>): Promise<AdminCommandResult>;
}

/**
 * Interface for the command definition stored in the service.
 */
export interface CommandDefinition {
  description: string;
  handler: CommandHandler;
}
