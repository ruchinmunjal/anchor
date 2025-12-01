import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      app: 'anchor',
      timestamp: new Date().toISOString(),
    };
  }
}

