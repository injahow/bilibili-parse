// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      0.3.7
// @description  支持番剧与用户上传视频，建议使用IDM下载，api接口见https://github.com/injahow/bilibili-parse
// @author       injahow
// @match        *://www.bilibili.com/video/av*
// @match        *://www.bilibili.com/video/BV*
// @match        *://www.bilibili.com/bangumi/play/ep*
// @match        *://www.bilibili.com/bangumi/play/ss*
// @license      MIT
// @grant        none
// @require      https://static.hdslb.com/js/jquery.min.js
/* globals $, DPlayer waitForKeyElements */
// ==/UserScript==

(function() {
    'use strict';

    let aid = '', epid='', p = '', q = '', cid = '';
    let aid_temp = '', p_temp = '', q_temp = '';
    let is_first_load = true, need_vip = false, is_login=false, vip_status = 0;
    let my_toolbar = '';
    let flag_name = '';
    $('body').append('<a id="video_url" style="display:none" target="_blank" referrerpolicy="origin" href="#"></a>');
    // 暂且延迟处理...
    setTimeout(function(){
        if(document.getElementById('arc_toolbar_report')){
            my_toolbar =
                '<div id="arc_toolbar_report_2" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true"><div class="ops">'+
                '<span id="bilibili_parse"><i class="van-icon-floatwindow_custome"></i>请求地址</span>'+
                '<span id="video_download" style="display:none"><i class="van-icon-download"></i>下载视频</span>'+
                '</div></div>';
            $("#arc_toolbar_report").after(my_toolbar);
        }else if(document.getElementById('toolbar_module')){
            my_toolbar =
                '<div id="toolbar_module_2" class="tool-bar clearfix report-wrap-module report-scroll-module media-info" scrollshow="true">'+
                '<div id="bilibili_parse" class="like-info"><i class="iconfont icon-customer-serv"></i><span >请求地址</span></div>'+
                '<div id="video_download" class="like-info" style="display:none"><i class="iconfont icon-download"></i><span>下载视频</span></div>'+
                '</div>';
            $("#toolbar_module").after(my_toolbar);
        }
    }, 3000);

    $('body').on('click', '#video_download',function(){
        $('#video_url')[0].click();
    });
    function replace_player(url){
        $('#bilibili-player').before('<div id="my_dplayer" class="bilibili-player relative bilibili-player-no-cursor"></div>');
        $('#bilibili-player').hide();
        if(!!$('#player_mask_module')[0]){
            $('#player_mask_module').hide();
        }
        let video_type;
        if(url.match(/.mp4/)){
            video_type = 'mp4';
        }else if(url.match(/.flv/)){
            video_type = 'flv';
        }
        window.my_dplayer = new DPlayer({
            container: document.getElementById('my_dplayer'),
            video: {
                url: url,
                type: video_type
            }
        });
    }

    $('body').on('click', '#bilibili_parse',function(){
        let location_href = window.location.href;
        if(location_href.match(/bilibili.com\/bangumi\/play\/ep/)){
            flag_name = 'ep';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
        }else if(location_href.match(/bilibili.com\/bangumi\/play\/ss/)){
            flag_name = 'ss';
            need_vip = window.__INITIAL_STATE__.epInfo.badge === '会员';
        }else if(location_href.match(/bilibili.com\/video\/av/)){
            flag_name = 'av';
            need_vip = false;
        }else if(location_href.match(/bilibili.com\/video\/BV/)){
            flag_name = 'bv';
            need_vip = false;
        }
        if(!aid){
            // 更新cid和aid - 2
            const ids = get_all_id();
            aid = ids.aid;
            cid = ids.cid;
            if(!aid){
                // 异常
                console.log('aid获取出错！');
            }
        }
        // 获取视频分页参数q
        if(flag_name === 'ep' || flag_name === 'ss'){
            p = window.__INITIAL_STATE__.epInfo.i;
        }else if(flag_name === 'av' || flag_name === 'bv') {
            p = window.__INITIAL_STATE__.p;
        }
        p = p || '1';
        // 获取视频分辨率参数q
        if(!!$('li.bui-select-item.bui-select-item-active').attr('data-value')){
            q = $('li.bui-select-item.bui-select-item-active').attr('data-value');
            if(q === '0'){
                let q_max = $('.bui-select-item')[0].dataset.value || q;
                q = q_max > 80 ? 80 : q_max;
            }
        }

        q = q || '80';
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
            if(is_first_load){
                // 引用外链播放器
                $('body').append('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">');
                $('body').append('<script src="https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js"></script>');
                $('body').append('<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>');
                is_first_load = false;
            }
            if(!!$('.bui-select-item')[0]){
                let q_max = $('.bui-select-item')[0].dataset.value || q;
                q = q_max > 80 ? 80 : q_max;
            }else{
                q = 80;
            }
            // 暂停视频准备换源
            if(!!$('video[crossorigin="anonymous"]')[0]){
                $('video[crossorigin="anonymous"]')[0].pause();
            }
        }

        if (aid === aid_temp && p === p_temp && q === q_temp){
            console.log('重复请求');
            const url = $('#video_url').attr('href')
            if (url && url !== '#'){
                $('#video_download').show();
                if(!is_login || (is_login && vip_status === 0 && need_vip)){
                    replace_player(url);
                }
            }
            return;
        }

        aid_temp = aid;
        p_temp = p;
        q_temp = q;

        console.log('开始解析');
        let type, api_url;
        if(flag_name === 'ep'){
            type = 'bangumi';
            epid = location_href.match(/\d+/g)[0];
            api_url = `https://api.injahow.cn/bparse/?av=${aid}&ep=${epid}&q=${q}&otype=url&type=${type}`;
        }else if(flag_name === 'ss'){
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
        if(document.getElementById('video_download')){
            $('#video_download').hide();
        }
        if (window.my_dplayer){
            console.log('销毁dplayer');
            window.my_dplayer.destroy();
            window.my_dplayer = null;
            $('#my_dplayer').remove();
            $('#bilibili-player').show();
        }
        // 更新cid和aid - 1
        const ids = get_all_id();
        aid = ids.aid;
        cid = ids.cid;
    }

    // 监听p
    $('body').on('click', '.list-box', function(){
        refresh();
    });

    $('body').on('click', 'li.ep-item', function(){
        refresh();
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
