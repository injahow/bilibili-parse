<?php
$av =  $_COOKIE['av'];
$file_name = './geturl/' . $av . '.json';
if (file_exists($file_name)) {
    $data = json_decode(file_get_contents($file_name));
    $url = $data->durl[0]->url;
    $curl = curl_init();
    $headers = rand_headers();
    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);
    $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.121 Safari/537.36';
    curl_setopt($curl, CURLOPT_USERAGENT, $ua);
    curl_setopt($curl, CURLOPT_REFERER, 'http://bilibili.com');
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_HEADER, 0);
    //!直接输出flv到页面
    curl_exec($curl);
    curl_close($curl);
}

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
    $headerArr = array();
    foreach ($headers as $n => $v) {
        $headerArr[] = $n . ':' . $v;
    }
    return $headerArr;
}
