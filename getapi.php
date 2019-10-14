<?php
$av = $_GET['av'];
$q = $_GET['q'];
$p = $_GET['p'];
$otype = $_GET['otype'];
if ($av=='') {
    echo '<!DOCTYPE HTML><html><meta http-equiv="Content-Type" content="text/html;charset=utf-8"/><head><link rel="shortcut icon" href="favicon.png"><title>b-video</title></head><body><h1>参数说明</h1>
        type: 类型<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;av 视频av号<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;p 视频集数<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;q 视频清晰度<br />
        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;otype 输出格式<br /><br />
        此API基于you-get构建。<br /><br />
        例如：<a href="https://api.injahow.cn/bparse/?av=14661594&p=1&q=16&otype=json" target="_blank">https://api.injahow.cn/bparse/?av=14661594&p=1&q=16&otype=json</a><br />
        </body></html>';
    exit();//结束所有脚本
} else {
    setcookie('av',$av);
}
header('Content-Type: text/html; charset=UTF-8');//定义头文件，防止乱码
if ($p == '') {
    $p = '1';//默认720P    
}
if ($q == '') {
    $q = '64';//默认第1页    
}
if ($otype == '') {
    $otype = 'dplayer';//默认播放器
}
//$av = $_COOKIE['av'];//'810872';//视频的av编号
//$q = $_COOKIE['q'];//'16';//视频的清晰度编号
/*以下av编号解析*/
$cid = get_cid($av,$p);
$api = get_api($cid,$q);

/**此处出错
if (json_decode(get_json($api))->code == 10004) {//判断为bangumi视频源
$api = get_api_bangumi($cid,$q);
}
*/

/*以下ep编号解析*/
$msg = get_json($api,'http://bilibili.com');
//echo $api;//测试视频api能否解析
//echo $msg;//测试服务器实际解析
$json = json_decode($msg);//json字符串对象化获取相关数据
$q = $json->quality;
/*下略补充*/
$url = $json->durl[0]->url;
//$url = strtr($url, 'http', 'https');//修改为https
/*下略补充*/
$durl_json = array('url'=>$url);
$get_json = array('aid'=>$av,'page'=>$p,'quality'=>$q,'durl'=>[$durl_json],'status'=>'ok');//json初始化
$get_json = json_encode($get_json);//php数组json字符串化
$file = './geturl/'.$av.'.json';
write_url($file, $get_json);
//echo $durl_0[0];
function get_cid($aid,$p) {//已知av获取cid
    return json_decode(get_json('https://api.bilibili.com/x/web-interface/view?aid='.$aid,'http://bilibili.com'))->data->pages[$p-1]->cid;
}

function get_api($cid,$quality) {//核心代码————解析函数(cid编号，清晰度)
	//$quality-清晰度(112|1080P+)/(80->1080P)/(64->720)/(32->480P)/(16->360P)//以最后返回为准，存在一定误差
    /*************/
    $entropy = 'rbMCKn@KuamXWlPMoJGsKcbiJKUfkPF_8dABscJntvqhRSETg';
    $entropy_array = str_split(strrev($entropy),1);
    $str='';
    for ($i=0; $i < strlen($entropy); ++$i) {
        $a = chr(ord($entropy_array[$i])+2);
        $str .= $a;
    }
	$appkey = explode(':',$str)[0];
	$sec = explode(':',$str)[1];
    /***************/
	$api_url = 'https://interface.bilibili.com/v2/playurl?';//去v2清晰度最高480或(64->720)
	$params_str = 'appkey='.$appkey.'&cid='.$cid.'&otype=json&qn='.$quality.'&quality='.$quality.'&type=';//otype可xml/type可mp4...
	$chksum = md5($params_str.$sec);
	$api_url = $api_url.$params_str.'&sign='.$chksum; 
    //echo $api_url;
    return $api_url;
}

function get_api_bangumi($cid,$quality) {//(待修正)————番剧解析函数(cid编号，清晰度)
    $ts = time();//获取当前时间戳
    $mod = 'bangumi';//$mod = 'movie';
    $sec2 = '9b288147e5474dd2aa67085f716c560d';//特殊密钥
    $bangumi_api_url = 'http://bangumi.bilibili.com/player/web_api/playurl?';
    $params_str = 'cid='.$cid.'&module='.$mod.'&otype=json&player=1&quality='.$quality.'&ts='.$ts;
    $sign = md5($params_str.$sec2);
    $api_url = $bangumi_api_url.$params_str.'&sign='.$sign;
    return $api_url;
}

function get_json($url,$referer) {
	$curl = curl_init();//创建一个新的CURL资源
	$headers = rand_headers();
    curl_setopt($curl, CURLOPT_HTTPHEADER, $headers);//伪造请求ip
    $ua = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.66 Safari/537.36';
	curl_setopt($curl, CURLOPT_USERAGENT, $ua);//模拟windows用户正常访问
	curl_setopt($curl, CURLOPT_REFERER, $referer);//伪造请求源referer
	curl_setopt($curl, CURLOPT_URL, $url);//设置URL和相应的选项
	curl_setopt($curl, CURLOPT_HEADER, 0);//0表示不输出Header，1表示输出
	curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);//数据不输出到页面
	$json = curl_exec($curl);
	curl_close($curl);
	return $json;
}

function write_url($txt_file_name,$str) {
	if (!($txt_res=fopen($txt_file_name,'w+'))) {//读写打开，不存在则创建
		exit();
	}
	if (!fwrite($txt_res,$str)) {//写入
		fclose($txt_res);
		exit();
	}
	fclose($txt_res);//关闭指针
}

function rand_headers(){//随机ip
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
	$ip= long2ip(mt_rand($ip_long[$rand_key][0], $ip_long[$rand_key][1]));
	$headers['CLIENT-IP'] = $ip;
	$headers['X-FORWARDED-FOR'] = $ip;
	$header_arr = array();
	foreach ($headers as $n => $v) {
		$header_arr[] = $n.':'.$v;
	}
    return $header_arr;
}
?>
