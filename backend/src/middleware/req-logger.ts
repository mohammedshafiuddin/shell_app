import { Request, Response, NextFunction } from 'express';

/**
 * Express middleware to log the pathname of incoming requests.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Log the request's original URL to the console.
  console.log(`Incoming request to: ${req.originalUrl}`);

  // Call the next middleware in the stack.
  next();
}

export default requestLogger;
