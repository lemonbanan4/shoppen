import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    // Stripe activates automatically once STRIPE_API_KEY is set. One provider
    // covers cards, Apple Pay, Google Pay and (via Stripe) local methods like
    // Klarna, iDEAL and MobilePay. Run `npx medusa exec ./src/scripts/enable-stripe.ts`
    // once after adding the key to enable it on your regions.
    ...(process.env.STRIPE_API_KEY
      ? [
          {
            resolve: '@medusajs/medusa/payment',
            options: {
              providers: [
                {
                  resolve: '@medusajs/medusa/payment-stripe',
                  id: 'stripe',
                  options: {
                    apiKey: process.env.STRIPE_API_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
                  },
                },
              ],
            },
          },
        ]
      : []),
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            // Sends via Resend when RESEND_API_KEY is set; otherwise renders
            // emails to .medusa/emails/ for local development.
            resolve: './src/modules/resend-notification',
            id: 'resend',
            options: {
              channels: ['email'],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
  ],
})
