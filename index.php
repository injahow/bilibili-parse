<?php
// allow cross
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

$av = isset($_GET['av']) ? intval($_GET['av']) : 0;
$ep = isset($_GET['ep']) ? intval($_GET['ep']) : 0;

if (!$av && !$ep) {
    include __DIR__ . '/public/welcome.html';
    exit;
}

$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';
$otype = in_array($otype, ['json', 'url', 'dplayer']) ? $otype : 'json';

// only for mp4
if ($otype == 'dplayer') {
    include __DIR__ . '/public/dplayer.php';
    exit;
}

$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$q = isset($_GET['q']) ? intval($_GET['q']) : 32;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$format = isset($_GET['format']) ? $_GET['format'] : 'flv';

include  __DIR__ . '/src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type); //video or bangumi

// cache 1h
$bp->cache(true)->cache_time(3600);
// need config apcu
// $bp->cache(true, 'apcu')->cache_time(3600);

$bp->epid($ep);
$bp->aid($av)->page($p)->quality($q)->format($format);

// dash
if ($format == 'dash') {
    header('Content-type: application/json; charset=utf-8;');
    echo $bp->result();
    exit;
}

$res = json_decode($bp->result(), true);

if ($otype == 'json') {
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode($res);
} elseif ($otype == 'url') {
    header('Content-type: text/plain; charset=utf-8;');
    if (isset($res['url'])) {
        echo $res['url'];
    } else {
        echo '';
    }
}
