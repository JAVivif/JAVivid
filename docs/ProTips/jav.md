<details><summary>中文</summary>

- 怎样添加别的资源网站？

  （**前提**：使用[本地版]）

  比如要添加可在线观看全片的网站，那就往配置文件 [`config.js`][config-file] 中的数组 `streamSites` 增加新条目。

  **必需**字段有 `domain` 和 `type`，举例：
  ```
  { domain: 'xx.com', type: 'stream' }
  ```
  至于其他可选参数及标注，参考那里具体的预置列表即可。

<br>

- 范围生成
  - 举例
    - `SSNI-960..888--36`
    - `ssni888..960++36`
  - 格式说明
    - `系列名-起始序号..截止序号++序号间隔`
      - `++` 为增；`--` 为减
      - `系列名` 与 `起始序号` 之间的横杠（`-`）可省略
</details>

<br>
<br>

<details><summary>English</summary>

- How to add other resource sites?

  (**Premise**: Use the [local version])

  For example, if you want to add a website where you can watch the full JAV online, then add a new entry to the array `streamSites` in the configuration file [`config.js`][config-file].

  **Required** fields are `domain` and `type`, for example:
  ```
  { domain: 'xx.com', type: 'stream' }
  ```
  As for other optional parameters and labels, just refer to the specific preset list there.

<br>

- Range generation
  - Examples
    - `SSNI-960..888--36`
    - `ssni888..960++36`
  - Format description
    - `SeriesName-StartingSerialNumber..EndingSerialNumber++SerialNumberInterval`
      - `++` means increase; `--` means decrease
      - The hyphen (`-`) between `SeriesName` and `StartingSerialNumber` can be omitted
</details>


[config-file]: ../../configs/config.js
[local version]: ../../readme.md#❓-Where-to-download-the-local-version?
[本地版]: ../readme-in-other-langs/zh.md#❓-哪里下载本地版？