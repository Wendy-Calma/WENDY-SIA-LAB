<?php

/**
 * Dependency-free tests for sync/lib.php. Run with: composer test
 */

declare(strict_types=1);

require_once __DIR__ . '/../sync/lib.php';

$failures = 0;

function check(string $name, bool $condition): void
{
    global $failures;
    echo ($condition ? '  ✓ ' : '  ✗ ') . $name . "\n";
    if (!$condition) {
        $failures++;
    }
}

echo "toAlgoliaRecord\n";

$record = toAlgoliaRecord([
    'id'           => 42,
    'title'        => 'Inception',
    'overview'     => 'A thief who steals corporate secrets…',
    'genre'        => 'Action, Science Fiction, ,Adventure',
    'release_date' => '2010-07-15',
    'release_year' => '2010',
    'vote_average' => '8.36',
    'poster_url'   => '',
]);

check('objectID is the id as a string', $record['objectID'] === '42');
check('genre string is split, trimmed and blanks dropped', $record['genre'] === ['Action', 'Science Fiction', 'Adventure']);
check('release_year is an int', $record['release_year'] === 2010);
check('vote_average is a float rounded to 1 dp', $record['vote_average'] === 8.4);
check('empty poster_url becomes null', $record['poster_url'] === null);

$sparse = toAlgoliaRecord(['id' => 7, 'genre' => null, 'release_year' => null]);
check('missing genre becomes an empty list', $sparse['genre'] === []);
check('missing release_year stays null', $sparse['release_year'] === null);
check('missing vote_average defaults to 0', $sparse['vote_average'] === 0.0);

echo "loadEnv / env\n";

$envFile = tempnam(sys_get_temp_dir(), 'env');
file_put_contents($envFile, "# comment\nTEST_PLAIN=value\nTEST_QUOTED=\"with spaces\"\nTEST_PRESET=from-file\n");
putenv('TEST_PRESET=from-environment');
loadEnv($envFile);
unlink($envFile);

check('plain value is loaded', env('TEST_PLAIN') === 'value');
check('quotes are stripped', env('TEST_QUOTED') === 'with spaces');
check('real environment wins over .env', env('TEST_PRESET') === 'from-environment');
check('default is used for missing keys', env('TEST_MISSING', 'fallback') === 'fallback');

echo $failures === 0 ? "\nAll tests passed.\n" : "\n{$failures} test(s) failed.\n";
exit($failures === 0 ? 0 : 1);
