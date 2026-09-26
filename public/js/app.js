/**
 * CineSearch — instant movie search UI built on Algolia InstantSearch.js.
 * Reads its Algolia settings from window.CINESEARCH_CONFIG (see config.js).
 */
(function () {
  'use strict';

  const config = window.CINESEARCH_CONFIG || {};

  function showFatalError(message) {
    const container = document.getElementById('hits');
    const box = document.createElement('div');
    box.className = 'search-error';
    box.setAttribute('role', 'alert');
    box.textContent = `⚠️ ${message}`;
    const hint = document.createElement('small');
    hint.textContent = 'Check the browser console for details.';
    box.appendChild(hint);
    container.replaceChildren(box);
  }

  // ── Search client: Algolia, or the built-in demo data ───────────────────
  //
  // demoMode 'auto' (default): use Algolia when it is configured, and fall
  // back to the sample movies if it is missing or a request fails (e.g. the
  // Algolia app was suspended). true: always demo. false: Algolia only.

  const demoMode = config.demoMode ?? 'auto';
  const algoliaConfigured = Boolean(config.appId && config.searchApiKey && config.indexName);
  const demoClient = window.createDemoSearchClient(window.CINESEARCH_DEMO_MOVIES || []);
  let usingDemo = demoMode === true || (demoMode === 'auto' && !algoliaConfigured);

  if (demoMode === false && !algoliaConfigured) {
    showFatalError('Algolia is not configured. Fill in public/js/config.js.');
    return;
  }

  function showDemoBadge() {
    document.getElementById('demo-badge').hidden = false;
  }

  function createSearchClient() {
    if (usingDemo) {
      showDemoBadge();
      return demoClient;
    }
    const algolia = algoliasearch(config.appId, config.searchApiKey);
    if (demoMode !== 'auto') return algolia;
    return {
      search(requests) {
        if (usingDemo) return demoClient.search(requests);
        return algolia.search(requests).catch((error) => {
          console.warn('Algolia unavailable, switching to demo data:', error);
          usingDemo = true;
          showDemoBadge();
          return demoClient.search(requests);
        });
      },
    };
  }

  // ── Helpers for rendering a hit ──────────────────────────────────────────

  function firstGenre(hit) {
    if (Array.isArray(hit.genre)) return hit.genre[0] || '';
    if (typeof hit.genre === 'string') return hit.genre.split(',')[0].trim();
    return '';
  }

  function releaseYear(hit) {
    if (hit.release_year) return hit.release_year;
    if (!hit.release_date) return '';
    const year = new Date(hit.release_date).getFullYear();
    return Number.isNaN(year) ? '' : year;
  }

  function shortOverview(hit, maxLength = 110) {
    if (typeof hit.overview !== 'string' || hit.overview === '') {
      return 'No overview available.';
    }
    return hit.overview.length > maxLength
      ? `${hit.overview.substring(0, maxLength).trimEnd()}…`
      : hit.overview;
  }

  // The fallback is always rendered after the <img>; CSS only shows it when the
  // image is missing or fails to load (the card gets .poster-broken).
  function posterFallback(html) {
    return html`<div class="poster-fallback">🎬<span>No Poster</span></div>`;
  }

  function poster(hit, html) {
    if (!hit.poster_url) return '';
    return html`<img
      src="${hit.poster_url}"
      alt="Poster for ${hit.title}"
      loading="lazy"
      onError=${(event) => event.currentTarget.parentElement.classList.add('poster-broken')}
    />`;
  }

  // ── InstantSearch setup ──────────────────────────────────────────────────

  const search = instantsearch({
    indexName: config.indexName || 'movies',
    searchClient: createSearchClient(),
    routing: true, // keep the query and filters in the URL so results can be shared
  });

  search.on('error', ({ error }) => {
    console.error('InstantSearch error:', error);
    showFatalError(`Search error: ${(error && error.message) || 'unable to fetch results'}`);
  });

  search.addWidgets([
    instantsearch.widgets.configure({
      hitsPerPage: 20,
    }),

    instantsearch.widgets.searchBox({
      container: '#searchbox',
      placeholder: 'Search movies by title, genre or plot…',
      showReset: true,
      showLoadingIndicator: true,
    }),

    instantsearch.widgets.stats({
      container: '#stats',
      templates: {
        text: ({ nbHits, processingTimeMS }) =>
          `${nbHits.toLocaleString()} ${nbHits === 1 ? 'movie' : 'movies'} found in ${processingTimeMS}ms`,
      },
    }),

    instantsearch.widgets.hits({
      container: '#hits',
      templates: {
        item: (hit, { html, components }) => html`
          <article class="movie-card">
            <div class="poster-wrap">
              ${poster(hit, html)}
              ${posterFallback(html)}
              ${hit.vote_average
                ? html`<div class="rating-pill">⭐ ${Number(hit.vote_average).toFixed(1)}</div>`
                : ''}
            </div>
            <div class="card-body">
              <h3 class="card-title">
                ${components.Highlight({ attribute: 'title', hit })}
              </h3>
              <div class="card-meta">
                ${firstGenre(hit) ? html`<span class="genre-chip">${firstGenre(hit)}</span>` : ''}
                ${releaseYear(hit) ? html`<span class="year-chip">${releaseYear(hit)}</span>` : ''}
              </div>
              <p class="card-overview">${shortOverview(hit)}</p>
            </div>
          </article>
        `,
        empty: (results, { html }) => html`
          <div class="no-results">
            <div class="no-results-icon" aria-hidden="true">🎬</div>
            <h3>No movies found</h3>
            <p>Try a different search term or clear your filters.</p>
          </div>
        `,
      },
    }),

    instantsearch.widgets.refinementList({
      container: '#genre-filter',
      attribute: 'genre',
      limit: 8,
      showMore: true,
      showMoreLimit: 20,
      sortBy: ['count:desc', 'name:asc'],
    }),

    instantsearch.widgets.refinementList({
      container: '#year-filter',
      attribute: 'release_year',
      limit: 8,
      showMore: true,
      showMoreLimit: 30,
      sortBy: ['name:desc'],
    }),

    instantsearch.widgets.currentRefinements({
      container: '#current-refinements',
    }),

    instantsearch.widgets.clearRefinements({
      container: '#clear-all',
      templates: { resetLabel: 'Clear all filters' },
    }),

    instantsearch.widgets.pagination({
      container: '#pagination',
      padding: 2,
      scrollTo: '.results',
    }),
  ]);

  search.start();
})();
