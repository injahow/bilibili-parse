// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      0.8.3
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
// @match        *://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png*
// @require      https://static.hdslb.com/js/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js
// @require      https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js
// @license      MIT
// @grant        none
// ==/UserScript==
/* globals $, DPlayer waitForKeyElements */
(function () {
    'use strict';

    let aid, p, q, cid, epid;
    let api_url, api_url_temp, new_config_str, new_config_str_temp;
    let flag_name = '', need_vip = false, vip_need_pay = false;
    let is_login = false, vip_status = 0, mid = '';

    function request_danmaku(options, _cid) {
        $.ajax(`https://api.bilibili.com/x/v1/dm/list.so?oid=${_cid}`, {
            dataType: 'text',
            success: (result) => {
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
            error: () => {
                options.error('弹幕请求异常');
            }
        });
    }

    function replace_player(url, url_2) {
        recover_player();
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
        if (config.format === 'dash' && url_2 && url_2 !== '#') {
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
                my_dplayer_2.volume(my_dplayer.video.volume);
                my_dplayer_2.video.muted = my_dplayer.video.muted;
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

    function get_user_status() {
        if (window.__BILI_USER_INFO__) {
            mid = window.__BILI_USER_INFO__.mid || '';
            is_login = window.__BILI_USER_INFO__.isLogin;
            vip_status = window.__BILI_USER_INFO__.vipStatus;
        } else if (window.__BiliUser__) {
            mid = window.__BiliUser__.cache.data.mid || '';
            is_login = window.__BiliUser__.isLogin;
            vip_status = window.__BiliUser__.cache.data.vipStatus;
        } else {
            mid = '';
            is_login = false;
            vip_status = 0;
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
        if (!!$('li.bui-select-item.bui-select-item-active').attr('data-value')) {
            _q = parseInt($('li.bui-select-item.bui-select-item-active').attr('data-value'));
            _q_max = parseInt($('li.bui-select-item')[0].dataset.value);
        } else if (!!$('li.squirtle-select-item.active').attr('data-value')) {
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

    function recover_player() {
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
    }

    function refresh() {
        console.log('refresh...');
        !!$('#video_download')[0] && $('#video_download').hide();
        !!$('#video_download_2')[0] && $('#video_download_2').hide();
        recover_player();
        // 更新cid和aid - 1
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
    }

    // 参考：https://greasyfork.org/zh-CN/scripts/25718-%E8%A7%A3%E9%99%A4b%E7%AB%99%E5%8C%BA%E5%9F%9F%E9%99%90%E5%88%B6
    if (location.href.match(/^https:\/\/www\.mcbbs\.net\/template\/mcbbs\/image\/special_photo_bg\.png/) != null) {
        if (location.href.match('access_key') != null && window.opener != null) {
            window.stop();
            document.children[0].innerHTML = '<title>bilibili-parse - 授权</title><meta charset="UTF-8" name="viewport" content="width=device-width">正在跳转……';
            window.opener.postMessage('bilibili-parse-login-credentials: ' + location.href, '*');
        }
        return
    }
    window.bp_show_login = function () {
        if (localStorage.getItem('bp_access_key')) {
            if (!confirm('发现授权记录，是否重新授权？')) {
                return;
            }
        }
        const auth_window = window.open('about:blank');
        auth_window.document.title = 'bilbili-parse - 授权';
        auth_window.document.body.innerHTML = '<meta charset="UTF-8" name="viewport" content="width=device-width">正在获取授权，请稍候……';
        window.auth_window = auth_window;
        $.ajax('https://passport.bilibili.com/login/app/third?appkey=27eb53fc9058f8c3&api=https%3A%2F%2Fwww.mcbbs.net%2Ftemplate%2Fmcbbs%2Fimage%2Fspecial_photo_bg.png&sign=04224646d1fea004e79606d3b038c84a', {
            xhrFields: { withCredentials: true },
            type: 'GET',
            dataType: 'json',
            success: (data) => {
                if (data.data.has_login) {
                    auth_window.document.body.innerHTML = '<meta charset="UTF-8" name="viewport" content="width=device-width">正在跳转……';
                    auth_window.location.href = data.data.confirm_uri;
                    console.log(data.data.confirm_uri);
                    return;
                } else {
                    auth_window.close();
                    alert('必须登录B站才能正常授权', () => {
                        location.href = 'https://passport.bilibili.com/login';
                    });
                }
            },
            error: () => {
                alert('授权出错!');
            }
        });
    }
    window.bp_show_logout = function () {
        if (!localStorage.getItem('bp_access_key')) {
            alert('没有发现授权记录');
            return;
        }
        get_user_status();
        $.ajax(`${config.base_api}/logout/?mid=${mid}`, {
            type: 'GET',
            success: () => {
                alert('取消授权成功!');
                localStorage.setItem('bp_access_key', '');
                $('#auth').val('0');
            },
            error: () => {
                alert('取消授权失败!');
            }
        });
    }
    window.bp_show_login_help = function () {
        if (!confirm('进行授权之后将可以在请求地址时正常享有会员的权益\n你可以随时在这里授权或取消授权\n不进行授权不会影响脚本的正常使用，但可能会缺失1080P\n是否需要授权？')) {
            return;
        } else {
            window.bp_show_login();
        }
    }
    window.addEventListener('message', function (e) {
        var _a;
        if (typeof e.data !== 'string') return;
        if (e.data.split(':')[0] === 'bilibili-parse-login-credentials') {
            (_a = window.auth_window) === null || _a === void 0 ? void 0 : _a.close();
            let url = e.data.split(': ')[1];
            localStorage.setItem('bp_access_key', new URL(url).searchParams.get('access_key'))
            $.ajax(url.replace('https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png', config.base_api + '/login/'), {
                dataType: 'json',
                success: () => {
                    alert('授权成功!');
                    $('#auth').val('1');
                },
                error: () => {
                    alert('授权失败!');
                }
            });
        }
    });

    function config_init() {
        const config_str = localStorage.getItem('my_config_str');
        if (!config_str) {
            localStorage.setItem('my_config_str', JSON.stringify(config));
        } else {
            let old_config = JSON.parse(config_str);
            if (Object.keys(old_config).toString() !== Object.keys(config).toString()) {
                for (let key in old_config) {
                    config[key] = old_config[key];
                }
            } else {
                config = old_config;
            }
        }
        const _config = config;
        window.my_click_event = function () {
            config.base_api = $('#base_api').val();
            config.format = $('#format option:selected').val();
            config.auth = $('#auth option:selected').val();
            new_config_str = JSON.stringify(config);
            localStorage.setItem('my_config_str', new_config_str);
            $('#my_config').hide();
            $('#video_download').hide();
            $('#video_download_2').hide();
        };
        window.onbeforeunload = function (e) {
            window.my_click_event();
        }
        const option = ['', 'selected'];
        const config_css =
            '<style>' +
            '@keyframes settings-bg{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.7)}}' +
            '.setting-button{width:120px;height:40px;border-width:0px;border-radius:3px;background:#1E90FF;cursor:pointer;outline:none;color:white;font-size:17px;}.setting-button:hover{background:#5599FF;}' +
            'a.setting-context{margin:0 2%;color:blue;}a.setting-context:hover{color:red;}' +
            '</style>';
        const config_html =
            '<div id="my_config" style="display:none;position:fixed;inset:0px;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.5s;z-index:10000;cursor:default;">' +
            '<div style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:600px;transform:translate(-50%,-50%);cursor:default;">' +
            '<span style="font-size:20px"><b>bilibili视频下载 参数设置</b></span>' +
            '<div style="margin:2% 0;"><label>请求地址：</label>' +
            `<input id="base_api" value="${_config.base_api}" style="width:50%;"><br/>` +
            '<small>普通使用请勿修改，默认地址：https://api.injahow.cn/bparse/</small></div>' +
            '<div style="margin:2% 0;"><label>视频格式：</label>' +
            '<select name="format" id="format">' +
            '<option value="flv" ' + option[Number(_config.format === 'flv')] + '>FLV</option>' +
            '<option value="dash" ' + option[Number(_config.format === 'dash')] + '>DASH</option>' +
            '<option value="mp4" ' + option[Number(_config.format === 'mp4')] + '>MP4</option>' +
            '</select><br/><small>注意：番剧暂不支持MP4请求</small></div>' +
            '<div style="margin:2% 0;">' +
            '<label>授权状态：</label><select name="auth" id="auth" disabled>' +
            '<option value="0" ' + option[Number(_config.auth === '0')] + '>未授权</option>' +
            '<option value="1" ' + option[Number(_config.auth === '1')] + '>已授权</option>' +
            '</select>' +
            '<a class="setting-context" href="javascript:void(0);" onclick="bp_show_login()">账号授权</a>' +
            '<a class="setting-context" href="javascript:void(0);" onclick="bp_show_logout()">取消授权</a>' +
            '<a class="setting-context" href="javascript:void(0);" onclick="bp_show_login_help()">这是什么？</a>' +
            '</div>' +
            '<div style="text-align:right"><button class="setting-button" onclick="my_click_event()">确定</button></div>' +
            '</div></div>';
        $('body').append(config_html + config_css);
    }

    // config
    let config = {
        base_api: 'https://api.injahow.cn/bparse/',
        format: 'flv',
        auth: '0',
    };
    config_init();

    $('body').append('<a id="video_url" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
    $('body').append('<a id="video_url_2" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');

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
        get_video_status();

        // 更新cid和aid - 2
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
        if (!aid) { // 异常
            console.log('aid获取出错！');
        }

        const quality = get_quality();
        q = quality.q;

        get_user_status();
        if (!is_login || (is_login && vip_status === 0 && need_vip)) {
            q = quality.q_max > 80 ? 80 : quality.q_max;
            // 暂停视频准备换源
            !!$('video[crossorigin="anonymous"]')[0] && $('video[crossorigin="anonymous"]')[0].pause();
        }

        let type;
        if (flag_name === 'ep' || flag_name === 'ss') {
            p = window.__INITIAL_STATE__.epInfo.i || 1;
            type = 'bangumi';
            epid = window.__INITIAL_STATE__.epInfo.id;
            api_url = `${config.base_api}?av=${aid}&p=${p}&q=${q}&ep=${epid}&type=${type}&format=${config.format}&otype=json&mid=${config.auth === '1' ? mid : ''}`;
        } else if (flag_name === 'av' || flag_name === 'bv') {
            p = window.__INITIAL_STATE__.p || 1;
            type = 'video';
            api_url = `${config.base_api}?av=${aid}&p=${p}&q=${q}&type=${type}&format=${config.format}&otype=json&mid=${config.auth === '1' ? mid : ''}`;
        }

        if (api_url === api_url_temp && new_config_str === new_config_str_temp) {
            console.log('重复请求');
            const url = $('#video_url').attr('href');
            const url_2 = $('#video_url_2').attr('href');
            if (url && url !== '#') {
                $('#video_download').show();
                config.format === 'dash' && $('#video_download_2').show();
                if (!is_login || (is_login && vip_status === 0 && need_vip)) {
                    !$('#my_dplayer')[0] && replace_player(url, url_2);
                }
            }
            return;
        }
        $('#video_url').attr('href', '#');
        $('#video_url_2').attr('href', '#');
        api_url_temp = api_url;
        new_config_str_temp = new_config_str;

        console.log('开始解析');
        $.ajax(api_url, {
            dataType: 'json',
            success: (result) => {
                if (result && result.code === 0) {
                    console.log('url获取成功');
                    const url = config.format === 'dash' ? result.video.replace(/^https?\:\/\//i, 'https://') : result.url.replace(/^https?\:\/\//i, 'https://');
                    const url_2 = config.format === 'dash' ? result.audio.replace(/^https?\:\/\//i, 'https://') : '#';
                    $('#video_url').attr('href', url);
                    $('#video_download').show();
                    if (config.format === 'dash') {
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
            error: (e) => {
                console.log('api请求异常', e);
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
        refresh();
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
