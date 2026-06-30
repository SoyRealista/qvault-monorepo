import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useWallet } from "../state/WalletProvider";
import { Screen, Card, H1, H2, Body, Muted, Button } from "../components/ui";
import { colors, spacing, font, radius } from "../theme";
import { getRecentActivity, TxSummary } from "../services/solana";
import { LINKS } from "../constants";
import { PublicKey } from "@solana/web3.js";

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function WalletScreen({ navigation }: any) {
  const { session, publicKey, balances, prices, loading, connect, disconnect, refresh } =
    useWallet();
  const [activity, setActivity] = useState<TxSummary[]>([]);

  useEffect(() => {
    if (publicKey) getRecentActivity(publicKey).then(setActivity).catch(() => {});
  }, [publicKey, balances]);

  if (!session) {
    return (
      <Screen style={styles.center}>
        <View style={styles.hexLogo}>
          <Body style={{ fontSize: 48 }}>⬡</Body>
        </View>
        <H1 style={{ textAlign: "center", marginTop: spacing.md }}>QVAULT Wallet</H1>
        <Muted style={{ textAlign: "center", marginVertical: spacing.sm }}>
          Your gateway to $QVLT. Connect your Phantom wallet to view your balance,
          send and receive tokens, and stake.
        </Muted>
        <View style={{ height: spacing.lg }} />
        <Button title="Connect Phantom" onPress={connect} />
        <Muted style={{ textAlign: "center", marginTop: spacing.md }}>
          Non-custodial — your keys never leave Phantom.
        </Muted>
      </Screen>
    );
  }

  const qvltUsd = prices.qvltUsd != null ? balances.qvlt * prices.qvltUsd : null;
  const solUsd = prices.solUsd != null ? balances.sol * prices.solUsd : null;
  const totalUsd =
    qvltUsd != null || solUsd != null ? (qvltUsd ?? 0) + (solUsd ?? 0) : null;

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.cyan} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Muted>Total balance</Muted>
            <H1>{totalUsd != null ? `$${totalUsd.toFixed(2)}` : "—"}</H1>
          </View>
          <TouchableOpacity
            onPress={() => publicKey && Linking.openURL(LINKS.explorerAddr(publicKey.toBase58()))}
            style={styles.addrPill}
          >
            <Body style={{ fontSize: font.small }}>
              {publicKey ? short(publicKey.toBase58()) : ""}
            </Body>
          </TouchableOpacity>
        </View>

        <TokenRow
          symbol="QVLT"
          icon="⬡"
          amount={balances.qvlt}
          usd={qvltUsd}
          note={prices.qvltUsd == null ? "Not trading yet" : undefined}
        />
        <TokenRow symbol="SOL" icon="◎" amount={balances.sol} usd={solUsd} />

        <View style={styles.actions}>
          <Action label="Send" icon="↗" onPress={() => navigation.navigate("Send")} />
          <Action label="Receive" icon="↙" onPress={() => navigation.navigate("Receive")} />
          <Action label="Stake" icon="⬡" onPress={() => navigation.navigate("Stake")} />
          <Action
            label="Buy"
            icon="＋"
            onPress={() => Linking.openURL(LINKS.buyRaydium)}
          />
        </View>

        <H2 style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Activity</H2>
        {activity.length === 0 ? (
          <Muted>No recent transactions.</Muted>
        ) : (
          activity.map((a) => (
            <TouchableOpacity
              key={a.signature}
              onPress={() => Linking.openURL(LINKS.explorerTx(a.signature))}
            >
              <View style={styles.activityRow}>
                <Body>{short(a.signature)}</Body>
                <Muted style={{ color: a.err ? colors.danger : colors.textSecondary }}>
                  {a.err ? "Failed" : a.time ? new Date(a.time * 1000).toLocaleDateString() : ""}
                </Muted>
              </View>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: spacing.lg }} />
        <Button title="Disconnect" variant="ghost" onPress={disconnect} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

function TokenRow({
  symbol,
  icon,
  amount,
  usd,
  note,
}: {
  symbol: string;
  icon: string;
  amount: number;
  usd: number | null;
  note?: string;
}) {
  return (
    <Card style={styles.tokenRow}>
      <View style={styles.tokenIcon}>
        <Body style={{ fontSize: 22, color: colors.cyan }}>{icon}</Body>
      </View>
      <View style={{ flex: 1 }}>
        <Body style={{ fontWeight: "700" }}>{symbol}</Body>
        {note ? <Muted>{note}</Muted> : <Muted>{usd != null ? `$${usd.toFixed(2)}` : "—"}</Muted>}
      </View>
      <Body style={{ fontWeight: "700" }}>
        {amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </Body>
    </Card>
  );
}

function Action({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.actionIcon}>
        <Body style={{ fontSize: 20, color: colors.cyan }}>{icon}</Body>
      </View>
      <Muted style={{ marginTop: 4 }}>{label}</Muted>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  hexLogo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  addrPill: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tokenRow: { flexDirection: "row", alignItems: "center" },
  tokenIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  action: { alignItems: "center", flex: 1 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
