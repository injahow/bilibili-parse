<?php

require 'src/Bilibili.php';

use Injahow\Bilibili;

$api = new Bilibili('video');

$api->cache(true);

$av = isset($_GET['av']) ? $_GET['av'] : '';
if ($av == '') {
    require './public/welcome.html';
    exit;
}
$api->aid($av);

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$api->page(intval($p));

$q = isset($_GET['q']) ? $_GET['q'] : 32;
$api->quality(intval($q));

$otype = isset($_GET['otype']) ? $_GET['otype'] : 'json';

if ($otype == 'dplayer') {
    // ! 测试用
    require './public/dplayer.html';
    exit;
} else if ($otype == 'json') {
    echo $api->video();
} else if ($otype == 'url') {
    echo json_encode($api->url());
}
