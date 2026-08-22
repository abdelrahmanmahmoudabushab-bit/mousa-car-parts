module.exports = {
  apps: [
    {
      name: 'mousa-api-5000',
      script: 'server/index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    },
    {
      name: 'mousa-customer-3000',
      script: 'node_modules/vite/bin/vite.js',
      args: '--config vite.customer.config.js --port 3000',
      env: {
        NODE_ENV: 'development'
      }
    },
    {
      name: 'mousa-pos-5173',
      script: 'node_modules/vite/bin/vite.js',
      args: '--port 5173',
      env: {
        NODE_ENV: 'development'
      }
    }
  ]
};
