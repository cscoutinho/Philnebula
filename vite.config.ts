import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(env.SUPABASE_URL || 'https://kowbxomppzqgmfagzirc.supabase.co'),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify(env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtvd2J4b21wcHpxZ21mYWd6aXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTI1MTMsImV4cCI6MjA2ODg2ODUxM30.3R92DVk_HPQBtGc4V3stf7UWQxMeNeazXdZEj_BZdk0')
      },
      resolve: {
        alias: {
          '@': path.resolve('.'),
        }
      }
    };
});