import * as path from 'node:path';

export const isProduction = process.env.NODE_ENV === 'production';

const baseDir = process.env.DATABASE_PATH || process.cwd();

export const getDbPath = () => path.isAbsolute(baseDir) 
  ? path.join(baseDir, 'sqlite.db') 
  : path.resolve(process.cwd(), baseDir, 'sqlite.db');
