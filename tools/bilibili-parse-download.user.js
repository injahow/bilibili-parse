// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      0.2.2
// @description  仅支持flv视频，建议使用IDM下载，api接口见https://github.com/injahow/bilibili-parse
// @author       injahow
// @match        *://www.bilibili.com/video/av*
// @match        *://www.bilibili.com/video/BV*
// @match        *://www.bilibili.com/bangumi/play/ep*
// @match        *://www.bilibili.com/bangumi/play/ss*
// @license      MIT
// @grant        none
// @require      https://static.hdslb.com/js/jquery.min.js
/* globals jQuery, $, DPlayer waitForKeyElements */
// ==/UserScript==

(function() {
    'use strict';

    let aid = '', epid='', p = '', q='', cid = window.cid;
    let aid_temp = '', p_temp = '', q_temp = '';
    let is_first_load = true;
    const my_toolbar =
          '<div id="arc_toolbar_report_2" class="video-toolbar report-wrap-module report-scroll-module" scrollshow="true">'+
          '<div class="ops">'+
          '<span id="bilibili_parse" title="download" class="like">'+
          '<i class="van-icon-biaoqing"></i>请求地址</span>'+
          '<span id="video_url_span" style="display:none" title="download" class="like">'+
          '<a id="video_url" target="_blank" referrerpolicy="origin" href="#"><i class="van-icon-download"></i>下载视频</a></span>'+
          '</div></div>';

    // 暂且延迟处理...
    setTimeout(function(){
        $("#arc_toolbar_report").after(my_toolbar);
    }, 3000)


    $('body').on('click','#bilibili_parse',function(){

        // 更新cid和aid - 2
        cid = window.cid;
        aid = window.aid;
        if(!aid){
            const link_av = $('link[rel="canonical"]')[0].href;
            const patt = /bilibili.com\/video\/av\d+/g;
            if(patt.test(link_av)){
                aid = link_av.replace(/[^0-9]/ig, '');
                console.log('获取aid:',aid);
            } else {
                console.log('aid获取出错！');
                return;
            }
        }

        // 获取视频分页参数p
        let query_arr = window.location.search.substring(1).split('&');
        for (let i=0; i<query_arr.length; i++) {
            let pair = query_arr[i].split('=');
            if(pair[0] == 'p'){
                p = pair[1];
            }
        }
        p = p || '1';

        // 获取视频分辨率参数q
        q = $('li.bui-select-item.bui-select-item-active').attr('data-value');
        q = q || '32';
        if(!window.__BiliUser__.isLogin){
            if(is_first_load){
                // 引用外链播放器
                $('body').append('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">');
                $('body').append('<script src="https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js"></script>');
                $('body').append('<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>');
                is_first_load = false;
            }
            let q_max = $('.bui-select-item')[0].dataset.value || q;
            q = q_max > 80 ? 80 : q_max;
            // 暂停视频准备换源
            $('video[crossorigin="anonymous"]')[0].pause();
        }

        if (aid === aid_temp && p === p_temp && q === q_temp){
            console.log('重复请求');
            $('#video_url').show();
            return;
        }
        aid_temp = aid;
        p_temp = p;
        q_temp = q;

        console.log('开始解析');
        let type, api_url;
        let local_host = window.location.href;
        if(local_host.match(/bilibili.com\/bangumi\/play\/ep/)){
            type = 'bangumi';
            epid = local_host.match(/\d+/g)[0];
            api_url = `https://api.injahow.cn/bparse/?av=${aid}&ep=${epid}&q=${q}&otype=url&type=${type}`;
        }else if(local_host.match(/bilibili.com\/bangumi\/play\/ss/)){
            type = 'bangumi';
            epid = window.__INITIAL_STATE__.epInfo.id;
            api_url = `https://api.injahow.cn/bparse/?av=${aid}&ep=${epid}&q=${q}&otype=url&type=${type}`;
        }else if(local_host.match(/bilibili.com\/video\//)){
            type = 'video';
            api_url =`https://api.injahow.cn/bparse/?av=${aid}&p=${p}&q=${q}&otype=url&type=${type}`;
        }
        $.ajax({
            url: api_url,
            dataType: 'text',
            success:function(result){
                if(result !== ''){
                    console.log('url获取成功');
                    const url = result.replace(/^https?\:\/\//i,'https://');
                    let video_type;
                    $('#video_url').attr('href', url);
                    $('#video_url_span').show();
                    if(url.match(/.mp4/)){
                        video_type = 'mp4';
                    }else if(url.match(/.flv/)){
                        video_type = 'flv';
                    }
                    if(!window.__BiliUser__.isLogin){
                        $('#bilibili-player').before("<div id='my_dplayer' class='bilibili-player relative bilibili-player-no-cursor'></div>");
                        $('#bilibili-player').hide();
                        window.my_dplayer = new DPlayer({
                            container: document.getElementById('my_dplayer'),
                            video: {
                                url: url,
                                type: video_type
                            }
                        });
                    }
                }else{
                    console.log('url获取失败');
                }
            }
        });
    });

    function refresh(){
        console.log('refresh');
        if(document.getElementById('video_url_span')){
            $('#video_url_span').hide();
        }
        if(!window.__BiliUser__.isLogin){
            if (window.my_dplayer){
                console.log('销毁dplayer');
                window.my_dplayer.destroy();
                window.my_dplayer = null;
                $('#my_dplayer').remove();
                $('#bilibili-player').show();
            }
        }
        // 更新cid和aid - 1
        aid = window.aid;
        cid = window.cid;
    }

    // 监听p
    $('body').on('click','.list-box', function(){
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
        if(aid !== window.aid || cid !== window.cid){
            refresh();
        }
    },3000);

})();
