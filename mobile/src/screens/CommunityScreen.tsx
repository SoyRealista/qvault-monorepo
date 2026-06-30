import React from "react";
import { View, StyleSheet, Linking, TouchableOpacity, ScrollView } from "react-native";
import { useWallet } from "../state/WalletProvider";
import { Screen, Card, H2, Body, Muted } from "../components/ui";
import { colors, spacing, radius, font } from "../theme";
import { LINKS } from "../constants";

const LAUNCH = new Date("2026-07-07T12:00:00Z");

function useDaysLeft() {
  const diff = LAUNCH.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function CommunityScreen() {
  const { prices } = useWallet();
  const days = useDaysLeft();

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <H2 style={{ marginVertical: spacing.md }}>QVAULT</H2>

        {/* Price / countdown */}
        <Card style={{ alignItems: "center" }}>
          {prices.qvltUsd != null ? (
            <>
              <Muted>$QVLT price</Muted>
              <H2 style={{ fontSize: font.h1 }}>${prices.qvltUsd.toFixed(6)}</H2>
            </>
          ) : (
            <>
              <Muted>Genesis launch</Muted>
              <H2 style={{ fontSize: font.h1, color: colors.cyan }}>
                {days > 0 ? `${days} days` : "LIVE 🚀"}
              </H2>
              <Muted>7 July 2026 · Solana mainnet</Muted>
            </>
          )}
        </Card>

        {/* Mission */}
        <Card>
          <Body style={{ fontWeight: "700", marginBottom: spacing.xs }}>
            Building finance for the post-quantum era
          </Body>
          <Muted>
            QVAULT is a community-first protocol on Solana — staking, fee-sharing,
            buyback &amp; burn and DAO governance — with a roadmap to a post-quantum
            Layer 1. Stake. Vote. Earn. ⬡
          </Muted>
        </Card>

        {/* Links */}
        <LinkRow label="Website" sub="qvlt.xyz" onPress={() => Linking.openURL(LINKS.website)} />
        <LinkRow label="X (Twitter)" sub="@TheQVault" onPress={() => Linking.openURL(LINKS.x)} />
        <LinkRow
          label="Buy $QVLT"
          sub="on Raydium"
          onPress={() => Linking.openURL(LINKS.buyRaydium)}
        />

        <Muted style={{ textAlign: "center", marginTop: spacing.lg }}>
          QVAULT ⬡ · $QVLT · Solana
        </Muted>
        <Muted style={{ textAlign: "center", marginTop: spacing.xs, color: colors.textMuted }}>
          Never share your seed phrase. The team will never DM you first.
        </Muted>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function LinkRow({ label, sub, onPress }: { label: string; sub: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.linkRow}>
        <View>
          <Body style={{ fontWeight: "700" }}>{label}</Body>
          <Muted>{sub}</Muted>
        </View>
        <Body style={{ color: colors.cyan, fontSize: 20 }}>↗</Body>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  linkRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
