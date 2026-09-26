<?php

/**
 * Batch sync: MySQL movie catalogue → Algolia index.
 *
 * Reads movies from MySQL in keyset-paginated batches, normalises each row
 * into an Algolia record, pushes the records to the index and finally applies
 * the index settings (searchable attributes, facets, ranking).
 *
 * Usage:  composer sync        (or)        php sync/sync.php
 * Config: copy .env.example to .env and fill in the values.
 */

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/lib.php';

use Algolia\AlgoliaSearch\Api\SearchClient;

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("This script must be run from the command line.\n");
}

loadEnv(__DIR__ . '/../.env');

$dbHost      = env('DB_HOST', '127.0.0.1');
$dbPort      = env('DB_PORT', '3306');
$dbName      = env('DB_NAME', 'moviedb');
$dbUser      = env('DB_USER', 'root');
$dbPass      = env('DB_PASS', '');
$dbTable     = env('DB_TABLE', 'movies');
$algoliaApp  = env('ALGOLIA_APP_ID');
$algoliaKey  = env('ALGOLIA_WRITE_API_KEY');
$algoliaIdx  = env('ALGOLIA_INDEX_NAME', 'movies');
$batchSize   = (int) env('SYNC_BATCH_SIZE', '1000');

if ($algoliaApp === '' || $algoliaKey === '') {
    fwrite(STDERR, "Missing ALGOLIA_APP_ID or ALGOLIA_WRITE_API_KEY. See .env.example.\n");
    exit(1);
}

if (!preg_match('/^[A-Za-z0-9_]+$/', $dbTable)) {
    fwrite(STDERR, "DB_TABLE may only contain letters, digits and underscores.\n");
    exit(1);
}

// ── MySQL connection ──────────────────────────────────────────────────────
try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $dbUser,
        $dbPass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "MySQL connection failed: {$e->getMessage()}\n");
    exit(1);
}

// ── Algolia connection ────────────────────────────────────────────────────
$client = SearchClient::create($algoliaApp, $algoliaKey);

echo "Starting sync: MySQL `{$dbName}.{$dbTable}` → Algolia index '{$algoliaIdx}'\n";
echo str_repeat('-', 60) . "\n";

// Keyset pagination (WHERE id > last id) stays fast on large tables,
// unlike LIMIT/OFFSET which rescans every skipped row.
$stmt = $pdo->prepare("
    SELECT id, title, overview, genre, release_date, vote_average, poster_url,
           YEAR(release_date) AS release_year
    FROM `{$dbTable}`
    WHERE id > :last_id
    ORDER BY id
    LIMIT :limit
");

$lastId = 0;
$total  = 0;

try {
    do {
        $stmt->bindValue(':last_id', $lastId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $batchSize, PDO::PARAM_INT);
        $stmt->execute();
        $rows  = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $count = count($rows);

        if ($count === 0) {
            break;
        }

        $records = array_map('toAlgoliaRecord', $rows);
        $client->saveObjects($algoliaIdx, $records, true);

        $lastId  = (int) end($rows)['id'];
        $total  += $count;
        echo "  Synced {$count} records (total {$total}, last id {$lastId})\n";
    } while ($count === $batchSize);

    echo str_repeat('-', 60) . "\n";
    echo "Records synced: {$total}\n";

    echo "Applying index settings…\n";
    $client->setSettings($algoliaIdx, [
        'searchableAttributes'  => ['title', 'overview', 'genre'],
        'attributesForFaceting' => ['searchable(genre)', 'release_year'],
        'customRanking'         => ['desc(vote_average)'],
        'highlightPreTag'       => '<mark>',
        'highlightPostTag'      => '</mark>',
    ]);
} catch (Throwable $e) {
    fwrite(STDERR, "Sync failed: {$e->getMessage()}\n");
    exit(1);
}

echo "Sync complete.\n";
