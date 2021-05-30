// ==UserScript==
// @name         bilibili视频下载
// @namespace    https://github.com/injahow
// @version      0.1.9
// @description  仅支持flv视频，建议使用IDM下载，api接口见https://github.com/injahow/bilibili-parse
// @author       injahow
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/bangumi/play/ep*
// @match        *://www.bilibili.com/bangumi/play/ss*
// @license      MIT
// @grant        none
// @require      https://static.hdslb.com/js/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    let aid = '', epid='', p = '', q='', cid = window.cid;
    let aid_temp = '', p_temp = '', q_temp = '';
    const topBox =
          "<div style='position:fixed;z-index:999999;cursor:pointer;top:60px;left:0px;'>"+
          "<div id='bilibili_parse' style='font-size:14px;padding:10px 2px;color:#000000;background-color:#00a1d6;'>请求地址</div>"+
          "<div style='font-size:14px;padding:10px 2px;'>"+
          "<a id='video_url' style='display:none' target='_blank' referrerpolicy='origin' href='#'>下载视频</a>"+
          "</div>"+
          "</div>";
    $('body').append(topBox);
    // 引用外链播放器
    $('body').append('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.css">');
    $('body').append('<script src="https://cdn.jsdelivr.net/npm/flv.js/dist/flv.min.js"></script>');
    $('body').append('<script src="https://cdn.jsdelivr.net/npm/dplayer/dist/DPlayer.min.js"></script>');

    const video_url = $('#video_url');

    $('body').on('click','#bilibili_parse',function(){

        // 更新cid和aid
        cid = window.cid
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
            let q_max = $('.bui-select-item')[0].dataset.value || q;
            q = q_max > 80 ? 80 : q_max;
            // 暂停视频准备换源
            $('video[crossorigin="anonymous"]')[0].pause();
        }

        if (aid === aid_temp && p === p_temp && q === q_temp){
            console.log('重复请求');
            video_url.show();
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
                    video_url.attr('href', result.replace(/^https?\:\/\//i,'https://'));
                    video_url.show();
                    if(!window.__BiliUser__.isLogin){
                        $('#bilibili-player').before("<div id='my_dplayer' class='bilibili-player relative bilibili-player-no-cursor'></div>");
                        $('#bilibili-player').hide();
                        window.my_dplayer = new DPlayer({
                            container: document.getElementById('my_dplayer'),
                            video: {
                                url: result.replace(/^https?\:\/\//i,'https://'),
                                type: "customFlv",
                                customType: {
                                    customFlv: function (video, player) {
                                        const flvPlayer = flvjs.createPlayer({
                                            type: "flv",
                                            url: video.src,
                                        });
                                        flvPlayer.attachMediaElement(video);
                                        flvPlayer.load();
                                    }
                                }
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
        video_url.hide();
        if(!window.__BiliUser__.isLogin){
            //window.my_dplayer.pause();
            $('#my_dplayer').remove();
            $('#bilibili-player').show();
        }
    }

    // 监听p
    $('body').on('click','.list-box',function(){
        refresh();
    });

    // 监听q
    $('body').on('click','li.bui-select-item',function(){
        refresh();
    });

    // 监听aid 右侧推荐
    $('body').on('click','.rec-list',function(){
        refresh();
    });

    // 监听aid 视频内部推荐
    $('body').on('click','.bilibili-player-ending-panel-box-videos',function(){
        refresh();
    });

    // 定时检查 aid 和 cid
    setInterval(function(){
        if(aid !== window.aid || cid !== window.cid){
            refresh();
        }
    },3000);

})();
