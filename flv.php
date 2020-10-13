<?php
//!仅用于开发测试

require 'src/Bilibili.php';

use Injahow\Bilibili;

$api = new Bilibili('video');

$api->cache(true);

$av = isset($_GET['av']) ? $_GET['av'] : '';
if ($av == '') exit;


$api->aid($av);

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$api->page(intval($p));

$q = isset($_GET['q']) ? $_GET['q'] : 32;
$api->quality(intval($q));

$api->flv();
