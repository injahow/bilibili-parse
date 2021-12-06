<?php

/**
 * bilbili video api
 * https://injahow.com
 * https://github.com/injahow/bilibili-parse
 * Version 0.4.6
 *
 * Copyright 2019, injahow
 * Released under the MIT license
 */

namespace Injahow;

class Bilibili
{
    public $aid;
    public $bvid;
    public $epid;
    public $page = 1;
    public $cid;
    public $quality = 32;
    public $type = 'video';
    public $format = 'flv';
    public $access_key;

    public $cache = false;
    public $cache_type = 'file';
    public $cache_time = 3600;

    public $result;
    public $has_cookie = false;
    public $header;
    public $proxy = null;
    public $data;
    public $raw;
    public $info;
    public $error;
    public $status;

    public $appkey;
    public $sec;

    public function __construct($value = 'video')
    {
        $this->type($value);
    }

    public function type($value)
    {
        $suppose = array('video', 'bangumi', 'cheese');
        $this->type = in_array($value, $suppose) ? $value : 'video';
        $this->header = $this->curlset();

        return $this;
    }

    public function aid($value)
    {
        $this->aid = $value;

        return $this;
    }

    public function bvid($value)
    {
        $this->bvid = $value;

        return $this;
    }

    public function page($value)
    {
        $this->page = $value > 1 ? $value : 1;

        return $this;
    }

    public function epid($value)
    {
        $this->epid = $value;

        return $this;
    }

    public function cid($value)
    {
        $this->cid = $value;

        return $this;
    }

    public function quality($value, $force = false)
    {
        $value = intval($value);
        if (!$force) {
            $suppose = array(127, 125, 120, 116, 112, 80, 74, 64, 48, 32, 16); // todo
            foreach ($suppose as $v) {
                if ($v <= $value) {
                    $this->quality = $v;

                    return $this;
                }
            }
            $this->quality = 32;
        } else {
            $this->quality = $value;
        }

        return $this;
    }

    public function format($value)
    {
        $suppose = array('flv', 'dash', 'mp4');
        $this->format = in_array($value, $suppose) ? $value : 'flv';

        return $this;
    }

    public function access_key($value)
    {
        $this->access_key = $value;

        return $this;
    }

    public function cache($value = true, $type = '')
    {
        $this->cache = $value;
        if (in_array($type, array('file', 'apcu'))) {
            $this->cache_type = $type;
        }

        return $this;
    }

    public function cache_time($value = 3600)
    {
        $value = intval($value);
        $this->cache_time = $value > 60 ? $value : 60;

        return $this;
    }

    public function cookie($value)
    {
        $this->has_cookie = !empty($value);
        $this->header['Cookie'] = $value;

        return $this;
    }

    public function proxy($value)
    {
        $this->proxy = $value;

        return $this;
    }

    public function video()
    {
        if (empty($this->cid)) {
            $this->setCid();
        }

        if (empty($this->cid)) {
            return json_encode([array(
                'code'    => 1,
                'message' => 'unknown cid'
            )]);
        }

        if ($this->type == 'video') {
            if (empty($this->access_key) && !$this->has_cookie && $this->format != 'dash') {
                $api = $this->bilibili_video_api();
            } else {
                $api = $this->bilibili_api();
            }
        } else if ($this->type == 'bangumi') {
            $api = $this->bilibili_bangumi_api();
        } else {
            $api = $this->bilibili_cheese_api();
        }

        return $this->exec($api);
    }

