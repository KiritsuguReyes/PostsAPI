import { Global, Module } from '@nestjs/common';
import { RedisCacheService } from './redis-cache.service';

/**
 * @Global → disponible en todos los módulos sin importar explícitamente.
 * Basta con importarlo una vez en AppModule.
 */
@Global()
@Module({
  providers: [RedisCacheService],
  exports: [RedisCacheService],
})
export class RedisCacheModule {}
