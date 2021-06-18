<?php
// ! 仅用于开发测试
$av = isset($_GET['av']) ? $_GET['av'] : '';
if ($av == '') exit;

$p = isset($_GET['p']) ? $_GET['p'] : 1;
$q = isset($_GET['q']) ? $_GET['q'] : 32;

include __DIR__ . '/src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili('video');

// 缓存 1h
$bp->cache(true);
$bp->cache_time(3600);
$bp->aid($av);
$bp->page($p);
$bp->quality($q);

// header('Content-type: application/octet-stream;');
$url = $bp->url();
$curl = curl_init();
$ua = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36';
curl_setopt($curl, CURLOPT_USERAGENT, $ua);
curl_setopt($curl, CURLOPT_HTTPHEADER, rand_headers());
curl_setopt($curl, CURLOPT_HEADER, 0);
curl_setopt($curl, CURLOPT_TIMEOUT, 20);
curl_setopt($curl, CURLOPT_ENCODING, 'gzip');
curl_setopt($curl, CURLOPT_IPRESOLVE, 1);
curl_setopt($curl, CURLOPT_REFERER, 'https://www.bilibili.com');
// !输出到页面
curl_setopt($curl, CURLOPT_RETURNTRANSFER, 0);
curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
curl_setopt($curl, CURLOPT_URL, $url);
curl_exec($curl);
curl_close($curl);

function rand_headers()
{
    $ip_long = array(
        array('607649792', '608174079'), //36.56.0.0-36.63.255.255
        array('1038614528', '1039007743'), //61.232.0.0-61.237.255.255
        array('1783627776', '1784676351'), //106.80.0.0-106.95.255.255
        array('2035023872', '2035154943'), //121.76.0.0-121.77.255.255
        array('2078801920', '2079064063'), //123.232.0.0-123.235.255.255
        array('-1950089216', '-1948778497'), //139.196.0.0-139.215.255.255
        array('-1425539072', '-1425014785'), //171.8.0.0-171.15.255.255
        array('-1236271104', '-1235419137'), //182.80.0.0-182.92.255.255
        array('-770113536', '-768606209'), //210.25.0.0-210.47.255.255
        array('-569376768', '-564133889'), //222.16.0.0-222.95.255.255
    );
    $rand_key = mt_rand(0, 9);
    $ip = long2ip(mt_rand($ip_long[$rand_key][0], $ip_long[$rand_key][1]));
    $headers['CLIENT-IP'] = $ip;
    $headers['X-FORWARDED-FOR'] = $ip;
    $header_arr = array();
    foreach ($headers as $n => $v) {
        $header_arr[] = $n . ':' . $v;
    }
    return $header_arr;
}
