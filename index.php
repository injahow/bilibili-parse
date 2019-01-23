<html>
<head>
<meta content="text/html; charset=utf-8" http-equiv="Content-Type">
<title>flv解析</title>
<style>
.mainContainer {
display: block;
width: 1024px;
margin-left: auto;
margin-right: auto;
}
.urlInput {
display: block;
width: 100%;
margin-left: auto;
margin-right: auto;
margin-top: 8px;
margin-bottom: 8px;
}
.centeredVideo {
display: block;
width: 100%;
height: 576px;
margin-left: auto;
margin-right: auto;
margin-bottom: auto;
}
.controls {
display: block;
width: 100%;
text-align: left;
margin-left: auto;
margin-right: auto;
}
</style>
</head>
<body>
<?php
$file = "geturl.txt";
if(file_exists($file)){
$msg = file_get_contents($file);//使用file_get_contents函数获取url
$array = get_headers($msg,1);
//echo $array[0];//测试返回代码
if(preg_match('/453/',$array[0])){//判断url453不可访问则为有效//如果upos返回403不可解析
	} else {//url无效,getapi.php重写url
	include 'getapi.php';
	echo "<script language=JavaScript> location.replace(location.href);</script>";//php刷新页面
	}
}
?>
<div class="mainContainer">
<video id="videoElement" class="centeredVideo" controls autoplay width="1024" height="576"></video>

</div>
<br>
<div class="controls">
<!--<button onclick="flv_load()">加载</button>-->
<button onclick="flv_start()">开始</button>
<button onclick="flv_pause()">暂停</button>
<button onclick="flv_destroy()">停止</button>
<input style="width:100px" type="text" name="seekpoint" />
<button onclick="flv_seekto()">跳转</button>
</div>

<script src="./flv.min.js"></script>
<script>
      var player = document.getElementById('videoElement');
	  if (flvjs.isSupported()) {
         var flvPlayer = flvjs.createPlayer({type: 'flv',//此处可添加设置
        url: 'flv.php',//<==自行修改
            }, {
		lazyLoadMaxDuration: 10 * 60 //前面数值对应单位缓存差18s//此处具体参数可以通过获得的视频具体时长计算
			});
            flvPlayer.attachMediaElement(videoElement);
            flvPlayer.load(); //加载
            flv_start();
        }
		function flv_start() {
            player.play();
        }
		function flv_pause() {
            player.pause();
        }
		function flv_destroy() {
            player.pause();
            player.unload();
            player.detachMediaElement();
            player.destroy();
            player = null;
        }
		function flv_seekto() {
            player.currentTime = parseFloat(document.getElementsByName('seekpoint')[0].value);
        }
</script>
</body>
</html>