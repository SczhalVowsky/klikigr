<?php
// API Weekly Report — cukup taruh folder ini di web server PHP (XAMPP/Laragon/dll).
// Data disimpan di data/reports.php (JSON dengan header <?php exit; agar tidak bisa dibuka langsung).

declare(strict_types=1);

ini_set('display_errors', '0'); // jangan sampai warning PHP merusak JSON

$config = require __DIR__ . '/config.php';
const DIVISIONS = [
    'logistik1', 'klik', 'logistik2', 'ga', 'member-relation', 'member-service',
    'omi', 'food', 'nonfood', 'perishable', 'cashier', 'support',
];
const GUARD = "<?php exit; ?>\n";
$DATA_DIR = __DIR__ . '/data';
$DATA_FILE = $DATA_DIR . '/reports.php';
$FAIL_FILE = $DATA_DIR . '/login-fails.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
session_name('wr_admin');
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Strict']);

function send(int $status, $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_guarded(string $file, $default, bool $assoc = true)
{
    if (!is_file($file)) return $default;
    $raw = (string) file_get_contents($file);
    if (strncmp($raw, GUARD, strlen(GUARD)) === 0) $raw = substr($raw, strlen(GUARD));
    $data = json_decode($raw, $assoc);
    return ($assoc ? is_array($data) : is_object($data)) ? $data : $default;
}

function write_guarded(string $file, $data): void
{
    $dir = dirname($file);
    if (!is_dir($dir) && !mkdir($dir, 0775, true)) send(500, ['error' => 'Folder data tidak bisa dibuat']);
    $tmp = $file . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (file_put_contents($tmp, GUARD . $json, LOCK_EX) === false) {
        send(500, ['error' => 'Tidak bisa menulis data — pastikan folder data bisa ditulis web server']);
    }
    if (!rename($tmp, $file)) {
        // Windows: rename gagal kalau target ada
        @unlink($file);
        rename($tmp, $file);
    }
}

// Store dibaca sebagai object (bukan array) agar {} kosong tidak berubah jadi [].
function read_store(string $file): stdClass
{
    $store = read_guarded($file, new stdClass(), false);
    $settings = isset($store->settings) && is_object($store->settings) ? $store->settings : new stdClass();
    if (!isset($settings->tanggal)) $settings->tanggal = '';
    return (object) [
        'settings' => $settings,
        'reports' => isset($store->reports) && is_object($store->reports) ? $store->reports : new stdClass(),
    ];
}

function cut(string $s, int $n): string
{
    return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n);
}

function ini_bytes(string $v): int
{
    $v = trim($v);
    $n = (int) $v;
    switch (strtolower(substr($v, -1))) {
        case 'g': $n *= 1024;
        case 'm': $n *= 1024;
        case 'k': $n *= 1024;
    }
    return $n;
}

function body(): stdClass
{
    $len = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $max = ini_bytes((string) ini_get('post_max_size'));
    if ($max > 0 && $len > $max) {
        send(413, ['error' => 'Laporan terlalu besar untuk server (post_max_size ' . ini_get('post_max_size') . '). Kurangi foto atau naikkan post_max_size di php.ini']);
    }
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return new stdClass();
    $data = json_decode($raw);
    if (!is_object($data)) send(400, ['error' => 'JSON tidak valid']);
    return $data;
}

function require_admin(): void
{
    if (empty($_SESSION['admin'])) send(401, ['error' => 'Khusus admin']);
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') send(405, ['error' => 'Gunakan POST']);
}

function division(): string
{
    $div = (string) ($_GET['div'] ?? '');
    if (!in_array($div, DIVISIONS, true)) send(404, ['error' => 'Divisi tidak dikenal']);
    return $div;
}

$action = (string) ($_GET['a'] ?? '');

switch ($action) {
    case 'settings':
        $store = read_store($DATA_FILE);
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            require_admin();
            $b = body();
            $store->settings->tanggal = cut((string) ($b->tanggal ?? ''), 120);
            write_guarded($DATA_FILE, $store);
        }
        send(200, $store->settings);

    case 'login':
        require_post();
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $fails = read_guarded($FAIL_FILE, []);
        $f = $fails[$ip] ?? ['count' => 0, 'until' => 0];
        if ($f['until'] > time()) send(429, ['error' => 'Terlalu banyak percobaan, coba lagi 1 menit lagi']);
        $b = body();
        if (!hash_equals((string) $config['admin_pin'], (string) ($b->pin ?? ''))) {
            $count = ($f['until'] > 0 ? 0 : $f['count']) + 1;
            $fails[$ip] = ['count' => $count, 'until' => $count >= 5 ? time() + 60 : 0];
            write_guarded($FAIL_FILE, $fails);
            send(401, ['error' => 'PIN salah']);
        }
        if (isset($fails[$ip])) {
            unset($fails[$ip]);
            write_guarded($FAIL_FILE, $fails);
        }
        session_regenerate_id(true);
        $_SESSION['admin'] = true;
        send(200, ['token' => 'session']);

    case 'logout':
        $_SESSION = [];
        session_destroy();
        send(200, ['ok' => true]);

    case 'check':
        send(empty($_SESSION['admin']) ? 401 : 200, ['ok' => !empty($_SESSION['admin'])]);

    case 'all':
        require_admin();
        send(200, read_store($DATA_FILE));

    case 'clear':
        require_post();
        require_admin();
        $store = read_store($DATA_FILE);
        $store->reports = new stdClass();
        write_guarded($DATA_FILE, $store);
        send(200, ['ok' => true]);

    case 'report':
        $div = division();
        $store = read_store($DATA_FILE);
        send(200, $store->reports->$div ?? null);

    case 'save':
        require_post();
        $div = division();
        $b = body();
        if (!isset($b->data) || !is_object($b->data)) send(400, ['error' => 'Format salah']);
        $store = read_store($DATA_FILE);
        $store->reports->$div = (object) [
            'division' => $div,
            'pengisi' => cut((string) ($b->pengisi ?? ''), 80),
            'periode' => cut((string) ($b->periode ?? ''), 120),
            'data' => $b->data,
            'updatedAt' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
        write_guarded($DATA_FILE, $store);
        send(200, $store->reports->$div);

    case 'delete':
        require_post();
        require_admin();
        $div = division();
        $store = read_store($DATA_FILE);
        unset($store->reports->$div);
        write_guarded($DATA_FILE, $store);
        send(200, ['ok' => true]);

    default:
        send(404, ['error' => 'Tidak ditemukan']);
}
