// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      1.1.4
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
// @match        https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png*
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
    let bili_player_id;

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

    function bili_video_stop() { // listener
        const bili_video = $('video[crossorigin="anonymous"]')[0];
        bili_video.pause();
        bili_video.currentTime = 0;
    }

    function replace_player(url, url_2) {
        // 恢复原视频
        recover_player();
        // 暂停原视频
        if (!!$('video[crossorigin="anonymous"]')[0]) {
            bili_video_stop();
            const bili_video = $('video[crossorigin="anonymous"]')[0];
            bili_video.addEventListener('play', bili_video_stop, false);
        }
        if (!!$('#bilibiliPlayer')[0]) {
            bili_player_id = '#bilibiliPlayer';
            $('#bilibiliPlayer').before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor">');
            $('#bilibiliPlayer').hide();
        } else if (!!$('#bilibili-player')[0]) {
            bili_player_id = '#bilibili-player';
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
                send: function (options) { // ?
                    options.error('此脚本无法将弹幕同步到云端');
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

    function get_video_status() { // todo
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
            p = window.__INITIAL_STATE__.p || 1;
            _cid = window.__INITIAL_STATE__.cidMap[_aid].cids[p];
        }
        return { aid: _aid, cid: _cid };
    }

    function get_quality() {
        let _q = 0, _q_max = 0;
        if (!!$('li.bui-select-item')[0] && !!(_q_max = parseInt($('li.bui-select-item')[0].dataset.value))) {
            _q = parseInt($('li.bui-select-item.bui-select-item-active').attr('data-value')) || (_q_max > 80 ? 80 : _q_max);
        } else if (!!$('li.squirtle-select-item')[0] && !!(_q_max = parseInt($('li.squirtle-select-item')[0].dataset.value))) {
            _q = parseInt($('li.squirtle-select-item.active').attr('data-value')) || (_q_max > 80 ? 80 : _q_max);
        } else {
            _q = _q_max = 80;
        }
        if (!user_status.is_login()) {
            _q = _q_max > 80 ? 80 : _q_max;
        }
        return { q: _q, q_max: _q_max };
    }

    function recover_player() {
        if (window.my_dplayer) {
            utils.Message.info('恢复播放器');
            const bili_video = $('video[crossorigin="anonymous"]')[0];
            !!bili_video && bili_video.removeEventListener('play', bili_video_stop, false);
            window.my_dplayer.destroy();
            window.my_dplayer = null;
            $('#my_dplayer').remove();
            if (window.my_dplayer_2) {
                window.my_dplayer_2.destroy();
                window.my_dplayer_2 = null;
                $('#my_dplayer_2').remove();
            }
            !!bili_player_id && $(bili_player_id).show();
            $('#danmukuBox').show();
            /*!!$('#player_mask_module')[0] && $('#player_mask_module').show();*/
        }
    }

    function refresh() {
        //utils.Message.info('refresh...');
        console.log('refresh...');
        !!$('#video_download')[0] && $('#video_download').hide();
        !!$('#video_download_2')[0] && $('#video_download_2').hide();
        recover_player();
        // 更新cid和aid - 1
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
        q = get_quality().q;
    }

    // https://greasyfork.org/zh-CN/scripts/25718-%E8%A7%A3%E9%99%A4b%E7%AB%99%E5%8C%BA%E5%9F%9F%E9%99%90%E5%88%B6
    if (location.href.match(/^https:\/\/www\.mcbbs\.net\/template\/mcbbs\/image\/special_photo_bg\.png/) != null) {
        if (location.href.match('access_key') != null && window.opener != null) {
            window.stop();
            document.children[0].innerHTML = '<title>bilibili-parse - 授权</title><meta charset="UTF-8" name="viewport" content="width=device-width">正在跳转……';
            window.opener.postMessage('bilibili-parse-login-credentials: ' + location.href, '*');
        }
        return;
    }
    function check_login_status() {
        !localStorage.getItem('bp_remind_login') && localStorage.setItem('bp_remind_login', '1');
        const auth_id = localStorage.getItem('bp_auth_id') || '';
        const auth_sec = localStorage.getItem('bp_auth_sec') || '';
        const access_key = localStorage.getItem('bp_access_key') || '';
        let auth_time = localStorage.getItem('bp_auth_time');
        if (access_key && !auth_time) {
            localStorage.setItem('bp_auth_time', Date.now());
            auth_time = localStorage.getItem('bp_auth_time');
        }
        if (user_status.is_login()) {
            if (localStorage.getItem('bp_remind_login') === '1') {
                if (!access_key) {
                    utils.MessageBox.confirm('当前脚本未进行账号授权，无法请求1080P以上的清晰度；如果你是大会员或承包过这部番，授权即可解锁全部清晰度；是否需要进行账号授权？', () => {
                        window.bp_show_login();
                    });
                }
                localStorage.setItem('bp_remind_login', '0');
            } else if (true /*config.base_api !== localStorage.getItem('bp_pre_base_api') || (Date.now() - parseInt(auth_time) > 24 * 60 * 60 * 1000)*/) {
                // check key
                if (access_key) { // ! v1 -> v2 ? auth_id &&
                    $.ajax(`${config.base_api}/auth/v2/?act=check&auth_id=${auth_id}&auth_sec=${auth_sec}&access_key=${access_key}`, {
                        type: 'GET',
                        dataType: 'json',
                        success: (res) => {
                            if (res.code) {
                                utils.MessageBox.alert('授权已过期，准备重新授权', () => {
                                    localStorage.setItem('bp_access_key', '');
                                    localStorage.setItem('bp_auth_time', '');
                                    window.bp_show_login();
                                });
                            } else {
                                localStorage.setItem('bp_auth_time', Date.now());
                            }
                        },
                        error: () => {
                            utils.Message.danger('检查key请求异常');
                        }
                    });
                }
            }
        }
        localStorage.setItem('bp_pre_base_api', config.base_api);
    }
    window.bp_show_login = function () {
        if (window.auth_clicked) {
            utils.Message.info('(^・ω・^)~喵喵喵~');
            return;
        }
        window.auth_clicked = true;
        if (localStorage.getItem('bp_access_key')) {
            utils.MessageBox.confirm('发现授权记录，是否重新授权？', () => {
                login();
            }, () => {
                window.auth_clicked = false;
            });
        } else {
            login();
        }
    }
    function login() {
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
                } else {
                    auth_window.close();
                    utils.MessageBox.confirm('必须登录B站才能正常授权，是否登陆？', () => {
                        location.href = 'https://passport.bilibili.com/login';
                    }, () => {
                        window.auth_clicked = false;
                    });
                }
            },
            error: () => {
                utils.Message.danger('授权请求异常');
                window.auth_clicked = false;
            }
        });
    }
    window.bp_show_logout = function () {
        const auth_id = localStorage.getItem('bp_auth_id') || '';
        const auth_sec = localStorage.getItem('bp_auth_sec') || '';
        if (window.auth_clicked) {
            utils.Message.info('(^・ω・^)~喵喵喵~');
            return;
        }
        window.auth_clicked = true;
        if (!auth_id) {
            utils.MessageBox.alert('没有发现授权记录');
            window.auth_clicked = false;
            return;
        }
        $.ajax(`${config.base_api}/auth/v2/?act=logout&auth_id=${auth_id}&auth_sec=${auth_sec}`, {
            type: 'GET',
            dataType: 'json',
            success: (res) => {
                if (!res.code) {
                    utils.Message.success('取消成功');
                    localStorage.setItem('bp_auth_id', '');
                    localStorage.setItem('bp_auth_sec', '');
                    localStorage.setItem('bp_auth_time', '');
                    localStorage.setItem('bp_access_key', '');
                    $('#auth').val('0');
                } else {
                    utils.Message.warning('取消失败');
                }
                window.auth_clicked = false;
            },
            error: () => {
                utils.Message.danger('请求异常');
                window.auth_clicked = false;
            }
        });
    }
    window.bp_show_login_help = function () {
        utils.MessageBox.confirm('进行授权之后将能在请求地址时享有用户账号原有的权益，例如能够请求用户已经付费或承包的番剧，是否需要授权？', () => {
            window.bp_show_login();
        });
    }
    window.addEventListener('message', function (e) {
        var _a;
        if (typeof e.data !== 'string') return;
        if (e.data.split(':')[0] === 'bilibili-parse-login-credentials') {
            (_a = window.auth_window) === null || _a === void 0 ? void 0 : _a.close();
            let url = e.data.split(': ')[1];
            const auth_id = localStorage.getItem('bp_auth_id') || '';
            const auth_sec = localStorage.getItem('bp_auth_sec') || '';
            $.ajax(url.replace('https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png?', `${config.base_api}/auth/v2/?act=login&auth_id=${auth_id}&auth_sec=${auth_sec}&vip_status=${user_status.vip_status()}&`), {
                type: 'GET',
                dataType: 'json',
                success: (res) => {
                    if (!res.code) {
                        utils.Message.success('授权成功');
                        if (res.auth_id && res.auth_sec) {
                            localStorage.setItem('bp_auth_id', res.auth_id);
                            localStorage.setItem('bp_auth_sec', res.auth_sec);
                        }
                        localStorage.setItem('bp_access_key', new URL(url).searchParams.get('access_key'));
                        localStorage.setItem('bp_auth_time', Date.now());
                        $('#auth').val('1');
                    } else {
                        utils.Message.warning('授权失败');
                    }
                    window.auth_clicked = false;
                },
                error: () => {
                    utils.Message.danger('请求异常');
                    window.auth_clicked = false;
                }
            });
        }
    });

    // config
    let config = {
        base_api: 'https://api.injahow.cn/bparse/',
        format: 'flv',
        replace_force: '0',
        auth: '0'
    };
    // config_init
    (function () {
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
        new_config_str_temp = new_config_str = JSON.stringify(config);
        const _config = config;
        window.my_click_event = () => {
            config.base_api = $('#base_api').val();
            config.format = $('#format option:selected').val();
            config.replace_force = $('#replace_force option:selected').val();
            config.auth = $('#auth option:selected').val();
            new_config_str = JSON.stringify(config);
            localStorage.setItem('my_config_str', new_config_str);
            $('#my_config').hide();
            $('#video_download').hide();
            $('#video_download_2').hide();
        };
        window.onbeforeunload = () => {
            window.my_click_event();
        };
        window.bp_show_help = () => {
            if (window.help_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                return;
            }
            window.help_clicked = true;
            $.ajax(`${config.base_api}/auth/v2/?act=help`, {
                dataType: 'text',
                success: (result) => {
                    if (result) {
                        utils.MessageBox.alert(result);
                    } else {
                        utils.Message.warning('获取失败');
                    }
                    window.help_clicked = false;
                },
                error: (e) => {
                    utils.Message.danger('请求异常');
                    window.help_clicked = false;
                    console.log('error', e);
                }
            });
        };
        const option = ['', 'selected'];
        const config_css =
            '<style>' +
            '@keyframes settings-bg{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.7)}}' +
            '.setting-button{width:120px;height:40px;border-width:0px;border-radius:3px;background:#1E90FF;cursor:pointer;outline:none;color:white;font-size:17px;}.setting-button:hover{background:#5599FF;}' +
            'a.setting-context{margin:0 2%;color:blue;}a.setting-context:hover{color:red;}' +
            '</style>';
        const config_html =
            '<div id="my_config" style="display:none;position:fixed;inset:0px;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.3s;z-index:10000;cursor:default;">' +
            '<div style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:600px;transform:translate(-50%,-50%);cursor:default;">' +
            '<span style="font-size:20px"><b>bilibili视频下载 参数设置 <a style="text-decoration:underline;" href="javascript:;" onclick="bp_show_help()">&lt;获取帮助|脚本通知&gt;</a></b></span>' +
            '<div style="margin:2% 0;"><label>请求地址：</label>' +
            `<input id="base_api" value="${_config.base_api}" style="width:50%;"><br/>` +
            '<small>普通使用请勿修改，默认地址：https://api.injahow.cn/bparse/</small></div>' +
            '<div style="margin:2% 0;"><label>视频格式：</label>' +
            '<select name="format" id="format">' +
            '<option value="flv" ' + option[Number(_config.format === 'flv')] + '>FLV</option>' +
            '<option value="dash" ' + option[Number(_config.format === 'dash')] + '>DASH</option>' +
            '<option value="mp4" ' + option[Number(_config.format === 'mp4')] + '>MP4</option>' +
            '</select><br/><small>注意：番剧暂不支持MP4请求</small></div>' +
            '<div style="margin:2% 0;"><label>强制换源：</label>' +
            '<select name="replace_force" id="replace_force">' +
            '<option value="0" ' + option[Number(!_config.replace_force)] + '>关闭</option>' +
            '<option value="1" ' + option[Number(_config.replace_force)] + '>开启</option>' +
            '</select><br/><small>说明：强制使用请求到的视频地址和第三方播放器进行播放</small></div>' +
            '<div style="margin:2% 0;"><label>授权状态：</label>' +
            '<select name="auth" id="auth" disabled>' +
            '<option value="0" ' + option[Number(!_config.auth)] + '>未授权</option>' +
            '<option value="1" ' + option[Number(_config.auth)] + '>已授权</option></select>' +
            '<a class="setting-context" href="javascript:;" onclick="bp_show_login()">账号授权</a>' +
            '<a class="setting-context" href="javascript:;" onclick="bp_show_logout()">取消授权</a>' +
            '<a class="setting-context" href="javascript:;" onclick="bp_show_login_help()">这是什么？</a></div>' +
            '<div style="text-align:right"><button class="setting-button" onclick="my_click_event()">确定</button></div>' +
            '</div></div>';
        $('body').append(config_html + config_css);
    })();

    // components
    const utils = {
        Message: {},
        MessageBox: {}
    };
    // components_init
    (function () {
        utils.Message = {
            success: (html) => {
                message(html, 'success');
            },
            warning: (html) => {
                message(html, 'warning');
            },
            danger: (html) => {
                message(html, 'danger');
            },
            info: (html) => {
                message(html, 'info');
            }
        };
        utils.MessageBox = {
            alert: (html, affirm) => {
                messageBox({
                    html, callback: { affirm }
                }, 'alert');
            },
            confirm: (html, affirm, cancel) => {
                messageBox({
                    html, callback: {
                        affirm, cancel
                    }
                }, 'confirm');
            }
        };
        const components_css =
            '<style>' +
            '.message-bg{position:fixed;float:right;right:0;top:2%;z-index:10001;}' +
            '.message{margin-bottom:15px;padding:4px 12px;width:300px;display:flex;margin-top:-70px;opacity:0;}' +
            '.message-danger{background-color:#ffdddd;border-left:6px solid #f44336;}' +
            '.message-success{background-color:#ddffdd;border-left:6px solid #4caf50;}' +
            '.message-info{background-color:#e7f3fe;border-left:6px solid #0c86de;}' +
            '.message-warning{background-color:#ffffcc;border-left:6px solid #ffeb3b;}' +
            '.message-context{font-size:21px;word-wrap:break-word;word-break:break-all;}' +
            '.message_box_btn{text-align:right;}.message_box_btn button{margin:0 5px;}' +
            '</style>';
        const components_html =
            '<div class="message-bg"></div>' +
            '<div id="message_box" style="opacity:0;display:none;position:fixed;inset:0px;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.3s;z-index:10000;cursor:default;">' +
            '<div style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:400px;transform:translate(-50%,-50%);cursor:default;">' +
            '<span style="font-size:20px"><b>提示：</b></span>' +
            '<div id="message_box_context" style="margin:2% 0;">......</div><br/><br/>' +
            '<div class="message_box_btn">' +
            '<button class="setting-button" name="affirm">确定</button>' +
            '<button class="setting-button" name="cancel">取消</button></div>' +
            '</div></div>';
        function messageBox(ctx, type) {
            if (type === 'confirm') {
                $('div.message_box_btn button[name="cancel"]').show();
            } else if (type === 'alert') {
                $('div.message_box_btn button[name="cancel"]').hide();
            }
            if (ctx.html) {
                $('div#message_box_context').html(`<div style="font-size:18px">${ctx.html}</div>`);
            } else {
                $('div#message_box_context').html('<div style="font-size:18px">╰(￣▽￣)╮</div>');
            }
            $('#message_box').show();
            $('div#message_box').animate({
                'opacity': '1'
            }, 300);
            $('div.message_box_btn button[name="affirm"]')[0].onclick = () => {
                $('div#message_box').hide();
                if (ctx.callback && ctx.callback.affirm) {
                    ctx.callback.affirm();
                }
            };
            $('div.message_box_btn button[name="cancel"]')[0].onclick = () => {
                $('div#message_box').hide();
                if (ctx.callback && ctx.callback.cancel) {
                    ctx.callback.cancel();
                }
            };
        }
        let id = 0;
        function message(html, type) {
            id += 1;
            messageEnQueue(`<div id="message-${id}" class="message message-${type}"><div class="message-context"><p><strong>${type}：</strong></p><p>${html}</p></div></div>`, id);
            messageDeQueue(id);
        }
        function messageEnQueue(message, id) {
            $('div.message-bg').append(message);
            $(`div#message-${id}`).animate({
                'margin-top': '+=70px',
                'opacity': '1',
            }, 300);
        }
        function messageDeQueue(id, time = 3000) {
            setTimeout(() => {
                const e = `div#message-${id}`;
                $(e).animate({
                    'margin-top': '-=70px',
                    'opacity': '0',
                }, 300, () => {
                    $(e).remove();
                });
            }, time);
        }
        $('body').append(components_html + components_css);
    })();

    // user
    let user_status;
    // user_init
    (function () {
        user_status = {
            is_login, vip_status, mid,
            need_replace,
            lazy_init
        };
        let _is_login = false, _vip_status = 0, _mid = '';
        let is_init = false;
        function lazy_init(last_init = false) {
            if (!is_init) {
                if (window.__BILI_USER_INFO__) {
                    _is_login = window.__BILI_USER_INFO__.isLogin;
                    _vip_status = window.__BILI_USER_INFO__.vipStatus;
                    _mid = window.__BILI_USER_INFO__.mid || '';
                } else if (window.__BiliUser__) {
                    _is_login = window.__BiliUser__.isLogin;
                    if (window.__BiliUser__.cache) {
                        _vip_status = window.__BiliUser__.cache.data.vipStatus;
                        _mid = window.__BiliUser__.cache.data.mid || '';
                    } else {
                        _vip_status = 0;
                        _mid = '';
                    }
                } else {
                    _is_login = false;
                    _vip_status = 0;
                    _mid = '';
                }
                is_init = last_init;
            }
        }
        function is_login() {
            return _is_login;
        }
        function vip_status() {
            return _vip_status;
        }
        function mid() {
            return _mid;
        }
        function need_replace() {
            return (!_is_login || (_is_login && !_vip_status && need_vip));
        }
    })();

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
        get_video_status();
        user_status.lazy_init();
        check_login_status();
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
        user_status.lazy_init(true); // init
        get_video_status();

        // 更新cid和aid - 2
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
        if (!aid) { // 异常
            utils.Message.warning('aid获取出错');
        }
        q = get_quality().q;
        if (flag_name === 'ep' || flag_name === 'ss') {
            p = window.__INITIAL_STATE__.epInfo.i || 1;
            epid = window.__INITIAL_STATE__.epInfo.id;
            api_url = `${config.base_api}?av=${aid}&p=${p}&ep=${epid}&cid=${cid}&q=${q}&type=bangumi&format=${config.format}&otype=json`;
        } else if (flag_name === 'av' || flag_name === 'bv') {
            p = window.__INITIAL_STATE__.p || 1;
            api_url = `${config.base_api}?av=${aid}&p=${p}&cid=${cid}&q=${q}&type=video&format=${config.format}&otype=json`;
        }
        const auth_id = localStorage.getItem('bp_auth_id') || '';
        const auth_sec = localStorage.getItem('bp_auth_sec') || '';
        if (config.auth === '1' && auth_id && auth_id) {
            api_url += `&auth_id=${auth_id}&auth_sec=${auth_sec}`;
        }

        if (api_url === api_url_temp && new_config_str === new_config_str_temp) {
            utils.Message.warning('(^・ω・^)~喵喵喵~');
            const url = $('#video_url').attr('href');
            const url_2 = $('#video_url_2').attr('href');
            if (url && url !== '#') {
                $('#video_download').show();
                config.format === 'dash' && $('#video_download_2').show();
                if (user_status.need_replace() || config.replace_force === '1') {
                    !$('#my_dplayer')[0] && replace_player(url, url_2);
                }
            }
            return;
        }
        $('#video_url').attr('href', '#');
        $('#video_url_2').attr('href', '#');
        api_url_temp = api_url;
        new_config_str_temp = new_config_str;

        utils.Message.info('开始请求');
        $.ajax(api_url, {
            dataType: 'json',
            success: (result) => {
                if (result && result.code === 0) {
                    utils.Message.success('请求成功');
                    const url = config.format === 'dash' ? result.video.replace(/^https?\:\/\//i, 'https://') : result.url.replace(/^https?\:\/\//i, 'https://');
                    const url_2 = config.format === 'dash' ? result.audio.replace(/^https?\:\/\//i, 'https://') : '#';
                    $('#video_url').attr('href', url);
                    $('#video_download').show();
                    if (config.format === 'dash') {
                        $('#video_url_2').attr('href', url_2);
                        $('#video_download_2').show();
                    }
                    if (user_status.need_replace() || config.replace_force === '1') {
                        replace_player(url, url_2);
                    }
                } else {
                    utils.Message.warning('请求失败：' + result.message);
                }
            },
            error: (e) => {
                utils.Message.danger('请求异常');
                console.log('error', e);
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

    setInterval(function () {
        if (q !== get_quality().q) {
            refresh();
        }
    }, 1000);

    // 监听aid
    $('body').on('click', '.rec-list', function () {
        refresh();
    });

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
