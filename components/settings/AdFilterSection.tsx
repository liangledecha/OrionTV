import React, { useCallback, useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { useTVEventHandler } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/stores/settingsStore";
import { useResponsiveLayout } from "@/hooks/useResponsiveLayout";

interface AdFilterSectionProps {
  onChanged: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const AdFilterSection: React.FC<AdFilterSectionProps> = ({ onChanged, onFocus, onBlur }) => {
  const { removeAds, setRemoveAds } = useSettingsStore();
  const { deviceType } = useResponsiveLayout();
  const [isFocused, setIsFocused] = useState(false);

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

  return (
    <SettingsSection focusable onFocus={handleSectionFocus} onBlur={handleSectionBlur}>
      <View style={styles.container}>
        <View style={styles.labelContainer}>
          <ThemedText style={styles.title}>移除广告</ThemedText>
          <ThemedText style={styles.description}>播放时自动过滤M3U8中的广告片段</ThemedText>
        </View>
        <Switch
          value={removeAds}
          onValueChange={handleToggle}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={removeAds ? "#ffffff" : "#f4f3f4"}
          style={[styles.switch, { minWidth: minTouchTarget, minHeight: minTouchTarget / 2 }]}
        />
      </View>
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
});