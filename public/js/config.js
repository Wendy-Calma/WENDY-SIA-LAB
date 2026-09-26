/**
 * Front-end Algolia configuration.
 *
 * Leave appId/searchApiKey empty to run on the built-in demo data.
 *
 * Only put a SEARCH-ONLY API key here. It is sent to every visitor's browser,
 * so it must never be the Admin or Write key used by sync/sync.php.
 * Generate one in the Algolia dashboard (Settings → API Keys) and restrict it
 * to the "search" ACL and to this index.
 */
window.CINESEARCH_CONFIG = {
  appId: '355BZQB0BJ',
  searchApiKey: 'a964a2a492d1ca0943471d2c8930a1c9', // search-only key
  indexName: 'movies',

  // 'auto': use Algolia when configured, otherwise (or if it fails) search the
  // built-in sample movies in demo-data.js. true: always demo. false: never.
  demoMode: 'auto',
};
