# OrionTV 新功能实现文档

## 概述

基于对 MoonTVPlus-main 和 yourtv-main 两个项目的深入分析，成功为 OrionTV 应用实现了以下功能：

## 1. 广告过滤功能

### 1.1 实现原理

参考 MoonTVPlus-main 的广告过滤机制，实现了基于关键词的 M3U8 广告过滤：

**广告关键词列表：**
- `sponsor` - 赞助商标记
- `/ad/` - 广告路径
- `/ads/` - 广告路径
- `advert` - 广告通用词
- `advertisement` - 广告全拼
- `/adjump` - 广告跳转
- `redtraffic` - 流量广告

### 1.2 过滤算法

过滤算法采用行级处理策略：

1. **跳过 #EXT-X-DISCONTINUITY 标记**：这些标记用于标识内容不连续，通常出现在广告切换点

2. **检测 #EXTINF 行**：#EXTINF 行后面通常跟着媒体 URL

3. **关键词匹配**：检查 URL 中是否包含广告关键词

4. **整体过滤**：如果检测到广告，则跳过 #EXTINF 行和对应的 URL 行

### 1.3 技术实现

**文件位置：** [services/m3u.ts](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/services/m3u.ts)

**核心函数：**
- `filterM3UContent()` - 过滤 M3U 内容中的广告片段
- `isAdUrl()` - 检测 URL 是否为广告 URL
- `fetchAndParseM3u()` - 带过滤功能的 M3U 解析（支持开关）

## 2. 设置页面集成

### 2.1 新增设置项

在设置页面添加了"移除广告"开关：

**文件位置：** [components/settings/AdFilterSection.tsx](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/components/settings/AdFilterSection.tsx)

**特性：**
- 默认启用状态
- 持久化存储（应用重启后保持设置）
- 支持 TV 遥控器导航
- 触摸设备友好的交互设计

### 2.2 设置存储

**文件位置：** [stores/settingsStore.ts](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/stores/settingsStore.ts)

**实现：**
- 添加 `removeAds` 状态字段
- 实现 `setRemoveAds()` 方法
- 在 `loadSettings()` 和 `saveSettings()` 中集成
- 默认值为 `true`（启用）

## 3. Live TV 功能增强

### 3.1 新增状态管理

**文件位置：** [stores/liveStore.ts](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/stores/liveStore.ts)

**功能：**
- 频道列表管理
- 分组管理（group-title）
- 收藏频道管理
- 频道搜索
- 最后观看时间追踪
- 频道切换（上一个/下一个）

### 3.2 增强的播放器

**文件位置：** [components/LivePlayer.tsx](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/components/LivePlayer.tsx)

**功能：**
- URL 级别的广告过滤
- 频道切换回调
- 遥控器事件处理
- 播放状态管理
- 超时处理
- 错误恢复

### 3.3 重新设计的 Live 页面

