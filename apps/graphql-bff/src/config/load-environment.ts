import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { config as loadDotenv } from 'dotenv';

let loaded = false;

export function loadEnvironment(): void {
  if (loaded) {
    return;
  }

  const candidatePaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/graphql-bff/.env'),
  ];

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      loadDotenv({ path: candidatePath, quiet: true });
      loaded = true;
      return;
    }
  }

  loaded = true;
}
