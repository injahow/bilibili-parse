<?php include 'getapi.php'; ?>
<?php
if ($otype == 'json') {
    header('Content-type: application/json; charset=UTF-8;');
    $file = './geturl/' . $av . '.json';
    $msg_json = file_get_contents($file);
    echo $msg_json;
    exit;
}
?>

<?php if ($otype == 'dplayer') { ?>
    <!-- 仅用于开发测试环境 -->
    <html>

    <head>
        <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
        <title>bilibili-parse播放测试</title>
    </head>

    <body>
        <div id="dplayer1"></div>
    </body>

    <link rel="stylesheet" href="./DPlayer.min.css">
    <script src="./flv.min.js"></script>
    <script type="text/javascript" src="./DPlayer.min.js" charset="utf-8"></script>
    <script>
        //这里必须使用 customType 自定义类型
        const dp = new DPlayer({
            container: document.getElementById('dplayer1'),
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
            }
        });
    </script>

    </html>
<?php exit;
} ?>