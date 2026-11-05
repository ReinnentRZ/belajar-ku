export class HttpError extends Error {
  public statusCode: number;
  public code: string;
  public errors?: unknown;

  constructor(statusCode: number, message: string, errors?: unknown, code?: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code || this.getDefaultCode(statusCode);
    Object.setPrototypeOf(this, new.target.prototype);
  }

  private getDefaultCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 422:
        return 'UNPROCESSABLE_ENTITY';
      case 429:
        return 'TOO_MANY_REQUESTS';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad Request', errors?: unknown, code = 'BAD_REQUEST') {
    super(400, message, errors, code);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized', errors?: unknown, code = 'UNAUTHORIZED') {
    super(401, message, errors, code);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden access', errors?: unknown, code = 'FORBIDDEN') {
    super(403, message, errors, code);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found', errors?: unknown, code = 'NOT_FOUND') {
    super(404, message, errors, code);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict', errors?: unknown, code = 'CONFLICT') {
    super(409, message, errors, code);
    this.name = 'ConflictError';
  }
}
