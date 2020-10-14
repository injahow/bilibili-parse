// ==UserScript==
// @name         bilibili-parse-download
// @namespace    https://github.com/injahow
// @version      0.1
// @description  目前仅支持flv视频，使用a标签绕过防盗链，但ip受限，api接口见https://github.com/injahow/bilibili-parse
// @author       injahow
// @match        *://www.bilibili.com/video/*
// @license      MIT
// @grant        none
// @require      https://static.hdslb.com/js/jquery.min.js
// ==/UserScript==

(function() {
    'use strict';

    let aid = '', p = '', q='';
    let aid_temp = '', p_temp = '', q_temp = '';

    let topBox =
        "<div style='position:fixed;z-index:999999;cursor:pointer;top:60px;left:0px;'>"+
          "<div id='bilibili_parse' style='font-size:14px;padding:10px 2px;color:#000000;background-color:#00a1d6;'>请求地址</div>"+
          "<div style='font-size:14px;padding:10px 2px;'>"+
            "<a id='video_url' style='display:none' target='_blank' referrerpolicy='origin' href='#'>下载视频</a>"+
          "</div>"+
        "</div>";
    $('body').append(topBox)

    //获取视频编号参数aid
    const link_av = $('link:first')[0].href
    const patt = /bilibili.com\/video\/av\d+/g
    if(patt.test(link_av)){
        aid = link_av.replace(/[^0-9]/ig, '')
        console.log('获取aid:',aid)
    } else {
        console.log('aid获取出错！')
    }

    // todo:获取视频分辨率参数q
    q = q || '64'

    $('body').on('click','#bilibili_parse',function(){
        // aid错误
        if (aid === '') return

        //获取视频分页参数p
        let query_arr = window.location.search.substring(1).split('&');
        for (let i=0; i<query_arr.length; i++) {
            let pair = query_arr[i].split('=')
            if(pair[0] == 'p'){
                p = pair[1]
            }
        }
        p = p || '1'

        if (aid === aid_temp && p === p_temp && q === q_temp){
            console.log('请勿重复请求')
            return
        }
        aid_temp = aid
        p_temp = p
        q_temp = q

        console.log('开始解析')
        $.ajax({
            url:`https://api.injahow.cn/bparse/?av=${aid}&p=${p}&q=${q}&otype=url`,
            success:function(result){
                console.log('url获取成功')
                $('#video_url').attr('href', result)
                $('#video_url').show()
            }
        })

    })

    // 监听p参数变化
    $('body').on('click','.list-box',function(){
        $('#video_url').hide()
    })

})();
