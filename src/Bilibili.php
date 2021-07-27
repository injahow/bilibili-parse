<?php

/**
 * bilbili video api
 * https://injahow.com
 * https://github.com/injahow/bilibili-parse
 * Version 0.3.7
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
    public $fnval = 0; // 0-FLV 1-MP4 16-DASH

    public $access_key;
    public $header;
    public $result;
    public $cache = false;
    public $cache_type = 'file';
    public $cache_time = 3600;

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
        $suppose = array('video', 'bangumi');
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

    /**
     * 分辨率(116|112|80->1080P)/(74|64|48->720P)/(32->480P)/(16->360P)/15?
     */
    public function quality($value, $force = false)
    {
        $value = intval($value);
        if (!$force) {
            $suppose = array(16, 32, 48, 64, 74, 80, 112, 116); // ...
            $this->quality = in_array($value, $suppose) ? $value : 32;
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

    public function cache($value = true, $type = 'file')
    {
        $this->cache = $value;
        $suppose = array('file', 'apcu');
        $this->cache_type = in_array($type, $suppose) ? $type : 'file';

        return $this;
    }

    public function cache_time($value = 3600)
    {
        // min 60s
        $this->cache_time = $value > 60 ? $value : 60;

        return $this;
    }

    public function cookie($value)
    {
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

        // ? all need cid
        if ($this->type == 'video') {
            if ($this->format == 'dash') {
                $api = $this->bilibili_api();
            } else {
                $api = $this->format == 'mp4' ? $this->bilibili_api() : $this->bilibili_video_api();
            }
        } elseif ($this->type == 'bangumi') {
            $this->fnval = $this->format == 'dash' ? 16 : 0;
            $api = $this->bilibili_bangumi_api();
        }

        $data = $this->exec($api);

        return $data;
    }

    public function result()
    {

        if ($this->cache) {
            $this->result = $this->getCache();
            if (!empty($this->result)) {
                return $this->result;
            }
        }

        $data = json_decode($this->video(), true)[0];
        if (isset($data['code']) && $data['code'] != 0) {
            return json_encode($data);
        } else {
            switch ($this->format) {
                case 'dash':
                    $name = $this->type == 'bangumi' ? 'result' : 'data';
                    if (isset($data[$name]['dash'])) { // ? 可能出现durl付费预览
                        $dash_data = $data[$name]['dash'];
                        $video_data = $dash_data['video'];
                        $index = 0;
                        foreach ($video_data as $i => $video) {
                            if ($video['id'] == $this->quality) {
                                $index = $i;
                                break;
                            }
                        }
                        $this->quality($video_data[$index]['id'], true);
                        $this->result = json_encode(array(
                            'code'    => 0,
                            'quality' => $this->quality,
                            'video'   => $video_data[$index]['baseUrl'],
                            'audio'   => $dash_data['audio'][0]['baseUrl']
                        ));
                    } else { // ? durl
                        return json_encode(array(
                            'code'    => 1,
                            'message' => '可能是会员付费视频'
                        ));
                    }
                    break;
                case 'flv':
                    if ($this->type == 'bangumi') {
                        $data = $data['result'];
                        if (isset($data['format']) && $data['format'] == 'mp4') {
                            return json_encode(array(
                                'code'    => 1,
                                'message' => '可能需要会员播放'
                            ));
                        }
                    }
                    $this->quality($data['quality'], true);
                    $this->result = json_encode(array(
                        'code'    => 0,
                        'quality' => $this->quality,
                        'url'     => $data['durl'][0]['url']
                    ));
                    break;
                case 'mp4':
                    // todo
                    if ($this->type == 'video') {
                        $data = $data['data'];
                        $this->quality($data['quality'], true);
                        $this->result = json_encode(array(
                            'code'    => 0,
                            'quality' => $this->quality,
                            'url'     => $data['durl'][0]['url']
                        ));
                    } else {
                        return json_encode(array(
                            'code'    => 1,
                            'message' => '暂不支持番剧的MP4请求'
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
        elseif (!empty($this->epid))
            $path = '/../cache/epid/' . $this->epid . '_' . $suffix . '.json';
        else
            $path = '/../cache/cid/0' . '_' . $this->format . '.json';

        return __DIR__ . $path;
    }

    private function bilibili_api()
    {
        $qn = 0;
        $api = array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/x/player/playurl',
            'body'   => array(
                'avid'       => $this->aid,
                'bvid'       => $this->bvid,
                'cid'        => $this->cid,
                'qn'         => $qn,
                'type'       => $this->format == 'mp4' ? 'mp4' : '',
                'otype'      => 'json',
                'access_key' => $this->access_key
            ),
            'format' => ''
        );
        if ($this->format == 'mp4') { // mp4
            $api['body'] += array(
                'platform'     => 'html5',
                'high_quality' => 1
            );
        } else { // dash
            $api['body'] += array(
                'fnver' => 0,
                'fnval' => 16,
                'fourk' => 1
            );
        }
        return $api;
    }

    private function bilibili_video_api($format = 'flv')
    {
        $this->setAppkey();
        $format = in_array($format, ['flv', 'mp4']) ? $format : 'flv';
        $url = array(
            'flv' => 'https://interface.bilibili.com/v2/playurl',
            'mp4' => 'https://app.bilibili.com/v2/playurlproj'
        );
        $api_format = array( // todo
            'flv' => '',
            'mp4' => ''
        );
        $body = array(
            'access_key' => $this->access_key,
            'appkey'     => $this->appkey,
            'cid'        => $this->cid,
            'otype'      => 'json',
            'qn'         => $this->quality,
            'quality'    => $this->quality,
            'type'       => ''
        );
        $body += array('sign' => md5(http_build_query($body) . $this->sec));
        return array(
            'method' => 'GET',
            'url'    => $url[$format],
            'body'   => $body,
            'format' => $api_format[$format]
        );
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
                'fnval'      => $this->fnval,
                'access_key' => $this->access_key
            ),
            'format' => ''
        );
    }

    private function setCache($data)
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

    private function getCache()
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
        if (!(empty($this->aid) && empty($this->bvid))) {
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
        } else if (!empty($this->epid)) {
            $api = array(
                'method' => 'GET',
                'url'    => 'https://api.bilibili.com/pgc/view/web/season',
                'body'   => array(
                    'ep_id'      => $this->epid,
                    'access_key' => $this->access_key
                ),
                'format' => 'result.episodes.' . strval($this->page - 1)
            );
        } else {
            return;
        }
        $res = json_decode($this->exec($api), true);
        if (!isset($res[0])) return;

        if ($this->type == 'bangumi') {
            if (isset($res[0]['data'])) {
                $this->cid = $res[0]['data']['cid'];
            } else if (isset($res[0]['cid'])) {
                $this->cid = $res[0]['cid'];
            }
        } else
            $this->cid = $res[0]['cid'];
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
            'Cookie'          => 'appver=1.5.9; os=osx; __remember_me=true; osver=%E7%89%88%E6%9C%AC%2010.13.5%EF%BC%88%E7%89%88%E5%8F%B7%2017F77%EF%BC%89;',
            'User-Agent'      => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_5) AppleWebKit/605.1.15 (KHTML, like Gecko)',
            'X-Real-IP'       => long2ip(mt_rand(1884815360, 1884890111)),
            'Accept'          => '*/*',
            'Accept-Language' => 'zh-CN,zh;q=0.8,gl;q=0.6,zh-TW;q=0.4',
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
        for ($i = 0; $i < 3; $i++) {
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
