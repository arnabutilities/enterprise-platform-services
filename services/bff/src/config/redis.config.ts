import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import KeyvRedis from '@keyv/redis';

function buildRedisUrl(configService: ConfigService): string {
  const host = configService.get<string>('redis.host') ?? 'localhost';
  const port = configService.get<number>('redis.port') ?? 6379;
  const password = configService.get<string>('redis.password');
  const db = configService.get<number>('redis.db') ?? 0;

  const url = new URL(`redis://${host}:${port}`);
  url.hostname = host;
  url.port = String(port);

  if (password) {
    url.password = password;
  }

  url.pathname = `/${db}`;
  return url.toString();
}

export const getRedisConfig = async (configService: ConfigService): Promise<CacheModuleOptions> => {
  const useMemory = configService.get<boolean>('redis.useMemory');

  if (useMemory) {
    return {};
  }

  return {
    stores: [createRedisStore(configService)],
    ttl: (configService.get<number>('redis.ttl') ?? 3600) * 1000,
  };
};

function createRedisStore(configService: ConfigService): InstanceType<typeof KeyvRedis> {
  const store = new KeyvRedis(buildRedisUrl(configService));

  store.client?.on?.('error', (error: Error) => {
    console.error(`Redis cache connection error: ${error.message}`);
  });

  return store;
}
