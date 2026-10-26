import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const tooLarge=exception instanceof Error && 'type' in exception && exception.type==='entity.too.large';
    const malformed=exception instanceof Error && 'type' in exception && exception.type==='entity.parse.failed';
    const status = tooLarge?413:malformed?400:exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = tooLarge?'Request body is too large':malformed?'Invalid JSON':status>=500?'Content service is temporarily unavailable':exception instanceof Error ? exception.message : 'Unexpected error';

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