    public function result()
    {

        if ($this->cache) {
            $this->result = $this->getCache();
            if (!empty($this->result)) {
                return $this->result;
            }
        }

        $data = $this->video();
        $raw = json_decode($this->raw, true);
        if (!empty($raw['code'])) {
            return $this->raw;
        } else {
            $data = json_decode($data, true)[0];
            switch ($this->format) {
                case 'dash':
                    if (isset($data['dash'])) {
                        $index = 0;
                        $find = 0;
                        foreach ($data['dash']['video'] as $i => $video) {
                            if ($video['id'] == $this->quality) {
                                $index = $i;
                                $find = 1;
                                break;
                            }
                        }

                        if ($data['accept_quality'][0] >= 80 && $find == 0) { // ?

                            return json_encode(array(
                                'code'           => 1,
                                'accept_quality' => $data['accept_quality'],
                                'message'        => '可能需要会员或未知参数quality'
                            ));
                        }

                        $this->result = json_encode(array(
                            'code'           => 0,
                            'quality'        => $data['dash']['video'][$index]['id'],
                            'accept_quality' => $data['accept_quality'],
                            'video'          => $data['dash']['video'][$index]['base_url'],
                            'audio'          => $data['dash']['audio'][0]['base_url']
                        ));
                    } else { // ? durl

                        return json_encode(array(
                            'code'    => 1,
                            'message' => '可能是会员付费视频'
                        ));
                    }
                    break;

                case 'flv':

                    if (in_array($this->type, ['bangumi', 'cheese'])) {
                        if (isset($data['format']) && $data['format'] == 'mp4' && $data['quality'] != 16) {

                            return json_encode(array(
                                'code'    => 1,
                                'message' => '可能需要会员或付费播放'
                            ));
                        }
                    }

                    if ($data['accept_quality'][0] >= 80 && $this->quality != $data['quality']) {  // ?

                        return json_encode(array(
                            'code'           => 1,
                            'accept_quality' => $data['accept_quality'],
                            'message'        => '可能需要会员或未知参数quality'
                        ));
                    }

                    $this->result = json_encode(array(
                        'code'           => 0,
                        'quality'        => $data['quality'],
                        'accept_quality' => $data['accept_quality'],
                        'url'            => $data['durl'][0]['url']
                    ));

                    break;

                case 'mp4':
                    if ($this->type == 'video') {
                        $this->quality($data['quality'], true);
                        $this->result = json_encode(array(
                            'code'           => 0,
                            'quality'        => $this->quality,
                            'accept_quality' => $data['accept_quality'],
                            'url'            => $data['durl'][0]['url']
                        ));
                    } else {
                        // todo
                        return json_encode(array(
                            'code'    => 1,
                            'message' => '暂不支持该类视频的MP4请求'
                        ));
                    }
                    break;
            }
        }

        if ($this->cache) {
            $this->setCache($this->result);
        }

        return $this->result;
    }

    private function getCacheName()
    {
        // ! mkdir '/cache/*'
        if ($this->format == 'mp4')
            $suffix = 'mp4';
        else
            $suffix = $this->quality . '_' . $this->format;

        if (!isset($this->cid)) $this->setCid();

        if (!empty($this->cid))
            $path = '/../cache/cid/' . $this->cid . '_' . $suffix . '.json';
        else
            $path = '/../cache/cid/0' . '_' . $this->format . '.json';

        return __DIR__ . $path;
    }

    private function bilibili_api()
    {
        $api = array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/x/player/playurl',
            'body'   => array(
                'avid'       => $this->aid,
                'bvid'       => $this->bvid,
                'cid'        => $this->cid,
                'qn'         => $this->format == 'flv' ? $this->quality : 0,
                'type'       => $this->format == 'mp4' ? 'mp4' : '',
                'otype'      => 'json',
                'access_key' => $this->access_key
            ),
            'format' => 'data'
        );

