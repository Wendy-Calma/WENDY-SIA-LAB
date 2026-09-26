<?php

/**
 * Small helpers used by sync.php. Kept free of side effects so they can be
 * tested without a database or an Algolia account (see tests/).
 */

declare(strict_types=1);

/**
 * Load KEY=VALUE pairs from a .env file into the environment.
 * Variables that are already set in the real environment win.
 */
function loadEnv(string $path): void
{
    if (!is_readable($path)) {
        return;
    }

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || !str_contains($line, '=')) {
            continue;
        }

        [$key, $value] = array_map('trim', explode('=', $line, 2));
        $value = trim($value, "\"'");

        if (getenv($key) === false) {
            putenv("{$key}={$value}");
        }
    }
}

function env(string $key, string $default = ''): string
{
    $value = getenv($key);
    return ($value === false || $value === '') ? $default : $value;
}

/**
 * Convert a MySQL row into the record shape stored in Algolia.
 *
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function toAlgoliaRecord(array $row): array
{
    $genres = [];
    if (is_string($row['genre'] ?? null) && $row['genre'] !== '') {
        $genres = array_values(array_filter(array_map('trim', explode(',', $row['genre']))));
    }

    return [
        'objectID'     => (string) $row['id'],
        'title'        => (string) ($row['title'] ?? ''),
        'overview'     => (string) ($row['overview'] ?? ''),
        'genre'        => $genres,
        'release_date' => $row['release_date'] ?? null,
        'release_year' => isset($row['release_year']) ? (int) $row['release_year'] : null,
        'vote_average' => round((float) ($row['vote_average'] ?? 0), 1),
        'poster_url'   => ($row['poster_url'] ?? '') ?: null,
    ];
}
