const fs = require('fs');
const path = require('path');

const rootEnv = path.resolve(__dirname, '../.env');
const backendEnv = path.resolve(__dirname, '../apps/backend/.env');
const webEnv = path.resolve(__dirname, '../apps/web/.env.local');

if (fs.existsSync(rootEnv)) {
  const needsBackendCopy = !fs.existsSync(backendEnv) || fs.statSync(rootEnv).mtimeMs > fs.statSync(backendEnv).mtimeMs;
  if (needsBackendCopy) {
    fs.copyFileSync(rootEnv, backendEnv);
    console.log('✔ [sync-env] Synchronized root .env -> apps/backend/.env');
  }

  const needsWebCopy = !fs.existsSync(webEnv) || fs.statSync(rootEnv).mtimeMs > fs.statSync(webEnv).mtimeMs;
  if (needsWebCopy) {
    fs.copyFileSync(rootEnv, webEnv);
    console.log('✔ [sync-env] Synchronized root .env -> apps/web/.env.local');
  }
}
