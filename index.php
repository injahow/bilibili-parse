<?php
$av = isset($_GET['av']) ? $_GET['av'] : '';
$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';

if ($av == '') {
    include __DIR__ . '/public/welcome.html';
    exit;
}

// ! 测试用
if ($otype == 'dplayer') {
    include __DIR__ . '/public/dplayer.html';
    exit;
}

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$q = isset($_GET['q']) ? $_GET['q'] : 32;

include __DIR__ . '/src/Bilibili.php';

use Injahow\Bilibili;

$video = new Bilibili('video');

// 缓存 1h
$video->cache(true);
$video->cache_time(3600);

$video->aid($av);
$video->page(intval($p));
$video->quality(intval($q));

// 允许跨站
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

if ($otype == 'json') {
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode(json_decode($video->video())[0]);
} else if ($otype == 'url') {
    header('Content-type: text/plain; charset=utf-8;');
    echo $video->url();
}
