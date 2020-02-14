<?php include 'getapi.php';?>
<?php
if ($otype == 'json'){
    header('Content-type: application/json; charset=UTF-8;');//定义json头
    $file = "./geturl/".$av.".json";
    $msg_json = file_get_contents($file);//获取json文件
    echo $msg_json;
    exit;
}
?>
<?php if ($otype == 'dplayer'){ ?>
    <html><head><meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <title>B-flv解析</title></head>
    <body>
    <script src="./flv.min.js"></script>
    <link rel="stylesheet" href="./DPlayer.min.css">
    <script type="text/javascript" src="./DPlayer.min.js" charset="utf-8"></script>
    <div id="player1"></div>
    <script>
    //这里必须使用 customType--自定义类型
    const dp = new DPlayer({
        container: document.getElementById('player1'),
        video: {
            url: 'flv.php',
            type: 'customFlv',
            customType: {
                customFlv: function(video, player) {
                    const flvPlayer = flvjs.createPlayer({
                        type: 'flv',
                        url: video.src,
                    });
                    flvPlayer.attachMediaElement(video);
                    flvPlayer.load();
                },
            },
        },
        //danmaku: {//可选，显示弹幕，忽略此选项以隐藏弹幕
        //id: '9E2E3368B56CDBB4',//必需，弹幕id，注意：它必须是唯一的，不能在你的新播放器中使用这些：`https://api.prprpr.me/dplayer/list`
        //   api: 'https://api.prprpr.me/dplayer/',//必需，弹幕api接口'https://api.bilibili.com/x/v1/dm/???https://api.injahow.cn/danmu/??https://injahow.cn/danmu/
        // token: 'tokendemo',//可选，api 的弹幕令牌
        //  maximum: 1000,//可选，最大数量的弹幕
            //addition: ['https://api.prprpr.me/dplayer/bilibili?aid=4157142']//可选的，额外的弹幕，参见：`Bilibili弹幕支持`https://api.bilibili.com/x/v1/dm/list.so?oid=63968441
        //}//
    });
    </script>
    </body>
    </html>
<?php exit;} ?>
