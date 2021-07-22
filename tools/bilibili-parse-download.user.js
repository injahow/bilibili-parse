// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      0.7.1
// @description  支持下载番剧与用户上传视频，自动切换为高清视频源
// @author       injahow
// @homepage     https://github.com/injahow/bilibili-parse
// @copyright    2021, injahow (https://github.com/injahow)
// @updateURL    https://github.com/injahow/bilibili-parse/raw/master/tools/bilibili-parse-download.user.js
// @downloadURL  https://github.com/injahow/bilibili-parse/raw/master/tools/bilibili-parse-download.user.js
// @match        *://www.bilibili.com/video/av*
// @match        *://www.bilibili.com/video/BV*
// @match        *://www.bilibili.com/bangumi/play/ep*
// @match        *://www.bilibili.com/bangumi/play/ss*
// @require      https://static.hdslb.com/js/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js
// @require      https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js
// @license      MIT
// @grant        none
// ==/UserScript==
/* globals $, DPlayer waitForKeyElements */
(function () {
    'use strict';

    // config
    let base_api = 'https://api.injahow.cn/bparse/';
    let format = 'flv';
    let use_dash = false;

    let aid, p, q, cid, epid;
    let api_url, api_url_temp;
    let flag_name = '', need_vip = false, vip_need_pay = false;
    let is_login = false, vip_status = 0;

    function request_danmaku(options, _cid) {
        $.ajax({
            url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${_cid}`,
            dataType: 'text',
            success: function (result) {
                const result_dom = $(result.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, ''));
                if (!result_dom) {
                    options.error('弹幕获取失败');
                    return;
                }
                if (!result_dom.find('d')[0]) {
                    options.error('未发现弹幕');
                } else {
                    const danmaku_data = result_dom.find('d').map((i, el) => {
                        const item = $(el);
                        const p = item.attr('p').split(',');
                        let type = 0;
                        if (p[1] === '4') {
                            type = 2;
                        } else if (p[1] === '5') {
                            type = 1;
                        }
                        return [{ author: '', time: parseFloat(p[0]), type: type, color: parseInt(p[3]), id: '', text: item.text() }];
                    }).get();
                    options.success(danmaku_data);
                }
            },
            error: function () {
                options.error('弹幕请求异常');
            }
        });
    }

    function replace_player(url, url_2) {
        if (!!$('#bilibiliPlayer')[0]) {
            $('#bilibiliPlayer').before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor">');
            $('#bilibiliPlayer').hide();
        } else {
            $('#bilibili-player').before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor" style="width:100%;height:100%;"></div>');
            $('#bilibili-player').hide();
        }
        $('#danmukuBox').hide();//隐藏弹幕列表
        !!$('#player_mask_module')[0] && $('#player_mask_module').hide();
        window.my_dplayer = new DPlayer({
            container: $('#my_dplayer')[0],
            mutex: false,
            video: {
                url: url,
                type: 'auto'
            },
            danmaku: true,
            apiBackend: {
                read: function (options) {
                    request_danmaku(options, cid);
                },
                send: function (options) {
                    options.error('此脚本无法将弹幕同步到云端！');
                }
            },
            contextmenu: [
                {
                    text: '脚本信息',
                    link: 'https://github.com/injahow/bilibili-parse'
                },
                {
                    text: '脚本作者',
                    link: 'https://injahow.com'
                }
            ]
        });
        if (use_dash && url_2 && url_2 !== '#') {
            $('body').append('<div id="my_dplayer_2" style="display:none"></div>');
            window.my_dplayer_2 = new DPlayer({
                container: $('#my_dplayer_2')[0],
                mutex: false,
                video: {
                    url: url_2,
                    type: 'auto'
                }
            });
            const my_dplayer = window.my_dplayer;
            const my_dplayer_2 = window.my_dplayer_2;
            my_dplayer.on('play', function () {
                !my_dplayer.paused && my_dplayer_2.play();
            });
            my_dplayer.on('playing', function () {
                !my_dplayer.paused && my_dplayer_2.play();
            });
            my_dplayer.on('timeupdate', function () {
                if (Math.abs(my_dplayer.video.currentTime - my_dplayer_2.video.currentTime) > 1) {
                    my_dplayer_2.pause();
                    my_dplayer_2.seek(my_dplayer.video.currentTime);
                }
                !my_dplayer.paused && my_dplayer_2.play();
            });
            my_dplayer.on('seeking', function () {
                my_dplayer_2.pause();
                my_dplayer_2.seek(my_dplayer.video.currentTime);
            });
            my_dplayer.on('waiting', function () {
                my_dplayer_2.pause();
            });
            my_dplayer.on('pause', function () {
                my_dplayer_2.pause();
            });
            my_dplayer.on('suspend', function () {
                my_dplayer_2.speed(my_dplayer.video.playbackRate);
            });
            my_dplayer.on('volumechange', function () {
                my_dplayer_2.video.muted = my_dplayer.video.muted;
                my_dplayer_2.volume(my_dplayer.video.volume);
            });
        }
    }

    function get_video_status() {
        const location_href = window.location.href;
        if (location_href.match(/bilibili.com\/bangumi\/play\/ep/)) {
            flag_name = 'ep';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
            vip_need_pay = window.__INITIAL_STATE__.epPayMent.vipNeedPay;
        } else if (location_href.match(/bilibili.com\/bangumi\/play\/ss/)) {
            flag_name = 'ss';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
            vip_need_pay = window.__INITIAL_STATE__.epPayMent.vipNeedPay;
        } else if (location_href.match(/bilibili.com\/video\/av/)) {
            flag_name = 'av';
            need_vip = false;
            vip_need_pay = false;
        } else if (location_href.match(/bilibili.com\/video\/BV/)) {
            flag_name = 'bv';
            need_vip = false;
            vip_need_pay = false;
        }
    }

    function get_all_id() {
        let _aid, _cid;
        if (flag_name === 'ep' || flag_name === 'ss') {
            _aid = window.__INITIAL_STATE__.epInfo.aid;
            _cid = window.__INITIAL_STATE__.epInfo.cid;
        } else if (flag_name === 'av' || flag_name === 'bv') {
            _aid = window.__INITIAL_STATE__.videoData.aid;
            // 只更新 window.cid ?
            _cid = window.__INITIAL_STATE__.videoData.cid;
        }
        return { aid: _aid, cid: _cid }
    }

    function get_quality() {
        let _q = 0, _q_max = 0;
        if (!!parseInt($('li.bui-select-item.bui-select-item-active').attr('data-value'))) {
            _q = parseInt($('li.bui-select-item.bui-select-item-active').attr('data-value'));
            _q_max = parseInt($('li.bui-select-item')[0].dataset.value);
        } else if (!!parseInt($('li.squirtle-select-item.active').attr('data-value'))) {
            _q = parseInt($('li.squirtle-select-item.active').attr('data-value'));
            _q_max = parseInt($('li.squirtle-select-item')[0].dataset.value);
        }
        if (_q === 0) {
            _q = _q_max > 80 ? 80 : _q_max;
        }
        _q = _q || 80;
        _q_max = _q_max || 80;
        return { q: _q, q_max: _q_max }
    }

    function refresh() {
        console.log('refresh...');
        !!('#video_download')[0] && $('#video_download').hide();
        !!('#video_download_2')[0] && $('#video_download_2').hide();

        if (window.my_dplayer) {
            console.log('销毁dplayer');
            window.my_dplayer.destroy();
            window.my_dplayer = null;
            $('#my_dplayer').remove();
            if (window.my_dplayer_2) {
                window.my_dplayer_2.destroy();
                window.my_dplayer_2 = null;
                $('#my_dplayer_2').remove();
            }
            // 恢复播放器
            if (!!$('#bilibiliPlayer')[0]) {
                $('#bilibiliPlayer').show();
            } else {
                $('#bilibili-player').show();
            }
            /*!!$('#player_mask_module')[0] && $('#player_mask_module').show();*/
        }
        // 更新cid和aid - 1
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
    }

    function config_init() {
        const config_html =
            '<div id="my_config" style="display:none;position:fixed;inset:0px;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.5s;z-index:10000;cursor:pointer;">' +
            '<div style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:600px;transform:translate(-50%,-50%);cursor:default;">' +
            '<span style="font-size:20px"><b>bilibili视频下载 参数设置（未缓存刷新页面将重置设置）</b></span>' +
            '<div style="margin:2% 0;"><label>请求地址：</label>' +
            '<input id="base_api" value="https://api.injahow.cn/bparse/" style="width:50%;"><br>' +
            '<span>普通使用请勿修改，默认地址：https://api.injahow.cn/bparse/</span></div>' +
            '<div style="margin:2% 0;"><label>视频格式：</label>' +
            '<select name="format" id="format">' +
            '<option value="flv" checked>FLV</option><option value="dash">DASH</option><option value="mp4">MP4</option>' +
            '</select></div>' +
            '<div style="text-align:right"><button class="setting-button" onclick="$(\'#my_config\').hide();$(\'#video_download\').hide();$(\'#video_download_2\').hide();">确定</button></div>' +
            '</div></div>';
        const config_css =
            '<style>' +
            '@keyframes settings-bg{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.7)}}' +
            '.setting-button{width:120px;height:40px;border-width:0px;border-radius:3px;background:#1E90FF;cursor:pointer;outline:none;color: white;font-size:17px;}.setting-button:hover{background:#5599FF;}' +
            '</style>';
        $('body').append(config_html + config_css);
    }

    $('body').append('<a id="video_url" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
    $('body').append('<a id="video_url_2" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
    config_init();

    // 暂且延迟处理...
    setTimeout(function () {
        let my_toolbar;
        if (!!$('#arc_toolbar_report')[0]) {
            my_toolbar =
                '<div id="arc_toolbar_report_2" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true"><div class="ops">' +
                '<span id="setting_btn"><i class="van-icon-general_addto_s"></i>脚本设置</span>' +
                '<span id="bilibili_parse"><i class="van-icon-floatwindow_custome"></i>请求地址</span>' +
                '<span id="video_download" style="display:none"><i class="van-icon-download"></i>下载视频</span>' +
                '<span id="video_download_2" style="display:none"><i class="van-icon-download"></i>下载音频</span>' +
                '</div></div>';
            $('#arc_toolbar_report').after(my_toolbar);
        } else if (!!$('#toolbar_module')[0]) {
            my_toolbar =
                '<div id="toolbar_module_2" class="tool-bar clearfix report-wrap-module report-scroll-module media-info" scrollshow="true">' +
                '<div id="setting_btn" class="like-info"><i class="iconfont icon-add"></i><span>脚本设置</span></div>' +
                '<div id="bilibili_parse" class="like-info"><i class="iconfont icon-customer-serv"></i><span>请求地址</span></div>' +
                '<div id="video_download" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载视频</span></div>' +
                '<div id="video_download_2" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载音频</span></div>' +
                '</div>';
            $('#toolbar_module').after(my_toolbar);
        }
    }, 3000);

    $('body').on('click', '#setting_btn', function () {
        $('#my_config').show();
    });

    $('body').on('click', '#video_download', function () {
        $('#video_url')[0].click();
    });

    $('body').on('click', '#video_download_2', function () {
        $('#video_url_2')[0].click();
    });

    $('body').on('click', '#bilibili_parse', function () {
        // 刷新配置
        base_api = $("#base_api").val();
        format = $("#format option:selected").val();
        use_dash = format === 'dash';
        get_video_status();

        // 更新cid和aid - 2
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
        if (!aid) {
            // 异常
            console.log('aid获取出错！');
        }

        // 获取视频分页参数p
        if (flag_name === 'ep' || flag_name === 'ss') {
            p = window.__INITIAL_STATE__.epInfo.i;
        } else if (flag_name === 'av' || flag_name === 'bv') {
            p = window.__INITIAL_STATE__.p;
        }
        p = p || 1;

        // 获取视频分辨率参数q
        const quality = get_quality();
        q = quality.q;

        // 获取用户状态
        if (window.__BILI_USER_INFO__) {
            is_login = window.__BILI_USER_INFO__.isLogin;
            vip_status = window.__BILI_USER_INFO__.vipStatus;
        } else if (window.__BiliUser__) {
            is_login = window.__BiliUser__.isLogin;
            vip_status = window.__BiliUser__.cache.data.vipStatus;
        } else {
            is_login = false;
            vip_status = 0;
        }
        if (!is_login || (is_login && vip_status === 0 && need_vip)) {
            q = quality.q_max > 80 ? 80 : quality.q_max;
            // 暂停视频准备换源
            !!$('video[crossorigin="anonymous"]')[0] && $('video[crossorigin="anonymous"]')[0].pause();
        }

        let type;
        if (flag_name === 'ep' || flag_name === 'ss') {
            type = 'bangumi';
            epid = window.__INITIAL_STATE__.epInfo.id;
            api_url = `${base_api}?av=${aid}&p=${p}&q=${q}&ep=${epid}&type=${type}&format=${format}&otype=json`;
        } else if (flag_name === 'av' || flag_name === 'bv') {
            type = 'video';
            api_url = `${base_api}?av=${aid}&p=${p}&q=${q}&type=${type}&format=${format}&otype=json`;
        }

        if (api_url === api_url_temp) {
            console.log('重复请求');
            const url = $('#video_url').attr('href');
            const url_2 = $('#video_url_2').attr('href');
            if (url && url !== '#') {
                $('#video_download').show();
                if (!is_login || (is_login && vip_status === 0 && need_vip)) {
                    !$('#my_dplayer')[0] && replace_player(url, url_2);
                }
            }
            return;
        }
        $('#video_url').attr('href', '#');
        $('#video_url_2').attr('href', '#');
        api_url_temp = api_url;

        console.log('开始解析');
        $.ajax({
            url: api_url,
            dataType: 'json',
            success: function (result) {
                if (result && result.code === 0) {
                    console.log('url获取成功');
                    const url = use_dash ? result.video.replace(/^https?\:\/\//i, 'https://') : result.url.replace(/^https?\:\/\//i, 'https://');
                    const url_2 = use_dash ? result.audio.replace(/^https?\:\/\//i, 'https://') : '#';
                    $('#video_url').attr('href', url);
                    $('#video_download').show();
                    if (use_dash) {
                        $('#video_url_2').attr('href', url_2);
                        $('#video_download_2').show();
                    }
                    if (!is_login || (is_login && vip_status === 0 && need_vip)) {
                        replace_player(url, url_2);
                    }
                } else {
                    console.log('url获取失败');
                }
            },
            error: function (error) {
                console.log('api请求异常', error);
            }
        });
    });

    // 监听p
    $('body').on('click', 'a.router-link-active', function () {
        if (this !== $('li[class="on"]').find('a')[0]) {
            refresh();
        }
    });

    $('body').on('click', 'li.ep-item', function () {
        if (!$(this).find('.cursor')) {
            refresh();
        }
    });

    $('body').on('click', 'button.bilibili-player-iconfont-next', function () {
        refresh();
    });

    !!$('video[crossorigin="anonymous"]')[0] && ($('video[crossorigin="anonymous"]')[0].onended = function () {
        refresh();
    });

    // 监听q
    $('body').on('click', 'li.bui-select-item', function () {
        refresh();
    });

    // 监听aid 右侧推荐
    $('body').on('click', '.rec-list', function () {
        refresh();
    });

    // 监听aid 视频内部推荐
    $('body').on('click', '.bilibili-player-ending-panel-box-videos', function () {
        refresh();
    });

    // 定时检查 aid 和 cid
    setInterval(function () {
        const ids = get_all_id();
        if (aid !== ids.aid || cid !== ids.cid) {
            refresh();
        }
    }, 3000);

})();
