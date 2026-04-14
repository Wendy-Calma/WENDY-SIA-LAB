const search = instantsearch({
  indexName: 'Wendy_movie',
  searchClient: algoliasearch('ZYG539C6SS', '1f28bdc6f3cabe827936b0b75bd0c1af'),
});

//debug Log when search widget initializes
console.log('InstantSearch initialized');
console.log('App ID:', 'ZYG539C6SS');

//mnitor for search errors
search.on('error', function(error) {
  console.error('InstantSearch error:', error);
  document.getElementById('hits').innerHTML = `
    <div style="padding: 2rem; color: #e07060; text-align: center;">
      <p>⚠️ Search Error: ${error.message || 'Unable to fetch results'}</p>
      <p style="font-size: 0.85rem; color: #999; margin-top: 1rem;">Check browser console for details</p>
    </div>
  `;
});

function firstGenre(hit) {
  if (Array.isArray(hit.genre)) return hit.genre[0] || '';
  if (typeof hit.genre === 'string') return hit.genre.split(',')[0].trim();
  return '';
}

function releaseYear(hit) {
  if (!hit.release_date) return '';
  const y = new Date(hit.release_date).getFullYear();
  return isNaN(y) ? '' : y;
}

function shortOverview(hit, len = 110) {
  if (!hit.overview || typeof hit.overview !== 'string') return 'No overview available.';
  return hit.overview.length > len ? hit.overview.substring(0, len) + '…' : hit.overview;
}

function posterHTML(hit, html) {
  if (hit.poster_url) {
    return html`<img
      src="${hit.poster_url}"
      alt="${hit.title}"
      loading="lazy"
      onerror="this.parentElement.innerHTML='<div class=poster-fallback>🎬<span>No Poster</span></div>'"
    />`;
  }
  return html`<div class="poster-fallback">🎬<span>No Poster</span></div>`;
}

search.addWidgets([

  instantsearch.widgets.searchBox({
    container: '#searchbox',
    placeholder: 'Search movies, genres, actors…',
    showReset: true,
    showLoadingIndicator: true,
  }),

  instantsearch.widgets.stats({
    container: '#stats',
    templates: {
      text: ({ nbHits, processingTimeMS }) =>
        `${nbHits.toLocaleString()} movies found in ${processingTimeMS}ms`,
    },
  }),

  instantsearch.widgets.hits({
    container: '#hits',
    templates: {
      item: (hit, { html, components }) => html`
        <div class="movie-card">
          <div class="poster-wrap">
            ${posterHTML(hit, html)}
            ${hit.vote_average
              ? html`<div class="rating-pill">⭐ ${Number(hit.vote_average).toFixed(1)}</div>`
              : ''}
          </div>
          <div class="card-body">
            <div class="card-title">
              ${components.Highlight({ attribute: 'title', hit })}
            </div>
            <div class="card-meta">
              ${firstGenre(hit)
                ? html`<span class="genre-chip">${firstGenre(hit)}</span>`
                : ''}
              ${releaseYear(hit)
                ? html`<span class="year-chip">${releaseYear(hit)}</span>`
                : ''}
            </div>
            <p class="card-overview">${shortOverview(hit)}</p>
          </div>
        </div>
      `,
      empty: () => {
        document.getElementById('no-results').style.display = 'block';
        return '';
      },
    },
    transformItems(items) {
      document.getElementById('no-results').style.display = items.length ? 'none' : 'block';
      return items;
    },
  }),

  instantsearch.widgets.refinementList({
    container: '#genre-filter',
    attribute: 'genre',
    limit: 8,
    showMore: true,
    showMoreLimit: 20,
    sortBy: ['count:desc'],
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

  // Pagination
  instantsearch.widgets.pagination({
    container: '#pagination',
    padding: 2,
  }),

]);

const requiredContainers = [
  '#searchbox', '#hits', '#stats', '#genre-filter', 
  '#year-filter', '#current-refinements', '#clear-all', '#pagination'
];

const missingContainers = requiredContainers.filter(selector => !document.querySelector(selector));

if (missingContainers.length > 0) {
  console.error('❌ Missing HTML containers:', missingContainers);
} else {
  console.log('✓ All required containers found');
}

search.start();
