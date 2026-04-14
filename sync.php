<?php
require_once __DIR__ . '/vendor/autoload.php';

use Algolia\AlgoliaSearch\Api\SearchClient;

$DB_HOST  = 'localhost';
$DB_NAME  = 'moviedb';         
$DB_USER  = 'root';            
$DB_PASS  = '';               

$ALGOLIA_APP_ID    = 'ZYG539C6SS';              
$ALGOLIA_WRITE_KEY = 'b026617efa177404574b772c13614428'; 
$ALGOLIA_INDEX     = 'Wendy_movie';

// MYSQL CONNECTION
try {
    $pdo = new PDO(
        "mysql:host={$DB_HOST};dbname={$DB_NAME};charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    die("MySQL connection failed: " . $e->getMessage() . "\n");
}

// ALGOLIA CONNECTION
$client = SearchClient::create($ALGOLIA_APP_ID, $ALGOLIA_WRITE_KEY);

//FETCH MOVIES IN BATCHES
$batchSize = 1000;
$offset    = 0;
$total     = 0;

echo "Starting sync: MySQL → Algolia index '{$ALGOLIA_INDEX}'\n";
echo str_repeat('-', 50) . "\n";

do {
    $stmt = $pdo->prepare("
        SELECT
            id,
            title,
            overview,
            genre,
            release_date,
            vote_average,
            poster_url,
            YEAR(release_date) AS release_year
        FROM moviedb
        ORDER BY id
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':limit',  $batchSize, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset,    PDO::PARAM_INT);
    $stmt->execute();

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $count = count($rows);

    if ($count === 0) break;

    $records = array_map(function ($row) {
        $row['objectID'] = (string) $row['id'];
        if (!empty($row['genre']) && is_string($row['genre'])) {
            $row['genre'] = array_map('trim', explode(',', $row['genre']));
        }

        $row['vote_average'] = (float) ($row['vote_average'] ?? 0);
        $row['release_year'] = (int)   ($row['release_year'] ?? 0);

        return $row;
    }, $rows);

    $client->saveObjects($ALGOLIA_INDEX, $records);

    $total  += $count;
    $offset += $batchSize;

    echo "  Synced records " . ($offset - $batchSize + 1) . "–{$total}…\n";

} while ($count === $batchSize);

echo str_repeat('-', 50) . "\n";
echo "Done! Total records synced: {$total}\n";

echo "Configuring index settings…\n";

$client->setSettings($ALGOLIA_INDEX, [
    'searchableAttributes' => ['title', 'overview', 'genre'],
    'attributesForFaceting' => ['searchable(genre)', 'release_year'],
    'customRanking'         => ['desc(vote_average)'],
    'highlightPreTag'       => '<mark>',
    'highlightPostTag'      => '</mark>',
]);

echo "Settings applied. Sync complete!\n";
