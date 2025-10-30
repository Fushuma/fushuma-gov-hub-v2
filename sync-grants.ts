import 'dotenv/config.js';
import { githubSync } from './src/server/services/github-sync';

async function main() {
  console.log('Starting GitHub grants sync...');
  const result = await githubSync.syncAllGrants();
  console.log(`Sync completed! Synced: ${result.synced}, Errors: ${result.errors}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