**文件位置：** [app/live.tsx](file:///c:/Users/Administrator/Documents/vscode-project/OrionTV-1/app/live.tsx)

**UI 特性：**
- 频道分组侧边栏
- 频道列表（支持 Logo）
- 当前播放信息显示
- 加载状态指示
- 错误提示和重试
- 响应式布局（适配手机、平板、TV）

## 4. TV 遥控器支持

### 4.1 播放页面遥控器控制

**功能：**
- **上/下键**：打开/关闭频道列表
- **左键**：切换到上一个频道
- **右键**：切换到下一个频道
- **确认键**：选择频道
- **返回键**：关闭频道列表

### 4.2 频道列表遥控器控制

**功能：**
- **上下键**：在频道列表中导航
- **左右键**：在分组和频道列表之间切换
- **确认键**：选择当前聚焦的频道
- **返回键**：关闭频道列表

### 4.3 焦点管理

- 自动焦点定位（当前播放频道）
- 平滑滚动
- 焦点状态可视化反馈
- TV 设备自动启用，移动设备自动禁用

## 5. IPTV 功能实现

### 5.1 频道管理

**M3U 解析支持：**
- `#EXTINF` 信息解析
- `tvg-logo` 频道图标
- `group-title` 分组
- 频道名称提取

**分组功能：**
- 自动按 group-title 分组
- 分组名称排序
- 分组频道数量统计

### 5.2 流媒体支持

基于 expo-av 的 Video 组件，支持：
- HLS 流（.m3u8）
- HTTP/HTTPS 直接流
- 自动播放
- 自动缓冲

## 6. 数据持久化

### 6.1 设置存储

**存储键：** `mytv_settings`

**保存内容：**
```json
{
  "apiBaseUrl": "...",
  "m3uUrl": "...",
  "removeAds": true,
  "remoteInputEnabled": false,
  "videoSource": {...},
  "username": "",
  "password": ""
}
```

### 6.2 频道状态

在 liveStore 中管理：
- 当前播放频道索引
- 频道观看历史
- 收藏状态

## 7. 向后兼容性

### 7.1 现有功能保持

- 所有现有的 API 配置功能保持不变
- 视频播放功能完全保留
- 搜索和详情页面不受影响
- 收藏和历史记录功能继续正常工作

### 7.2 渐进增强

- 新功能仅在相关场景激活
- 设置默认为安全值（启用广告过滤）
- 现有用户无需额外配置即可使用新功能

## 8. 使用说明

### 8.1 配置 M3U 播放列表

1. 进入设置页面
2. 在"直播源"部分配置 M3U URL
3. 确保"移除广告"开关已启用（默认）
4. 保存设置

### 8.2 观看直播电视

1. 进入"直播"标签页
2. 使用遥控器：
   - 按"下"键打开频道列表
   - 使用方向键导航
   - 按"确认"键选择频道
3. 按"左/右"键快速切换频道

### 8.3 切换频道组

1. 在频道列表中
2. 左侧显示分组列表
3. 选择不同分组查看该组频道

## 9. 技术架构

### 9.1 组件层级

```
app/live.tsx (主页面)
├── components/LivePlayer.tsx (播放器)
├── stores/liveStore.ts (状态管理)
│   └── services/m3u.ts (M3U 处理)
└── services/adFilter.ts (广告过滤)
```

### 9.2 状态管理

- **settingsStore**: 全局设置（广告过滤开关）
- **liveStore**: 直播相关状态（频道、分组、当前播放）
- **useResponsiveLayout**: 响应式布局状态

### 9.3 事件流

```
遥控器事件
  ↓
useTVEventHandler
  ↓
handleTVEvent (页面级处理)
  ↓
状态更新 / UI 反馈
  ↓
LivePlayer / 频道列表响应
```

## 10. 未来优化方向

### 10.1 可选功能

1. **EPG 电子节目单**：显示当前和即将播放的节目
2. **频道收藏**：标记和快速访问喜爱频道
3. **频道历史**：记录最近观看
4. **多源切换**：同一频道多个源自动切换
5. **画中画模式**：TV 设备上的后台播放

### 10.2 性能优化

1. **虚拟化列表**：大量频道时的性能优化
2. **图片缓存**：频道 Logo 缓存
3. **预加载**：相邻频道预加载

## 11. 测试建议

### 11.1 功能测试

- [ ] 广告过滤开关正常工作
- [ ] 设置持久化生效
- [ ] 频道分组显示正确
- [ ] 频道切换流畅
- [ ] 遥控器导航完整

### 11.2 兼容性测试

- [ ] 移动设备触控操作
- [ ] 平板设备布局适配
- [ ] TV 设备遥控器控制
- [ ] 不同 M3U 格式兼容

### 11.3 边界测试

- [ ] 空 M3U 列表处理
- [ ] 无效 M3U URL 处理
- [ ] 网络错误恢复
- [ ] 播放超时处理

## 12. 文件清单

### 新增文件
- `components/settings/AdFilterSection.tsx` - 广告过滤设置组件
- `services/adFilter.ts` - 广告过滤服务（工具函数）
- `stores/liveStore.ts` - 直播状态管理

### 修改文件
- `services/storage.ts` - 添加 removeAds 到 AppSettings
- `stores/settingsStore.ts` - 添加 removeAds 状态和方法
- `services/m3u.ts` - 添加广告过滤功能
- `components/LivePlayer.tsx` - 增强播放器功能
- `app/live.tsx` - 完整的 Live TV 页面重写
- `app/settings.tsx` - 添加广告过滤设置节

### 配置变更
- TypeScript 类型定义已更新
- 响应式布局保持兼容

---

**版本：** 1.0.0  
**日期：** 2026-05-11  
**实现者：** Claude Code Assistant
