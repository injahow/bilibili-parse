# bilibili-parse

> bilibili flv 视频源地址解析 API

## Descriptions

- 这是参考[you-get](https://github.com/metowolf/Meting)创建的 bilibili 视频解析 API

| 参数名 |    含义    | 默认 |     可选     |
| :----: | :--------: | :--: | :----------: |
|   av   |  视频编号  |      |      -       |
|   p    |  视频集数  |  1   |     >=1      |
|   q    | 视频清晰度 |  64  |   16/32/64   |
| otype  |  输出格式  |      | dplayer/json |

## Demo

[https://api.injahow.cn/bparse/?av=14661594&p=1&q=16&otype=json](https://api.injahow.cn/bparse/?av=14661594&p=1&q=16&otype=json)

## Requirement

PHP 5.4+ and Curl, OpenSSL extension installed.

## License

[MIT](https://github.com/injahow/bilibili-parse/blob/master/LICENSE) license.

Copyright (c) 2019 injahow
