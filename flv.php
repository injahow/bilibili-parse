<?php
// ! 仅用于开发测试
$av = isset($_GET['av']) ? $_GET['av'] : '';
if ($av == '') exit;

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$q = isset($_GET['q']) ? $_GET['q'] : 32;

include __DIR__ . 'src/Bilibili.php';

use Injahow\Bilibili;

$video = new Bilibili('video');

// 缓存 1h
$video->cache(true);
$video->cache_time(3600);

$video->aid($av);
$video->page(intval($p));
$video->quality(intval($q));

// header('Content-type: application/octet-stream;');
$video->flv();
