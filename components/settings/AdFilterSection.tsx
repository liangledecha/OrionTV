import React, { useCallback, useState } from "react";
import { StyleSheet, Switch, View, TextInput, Alert, Platform, ScrollView } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/stores/settingsStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";
import { getDefaultAdRules, getDefaultAdHosts } from "@/services/adFilter";

const DEFAULT_AD_RULES = `sponsor
/ad/
/ads/
advert
advertisement
/adjump
redtraffic
click
vast
ima.
doubleclick`;

const DEFAULT_AD_HOSTS = `doubleclick.net
googlesyndication.com
googleadservices.com
adnxs.com
adsrvr.org
adform.net
criteo.com
taboola.com
outbrain.com
mgid.com`;

const CODE_TEMPLATE = `function filterAdsFromM3U8(m3u8Content) {
  if (!m3u8Content) return '';
  
  // 广告关键字列表
  const adKeywords = [
    'sponsor', '/ad/', '/ads/', 'advert',
    'advertisement', '/adjump', 'redtraffic'
  ];
  
  const lines = m3u8Content.split('\\n');
  const filteredLines = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 跳过 DISCONTINUITY 标识
    if (line.includes('#EXT-X-DISCONTINUITY')) continue;
    
    // 检查 EXTINF 片段
    if (line.includes('#EXTINF:')) {
      const nextLine = lines[i + 1];
      if (nextLine) {
        const isAd = adKeywords.some(k => 
          nextLine.toLowerCase().includes(k)
        );
        if (isAd) { i++; continue; }
      }
    }
    
    filteredLines.push(line);
  }
  
  return filteredLines.join('\\n');
}`;

