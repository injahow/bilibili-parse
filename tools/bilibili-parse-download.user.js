// ==UserScript==
// @name         bilibili视频下载
// @version      0.4.5
// @description  支持下载番剧与用户上传视频，自动切换为高清视频源
// @author       injahow
// @copyright    2021, injahow (https://github.com/injahow)
// @match        *://www.bilibili.com/video/av*
// @match        *://www.bilibili.com/video/BV*
// @match        *://www.bilibili.com/bangumi/play/ep*
// @match        *://www.bilibili.com/bangumi/play/ss*
// @updateURL    https://github.com/injahow/bilibili-parse/raw/master/tools/bilibili-parse-download.user.js
// @downloadURL  https://github.com/injahow/bilibili-parse/raw/master/tools/bilibili-parse-download.user.js
// @homepage     https://github.com/injahow/bilibili-parse
// @license      MIT
// @grant        none
// @require      https://static.hdslb.com/js/jquery.min.js
// @require      https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js
// @require      https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js
// ==/UserScript==
/* globals $, DPlayer waitForKeyElements */
(function() {
    'use strict';

    let aid = '', p = '', q = '', cid = '', epid = '';
    let aid_temp = '', p_temp = '', q_temp = '';
    let flag_name = '', need_vip = false, vip_need_pay = false;
    let is_login = false, vip_status = 0;

    function request_danmaku(options, _cid){
        $.ajax({
            url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${_cid}`,
            dataType: 'text',
            success:function(result){
                const result_dom = $(result.replace(/[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]/g, ''));
                if(!result_dom.find('d')[0]){
                    options.error('弹幕请求失败');
                }else{
                    const danmaku_data = result_dom.find('d').map((i, el) => {
                        const item = $(el);
                        const p = item.attr('p').split(',');
                        let type = 0;
                        if(p[1] === '4'){
                            type = 2;
                        }else if(p[1] === '5'){
                            type = 1;
                        }
                        return [{author: '', time: parseFloat(p[0]), type: type, color: parseInt(p[3]), id: '', text: item.text()}];
                    }).get();
                    options.success(danmaku_data);
                }
            },
            error:function(error){
                options.error('弹幕请求异常');
            }
        });
    }

    function replace_player(url){
        if(!!$('#bilibiliPlayer')[0]){
            $('#bilibiliPlayer').before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor"></div>');
            $('#bilibiliPlayer').hide();
        }else{
            $('#bilibili-player').html('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor" style="width:100%;height:100%;"></div>');
        }
        $('#danmukuBox').hide();//隐藏弹幕列表
        !!$('#player_mask_module')[0] && $('#player_mask_module').hide();
        window.my_dplayer = new DPlayer({
            container: $('#my_dplayer')[0],
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
                    options.error('此脚本无法发送弹幕');
                }
            }
        });
    }

    function get_video_status(){
        let location_href = window.location.href;
        if(location_href.match(/bilibili.com\/bangumi\/play\/ep/)){
            flag_name = 'ep';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
            vip_need_pay = window.__INITIAL_STATE__.epPayMent.vipNeedPay;
        }else if(location_href.match(/bilibili.com\/bangumi\/play\/ss/)){
            flag_name = 'ss';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
            vip_need_pay = window.__INITIAL_STATE__.epPayMent.vipNeedPay;
        }else if(location_href.match(/bilibili.com\/video\/av/)){
            flag_name = 'av';
            need_vip = false;
            vip_need_pay = false;
        }else if(location_href.match(/bilibili.com\/video\/BV/)){
            flag_name = 'bv';
            need_vip = false;
            vip_need_pay = false;
        }
    }

    function get_all_id(){
        let _aid, _cid;
        if(flag_name === 'ep' || flag_name === 'ss'){
            _aid = window.__INITIAL_STATE__.epInfo.aid;
            _cid = window.__INITIAL_STATE__.epInfo.cid;
        }else if(flag_name === 'av' || flag_name === 'bv') {
            _aid = window.__INITIAL_STATE__.videoData.aid;
            _cid = window.__INITIAL_STATE__.videoData.cid;
        }
        return {aid: _aid, cid: _cid}
    }

    function refresh(){
        console.log('refresh...');
        !!('#video_download')[0] && $('#video_download').hide();
        if (window.my_dplayer){
            console.log('销毁dplayer');
            window.my_dplayer.destroy();
            window.my_dplayer = null;
            $('#my_dplayer').remove();
            !!$('#bilibiliPlayer')[0] && $('#bilibiliPlayer').show();
            !$('#bilibiliPlayer')[0] && $('#player_mask_module').show();
        }
        // 更新cid和aid - 1
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
    }

    $('body').append('<a id="video_url" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
    // 暂且延迟处理...
    setTimeout(function(){
        let my_toolbar;
        if(!!$('#arc_toolbar_report')[0]){
            my_toolbar =
                '<div id="arc_toolbar_report_2" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true"><div class="ops">'+
                '<span id="bilibili_parse"><i class="van-icon-floatwindow_custome"></i>请求地址</span>'+
                '<span id="video_download" style="display:none"><i class="van-icon-download"></i>下载视频</span>'+
                '</div></div>';
            $("#arc_toolbar_report").after(my_toolbar);
        }else if(!!$('#toolbar_module')[0]){
            my_toolbar =
                '<div id="toolbar_module_2" class="tool-bar clearfix report-wrap-module report-scroll-module media-info" scrollshow="true">'+
                '<div id="bilibili_parse" class="like-info"><i class="iconfont icon-customer-serv"></i><span>请求地址</span></div>'+
                '<div id="video_download" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载视频</span></div>'+
                '</div>';
            $("#toolbar_module").after(my_toolbar);
        }
    }, 3000);

    $('body').on('click', '#video_download',function(){
        $('#video_url')[0].click();
    });

    $('body').on('click', '#bilibili_parse',function(){
        get_video_status();

        // 更新cid和aid - 2
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
        if(!aid){
            // 异常
            console.log('aid获取出错！');
        }

        // 获取视频分页参数q
        if(flag_name === 'ep' || flag_name === 'ss'){
            p = window.__INITIAL_STATE__.epInfo.i;
        }else if(flag_name === 'av' || flag_name === 'bv') {
            p = window.__INITIAL_STATE__.p;
        }
        p = p || 1;

        // 获取视频分辨率参数q
        if(!!$('li.bui-select-item.bui-select-item-active').attr('data-value')){
            q = $('li.bui-select-item.bui-select-item-active').attr('data-value');
            if(q === '0'){
                let q_max = $('.bui-select-item')[0].dataset.value;
                q = q_max > 80 ? 80 : q_max;
            }
        }
        q = q || 80;

        // 获取用户状态
        if(window.__BILI_USER_INFO__){
            is_login = window.__BILI_USER_INFO__.isLogin;
            vip_status = window.__BILI_USER_INFO__.vipStatus;
        }else if(window.__BiliUser__){
            is_login = window.__BiliUser__.isLogin;
            vip_status = window.__BiliUser__.cache.data.vipStatus;
        }else{
            is_login = false;
            vip_status = 0;
        }
        if(!is_login || (is_login && vip_status === 0 && need_vip)){
            if(!!$('.bui-select-item')[0]){
                let q_max = $('.bui-select-item')[0].dataset.value;
                q = q_max > 80 ? 80 : q_max;
            }else{
                q = 80;
            }
            // 暂停视频准备换源
            !!$('video[crossorigin="anonymous"]')[0] && $('video[crossorigin="anonymous"]')[0].pause();
        }

        if (aid === aid_temp && p === p_temp && q === q_temp){
            console.log('重复请求');
            const url = $('#video_url').attr('href')
            if (url && url !== '#'){
                $('#video_download').show();
                if(!is_login || (is_login && vip_status === 0 && need_vip)){
                    !$('#my_dplayer')[0] && replace_player(url);
                }
            }
            return;
        }

        aid_temp = aid;
        p_temp = p;
        q_temp = q;

        console.log('开始解析');
        let type, api_url;
        if(flag_name === 'ep' || flag_name === 'ss'){
            type = 'bangumi';
            epid = window.__INITIAL_STATE__.epInfo.id;
            api_url = `https://api.injahow.cn/bparse/?av=${aid}&ep=${epid}&q=${q}&otype=url&type=${type}`;
        }else if(flag_name === 'av' || flag_name === 'bv'){
            type = 'video';
            api_url = `https://api.injahow.cn/bparse/?av=${aid}&p=${p}&q=${q}&otype=url&type=${type}`;
        }
        $.ajax({
            url: api_url,
            dataType: 'text',
            success:function(result){
                if(result !== ''){
                    console.log('url获取成功');
                    const url = result.replace(/^https?\:\/\//i, 'https://');
                    $('#video_url').attr('href', url);
                    $('#video_download').show();
                    if(!is_login || (is_login && vip_status === 0 && need_vip)){
                        replace_player(url);
                    }
                }else{
                    console.log('url获取失败');
                }
            },
            error:function(error){
                console.log('api请求异常', error);
            }
        });
    });

    // 监听p
    $('body').on('click', 'a.router-link-active', function(){
        if(this!==$('li[class="on"]').find('a')[0]){
            refresh();
        }
    });

    $('body').on('click', 'li.ep-item', function(){
        if(!$(this).find('.cursor')){
            refresh();
        }

    });

    // 监听q
    $('body').on('click', 'li.bui-select-item', function(){
        refresh();
    });

    // 监听aid 右侧推荐
    $('body').on('click', '.rec-list', function(){
        refresh();
    });

    // 监听aid 视频内部推荐
    $('body').on('click', '.bilibili-player-ending-panel-box-videos', function(){
        refresh();
    });

    // 定时检查 aid 和 cid
    setInterval(function(){
        const ids = get_all_id();
        if(aid !== ids.aid || cid !== ids.cid){
            refresh();
        }
    },3000);

})();
