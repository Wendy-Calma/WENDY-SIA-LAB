/**
 * Demo-mode search client.
 *
 * Implements the small subset of the Algolia search API that InstantSearch
 * uses (query, facets, facet filters, pagination, highlighting) over the
 * in-browser sample data in demo-data.js. It lets the UI work with no
 * Algolia app — useful for a portfolio demo that must never go down.
 */
(function () {
  'use strict';

  const FACETS = ['genre', 'release_year'];

  function normalise(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function queryWords(query) {
    return normalise(query || '').split(/\s+/).filter(Boolean);
  }

  // Every query word must prefix-match a word in the title, genres or overview.
  // Returns a relevance score (higher is better), or -1 for no match.
  function score(movie, words) {
    if (words.length === 0) return 0;
    const fields = [
      { text: normalise(movie.title), weight: 3 },
      { text: normalise(movie.genre.join(' ')), weight: 2 },
      { text: normalise(movie.overview), weight: 1 },
    ];
    let total = 0;
    for (const word of words) {
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(word)}`);
      const best = Math.max(...fields.map((f) => (pattern.test(f.text) ? f.weight : 0)));
      if (best === 0) return -1;
      total += best;
    }
    return total;
  }

  // facetFilters: [["genre:Action", "genre:Drama"], "release_year:2010"]
  // Inner arrays are OR-ed together; the outer list is AND-ed.
  function matchesFilters(movie, facetFilters) {
    return (facetFilters || []).every((group) => {
      const options = Array.isArray(group) ? group : [group];
      return options.some((filter) => {
        const separator = filter.indexOf(':');
        const attribute = filter.slice(0, separator);
        const value = filter.slice(separator + 1);
        const actual = movie[attribute];
        return Array.isArray(actual)
          ? actual.some((v) => String(v) === value)
          : String(actual) === value;
      });
    });
  }

  function highlight(text, words, preTag, postTag) {
    const escaped = String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (words.length === 0) {
      return { value: escaped, matchLevel: 'none', matchedWords: [] };
    }
    const matched = [];
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${words.map(escapeRegExp).join('|')})`, 'giu');
    const value = escaped.replace(pattern, (all, boundary, word) => {
      matched.push(word.toLowerCase());
      return `${boundary}${preTag}${word}${postTag}`;
    });
    return {
      value,
      matchLevel: matched.length ? 'full' : 'none',
      matchedWords: [...new Set(matched)],
    };
  }

  function countFacets(movies, attributes) {
    const facets = {};
    for (const attribute of attributes) {
      facets[attribute] = {};
      for (const movie of movies) {
        const values = Array.isArray(movie[attribute]) ? movie[attribute] : [movie[attribute]];
        for (const value of values) {
          if (value === undefined || value === null) continue;
          facets[attribute][value] = (facets[attribute][value] || 0) + 1;
        }
      }
    }
    return facets;
  }

  function runQuery(movies, request) {
    const started = performance.now();
    const params = request.params || {};
    const words = queryWords(params.query);
    const page = params.page || 0;
    const hitsPerPage = params.hitsPerPage ?? 20;
    const preTag = params.highlightPreTag || '<mark>';
    const postTag = params.highlightPostTag || '</mark>';

    const matching = movies
      .map((movie) => ({ movie, relevance: score(movie, words) }))
      .filter(({ movie, relevance }) => relevance >= 0 && matchesFilters(movie, params.facetFilters))
      .sort((a, b) => b.relevance - a.relevance || b.movie.vote_average - a.movie.vote_average)
      .map(({ movie }) => movie);

    const requested = [].concat(params.facets || []);
    const facetNames = requested.includes('*') ? FACETS : requested.filter((f) => FACETS.includes(f));

    const hits = matching.slice(page * hitsPerPage, (page + 1) * hitsPerPage).map((movie) => ({
      ...movie,
      _highlightResult: { title: highlight(movie.title, words, preTag, postTag) },
    }));

    return {
      index: request.indexName,
      query: params.query || '',
      params: '',
      hits,
      nbHits: matching.length,
      page,
      nbPages: hitsPerPage > 0 ? Math.ceil(matching.length / hitsPerPage) : 0,
      hitsPerPage,
      facets: countFacets(matching, facetNames),
      exhaustiveNbHits: true,
      exhaustiveFacetsCount: true,
      processingTimeMS: Math.max(1, Math.round(performance.now() - started)),
    };
  }

  window.createDemoSearchClient = function createDemoSearchClient(movies) {
    return {
      search(requests) {
        return Promise.resolve({ results: requests.map((request) => runQuery(movies, request)) });
      },
    };
  };
})();
