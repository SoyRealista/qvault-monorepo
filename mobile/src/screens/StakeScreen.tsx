import React, { useEffect, useState, useCallback } from "react";
import { View, TextInput, StyleSheet, Alert, ScrollView, TouchableOpacity } from "react-native";
import { useWallet } from "../state/WalletProvider";
import { Screen, Card, H2, Body, Muted, Button } from "../components/ui";
import { colors, spacing, radius, font } from "../theme";
import {
  getStakeInfo,
  StakeInfo,
  buildStakeTx,
  buildUnstakeTx,
  buildClaimTx,
  tierForAmount,
} from "../services/qvault";
import { TIERS } from "../constants";

export default function StakeScreen() {
  const { publicKey, balances, sendTransaction, refresh } = useWallet();
  const [info, setInfo] = useState<StakeInfo | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"stake" | "unstake" | "claim" | null>(null);

  const load = useCallback(() => {
    if (publicKey) getStakeInfo(publicKey).then(setInfo).catch(() => setInfo(null));
  }, [publicKey]);

  useEffect(() => {
    load();
  }, [load, balances]);

  const amountNum = Number(amount) || 0;
  const projectedTier = tierForAmount((info?.amount ?? 0) + amountNum);
  const now = Math.floor(Date.now() / 1000);
  const locked = info ? info.unlockAt > now : false;

  async function run(
    kind: "stake" | "unstake" | "claim",
    build: () => Promise<any>
  ) {
    if (!publicKey) return;
    try {
      setBusy(kind);
      const tx = await build();
      const sig = await sendTransaction(tx);
      Alert.alert("Success ✓", `${kind} confirmed.\n${sig.slice(0, 24)}…`);
      setAmount("");
      load();
      refresh();
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <H2 style={{ marginVertical: spacing.md }}>Staking</H2>

        {/* Current position */}
        <Card>
          <Muted>Currently staked</Muted>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <H2 style={{ fontSize: font.h1 }}>
              {(info?.amount ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </H2>
            <Body style={{ marginLeft: 6, color: colors.textSecondary }}>QVLT</Body>
          </View>
          <View style={styles.tierRow}>
            <View style={styles.tierBadge}>
              <Body style={{ color: colors.cyan }}>
                {info && info.amount > 0 ? `${TIERS[info.tier]?.icon} ${info.tierName}` : "No tier yet"}
              </Body>
            </View>
            {info && info.pendingRewards > 0 && (
              <Muted>
                Rewards: {info.pendingRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} QVLT
              </Muted>
            )}
          </View>
          {locked && (
            <Muted style={{ marginTop: spacing.sm }}>
              🔒 Locked until {new Date(info!.unlockAt * 1000).toLocaleDateString()}
            </Muted>
          )}
        </Card>

        {/* Tiers reference */}
        <Card>
          <Muted style={{ marginBottom: spacing.sm }}>Tiers</Muted>
          {TIERS.map((t) => (
            <View key={t.name} style={styles.tierLine}>
              <Body>
                {t.icon} {t.name}
              </Body>
              <Muted>{t.min.toLocaleString()} QVLT</Muted>
            </View>
          ))}
        </Card>

        {/* Stake input */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Muted>Amount to stake</Muted>
            <TouchableOpacity onPress={() => setAmount(String(balances.qvlt))}>
              <Muted style={{ color: colors.cyan }}>
                Balance: {balances.qvlt.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Muted>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />
          {projectedTier && amountNum > 0 && (
            <Muted style={{ color: colors.cyan }}>
              → {projectedTier.icon} {projectedTier.name} tier
            </Muted>
          )}
        </Card>

        <Button
          title="Stake"
          onPress={() => run("stake", () => buildStakeTx(publicKey!, amountNum, 0))}
          loading={busy === "stake"}
          disabled={amountNum <= 0 || amountNum > balances.qvlt || !!busy}
        />
        <View style={{ height: spacing.sm }} />
        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Button
              title="Claim rewards"
              variant="secondary"
              onPress={() => run("claim", () => buildClaimTx(publicKey!))}
              loading={busy === "claim"}
              disabled={!info || info.pendingRewards <= 0 || !!busy}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Unstake"
              variant="ghost"
              onPress={() =>
                run("unstake", () => buildUnstakeTx(publicKey!, amountNum || info?.amount || 0))
              }
              loading={busy === "unstake"}
              disabled={!info || info.amount <= 0 || locked || !!busy}
            />
          </View>
        </View>

        <Muted style={{ textAlign: "center", marginTop: spacing.md }}>
          All actions are approved and signed in Phantom. Staking rewards depend on
          treasury funding.
        </Muted>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  tierBadge: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tierLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  input: { color: colors.text, fontSize: font.h2, paddingVertical: spacing.sm },
});
