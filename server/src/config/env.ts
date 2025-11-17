import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Supabase Configuration
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // API Configuration
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:4200',

  // Validation
  isProduction: () => config.NODE_ENV === 'production',
  isDevelopment: () => config.NODE_ENV === 'development',

  // Validation function
  validate: () => {
    const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};
