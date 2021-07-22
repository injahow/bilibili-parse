<?php
// $av $ep
if (!isset($av) && !isset($epid)) exit;
$p = isset($_GET['p']) ? intval($_GET['p']) : 1;
$type = isset($_GET['type']) ? $_GET['type'] : 'video';
$format = 'mp4';
$otype = 'url';

include __DIR__ . '/../src/Bilibili.php';

use Injahow\Bilibili;

$bp = new Bilibili($type);

$bp->cache(true)->cache_time(3600);
$bp->epid($ep);
$bp->aid($av)->page($p)->format($format);
$data = json_decode($bp->video(), true)[0];
if (isset($data['code']) && $data['code'] != 0) {
    $url = '';
} else {
    if ($format == 'mp4') $data = $data['data'];
    $url = $data['durl'][0]['url'];
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
