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

// ! only for test
if ($otype == 'dplayer') {
    include __DIR__ . '/public/dplayer.html';
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

$bp->epid($ep);
$bp->aid($av)->page($p)->quality($q)->format($format);

// dash
if ($format == 'dash') {
    header('Content-type: application/json; charset=utf-8;');
    $name = $type == 'bangumi' ? 'result' : 'data';
    //echo $bp->dash(true)->video();exit;
    $dash_data = json_decode($bp->video(), true)[0];
    if (isset($dash_data['code']) && $dash_data['code'] != 0) {
        echo json_encode($dash_data);
        exit;
    }
    $dash_data = $dash_data[$name]['dash'];

    $video_data = $dash_data['video'];
    $index = 0;
    foreach ($video_data as $i => $video) {
        if ($video['id'] == $q) {
            $index = $i;
            break;
        }
    }
    $quality = $video_data[$index]['id'];
    $video_url = $video_data[$index]['baseUrl'];
    $audio_url = $dash_data['audio'][0]['baseUrl'];
    echo json_encode(array(
        'code'    => 0,
        'quality' => $quality,
        'video'   => $video_url,
        'audio'   => $audio_url
    ));
    exit;
}

$data = json_decode($bp->video(), true)[0];
//echo json_encode($data); exit;
if (isset($data['code']) && $data['code'] != 0) {
    echo json_encode($data);
    exit;
}

if ($type == 'bangumi') {
    $data = $data['result'];
} else if ($format == 'mp4') {
    $data = $data['data'];
}

$durl_data = $data['durl'][0];

$url = $durl_data['url'];
$quality = $data['quality'];
$res = array(
    'code'    => 0,
    'quality' => $quality,
    'url'     => $url
);

if ($otype == 'json') {
    header('Content-type: application/json; charset=utf-8;');
    echo json_encode($res);
} elseif ($otype == 'url') {
    header('Content-type: text/plain; charset=utf-8;');
    echo $res['url'];
}