interface AdFilterSectionProps {
  onChanged: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const AdFilterSection: React.FC<AdFilterSectionProps> = ({ onChanged, onFocus, onBlur }) => {
  const { removeAds, customAdRules, setRemoveAds, setCustomAdRules } = useSettingsStore();
  const { deviceType } = useResponsiveLayout();
  const [isFocused, setIsFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<'simple' | 'hosts' | 'code'>('simple');

  const handleToggle = useCallback(() => {
    setRemoveAds(!removeAds);
    onChanged();
  }, [removeAds, setRemoveAds, onChanged]);

  const handleSectionFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleSectionBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleTVEvent = useCallback(
    (event: any) => {
      if (event.eventType === "select" && isFocused) {
        handleToggle();
      }
    },
    [isFocused, handleToggle]
  );

  useTVEventHandler(handleTVEvent);

  const minTouchTarget = deviceType === "mobile" ? 44 : 48;

  const handleRulesChange = (text: string) => {
    setCustomAdRules(text);
    onChanged();
  };

  const handleResetRules = () => {
    Alert.alert(
      "恢复默认规则",
      "确定要恢复默认去广告规则吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          onPress: () => {
            setCustomAdRules(DEFAULT_AD_RULES);
            onChanged();
          }
        }
      ]
    );
  };

  const handleUseCodeTemplate = () => {
    Alert.alert(
      "使用代码模式",
      "确定要切换到代码编辑模式吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          onPress: () => {
            setCustomAdRules(CODE_TEMPLATE);
            setActiveTab('code');
            onChanged();
          }
        }
      ]
    );
  };

  const handleUseSimpleRules = () => {
    Alert.alert(
      "使用关键词模式",
      "确定要切换到关键词模式吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          onPress: () => {
            setCustomAdRules(DEFAULT_AD_RULES);
            setActiveTab('simple');
            onChanged();
          }
        }
      ]
    );
  };

  const handleLoadHostsTemplate = () => {
    Alert.alert(
      "加载广告域名模板",
      "确定要加载常用广告域名列表吗？",
      [
        { text: "取消", style: "cancel" },
        {
          text: "确定",
          onPress: () => {
            setCustomAdRules(DEFAULT_AD_HOSTS);
            setActiveTab('hosts');
            onChanged();
          }
        }
      ]
    );
  };

  const isCodeMode = customAdRules && customAdRules.includes('function');
  const isHostsMode = customAdRules && !isCodeMode && (
    customAdRules.includes('.com') || 
    customAdRules.includes('.net') || 
    customAdRules.includes('.org')
  );

  const currentTab = isCodeMode ? 'code' : isHostsMode ? 'hosts' : activeTab;

  const renderSimpleRules = () => (
    <View style={styles.tabContent}>
      <TextInput
        style={styles.rulesInput}
        value={customAdRules || DEFAULT_AD_RULES}
        onChangeText={handleRulesChange}
        placeholder="输入广告关键词，每行一个"
        placeholderTextColor="#888"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ThemedText style={styles.rulesHint}>
        每行一个关键词，支持模糊匹配
      </ThemedText>
      <View style={styles.quickActions}>
        <ThemedText style={styles.quickAction} onPress={() => setCustomAdRules(DEFAULT_AD_RULES)}>
          加载默认关键词
        </ThemedText>
        <ThemedText style={styles.quickAction} onPress={handleLoadHostsTemplate}>
          加载广告域名
        </ThemedText>
      </View>
    </View>
  );

  const renderHostsRules = () => (
    <View style={styles.tabContent}>
      <TextInput
        style={styles.rulesInput}
        value={customAdRules || DEFAULT_AD_HOSTS}
        onChangeText={handleRulesChange}
        placeholder="输入广告域名，每行一个"
        placeholderTextColor="#888"
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ThemedText style={styles.rulesHint}>
        广告域名列表，支持子域名匹配
      </ThemedText>
      <View style={styles.quickActions}>
        <ThemedText style={styles.quickAction} onPress={() => setCustomAdRules(DEFAULT_AD_HOSTS)}>
          加载默认域名
        </ThemedText>
        <ThemedText style={styles.quickAction} onPress={() => setCustomAdRules(DEFAULT_AD_RULES)}>
          加载关键词
        </ThemedText>
      </View>
    </View>
  );

  const renderCodeEditor = () => (
    <View style={styles.tabContent}>
      <TextInput
        style={[styles.rulesInput, styles.codeInput]}
        value={customAdRules || CODE_TEMPLATE}
        onChangeText={handleRulesChange}
        placeholder="输入去广告代码..."
        placeholderTextColor="#888"
        multiline
        numberOfLines={12}
        textAlignVertical="top"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ThemedText style={styles.codeHint}>
        必须包含 filterAdsFromM3U8 函数，返回处理后的 M3U8 内容
      </ThemedText>
    </View>
  );

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <ThemedText style={styles.title}>移除广告</ThemedText>
          <ThemedText style={styles.description}>
            智能检测并过滤M3U8中的广告片段
          </ThemedText>
        </View>
        <Switch
          value={removeAds}
          onValueChange={handleToggle}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={removeAds ? "#ffffff" : "#f4f3f4"}
          style={[styles.switch, { minWidth: minTouchTarget, minHeight: minTouchTarget / 2 }]}
        />
      </View>

      {removeAds && (
        <View style={styles.customRulesContainer}>
          <View style={styles.tabHeader}>
            <ThemedText
              style={[styles.tab, currentTab === 'simple' && styles.activeTab]}
              onPress={() => setActiveTab('simple')}
            >
              关键词
            </ThemedText>
            <ThemedText
              style={[styles.tab, currentTab === 'hosts' && styles.activeTab]}
              onPress={() => setActiveTab('hosts')}
            >
              域名
            </ThemedText>
            <ThemedText
              style={[styles.tab, currentTab === 'code' && styles.activeTab]}
              onPress={() => setActiveTab('code')}
            >
              代码
            </ThemedText>
          </View>

          {currentTab === 'simple' && renderSimpleRules()}
          {currentTab === 'hosts' && renderHostsRules()}
          {currentTab === 'code' && renderCodeEditor()}

          <View style={styles.buttonRow}>
            <ThemedText style={styles.resetHint} onPress={handleResetRules}>
              重置全部
            </ThemedText>
          </View>
        </View>
      )}
    </SettingsSection>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    opacity: 0.7,
  },
  switch: {
    transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }],
  },
  customRulesContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  tabHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  tab: {
    fontSize: 13,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    opacity: 0.6,
  },
  activeTab: {
    opacity: 1,
    fontWeight: "600",
    color: "#007AFF",
  },
  tabContent: {
    marginBottom: 12,
  },
  rulesInput: {
    backgroundColor: "#3a3a3c",
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: "#fff",
    minHeight: 150,
    textAlignVertical: "top",
  },
  codeInput: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    minHeight: 200,
  },
  rulesHint: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 8,
  },
  codeHint: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 8,
    color: "#FF9500",
  },
  quickActions: {
    flexDirection: "row",
    marginTop: 12,
    flexWrap: "wrap",
  },
  quickAction: {
    fontSize: 12,
    color: "#34C759",
    marginRight: 16,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 12,
  },
  resetHint: {
    fontSize: 12,
    color: "#FF3B30",
  },
});
