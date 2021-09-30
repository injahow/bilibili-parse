// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      1.7.1
// @description  支持Web、RPC、Blob、Aria等下载方式；支持flv、dash、mp4视频格式；支持下载港区番剧；支持会员下载；支持换源播放，自动切换为高清视频源
// @author       injahow
// @source       https://github.com/injahow/bilibili-parse
// @copyright    2021, injahow (https://github.com/injahow)
// @updateURL    https://greasyfork.org/scripts/413228-bilibili%E8%A7%86%E9%A2%91%E4%B8%8B%E8%BD%BD/code/bilibili%E8%A7%86%E9%A2%91%E4%B8%8B%E8%BD%BD.user.js
// @downloadURL  https://greasyfork.org/scripts/413228-bilibili%E8%A7%86%E9%A2%91%E4%B8%8B%E8%BD%BD/code/bilibili%E8%A7%86%E9%A2%91%E4%B8%8B%E8%BD%BD.user.js
// @include      *://www.bilibili.com/video/av*
// @include      *://www.bilibili.com/video/BV*
// @include      *://www.bilibili.com/medialist/play/*
// @include      *://www.bilibili.com/bangumi/play/ep*
// @include      *://www.bilibili.com/bangumi/play/ss*
// @include      *://www.bilibili.com/cheese/play/ep*
// @include      *://www.bilibili.com/cheese/play/ss*
// @include      https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png*
// @require      https://static.hdslb.com/js/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js
// @require      https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js
// @compatible   chrome
// @compatible   firefox
// @license      MIT
// @grant        none
// ==/UserScript==
/* globals $, DPlayer waitForKeyElements */
(function () {
    'use strict';

    if (window.bp_fun_locked) return;
    window.bp_fun_locked = true;

    // user
    let UserStatus;
    (function () {
        UserStatus = {
            lazy_init,
            is_login, vip_status, mid, uname,
            need_replace
        };
        let _is_login = false, _vip_status = 0, _mid = '', _uname = '';
        let is_init = false;

        function lazy_init(last_init = false) {
            if (!is_init) {
                if (window.__BILI_USER_INFO__) {
                    _is_login = window.__BILI_USER_INFO__.isLogin;
                    _vip_status = window.__BILI_USER_INFO__.vipStatus;
                    _mid = window.__BILI_USER_INFO__.mid || '';
                    _uname = window.__BILI_USER_INFO__.uname || '';
                } else if (window.__BiliUser__) {
                    _is_login = window.__BiliUser__.isLogin;
                    if (window.__BiliUser__.cache) {
                        _vip_status = window.__BiliUser__.cache.data.vipStatus;
                        _mid = window.__BiliUser__.cache.data.mid || '';
                        _uname = window.__BiliUser__.cache.data.uname || '';
                    } else {
                        _vip_status = 0;
                        _mid = '';
                        _uname = '';
                    }
                } else {
                    _is_login = false;
                    _vip_status = 0;
                    _mid = '';
                    _uname = '';
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

        function uname() {
            return _uname;
        }

        function need_replace() {
            return (!_is_login || (_is_login && !_vip_status && VideoStatus.base().need_vip()));
        }

    })();

    // auth
    let Auth;
    (function () {
        // https://greasyfork.org/zh-CN/scripts/25718-%E8%A7%A3%E9%99%A4b%E7%AB%99%E5%8C%BA%E5%9F%9F%E9%99%90%E5%88%B6/code
        if (location.href.match(/^https:\/\/www\.mcbbs\.net\/template\/mcbbs\/image\/special_photo_bg\.png/) != null) {
            if (location.href.match('access_key') && window !== window.parent) {
                window.stop();
                window.parent.postMessage('bilibili-parse-login-credentials: ' + location.href, '*');
            }
            Auth = null;
            return;
        }

        Auth = {
            check_login_status
        };

        let auth_clicked = false;

        function check_login_status() {
            !localStorage.getItem('bp_remind_login') && localStorage.setItem('bp_remind_login', '1');
            const [auth_id, auth_sec, access_key, auth_time] = [
                localStorage.getItem('bp_auth_id') || '',
                localStorage.getItem('bp_auth_sec') || '',
                localStorage.getItem('bp_access_key') || '',
                localStorage.getItem('bp_auth_time') || '0'
            ];
            if (access_key && auth_time === '0') {
                localStorage.setItem('bp_auth_time', Date.now());
            }
            if (UserStatus.is_login()) {
                if (localStorage.getItem('bp_remind_login') === '1') {
                    if (!access_key) {
                        utils.MessageBox.confirm('当前脚本未进行账号授权，无法请求1080P以上的清晰度；如果你是大会员或承包过这部番，授权即可解锁全部清晰度；是否需要进行账号授权？', () => {
                            window.bp_show_login();
                        });
                    }
                    localStorage.setItem('bp_remind_login', '0');
                } else if (config.base_api !== localStorage.getItem('bp_pre_base_api') || (Date.now() - parseInt(auth_time) > 24 * 60 * 60 * 1000)) {
                    // check key
                    if (access_key) {
                        $.ajax(`https://api.bilibili.com/x/space/myinfo?access_key=${access_key}`, {
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
                                    $.ajax(`${config.base_api}/auth/v2/?act=check&auth_id=${auth_id}&auth_sec=${auth_sec}&access_key=${access_key}`, {
                                        type: 'GET',
                                        dataType: 'json',
                                        success: (res) => {
                                            if (res.code) {
                                                utils.Message.warning('授权检查失败：' + res.message);
                                            }
                                        },
                                        error: () => {
                                            utils.Message.danger('授权检查异常');
                                        }
                                    });
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

        window.bp_show_login = function (auto = '1') {
            if (auth_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                return;
            }
            auth_clicked = true;
            if (localStorage.getItem('bp_access_key')) {
                utils.MessageBox.confirm('发现授权记录，是否重新授权？', () => {
                    if (auto === '1') {
                        login();
                    } else {
                        login_manual();
                    }
                }, () => {
                    auth_clicked = false;
                });
            } else {
                if (auto === '1') {
                    login();
                } else {
                    login_manual();
                }
            }
        }

        function login() {
            $.ajax('https://passport.bilibili.com/login/app/third?appkey=27eb53fc9058f8c3&api=https%3A%2F%2Fwww.mcbbs.net%2Ftemplate%2Fmcbbs%2Fimage%2Fspecial_photo_bg.png&sign=04224646d1fea004e79606d3b038c84a', {
                xhrFields: { withCredentials: true },
                type: 'GET',
                dataType: 'json',
                success: (res) => {
                    if (res.data.has_login) {
                        $('body').append(`<iframe id="auth_iframe" src="${res.data.confirm_uri}" style="display:none"></iframe>`);
                    } else {
                        utils.MessageBox.confirm('必须登录B站才能正常授权，是否登陆？', () => {
                            location.href = 'https://passport.bilibili.com/login';
                        }, () => {
                            auth_clicked = false;
                        });
                    }
                },
                error: () => {
                    utils.Message.danger('授权请求异常');
                    auth_clicked = false;
                }
            });
        }

        function login_manual() {
            $.ajax('https://passport.bilibili.com/login/app/third?appkey=27eb53fc9058f8c3&api=https%3A%2F%2Fwww.mcbbs.net%2Ftemplate%2Fmcbbs%2Fimage%2Fspecial_photo_bg.png&sign=04224646d1fea004e79606d3b038c84a', {
                xhrFields: { withCredentials: true },
                type: 'GET',
                dataType: 'json',
                success: (res) => {
                    if (res.data.has_login) {
                        const msg = '' +
                            `请点击<b><a href="${res.data.confirm_uri}" target="_blank">授权地址</a></b>打开一个新窗口，正常情况新窗口应该显示一个用户头像，请将该窗口地址栏的URL链接复制到当前文本框中<br/>
                            <input id="auth_url" style="width:100%" type="text" autocomplete="off"><br>
                            然后点击确定即可`;
                        utils.MessageBox.alert(msg, () => {
                            const auth_url = $('#auth_url').val();
                            const [auth_id, auth_sec] = [
                                localStorage.getItem('bp_auth_id') || '',
                                localStorage.getItem('bp_auth_sec') || ''
                            ];
                            $.ajax(auth_url.replace('https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png?', `${config.base_api}/auth/v2/?act=login&auth_id=${auth_id}&auth_sec=${auth_sec}&`), {
                                type: 'GET',
                                dataType: 'json',
                                success: (res) => {
                                    if (!res.code) {
                                        utils.Message.success('授权成功');
                                        if (res.auth_id && res.auth_sec) {
                                            localStorage.setItem('bp_auth_id', res.auth_id);
                                            localStorage.setItem('bp_auth_sec', res.auth_sec);
                                        }
                                        localStorage.setItem('bp_access_key', new URL(auth_url).searchParams.get('access_key'));
                                        localStorage.setItem('bp_auth_time', Date.now());
                                        $('#auth').val('1');
                                        config.auth = '1';
                                    } else {
                                        utils.Message.warning('授权失败');
                                    }
                                    auth_clicked = false;
                                },
                                error: () => {
                                    utils.Message.danger('请求异常');
                                    auth_clicked = false;
                                }
                            });
                        });
                    } else {
                        utils.MessageBox.confirm('必须登录B站才能正常授权，是否登陆？', () => {
                            location.href = 'https://passport.bilibili.com/login';
                        }, () => {
                            auth_clicked = false;
                        });
                    }
                },
                error: () => {
                    utils.Message.danger('授权请求异常');
                    auth_clicked = false;
                }
            });
        }

        window.bp_show_logout = function () {
            const [auth_id, auth_sec] = [
                localStorage.getItem('bp_auth_id') || '',
                localStorage.getItem('bp_auth_sec') || ''
            ];
            if (auth_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                return;
            }
            auth_clicked = true;
            if (!auth_id) {
                utils.MessageBox.alert('没有发现授权记录');
                auth_clicked = false;
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
                        config.auth = '0';
                    } else {
                        utils.Message.warning('取消失败');
                    }
                    auth_clicked = false;
                },
                error: () => {
                    utils.Message.danger('请求异常');
                    auth_clicked = false;
                }
            });
        }
        window.bp_show_login_help = function () {
            utils.MessageBox.confirm('进行授权之后将能在请求地址时享有用户账号原有的权益，例如能够请求用户已经付费或承包的番剧，是否需要授权？', () => {
                window.bp_show_login();
            });
        }
        window.addEventListener('message', function (e) {
            if (typeof e.data !== 'string') return;
            if (e.data.split(':')[0] === 'bilibili-parse-login-credentials') {
                $('iframe#auth_iframe').remove();
                let url = e.data.split(': ')[1];
                const [auth_id, auth_sec] = [
                    localStorage.getItem('bp_auth_id') || '',
                    localStorage.getItem('bp_auth_sec') || ''
                ];
                $.ajax(url.replace('https://www.mcbbs.net/template/mcbbs/image/special_photo_bg.png?', `${config.base_api}/auth/v2/?act=login&auth_id=${auth_id}&auth_sec=${auth_sec}&`), {
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
                            config.auth = '1';
                        } else {
                            utils.Message.warning('授权失败');
                        }
                        auth_clicked = false;
                    },
                    error: () => {
                        utils.Message.danger('请求异常');
                        auth_clicked = false;
                    }
                });
            }
        });
    })();
    if (!Auth) {
        return;
    }

    // config
    const config = {
        base_api: 'https://api.injahow.cn/bparse/',
        format: 'flv',
        replace_force: '0',
        auth: '0',
        download_type: 'web',
        rpc_domain: 'http://localhost',
        rpc_port: '16800',
        rpc_token: '',
        rpc_dir: 'D:/',
        auto_download: '0'
    };
    // config_init
    (function () {
        const default_config = Object.assign({}, config); // 浅拷贝
        const config_str = localStorage.getItem('my_config_str');
        if (!config_str) {
            localStorage.setItem('my_config_str', JSON.stringify(config));
        } else {
            // set config from cache
            const old_config = JSON.parse(config_str);
            for (const key in old_config) {
                if (Object.hasOwnProperty.call(config, key)) {
                    config[key] = old_config[key];
                }
            }
        }
        window.bp_save_config = () => {
            // set config by form
            for (const key in config) {
                config[key] = $(`#${key}`).val();
            }
            const old_config = JSON.parse(localStorage.getItem('my_config_str'));
            localStorage.setItem('my_config_str', JSON.stringify(config));
            $('#my_config').hide();
            utils.Scroll.show();
            // 判断是否需要重新请求
            for (const key of ['base_api', 'format', 'auth']) {
                if (config[key] !== old_config[key]) {
                    $('#video_download').hide();
                    $('#video_download_2').hide();
                    break;
                }
            }
            // 判断RPC配置情况
            if (config.rpc_domain !== old_config.rpc_domain) {
                if (!(config.rpc_domain.match('https://') || config.rpc_domain.match(/(localhost|127\.0\.0\.1)/))) {
                    utils.MessageBox.alert('' +
                        '检测到当前RPC为非本机的http接口，即将跳转到AriaNG网页控制台页面；' +
                        '请查看控制台RPC接口参数是否正确，第一次加载会比较慢请耐心等待；' +
                        '配置好后即可使用脚本进行远程下载<br/>使用期间不用关闭控制台页面！', () => {
                            utils.open_ariang();
                        });
                }
            }
        };

        window.onbeforeunload = () => {
            window.bp_save_config();
            const bp_aria2_window = window.bp_aria2_window;
            if (bp_aria2_window && !bp_aria2_window.closed) {
                bp_aria2_window.close();
            }
        };

        let help_clicked = false;
        window.bp_show_help = () => {
            if (help_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                return;
            }
            help_clicked = true;
            $.ajax(`${config.base_api}/auth/v2/?act=help`, {
                dataType: 'text',
                success: (result) => {
                    if (result) {
                        utils.MessageBox.alert(result);
                    } else {
                        utils.Message.warning('获取失败');
                    }
                    help_clicked = false;
                },
                error: (e) => {
                    utils.Message.danger('请求异常');
                    help_clicked = false;
                    console.log('error', e);
                }
            });
        };
        !window.bp_reset_config && (window.bp_reset_config = () => {
            for (const key in default_config) {
                if (key === 'auth') {
                    continue;
                }
                $(`#${key}`).val(default_config[key]);
            }
        });
        const config_css = '' +
            '<style>' +
            '@keyframes settings-bg{from{background:rgba(0,0,0,0)}to{background:rgba(0,0,0,.7)}}' +
            '.setting-button{width:120px;height:40px;border-width:0px;border-radius:3px;background:#1E90FF;cursor:pointer;outline:none;color:white;font-size:17px;}.setting-button:hover{background:#5599FF;}' +
            'a.setting-context{margin:0 2%;color:blue;}a.setting-context:hover{color:red;}' +
            '</style>';
        const config_html = '' +
            `<div id="my_config"
                style="display:none;position:fixed;inset:0px;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.3s;z-index:10000;cursor:default;">
                <div
                    style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:600px;transform:translate(-50%,-50%);cursor:default;">
                    <span style="font-size:20px">
                        <b>bilibili视频下载 参数设置</b>
                        <b>
                            <a href="javascript:;" onclick="bp_reset_config()"> [重置配置] </a>
                            <a style="text-decoration:underline;" href="javascript:;" onclick="bp_show_help()">&lt;通知&帮助&gt;</a>
                        </b>
                    </span>
                    <div style="margin:2% 0;"><label>请求地址：</label>
                        <input id="base_api" value="..." style="width:50%;"><br />
                        <small>普通使用请勿修改</small>
                    </div>
                    <div style="margin:2% 0;"><label>视频格式：</label>
                        <select name="format" id="format">
                            <option value="flv">FLV</option>
                            <option value="dash">DASH</option>
                            <option value="mp4">MP4</option>
                        </select><br />
                        <small>注意：仅video类别支持MP4请求</small>
                    </div>
                    <div style="margin:2% 0;"><label>下载方式：</label>
                        <select name="download_type" id="download_type">
                            <option value="a">URL链接</option>
                            <option value="web">Web浏览器</option>
                            <option value="blob">Blob请求</option>
                            <option value="rpc">RPC接口</option>
                            <option value="aria">Aria命令</option>
                        </select><br />
                        <small>提示：url和web方式下载不会设置文件名</small>
                    </div>
                    <div style="margin:2% 0;"><label>RPC配置：[ 域名 : 端口 | 密钥 | 保存目录 ]</label><br />
                        <input id="rpc_domain" value="..." style="width:25%;"> :
                        <input id="rpc_port" value="..." style="width:10%;"> |
                        <input id="rpc_token" placeholder="没有密钥不用填" value="..." style="width:15%;"> |
                        <input id="rpc_dir" placeholder="留空使用默认目录" value="..." style="width:20%;"><br />
                        <small>注意：RPC默认使用Motrix（需要安装并运行）下载，其他软件请修改参数</small>
                    </div>
                    <div style="margin:2% 0;"><label>强制换源：</label>
                        <select name="replace_force" id="replace_force">
                            <option value="0">关闭</option>
                            <option value="1">开启</option>
                        </select><br />
                        <small>说明：强制使用请求到的视频地址和第三方播放器进行播放</small>
                    </div>
                    <div style="margin:2% 0;"><label>自动下载：</label>
                        <select name="auto_download" id="auto_download">
                            <option value="0">关闭</option>
                            <option value="1">开启</option>
                        </select><br />
                        <small>说明：请求地址成功后将自动点击下载视频按钮</small>
                    </div>
                    <div style="margin:2% 0;"><label>授权状态：</label>
                        <select name="auth" id="auth" disabled>
                            <option value="0">未授权</option>
                            <option value="1">已授权</option>
                        </select>
                        <a class="setting-context" href="javascript:;" onclick="bp_show_login()">账号授权</a>
                        <a class="setting-context" href="javascript:;" onclick="bp_show_logout()">取消授权</a>
                        <a class="setting-context" href="javascript:;" onclick="bp_show_login('0')">手动授权</a>
                        <a class="setting-context" href="javascript:;" onclick="bp_show_login_help()">这是什么？</a>
                    </div>
                    <div style="text-align:right"><br />
                        <button class="setting-button" onclick="bp_save_config()">确定</button>
                    </div>
                </div>
            </div>`;
        $('body').append(config_html + config_css);
        // 初始化配置页面
        for (const key in config) {
            $(`#${key}`).val(config[key]);
        }
    })();

    // components
    const utils = {
        Video: {},
        Player: {},
        Message: {},
        MessageBox: {},
        Scroll: {}
    };
    // components_init
    (function () {

        utils.open_ariang = open_ariang;

        // Video
        utils.Video = {
            download: (url, name, type) => {
                const filename = name.replace(/[\/\\:*?"<>|]+/g, '');
                if (type === 'blob') {
                    download_blob(url, filename);
                } else if (type === 'rpc') {
                    download_rpc(url, filename, rpc_type());
                }
            },
            download_all,
        };

        function rpc_type() {
            if (config.rpc_domain.match('https://') || config.rpc_domain.match(/localhost|127\.0\.0\.1/)) {
                return 'post';
            } else {
                return 'ariang';
            }
        }

        function download_all() {

            const [auth_id, auth_sec] = [
                localStorage.getItem('bp_auth_id'),
                localStorage.getItem('bp_auth_sec')
            ];
            const video_base = VideoStatus.base();
            const [type, q, total] = [
                video_base.type,
                VideoStatus.get_quality().q,
                video_base.total()
            ];

            $('body').on('click', 'input[name="dl_video"]', function () {
                // 后触发
                if ($(this).is(':checked')) {
                    $(this).parent().css('color', 'rgba(0,0,0,1)');
                } else {
                    $(this).parent().css('color', 'rgba(0,0,0,0.5)');
                }
            });
            let video_html = '';
            for (let i = 0; i < total; i++) {
                video_html += '' +
                    `<label for="option_${i}"><div style="color:rgba(0,0,0,0.5);">
                        <input type="checkbox" id="option_${i}" name="dl_video" value="${i}">
                        P${i + 1} ${video_base.title(i + 1)}
                    </div></label>`;
            }

            let all_checked = false;
            $('body').on('click', 'button#checkbox_btn', function () {
                if (all_checked) {
                    all_checked = false;
                    $('input[name="dl_video"]').prop('checked', all_checked);
                    $('input[name="dl_video"]').parent().css('color', 'rgba(0,0,0,0.5)');
                } else {
                    all_checked = true;
                    $('input[name="dl_video"]').prop('checked', all_checked);
                    $('input[name="dl_video"]').parent().css('color', 'rgb(0,0,0)');
                }
            });

            const q_map = {
                '120': '4K 超清',
                '116': '1080P 60帧',
                '112': '1080P 高码率',
                '80': '1080P 高清',
                '74': '720P 60帧',
                '64': '720P 高清',
                '48': '720P 高清(MP4)',
                '32': '480P 清晰',
                '16': '360P 流畅'
            };
            const quality_support = VideoStatus.get_quality_support();
            let option_support_html = '';
            for (const item of quality_support) {
                option_support_html += `<option value="${item}">${q_map[item]}</option>`;
            }
            const msg = '' +
                `<div style="margin:2% 0;">
                    <label>视频格式：</label>
                    <select name="format" id="dl_format">
                        <option value="flv" selected>FLV</option>
                        <option value="mp4">MP4</option>
                    </select>
                </div>
                <div style="margin:2% 0;">
                    <label>视频质量：</label>
                    <select name="dl_quality" id="dl_quality">
                        ${option_support_html}
                    </select>
                </div>
                <b>
                    <span style="color:red;">为避免请求被拦截，设置了延时且不支持下载无法播放的视频；请勿频繁下载过多视频，可能触发风控导致不可再下载！</span>
                </b><br />
                <div style="height:220px;width:100%;overflow:auto;background:rgba(0,0,0,0.1);">
                    ${video_html}
                </div>
                <div>${VideoStatus.type() === 'medialist' ? '不支持多页视频，若需要请到视频原播放页面下载' : ''}</div>
                <div style="margin:2% 0;">
                    <button id="checkbox_btn">全选</button>
                </div>`;

            utils.MessageBox.confirm(msg, () => {
                // 获取参数
                let _q = $('#dl_quality').val() || q;

                const videos = [];
                for (let i = 0; i < total; i++) {
                    if (!$(`input#option_${i}`).is(':checked')) {
                        continue;
                    }
                    const p = i + 1;
                    const [aid, cid, epid, filename] = [
                        video_base.aid(p),
                        video_base.cid(p),
                        video_base.epid(p),
                        video_base.filename(p)
                    ];
                    const format = $('#dl_format').val();
                    videos.push({
                        url: `${config.base_api}?av=${aid}&p=${p}&cid=${cid}&ep=${epid}&q=${_q}&type=${type}&format=${format}&otype=json&auth_id=${auth_id}&auth_sec=${auth_sec}&s`,
                        filename: filename
                    });
                }
                get_url(videos, 0, []);
            });
            // 初始化参数
            $('#dl_quality').val(q);

            function get_url(videos, i, video_urls) {
                // 单线递归处理，请求下载同时进行
                if (videos.length) {
                    if (i < videos.length) {
                        const video = videos[i];
                        const msg = `第${i + 1}（${i + 1}/${videos.length}）个视频`;
                        utils.MessageBox.alert(`${msg}：获取中...`);
                        setTimeout(function () {
                            $.ajax(video.url, {
                                type: 'GET',
                                dataType: 'json',
                                success: (res) => {
                                    if (!res.code) {
                                        utils.Message.success('请求成功' + (res.times ? `<br/>今日剩余请求次数${res.times}` : ''));
                                        utils.MessageBox.alert(`${msg}：获取成功！`);
                                        let video_format = '';
                                        if (res.url.match('.flv')) {
                                            video_format = '.flv';
                                        } else if (res.url.match('.mp4')) {
                                            video_format = '.mp4';
                                        }
                                        const type = rpc_type();
                                        if (type === 'post') {
                                            video_urls.push({
                                                url: res.url,
                                                filename: video.filename + video_format
                                            });
                                            if (video_urls.length > 3) {
                                                download_rpc_all(video_urls)
                                                video_urls.length = 0;
                                            }
                                        } else if (type === 'ariang') {
                                            download_rpc_ariang_one({
                                                url: res.url,
                                                filename: video.filename + video_format
                                            });
                                        }
                                    } else {
                                        utils.Message.warning(`第${i + 1}个视频请求失败：` + res.message);
                                    }
                                    setTimeout(function () {
                                        get_url(videos, ++i, video_urls);
                                    }, 1000);
                                },
                                error: () => {
                                    utils.Message.danger(`第${i + 1}个视频请求异常`);
                                    get_url(videos, ++i, video_urls);
                                }
                            });
                        }, 2000);
                    } else {
                        utils.MessageBox.alert('视频地址请求完成！');
                        if (rpc_type() === 'post') {
                            if (video_urls.length > 0) {
                                download_rpc_all(video_urls);
                                video_urls.length = 0;
                            }
                        }
                        // one by one -> null
                    }
                }
            }

            function download_rpc_all(video_urls) {
                const rpc = {
                    domain: config.rpc_domain,
                    port: config.rpc_port,
                    token: config.rpc_token,
                    dir: config.rpc_dir
                };
                const json_rpc = [];
                for (const video of video_urls) {
                    json_rpc.push({
                        id: window.btoa(`BParse_${Date.now()}_${Math.random()}`),
                        jsonrpc: '2.0',
                        method: 'aria2.addUri',
                        params: [`token:${rpc.token}`, [video.url], {
                            dir: rpc.dir,
                            out: video.filename,
                            header: [
                                `User-Agent: ${window.navigator.userAgent}`,
                                `Referer: ${window.location.href}`
                            ]
                        }]
                    });
                }
                utils.Message.info('发送RPC下载请求');
                $.ajax(`${rpc.domain}:${rpc.port}/jsonrpc`, {
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify(json_rpc),
                    success: (res) => {
                        if (res.length === json_rpc.length) {
                            utils.Message.success('RPC请求成功');
                        } else {
                            utils.Message.warning('RPC请求失败');
                        }
                    },
                    error: () => {
                        utils.Message.danger('RPC请求异常，请确认RPC服务配置及软件运行状态');
                    }
                });
            }
        }

        function download_rpc_ariang_one(video) {
            const bp_aria2_window = window.bp_aria2_window;
            let time = 100;
            if (!bp_aria2_window || bp_aria2_window.closed) {
                open_ariang();
                time = 3000;
            }
            setTimeout(() => {
                const bp_aria2_window = window.bp_aria2_window;
                const aria2_header = `header=User-Agent:${window.navigator.userAgent}&header=Referer:${window.location.href}`;
                if (bp_aria2_window && !bp_aria2_window.closed) {
                    const task_hash = `#!/new/task?url=${window.btoa(video.url)}&out=${encodeURIComponent(video.filename)}&${aria2_header}`;
                    bp_aria2_window.location.href = `http://ariang.injahow.com/${task_hash}`;
                    utils.Message.success('RPC请求成功');
                } else {
                    utils.Message.warning('RPC请求失败');
                }
            }, time);
        }

        let download_rpc_clicked = false;

        function download_rpc(url, filename, type = 'post') {
            if (download_rpc_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                return;
            }
            download_rpc_clicked = true;
            const rpc = {
                domain: config.rpc_domain,
                port: config.rpc_port,
                token: config.rpc_token,
                dir: config.rpc_dir
            };
            const json_rpc = {
                id: window.btoa(`BParse_${Date.now()}_${Math.random()}`),
                jsonrpc: '2.0',
                method: 'aria2.addUri',
                params: [`token:${rpc.token}`, [url], {
                    dir: rpc.dir,
                    out: filename,
                    header: [
                        `User-Agent: ${window.navigator.userAgent}`,
                        `Referer: ${window.location.href}`
                    ]
                }]
            };
            utils.Message.info('发送RPC下载请求');
            if (type === 'post') {
                $.ajax(`${rpc.domain}:${rpc.port}/jsonrpc`, {
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify(json_rpc),
                    success: (res) => {
                        if (res.result) {
                            utils.Message.success('RPC请求成功');
                        } else {
                            utils.Message.warning('RPC请求失败');
                        }
                        download_rpc_clicked = false;
                    },
                    error: () => {
                        utils.Message.danger('RPC请求异常，请确认RPC服务配置及软件运行状态');
                        download_rpc_clicked = false;
                    }
                });
            } else if (type === 'ariang') {
                const bp_aria2_window = window.bp_aria2_window;
                let time = 100;
                if (!bp_aria2_window || bp_aria2_window.closed) {
                    open_ariang();
                    time = 3000;
                }
                setTimeout(() => {
                    const bp_aria2_window = window.bp_aria2_window;
                    const aria2_header = `header=User-Agent:${window.navigator.userAgent}&header=Referer:${window.location.href}`;
                    const task_hash = `#!/new/task?url=${window.btoa(url)}&out=${encodeURIComponent(filename)}&${aria2_header}`;
                    if (bp_aria2_window && !bp_aria2_window.closed) {
                        bp_aria2_window.location.href = `http://ariang.injahow.com/${task_hash}`;
                        utils.Message.success('RPC请求成功');
                    } else {
                        utils.Message.warning('RPC请求失败');
                    }
                    download_rpc_clicked = false;
                }, time);
            }
        }

        function open_ariang() {
            const a = document.createElement('a');
            const rpc = {
                domain: config.rpc_domain,
                port: config.rpc_port,
                token: config.rpc_token
            };
            const url = `http://ariang.injahow.com/#!/settings/rpc/set/${rpc.domain.replace('://', '/')}/${rpc.port}/jsonrpc/${window.btoa(rpc.token)}`;
            a.setAttribute('target', '_blank');
            a.setAttribute('onclick', `window.bp_aria2_window=window.open('${url}');`);
            document.body.appendChild(a);
            a.click();
            a.remove();
        }

        let download_blob_clicked = false, need_show_progress = true;

        function show_progress({ total, loaded, percent }) {
            if (need_show_progress) {
                utils.MessageBox.alert(`文件大小：${Math.floor(total / (1024 * 1024))}MB(${total}Byte)<br/>` +
                    `已经下载：${Math.floor(loaded / (1024 * 1024))}MB(${loaded}Byte)<br/>` +
                    `当前进度：${percent}%<br/>下载中请勿操作浏览器！`, () => {
                        need_show_progress = false;
                        utils.MessageBox.alert('注意：刷新或离开页面会导致下载取消！<br/>再次点击下载按钮可查看下载进度。');
                    });
            }
            if (total === loaded) {
                utils.MessageBox.alert('下载完成，请等待浏览器保存！');
                download_blob_clicked = false;
            }
        }

        function download_blob(url, filename) {
            if (download_blob_clicked) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                need_show_progress = true;
                return;
            }
            const xhr = new XMLHttpRequest();
            xhr.open('get', url);
            xhr.responseType = 'blob';
            xhr.onload = function () {
                if (this.status === 200 || this.status === 304) {
                    if ('msSaveOrOpenBlob' in navigator) {
                        navigator.msSaveOrOpenBlob(this.response, filename);
                        return;
                    }
                    const blob_url = URL.createObjectURL(this.response);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = blob_url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    URL.revokeObjectURL(blob_url);
                }
            };
            need_show_progress = true;
            xhr.onprogress = function (evt) {
                if (this.state != 4) {
                    const loaded = evt.loaded;
                    const tot = evt.total;
                    show_progress({
                        total: tot,
                        loaded: loaded,
                        percent: Math.floor(100 * loaded / tot)
                    });
                }
            };
            xhr.send();
            download_blob_clicked = true; // locked
            utils.Message.info('准备开始下载');
        }

        // Player
        utils.Player = {
            replace: replace_player,
            recover: recover_player,
            tag: bili_video_tag
        };

        function request_danmaku(options, _cid) {
            if (!_cid) {
                options.error('cid未知，无法获取弹幕');
                return;
            }
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

        let bili_player_id;

        function replace_player(url, url_2) {
            // 恢复原视频
            recover_player();
            // 暂停原视频
            const bili_video = $(bili_video_tag())[0];
            bili_video_stop();
            !!bili_video && bili_video.addEventListener('play', bili_video_stop, false);

            if (!!$('#bilibiliPlayer')[0]) {
                bili_player_id = '#bilibiliPlayer';
                $(bili_player_id).before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor">');
                $(bili_player_id).hide();
            } else if (!!$('#bilibili-player')[0]) {
                bili_player_id = '#bilibili-player';
                $(bili_player_id).before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor" style="width:100%;height:100%;"></div>');
                $(bili_player_id).hide();
            } else if (VideoStatus.type() === 'cheese') {
                if (!!$('div.bpx-player[data-injector="nano"]')[0]) {
                    $('#pay-mask').hide();
                    $('#bofqi').show();
                    bili_player_id = 'div.bpx-player[data-injector="nano"]';
                    $(bili_player_id).before('<div id="my_dplayer" style="width:100%;height:100%;"></div>');
                    $(bili_player_id).hide();
                } else { // 第一次
                    bili_player_id = '#pay-mask';
                    $(bili_player_id).html('<div id="my_dplayer" style="width:100%;height:100%;"></div>');
                }
            }
            $('#player_mask_module').hide();
            const dplayer_init = (subtitle_url = '') => {
                window.my_dplayer = new DPlayer({
                    container: $('#my_dplayer')[0],
                    mutex: false,
                    volume: 1,
                    autoplay: true,
                    video: {
                        url: url,
                        type: 'auto'
                    },
                    subtitle: {
                        url: subtitle_url,
                        type: 'webvtt',
                        fontSize: '35px',
                        bottom: '5%',
                        color: '#fff',
                    },
                    danmaku: true,
                    apiBackend: {
                        read: function (options) {
                            request_danmaku(options, VideoStatus.base().cid());
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
                        volume: 1,
                        autoplay: true,
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
                        my_dplayer_2.seek(my_dplayer.video.currentTime);
                    });
                    my_dplayer.on('pause', function () {
                        my_dplayer_2.pause();
                        my_dplayer_2.seek(my_dplayer.video.currentTime);
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
            // 判断是否需要字幕
            if (VideoStatus.base().is_limited()) {
                get_subtitle_url(dplayer_init);
            } else {
                dplayer_init();
            }
        }

        function get_subtitle_url(dplayer_init) {
            const video_base = VideoStatus.base();
            const [aid, cid, epid] = [
                video_base.aid(),
                video_base.cid(),
                video_base.epid()
            ];
            $.ajax(`https://api.bilibili.com/x/player/v2?aid=${aid}&cid=${cid}&ep_id=${epid}`, {
                dataType: 'json',
                success: res => {
                    if (!res.code && res.data.subtitle.subtitles[0]) {
                        $.ajax(`${res.data.subtitle.subtitles[0].subtitle_url}`, {
                            dataType: 'json',
                            success: res => {
                                // json -> webvtt -> blob_url
                                const datas = res.body || [{ from: 0, to: 0, content: '' }];
                                let webvtt = 'WEBVTT\n\n';
                                for (let data of datas) {
                                    const a = new Date((parseInt(data.from) - 8 * 60 * 60) * 1000).toTimeString().split(' ')[0] +
                                        '.' + (data.from.toString().split('.')[1] || '000').padEnd(3, '0');
                                    const b = new Date((parseInt(data.to) - 8 * 60 * 60) * 1000).toTimeString().split(' ')[0] +
                                        '.' + (data.to.toString().split('.')[1] || '000').padEnd(3, '0');
                                    webvtt += `${a} --> ${b}\n${data.content}\n`;
                                }
                                dplayer_init(URL.createObjectURL(new Blob([webvtt], { type: 'text/vtt' })));
                            },
                            error: _ => {
                                dplayer_init();
                            }
                        });
                    } else {
                        dplayer_init();
                    }
                },
                error: _ => {
                    dplayer_init();
                }
            });
        }

        function bili_video_tag() {
            if (!!$('bwp-video')[0]) {
                return 'bwp-video';
            } else if (!!$('video[class!="dplayer-video dplayer-video-current"]')[0]) {
                return 'video[class!="dplayer-video dplayer-video-current"]';
            }
        }

        function bili_video_stop() { // listener
            const bili_video = $(bili_video_tag())[0];
            if (bili_video) {
                bili_video.pause();
                bili_video.currentTime = 0;
            }
        }

        function recover_player() {
            if (window.my_dplayer) {
                utils.Message.info('恢复播放器');
                const bili_video = $(bili_video_tag())[0];
                !!bili_video && bili_video.removeEventListener('play', bili_video_stop, false);
                window.my_dplayer.destroy();
                window.my_dplayer = null;
                $('#my_dplayer').remove();
                if (window.my_dplayer_2) {
                    window.my_dplayer_2.destroy();
                    window.my_dplayer_2 = null;
                    $('#my_dplayer_2').remove();
                }
                $(bili_player_id).show();
                //$('#player_mask_module').show();
            }
        }

        // Message & MessageBox
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
        const components_css = '' +
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
        const components_html = '' +
            '<div class="message-bg"></div>' +
            '<div id="message_box" style="opacity:0;display:none;position:fixed;inset:0px;top:0px;left:0px;width:100%;height:100%;background:rgba(0,0,0,0.7);animation-name:settings-bg;animation-duration:0.3s;z-index:10000;cursor:default;">' +
            '<div style="position:absolute;background:rgb(255,255,255);border-radius:10px;padding:20px;top:50%;left:50%;width:400px;transform:translate(-50%,-50%);cursor:default;">' +
            '<span style="font-size:20px"><b>提示：</b></span>' +
            '<div id="message_box_context" style="margin:2% 0;">...</div><br/><br/>' +
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
            hide_scroll();
            $('div#message_box').animate({
                'opacity': '1'
            }, 300);
            $('div.message_box_btn button[name="affirm"]')[0].onclick = () => {
                $('div#message_box').hide();
                show_scroll();
                if (ctx.callback && ctx.callback.affirm) {
                    ctx.callback.affirm();
                }
            };
            $('div.message_box_btn button[name="cancel"]')[0].onclick = () => {
                $('div#message_box').hide();
                show_scroll();
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

        // Scroll 滚动条
        utils.Scroll = {
            show: show_scroll,
            hide: hide_scroll
        };

        function show_scroll() {
            if ($('div#my_config').is(':hidden') && $('div#message_box').is(':hidden')) {
                $('body').css('overflow', 'auto');
            }
        }

        function hide_scroll() {
            $('body').css('overflow', 'hidden');
        }

    })();

    // error page redirect -> ss / ep
    if ($('.error-text')[0]) {
        return;
    }

    // video
    let VideoStatus;
    (function () {
        VideoStatus = {
            type, base,
            get_quality, get_quality_support
        };

        function type() {
            if (location.pathname.match('/cheese/play/')) {
                return 'cheese';
            } else if (location.pathname.match('/medialist/play/')) {
                // -/ml*/* or -/watchlater/*
                return 'medialist';
            } else if (!window.__INITIAL_STATE__) {
                // todo
                return '?';
            } else if (!!window.__INITIAL_STATE__.epInfo) {
                return 'bangumi';
            } else if (!!window.__INITIAL_STATE__.videoData) {
                return 'video';
            }
        }

        function base() {
            const _type = type();
            if (_type === 'video') {
                const state = window.__INITIAL_STATE__;
                return {
                    type: 'video',
                    total: () => {
                        return state.videoData.pages.length || 1;
                    },
                    title: (_p) => {
                        const p = _p || state.p || 1;
                        return (state.videoData.pages[p - 1].part || 'unknown').replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    filename: (_p) => {
                        const p = _p || state.p || 1;
                        const title = (state.videoData && state.videoData.title || 'unknown') + ` P${p} （${state.videoData.pages[p - 1].part || p}）`;
                        return title.replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    aid: (_p) => {
                        return state.videoData.aid;
                    },
                    p: () => {
                        return state.p || 1;
                    },
                    cid: (_p) => {
                        const p = _p || state.p || 1;
                        return state.videoData.pages[p - 1].cid;
                    },
                    epid: (_p) => {
                        return '';
                    },
                    need_vip: () => {
                        return false;
                    },
                    vip_need_pay: () => {
                        return false;
                    },
                    is_limited: () => {
                        return false;
                    }
                };
            } else if (_type === 'medialist') {
                const medialist = $('div.player-auxiliary-playlist-item');
                const _id = $('div.player-auxiliary-playlist-item.player-auxiliary-playlist-item-active').index();
                const collect_name = $('.player-auxiliary-playlist-top .player-auxiliary-filter-title').html();
                let owner_name;
                if (location.pathname.match('/medialist/play/watchlater/')) {
                    owner_name = UserStatus.uname();
                } else {
                    owner_name = $('.player-auxiliary-playlist-user .player-auxiliary-playlist-ownerName').html();
                }
                return {
                    type: 'video',
                    total: () => {
                        return medialist.length;
                    },
                    title: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        const title = medialist.eq(id).find('.player-auxiliary-playlist-item-title').attr('title') || 'unknown';
                        return title.replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    filename: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        const title = medialist.eq(id).find('.player-auxiliary-playlist-item-title').attr('title') || 'unknown';
                        return (`${owner_name}-${collect_name} P${id + 1} （${title}）`).replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    aid: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return medialist.eq(id).attr('data-aid');
                    },
                    p: () => {
                        return _id + 1;
                    },
                    cid: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return medialist.eq(id).attr('data-cid');
                    },
                    epid: (_p) => {
                        return '';
                    },
                    need_vip: () => {
                        return false;
                    },
                    vip_need_pay: () => {
                        return false;
                    },
                    is_limited: () => {
                        return false;
                    }
                };
            } else if (_type === 'bangumi') {
                const state = window.__INITIAL_STATE__;
                return {
                    type: 'bangumi',
                    total: () => {
                        return state.epList.length;
                    },
                    title: (_p) => {
                        let ep;
                        if (_p) {
                            ep = state.epList[_p - 1];
                        } else {
                            ep = state.epInfo;
                        }
                        return (`${ep.titleFormat} ${ep.longTitle}` || 'unknown').replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    filename: (_p) => {
                        if (_p) {
                            const ep = state.epList[_p - 1];
                            return (`${state.mediaInfo.season_title}：${ep.titleFormat} ${ep.longTitle}` || 'unknown').replace(/[\/\\:*?"<>|]+/g, '');
                        }
                        return (state.h1Title || 'unknown').replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    aid: (_p) => {
                        if (_p) {
                            return state.epList[_p - 1].aid;
                        }
                        return state.epInfo.aid;
                    },
                    p: () => {
                        return state.epInfo.i || 1;
                    },
                    cid: (_p) => {
                        if (_p) {
                            return state.epList[_p - 1].cid;
                        }
                        return state.epInfo.cid;
                    },
                    epid: (_p) => {
                        if (_p) {
                            return state.epList[_p - 1].id;
                        }
                        return state.epInfo.id;
                    },
                    need_vip: () => {
                        return state.epInfo.badge === '会员';
                    },
                    vip_need_pay: () => {
                        return state.epPayMent.vipNeedPay;
                    },
                    is_limited: () => {
                        return !!state.mediaInfo.season_title.match(/（(僅|仅)限.*地(區|区)）/g);
                    }
                };
            } else if (_type === 'cheese') {
                const episodes = window.PlayerAgent.getEpisodes();
                const _id = $('li.on.list-box-li').index();
                return {
                    type: 'cheese',
                    total: () => {
                        return episodes.length;
                    },
                    title: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return (episodes[id].title || 'unknown').replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    filename: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return (`${$('div.season-info h1').html()} P${id + 1} （${episodes[id].title || 'unknown'}）`).replace(/[\/\\:*?"<>|]+/g, '');
                    },
                    aid: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return episodes[id].aid;
                    },
                    p: () => {
                        return _id + 1;
                    },
                    cid: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return episodes[id].cid;
                    },
                    epid: (_p) => {
                        let id = _p ? (_p - 1) : _id;
                        return episodes[id].id;
                    },
                    need_vip: () => {
                        return false;
                    },
                    vip_need_pay: () => {
                        return false;
                    },
                    is_limited: () => {
                        return false;
                    }
                };
            } else { // error
                return {
                    type: '?',
                    total: () => { return 0; },
                    title: (_p) => { return ''; },
                    filename: (_p) => { return ''; },
                    aid: (_p) => { return ''; },
                    p: () => { return 1; },
                    cid: (_p) => { return ''; },
                    epid: (_p) => { return ''; },
                    need_vip: () => { return false; },
                    vip_need_pay: () => { return false; },
                    is_limited: () => { return false; }
                };
            }
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
            if (!UserStatus.is_login()) {
                _q = _q_max > 80 ? 80 : _q_max;
            }
            return { q: _q, q_max: _q_max };
        }

        function get_quality_support() {
            let list, quality_list = [];
            if (!!$('ul.squirtle-select-list')[0]) {
                list = $('li.squirtle-select-item');
            } else if (!!$('ul.bui-select-list')[0]) {
                list = $('li.bui-select-item');
            }
            if (list && list.length) {
                list.each(function () {
                    const q = `${$(this).attr('data-value')}`;
                    if (q === '0') {
                        return false;
                    }
                    quality_list.push(q);
                });
                return quality_list;
            }
            return ['80', '64', '32', '16'];
        }

    })();

    // check
    let Check;
    (function () {
        Check = {
            aid: '', cid: '', q: '', epid: '',
            refresh
        };

        function refresh() {
            //utils.Message.info('refresh...');
            console.log('refresh...');
            $('#video_download').hide();
            $('#video_download_2').hide();
            utils.Player.recover();
            // 更新check
            const video_base = VideoStatus.base();
            [Check.aid, Check.cid, Check.epid] = [
                video_base.aid(),
                video_base.cid(),
                video_base.epid()
            ];
            Check.q = VideoStatus.get_quality().q;
        }

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
        const bili_video_tag = utils.Player.tag();
        !!$(bili_video_tag)[0] && ($(bili_video_tag)[0].onended = function () {
            refresh();
        });
        // 监听q
        $('body').on('click', 'li.bui-select-item', function () {
            refresh();
        });
        setInterval(function () {
            if (Check.q !== VideoStatus.get_quality().q) {
                refresh();
            } else if (VideoStatus.type() === 'cheese') {
                // epid for cheese
                if (Check.epid !== VideoStatus.base().epid()) {
                    refresh();
                }
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
            const video_base = VideoStatus.base();
            if (Check.aid !== video_base.aid() || Check.cid !== video_base.cid()) {
                refresh();
            }
        }, 3000);

    })();

    // main
    (function () {
        $('body').append('<a id="video_url" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
        $('body').append('<a id="video_url_2" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
        // 暂且延迟处理...
        setTimeout(function () {
            let my_toolbar;
            if (!!$('#arc_toolbar_report')[0]) {
                my_toolbar = '' +
                    '<div id="arc_toolbar_report_2" style="margin-top:16px" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true"><div class="ops">' +
                    '<span id="setting_btn"><i class="van-icon-general_addto_s"></i>脚本设置</span>' +
                    '<span id="bilibili_parse"><i class="van-icon-floatwindow_custome"></i>请求地址</span>' +
                    '<span id="video_download" style="display:none"><i class="van-icon-download"></i>下载视频</span>' +
                    '<span id="video_download_2" style="display:none"><i class="van-icon-download"></i>下载音频</span>' +
                    '<span id="video_download_all"><i class="van-icon-download"></i>批量下载</span>' +
                    '</div></div>';
                $('#arc_toolbar_report').after(my_toolbar);
            } else if (!!$('#toolbar_module')[0]) {
                my_toolbar = '' +
                    '<div id="toolbar_module_2" class="tool-bar clearfix report-wrap-module report-scroll-module media-info" scrollshow="true">' +
                    '<div id="setting_btn" class="like-info"><i class="iconfont icon-add"></i><span>脚本设置</span></div>' +
                    '<div id="bilibili_parse" class="like-info"><i class="iconfont icon-customer-serv"></i><span>请求地址</span></div>' +
                    '<div id="video_download" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载视频</span></div>' +
                    '<div id="video_download_2" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载音频</span></div>' +
                    '<div id="video_download_all" class="like-info"><i class="iconfont icon-download"></i><span>批量下载</span></div>' +
                    '</div>';
                $('#toolbar_module').after(my_toolbar);
            } else if (!!$('div.video-toolbar')[0]) {
                my_toolbar = '' +
                    '<div id="arc_toolbar_report_2" style="margin-top:16px" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true"><div class="ops">' +
                    '<span id="setting_btn"><i class="van-icon-general_addto_s"></i>脚本设置</span>' +
                    '<span id="bilibili_parse"><i class="van-icon-floatwindow_custome"></i>请求地址</span>' +
                    '<span id="video_download" style="display:none"><i class="van-icon-download"></i>下载视频</span>' +
                    '<span id="video_download_2" style="display:none"><i class="van-icon-download"></i>下载音频</span>' +
                    '<span id="video_download_all"><i class="van-icon-download"></i>批量下载</span>' +
                    '</div></div>';
                $('div.video-toolbar').after(my_toolbar);
            }
            UserStatus.lazy_init();
            Auth.check_login_status();
            Check.refresh();
        }, 3000);

        $('body').on('click', '#setting_btn', function () {
            UserStatus.lazy_init(true); // init
            // set form by config
            for (const key in config) {
                $(`#${key}`).val(config[key]);
            }
            $('#my_config').show();
            utils.Scroll.hide();
        });

        $('body').on('click', '#video_download_all', function () {
            UserStatus.lazy_init(true); // init
            if (localStorage.getItem('bp_auth_id') && localStorage.getItem('bp_auth_sec')) {
                if (config.download_type === 'rpc') {
                    utils.Video.download_all();
                } else {
                    utils.MessageBox.confirm('仅支持使用RPC接口批量下载，请确保RPC环境正常，是否继续？', () => {
                        utils.Video.download_all();
                    });
                }
            } else {
                utils.MessageBox.confirm('批量下载仅支持授权用户使用RPC接口下载，是否进行授权？', () => {
                    window.bp_show_login();
                });
            }
        });

        $('body').on('click', '#video_download', function () {
            const type = config.download_type;
            if (type === 'web') {
                $('#video_url')[0].click();
            } else if (type === 'a') {
                const [video_url, video_url_2] = [
                    $('#video_url').attr('href'),
                    $('#video_url_2').attr('href')
                ];
                const msg = '建议使用IDM、FDM等软件安装其浏览器插件后，鼠标右键点击链接下载~<br/><br/>' +
                    `<a href="${video_url}" target="_blank" style="text-decoration:underline;">&gt;视频地址&lt;</a><br/><br/>` +
                    (config.format === 'dash' ? `<a href="${video_url_2}" target="_blank" style="text-decoration:underline;">&gt;音频地址&lt;</a>` : '');
                utils.MessageBox.alert(msg);
            } else if (type === 'aria') {
                const [video_url, video_url_2] = [
                    $('#video_url').attr('href'),
                    $('#video_url_2').attr('href')
                ];
                const video_title = VideoStatus.base().filename();
                let file_name, file_name_2;
                if (video_url.match('.flv')) {
                    file_name = video_title + '.flv';
                } else if (video_url.match('.m4s')) {
                    file_name = video_title + '_video.mp4';
                } else if (video_url.match('.mp4')) {
                    file_name = video_title + '.mp4';
                }
                file_name_2 = video_title + '_audio.mp4';
                const aria2_header = `--header "User-Agent: ${window.navigator.userAgent}" --header "Referer: ${window.location.href}"`;
                const [code, code_2] = [
                    `aria2c "${video_url}" --out "${file_name}" ${aria2_header}`,
                    `aria2c "${video_url_2}" --out "${file_name_2}" ${aria2_header}`
                ]
                const msg = '点击文本框即可复制下载命令！<br/><br/>' +
                    `视频：<br/><input id="aria2_code" value='${code}' onclick="bp_clip_btn('aria2_code')" style="width:100%;"></br></br>` +
                    (config.format === 'dash' ? `音频：<br/><input id="aria2_code_2" value='${code_2}' onclick="bp_clip_btn('aria2_code_2')" style="width:100%;"><br/><br/>` +
                        `全部：<br/><textarea id="aria2_code_all" onclick="bp_clip_btn('aria2_code_all')" style="min-width:100%;max-width:100%;min-height:100px;max-height:100px;">${code}\n${code_2}</textarea>` : '');
                !window.bp_clip_btn && (window.bp_clip_btn = (id) => {
                    $(`#${id}`).select();
                    if (document.execCommand('copy')) {
                        utils.Message.success('复制成功');
                    } else {
                        utils.Message.warning('复制失败');
                    }
                });
                utils.MessageBox.alert(msg);
            } else {
                const url = $('#video_url').attr('href');
                let file_name = VideoStatus.base().filename();
                if (url.match('.flv')) {
                    file_name += '.flv';
                } else if (url.match('.m4s')) {
                    file_name += '_video.mp4';
                } else if (url.match('.mp4')) {
                    file_name += '.mp4';
                } else {
                    return;
                }
                utils.Video.download(url, file_name, type);
            }
        });

        $('body').on('click', '#video_download_2', function () {
            const type = config.download_type;
            if (type === 'web') {
                $('#video_url_2')[0].click();
            } else if (type === 'a') {
                $('#video_download').click();
            } else if (type === 'aria') {
                $('#video_download').click();
            } else {
                const url = $('#video_url_2').attr('href');
                let file_name = VideoStatus.base().filename();
                if (url.match('.m4s')) {
                    file_name += '_audio.mp4';
                } else {
                    return;
                }
                utils.Video.download(url, file_name, type);
            }
        });

        let api_url, api_url_temp;
        $('body').on('click', '#bilibili_parse', function () {
            UserStatus.lazy_init(true); // init
            const video_base = VideoStatus.base();
            const [type, aid, p, cid, epid] = [
                video_base.type,
                video_base.aid(),
                video_base.p(),
                video_base.cid(),
                video_base.epid()
            ];
            const q = VideoStatus.get_quality().q;
            api_url = `${config.base_api}?av=${aid}&p=${p}&cid=${cid}&ep=${epid}&q=${q}&type=${type}&format=${config.format}&otype=json`;
            const [auth_id, auth_sec] = [
                localStorage.getItem('bp_auth_id') || '',
                localStorage.getItem('bp_auth_sec') || ''
            ];
            if (config.auth === '1' && auth_id && auth_sec) {
                api_url += `&auth_id=${auth_id}&auth_sec=${auth_sec}`;
            }
            if (api_url === api_url_temp) {
                utils.Message.info('(^・ω・^)~喵喵喵~');
                const url = $('#video_url').attr('href');
                const url_2 = $('#video_url_2').attr('href');
                if (url && url !== '#') {
                    $('#video_download').show();
                    config.format === 'dash' && $('#video_download_2').show();
                    if (UserStatus.need_replace() || video_base.is_limited() || config.replace_force === '1') {
                        !$('#my_dplayer')[0] && utils.Player.replace(url, url_2);
                    }
                    if (config.auto_download === '1') {
                        $('#video_download').click();
                    }
                }
                return;
            }
            $('#video_url').attr('href', '#');
            $('#video_url_2').attr('href', '#');
            api_url_temp = api_url;

            utils.Message.info('开始请求');
            $.ajax(api_url, {
                dataType: 'json',
                success: (res) => {
                    if (res && !res.code) {
                        utils.Message.success('请求成功' + (res.times ? `<br/>今日剩余请求次数${res.times}` : ''));
                        const url = config.format === 'dash' ? res.video.replace('http://', 'https://') : res.url.replace('http://', 'https://');
                        const url_2 = config.format === 'dash' ? res.audio.replace('http://', 'https://') : '#';
                        $('#video_url').attr('href', url);
                        $('#video_download').show();
                        if (config.format === 'dash') {
                            $('#video_url_2').attr('href', url_2);
                            $('#video_download_2').show();
                        }
                        if (UserStatus.need_replace() || video_base.is_limited() || config.replace_force === '1') {
                            utils.Player.replace(url, url_2);
                        }
                        if (config.auto_download === '1') {
                            $('#video_download').click();
                        }
                    } else {
                        utils.Message.warning('请求失败：' + res.message);
                    }
                },
                error: (e) => {
                    utils.Message.danger('请求异常');
                    console.log('error', e);
                }
            });
        });
    })();

})();
