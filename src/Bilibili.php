<?php

/**
 * bilbili video api
 * https://injahow.com
 * https://github.com/injahow/bilibili-parse
 * Version 0.1.2
 *
 * Copyright 2019, injahow
 * Released under the MIT license
 */

namespace Injahow;

class Bilibili
{
    public $aid;
    public $page = 1;
    public $quality = 32;
    public $type;
    public $epid;
    public $cid;

    public $fnval = 0; // 0-FLV 1-MP4 16-DASH
    public $cache = false;
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

    public function page($value)
    {
        $this->page = $value >= 1 ? $value : 1;

        return $this;
    }

    public function epid($value)
    {
        $this->epid = $value;

        return $this;
    }

    /**
     * 分辨率(112|1080P+)/(80->1080P)/(64->720P)/(32->480P)/(16->360P)/15?
     */
    public function quality($value)
    {
        $suppose = array(16, 32, 64, 80, 112); // ...
        $this->quality = in_array(intval($value), $suppose) ? intval($value) : 32;

        return $this;
    }

    public function cookie($value)
    {
        $this->header['Cookie'] = $value;

        return $this;
    }

    public function cache($value = true)
    {
        $this->cache = $value;

        return $this;
    }

    public function cache_time($value = 3600)
    {
        // min 60s
        $this->cache_time = $value > 60 ? $value : 60;

        return $this;
    }

    public function proxy($value)
    {
        $this->proxy = $value;

        return $this;
    }

    /**
     * ? 待处理
     */
    public function getCacheFileName()
    {
        // ! mkdir './cache/*'
        if ($this->cid != '') {
            return './cache/cid/' . $this->cid . '_' . $this->quality . '.json';
        } elseif ($this->epid != '') {
            return './cache/epid/' . $this->epid . '_' . $this->quality . '.json';
        }
    }

    public function video()
    {

        $this->setCid();

        $file_name = $this->getCacheFileName();
        if ($this->cache && file_exists($file_name)) {
            if ($_SERVER['REQUEST_TIME'] - filectime($file_name) < $this->cache_time) {
                return $this->getCache();
            }
        }

        if ($this->type == 'video') {
            $api = $this->bilibili_video_api();
        } elseif ($this->type == 'bangumi') {
            $api = $this->bilibili_bangumi_api();
        } else {
            return;
        }
        $data = $this->exec($api);

        if ($this->cache) {
            //更新quality参数，避免错误缓存
            if ($this->type == 'video') {
                $this->quality(json_decode($data, true)[0]['quality']);
            } elseif ($this->type == 'bangumi') {
                $this->quality(json_decode($data, true)[0]['result']['quality']);
            }
            $this->setCache($data);
        }
        return $data;
    }

    public function bilibili_video_api()
    {
        $this->setAppkey();
        $params_str = 'appkey=' . $this->appkey . '&cid=' . $this->cid . '&otype=json&qn=' . strval($this->quality) . '&quality=' . strval($this->quality) . '&type=';
        return array(
            'method' => 'GET',
            'url'    => 'https://interface.bilibili.com/v2/playurl',
            'body'   => array(
                'appkey'  => $this->appkey,
                'cid'     => $this->cid,
                'otype'   => 'json',
                'qn'      => $this->quality,
                'quality' => $this->quality,
                'type'    => '',
                'sign'    => md5($params_str . $this->sec)
            ),
            'format' => ''
        );
    }

    public function bilibili_bangumi_api()
    {
        $this->setCid();
        return array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/pgc/player/web/playurl',
            'body'   => array(
                'avid'    => $this->aid,
                'cid'     => $this->cid,
                'qn'      => isset($this->quality) ? $this->quality : 0,
                'quality' => $this->quality,
                'type'    => '',
                'otype'   => 'json',
                'ep_id'   => $this->epid,
                'fnver'   => '0',
                'fnval'   => $this->fnval
            ),
            'format' => ''
        );
    }

    public function url()
    {
        $data = $this->video();
        if ($this->type == 'video') {
            return json_decode($data, true)[0]['durl'][0]['url'];
        } elseif ($this->type == 'bangumi') {
            return json_decode($data, true)[0]['result']['durl'][0]['url'];
        }
    }

    public function setCache($str)
    {
        if (!($res = fopen($this->getCacheFileName(), 'w+'))) {
            exit;
        }
        if (!fwrite($res, $str)) {
            fclose($res);
            exit;
        }
        fclose($res);
    }

    public function getCache()
    {
        $file_name = $this->getCacheFileName();
        if (file_exists($file_name)) {
            return file_get_contents($file_name);
        }
        return '[]';
    }

    /**
     * 获取cid编号
     */
    private function setCid()
    {
        if (!isset($this->aid)) exit;
        $api = array(
            'method' => 'GET',
            'url'    => 'https://api.bilibili.com/x/web-interface/view',
            'body'   => array(
                'aid' => $this->aid
            ),
            'format' => 'data.pages.' . strval($this->page - 1)
        );
        $this->cid = json_decode($this->exec($api), true)[0]['cid'];

        return $this;
    }

    /**
     * 获取appkey
     */
    private function setAppkey()
    {
        /************/
        $entropy = 'rbMCKn@KuamXWlPMoJGsKcbiJKUfkPF_8dABscJntvqhRSETg';
        $entropy_array = str_split(strrev($entropy), 1);
        $str = '';
        for ($i = 0; $i < strlen($entropy); ++$i) {
            $a = chr(ord($entropy_array[$i]) + 2);
            $str .= $a;
        }
        $this->appkey = explode(':', $str)[0];
        $this->sec = explode(':', $str)[1];
        /************/

        return $this;
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
