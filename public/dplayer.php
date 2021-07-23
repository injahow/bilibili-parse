<?php
// $av $ep
if (!isset($av) && !isset($ep)) exit;
$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$format = 'mp4';

include __DIR__ . '/../src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type);

$bp->cache(true)->cache_time(3600);
// need config apcu
// $bp->cache(true, 'apcu')->cache_time(3600);
$bp->epid($ep);
$bp->aid($av)->page($p)->format($format);
$res = json_decode($bp->result(), true);
if (isset($res['url'])) {
    $url = $res['url'];
} else {
    $url = '';
}
?>
<html>

<head>
    <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
    <title>bilibili-parse播放测试</title>
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
