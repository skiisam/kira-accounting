import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
    superUrl: process.env.DATABASE_SUPER_URL || process.env.DATABASE_URL || '',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  // Company Defaults
  defaults: {
    currency: process.env.DEFAULT_CURRENCY || 'MYR',
    taxCode: process.env.DEFAULT_TAX_CODE || 'SR',
    taxRate: parseFloat(process.env.DEFAULT_TAX_RATE || '6'),
  },

  // Feature Flags
  features: {
    multiCurrency: process.env.ENABLE_MULTI_CURRENCY === 'true',
    multiLocation: process.env.ENABLE_MULTI_LOCATION === 'true',
    batchTracking: process.env.ENABLE_BATCH_TRACKING === 'true',
    serialTracking: process.env.ENABLE_SERIAL_TRACKING === 'true',
  },
};
