export const jwtConstants = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-token-secret-key',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-key',
  accessTokenExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY_SECONDS || String(15 * 60), 10),           // Default: 15 minutes
  refreshTokenExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY_SECONDS || String(7 * 24 * 60 * 60), 10), // Default: 7 days
} as const;