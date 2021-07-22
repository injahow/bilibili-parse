<?php
$av = isset($_GET['av']) ? intval($_GET['av']) : 0;
$ep = isset($_GET['ep']) ? intval($_GET['ep']) : 0;
$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$q = isset($_GET['q']) ? intval($_GET['q']) : 32;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$format = 'mp4';
$otype = 'url';
include  __DIR__ . '/../src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type);
$bp->cache(true)->cache_time(3600);
$bp->epid($ep);
$bp->aid($av)->page($p)->quality($q)->format($format);
$data = json_decode($bp->video(), true)[0];
if (isset($data['code']) && $data['code'] != 0) {
    exit;
}
if ($format == 'mp4') {
    $data = $data['data'];
}
$url = $data['durl'][0]['url'];
?>
<html>

<head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <title>bilibili-parse播放测试</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">
</head>

<body>
    <div id="dplayer1"></div>
</body>

<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>
<script>
    const dp = new DPlayer({
        container: document.getElementById("dplayer1"),
        video: {
            url: '<?php echo $url; ?>',
            type: 'auto'
        }
    })
</script>

</html>
