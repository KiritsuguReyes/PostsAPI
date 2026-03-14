import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Estructura interna de cada entrada cacheada */
export interface CachedEntry<T> {
  data: T;
  cachedAt: number; // timestamp ms cuando se almacenó
}

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  /** TTL de seguridad en segundos (30s desde la última actualización) */
  private readonly DEFAULT_TTL = 30;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis(this.configService.get<string>('REDIS_URL'), {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
    });

    this.client.on('connect', () => this.logger.log('✅ Redis conectado'));
    this.client.on('ready', () => this.logger.log('✅ Redis listo'));
    this.client.on('error', (err) =>
      this.logger.error(`❌ Redis error: ${err.message}`),
    );
    this.client.on('close', () => this.logger.warn('⚠️  Redis conexión cerrada'));

    this.client.connect().catch((err) =>
      this.logger.error(`No se pudo conectar a Redis: ${err.message}`),
    );
  }

  onModuleDestroy() {
    this.client.disconnect();
  }

  // ─── Primitivas ────────────────────────────────────────────────────────────

  private async getRaw(key: string): Promise<string | null> {
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  private async setRaw(key: string, value: string, ttl: number): Promise<void> {
    try {
      await this.client.set(key, value, 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Redis SET falló para "${key}": ${err.message}`);
    }
  }

  // ─── lastModified tracker ──────────────────────────────────────────────────

  /** Retorna el timestamp de la última escritura de la colección (0 si no hay registro) */
  async getLastModified(collection: string): Promise<number> {
    // Prefijo _lm: para que NO coincida con el patrón "collection:*" del SCAN-delete
    const raw = await this.getRaw(`_lm:${collection}`);
    return raw ? parseInt(raw, 10) : 0;
  }

  /**
   * Marca la colección como modificada AHORA.
   * Usa prefijo "_lm:" para separarlo del namespace de datos ("collection:*"),
   * evitando que deletePattern lo borre en la invalidación.
   * TTL de 1h: si nadie escribe en 1h, el campo desaparece
   * y el próximo GET tratará el cache como fresco (safe degradation).
   */
  async touchLastModified(collection: string): Promise<void> {
    try {
      await this.client.set(
        `_lm:${collection}`,
        Date.now().toString(),
        'EX',
        3600,
      );
    } catch (err) {
      this.logger.warn(`touchLastModified falló: ${err.message}`);
    }
  }

  // ─── Smart get-or-set ─────────────────────────────────────────────────────

  /**
   * Estrategia de cache inteligente con doble invalidación:
   *
   * 1. TTL físico de 30 segundos (Redis expira la key automáticamente).
   * 2. Invalidación por modificación: si `collection:lastModified > cachedAt`
   *    el dato se considera stale y se refresca aunque el TTL no haya expirado.
   *
   * On write → `invalidateCollection()` sube lastModified + borra keys → todos
   * los GETs siguientes ven el dato fresco inmediatamente sin esperar los 30s.
   *
   * Si Redis no está disponible, el método llama a `factory()` directamente
   * (graceful degradation).
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    collection: string,
    ttl = this.DEFAULT_TTL,
  ): Promise<T> {
    try {
      const [rawCache, lastModified] = await Promise.all([
        this.getRaw(key),
        this.getLastModified(collection),
      ]);

      if (rawCache) {
        const entry: CachedEntry<T> = JSON.parse(rawCache);

        if (entry.cachedAt > lastModified) {
          // ✅ Cache válido y fresco
          this.logger.debug(`Cache HIT [${key}]`);
          return entry.data;
        }

        // ⚠️  Cache stale: hay datos más nuevos en DB
        this.logger.debug(
          `Cache STALE [${key}] - cachedAt: ${entry.cachedAt}, lastModified: ${lastModified}`,
        );
      } else {
        this.logger.debug(`Cache MISS [${key}]`);
      }

      // ── Refrescar desde DB ──────────────────────────────────────────────
      const data = await factory();
      const entry: CachedEntry<T> = { data, cachedAt: Date.now() };
      await this.setRaw(key, JSON.stringify(entry), ttl);
      return data;
    } catch (err) {
      // Redis caído → fallback directo a DB sin romper la request
      this.logger.warn(`Redis getOrSet error en "${key}", fallback a DB: ${err.message}`);
      return factory();
    }
  }

  // ─── Invalidación ─────────────────────────────────────────────────────────

  /**
   * Elimina todas las keys del namespace de una colección usando SCAN
   * (no-blocking, seguro en producción con keyspaces grandes).
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      let deletedCount = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;

        if (keys.length > 0) {
          await this.client.del(...keys);
          deletedCount += keys.length;
        }
      } while (cursor !== '0');

      if (deletedCount > 0) {
        this.logger.debug(`Invalidadas ${deletedCount} keys con patrón "${pattern}"`);
      }
    } catch (err) {
      this.logger.warn(`deletePattern falló para "${pattern}": ${err.message}`);
    }
  }

  /**
   * Invalidación completa de colección:
   * 1. Marca `_lm:{collection} = ahora`  → todos los GETs verán stale
   * 2. SCAN-delete de `{collection}:*`   → limpia las keys de datos físicamente
   *
   * Se ejecutan en paralelo de forma segura porque los namespaces son distintos:
   * los datos usan "collection:*" y lastModified usa "_lm:collection".
   */
  async invalidateCollection(collection: string): Promise<void> {
    await Promise.all([
      this.touchLastModified(collection),
      this.deletePattern(`${collection}:*`),
    ]);
    this.logger.debug(`Colección "${collection}" invalidada`);
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  isConnected(): boolean {
    return this.client.status === 'ready';
  }
}
