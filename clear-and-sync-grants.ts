import { db } from './src/db/index';
import { developmentGrants } from './src/db/schema';
import { githubSync } from './src/server/services/github-sync';

async function main() {
  console.log('Clearing existing grants...');
  await db.delete(developmentGrants);
  console.log('Grants cleared.');
  
  console.log('Starting GitHub grants sync...');
  const result = await githubSync.syncAllGrants();
  console.log(`Sync completed! Synced: ${result.synced}, Errors: ${result.errors}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