        switch ($this->format) {
            case 'mp4':
                $api['body'] += array(
                    'platform'     => 'html5',
                    'high_quality' => 1
                );
                break;
            case 'flv':
            case 'dash':
                $api['body'] += array(
                    'fnver' => 0,
                    'fnval' => $this->format == 'dash' ? 2000 : 0,
                    'fourk' => 1
                );
                break;
        }
        return $api;
    }

    private function bilibili_video_api()
    {
        $this->setAppkey();

        $api = array(
            'method' => 'GET',
            'url'    => array(
                'flv' => 'https://interface.bilibili.com/v2/playurl',
                'mp4' => 'https://app.bilibili.com/v2/playurlproj'
            )[$this->format != 'flv' ? 'mp4' : 'flv'],
            'body'   => array(
                'appkey'     => $this->appkey,
                'cid'        => $this->cid,
                'otype'      => 'json',
                'qn'         => $this->quality,
                'quality'    => $this->quality,
                'type'       => ''
            ),
            'format' => ''
        );
        $api['body'] += array('sign' => md5(http_build_query($api['body']) . $this->sec));

        return $api;
    }

    private function bilibili_bangumi_api()
    {
        return array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/pgc/player/web/playurl',
            'body'   => array(
                'avid'       => $this->aid,
                'bvid'       => $this->bvid,
                'cid'        => $this->cid,
                'qn'         => $this->quality,
                'quality'    => $this->quality,
                'type'       => '',
                'otype'      => 'json',
                'ep_id'      => $this->epid,
                'fnver'      => '0',
                'fnval'      => $this->format == 'dash' ? 2000 : 0,
                'fourk'      => 1,
                'access_key' => $this->access_key
            ),
            'format' => 'result'
        );
    }

    private function bilibili_cheese_api()
    {
        return array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/pugv/player/web/playurl',
            'body'   => array(
                'avid'       => $this->aid,
                'bvid'       => $this->bvid,
                'cid'        => $this->cid,
                'qn'         => $this->quality,
                'quality'    => $this->quality,
                'type'       => '',
                'otype'      => 'json',
                'ep_id'      => $this->epid,
                'fnver'      => '0',
                'fnval'      => $this->format == 'dash' ? 2000 : 0,
                'fourk'      => 1,
                'access_key' => $this->access_key
            ),
            'format' => 'data'
        );
    }

    private function bangumi_season_id($media_id)
    {
        // media_id -> season_id
        return array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/pgc/review/user',
            'body'   => array(
                'media_id' => $media_id
            )
        );
    }

    private function bangumi_cid($season_id)
    {
        // season_id -> all(cid)
        return array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/pgc/web/season/section',
            'body'   => array(
                'season_id' => $season_id
            )
        );
    }

    public function setCache($data)
    {
        $file_name = $this->getCacheName();
        if ($this->cache_type == 'file') {
            if (!($f = fopen($file_name, 'w+'))) {
                return;
            }
            if (!fwrite($f, $data)) {
                fclose($f);
                return;
            }
            fclose($f);
        } else if ($this->cache_type == 'apcu') {
            apcu_store(md5($file_name), $data, $this->cache_time);
        }
    }

    public function getCache()
    {
        $file_name = $this->getCacheName();
        if ($this->cache_type == 'file') {
            if (file_exists($file_name)) {
                if ($_SERVER['REQUEST_TIME'] - filectime($file_name) < $this->cache_time) {
                    return file_get_contents($file_name);
                }
            }
            return null;
        } else if ($this->cache_type == 'apcu') {
            return apcu_fetch(md5($file_name));
        }
    }

    private function setCid()
    {
        if (!empty($this->epid)) {
            $api = array(
                'method' => 'GET',
                'url'    => array(
                    'bangumi' => 'https://api.bilibili.com/pgc/view/web/season',
                    'cheese'  => 'https://api.bilibili.com/pugv/view/web/season'
                )[$this->type != 'bangumi' ? 'cheese' : 'bangumi'],
                'body'   => array(
                    'ep_id'      => $this->epid,
                    'access_key' => $this->access_key
                ),
                'format' => ($this->type != 'bangumi' ? 'data' : 'result') . '.episodes'
            );
            $episodes = json_decode($this->exec($api), true);
            if (!isset($episodes[0])) return;

            foreach ($episodes as $episode) {
                if ($episode['id'] == $this->epid) {
                    $this->cid = $episode['cid'];

                    return;
                }
            }
        } else if (!(empty($this->aid) && empty($this->bvid))) {
            $api = array(
                'method' => 'GET',
                'url'    => 'https://api.bilibili.com/x/web-interface/view',
                'body'   => array(
                    'aid'        => $this->aid,
                    'bvid'       => $this->bvid,
                    'access_key' => $this->access_key
                ),
                'format' => $this->type == 'bangumi' ? '' : 'data.pages.' . strval($this->page - 1)
            );
            $res = json_decode($this->exec($api), true);
            if (!isset($res[0])) return;

            if ($this->type == 'bangumi') {
                if (isset($res[0]['data'])) {
                    $this->cid = $res[0]['data']['cid'];
                }
            } else
                $this->cid = $res[0]['cid'];
        }
    }

    private function setAppkey()
    {
        /************/
        $entropy = 'rbMCKn@KuamXWlPMoJGsKcbiJKUfkPF_8dABscJntvqhRSETg';
        $entropy_array = str_split(strrev($entropy), 1);
        $str = '';
        for ($i = 0; $i < strlen($entropy); ++$i) {
            $str .= chr(ord($entropy_array[$i]) + 2);
        }
        list($this->appkey, $this->sec) = explode(':', $str);
        /************/
    }

    private function curlset()
    {
        return array(
            'Referer'         => 'https://www.bilibili.com/',
            'Cookie'          => '_uuid=ECD29A42-D6E2-2C85-D76D-53E293C8053659853infoc; bfe_id=61a513175dc1ae8854a560f6b82b37af; CURRENT_BLACKGAP=1; CURRENT_FNVAL=80; CURRENT_QUALITY=80',
            'User-Agent'      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 (KHTML, like Gecko)',
            'X-Real-IP'       => long2ip(mt_rand(1884815360, 1884890111)),
            'Accept'          => 'application/json, text/plain, */*',
            'Accept-Language' => 'zh-CN,zh;q=0.9,en;q=0.8,ja;q=0.7',
            'Connection'      => 'keep-alive',
            'Content-Type'    => 'application/x-www-form-urlencoded',
        );
    }

    private function exec($api)
    {
        if ($api['method'] == 'GET') {
            if (isset($api['body'])) {
                $api['url'] .= '?' . http_build_query($api['body']);
                $api['body'] = null;
            }
        }

        $this->curl($api['url'], $api['body']);
        $this->data = $this->raw;

        if (isset($api['format'])) {
            $this->data = $this->clean($this->data, $api['format']);
        }

        return $this->data;
    }

    private function curl($url, $payload = null, $headerOnly = 0)
    {
        $header = array_map(function ($k, $v) {
            return $k . ': ' . $v;
        }, array_keys($this->header), $this->header);
        $curl = curl_init();
        if (!is_null($payload)) {
            curl_setopt($curl, CURLOPT_POST, 1);
            curl_setopt($curl, CURLOPT_POSTFIELDS, is_array($payload) ? http_build_query($payload) : $payload);
        }
        curl_setopt($curl, CURLOPT_HEADER, $headerOnly);
        curl_setopt($curl, CURLOPT_TIMEOUT, 20);
        curl_setopt($curl, CURLOPT_ENCODING, 'gzip');
        curl_setopt($curl, CURLOPT_IPRESOLVE, 1);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($curl, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($curl, CURLOPT_CONNECTTIMEOUT, 10);
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_HTTPHEADER, $header);
        if ($this->proxy) {
            curl_setopt($curl, CURLOPT_PROXY, $this->proxy);
        }
        for ($i = 0; $i < 3; ++$i) {
            $this->raw = curl_exec($curl);
            $this->info = curl_getinfo($curl);
            $this->error = curl_errno($curl);
            $this->status = $this->error ? curl_error($curl) : '';
            if (!$this->error) {
                break;
            }
        }
        curl_close($curl);

        return $this;
    }

    private function pickup($array, $rule)
    {
        $t = explode('.', $rule);
        foreach ($t as $vo) {
            if (!isset($array[$vo])) {
                return array();
            }
            $array = $array[$vo];
        }

        return $array;
    }

    private function clean($raw, $rule)
    {
        $raw = json_decode($raw, true);
        if (!empty($rule)) {
            $raw = $this->pickup($raw, $rule);
        }
        if (!isset($raw[0]) && count($raw)) {
            $raw = array($raw);
        }
        $result = $raw;

        return json_encode($result);
    }
}
