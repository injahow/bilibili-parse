<?php
$av = isset($_GET['av']) ? $_GET['av'] : '';
$ep = isset($_GET['ep']) ? $_GET['ep'] : '';
if ($av == '' && $ep == '') {
    include __DIR__ . '/public/welcome.html';
    exit;
}

$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';
// ! 测试用
if ($otype == 'dplayer') {
    include __DIR__ . '/public/dplayer.html';
    exit;
}

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$q = isset($_GET['q']) ? $_GET['q'] : 32;
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
    $dash_data = json_decode($bp->video(), true)[0][$name]['dash'];
    $video_url = $dash_data['video'][0]['baseUrl'];
    /*foreach ($videos as $video) {
        $video[''];
    }*/
    $audio_url = $dash_data['audio'][0]['baseUrl'];
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode(array(
        'code'  => 0,
        'video' => $video_url,
        'audio' => $audio_url
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
