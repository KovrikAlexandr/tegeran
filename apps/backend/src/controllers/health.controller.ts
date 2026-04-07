import { Controller, Get } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { HealthResponseDto } from '../dto/response/health.response.dto';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  getHealth(): HealthResponseDto {
    return HealthResponseDto.ok();
  }
}
