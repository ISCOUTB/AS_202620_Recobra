import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class SaludController {
  @Get()
  verificar() {
    return { status: 'ok', service: 'recobra-backend' };
  }
}
