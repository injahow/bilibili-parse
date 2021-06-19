<?php
$av = isset($_GET['av']) ? intval($_GET['av']) : 0;
$ep = isset($_GET['ep']) ? intval($_GET['ep']) : 0;
if (!$av && !$ep) {
    include __DIR__ . '/public/welcome.html';
    exit;
}

$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';
// ! 测试用
if ($otype == 'dplayer') {
    include __DIR__ . '/public/dplayer.html';
    exit;
}

$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$q = isset($_GET['q']) ? intval($_GET['q']) : 32;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$use_dash = isset($_GET['dash']) ? true : false;

include  __DIR__ . '/src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type); //video or bangumi

// 缓存 1h
$bp->cache(true)->cache_time(3600);

$bp->aid($av)->page($p)->quality($q);
$bp->epid($ep);

// 允许跨站
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// dash
if ($use_dash) {
    $bp->dash();
    $name = $type == 'bangumi' ? 'result' : 'data';
    //echo $bp->video();exit;
    $dash_data = json_decode($bp->video(), true)[0][$name]['dash'];
    $video_data = $dash_data['video'];
    $index = 0;
    foreach ($video_data as $i => $video) {
        if ($video['id'] == $q) {
            $index = $i;
            break;
        }
    }
    $video_url = $video_data[$index]['baseUrl'];
    $quality = $video_data[$index]['id'];
    $audio_url = $dash_data['audio'][0]['baseUrl'];
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode(array(
        'code'    => 0,
        'quality' => $quality,
        'video'   => $video_url,
        'audio'   => $audio_url
    ));
    exit;
}

if ($otype == 'json') {
    header('Content-type: application/json; charset=utf-8;');
    echo $bp->video();
} elseif ($otype == 'url') {
    header('Content-type: text/plain; charset=utf-8;');
    echo $bp->url();
}
