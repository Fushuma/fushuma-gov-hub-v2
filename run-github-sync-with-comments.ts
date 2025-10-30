import { githubSync } from './src/server/services/github-sync';

async function main() {
  console.log('Running GitHub sync with comments...');
  const result = await githubSync.syncAllGrants();
  console.log('Sync complete:', result);
  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
