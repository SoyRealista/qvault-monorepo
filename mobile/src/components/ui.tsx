import React from "react";
import {
  Text,
  TextProps,
  TouchableOpacity,
  View,
  ViewProps,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { colors, radius, spacing, font } from "../theme";

export function Screen({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.screen, style]} {...rest}>
      {children}
    </View>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function H1(props: TextProps) {
  return <Text {...props} style={[styles.h1, props.style]} />;
}
export function H2(props: TextProps) {
  return <Text {...props} style={[styles.h2, props.style]} />;
}
export function Body(props: TextProps) {
  return <Text {...props} style={[styles.body, props.style]} />;
}
export function Muted(props: TextProps) {
  return <Text {...props} style={[styles.muted, props.style]} />;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? colors.cyan
      : variant === "danger"
      ? colors.danger
      : variant === "secondary"
      ? colors.bgCard
      : "transparent";
  const fg =
    variant === "primary" ? colors.bg : variant === "danger" ? "#fff" : colors.text;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : 1 },
        variant === "ghost" && { borderWidth: 1, borderColor: colors.border },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.btnText, { color: fg }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  h1: { color: colors.text, fontSize: font.h1, fontWeight: "800" },
  h2: { color: colors.text, fontSize: font.h2, fontWeight: "700" },
  body: { color: colors.text, fontSize: font.body },
  muted: { color: colors.textSecondary, fontSize: font.small },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: { fontSize: font.body, fontWeight: "700" },
});
