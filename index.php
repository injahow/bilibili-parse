<?php
// allow cross
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$av = isset($_GET['av']) ? intval($_GET['av']) : 0;
$bv = isset($_GET['bv']) ? $_GET['bv'] : '';
$cid = isset($_GET['cid']) ? intval($_GET['cid']) : 0;
$ep = isset($_GET['ep']) ? intval($_GET['ep']) : 0;

if (!$av && !$bv && !$ep) {
    $file_path = __DIR__ . '/public/readme.html';
    if (file_exists($file_path)) {
        echo file_get_contents($file_path);
    }
    exit;
}

$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';
$otype = in_array($otype, ['json', 'url', 'dplayer']) ? $otype : 'json';

// only for video mp4
if ($otype == 'dplayer') {
    $file_path = __DIR__ . '/public/dplayer.html';
    if (file_exists($file_path)) {
        echo file_get_contents($file_path);
    }
    exit;
}

$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$q = isset($_GET['q']) ? intval($_GET['q']) : 32;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$format = isset($_GET['format']) ? $_GET['format'] : 'flv';

include __DIR__ . '/src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type); //video or bangumi

// cache 1h
// $bp->cache(true)->cache_time(3600);
// need apcu
// $bp->cache(true, 'apcu')->cache_time(3600);

$bp->aid($av)->bvid($bv)->cid($cid)->epid($ep);
$bp->page($p)->quality($q)->format($format);

$result = json_decode($bp->result(), true);

if ($format == 'dash' || $otype == 'json') {
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode($result);
} elseif ($otype == 'url') {
    header('Content-type: text/plain; charset=utf-8;');
    echo isset($result['url']) ? $result['url'] : '';
}
