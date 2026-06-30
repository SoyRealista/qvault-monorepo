import React from "react";
import { View, StyleSheet, Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { useWallet } from "../state/WalletProvider";
import { Screen, Card, H2, Body, Muted, Button } from "../components/ui";
import { colors, spacing } from "../theme";

export default function ReceiveScreen() {
  const { publicKey } = useWallet();
  const addr = publicKey?.toBase58() ?? "";

  return (
    <Screen style={{ alignItems: "center" }}>
      <H2 style={{ marginVertical: spacing.md }}>Receive QVLT & SOL</H2>
      <Card style={styles.qrCard}>
        {addr ? (
          <QRCode value={addr} size={220} backgroundColor="#fff" color="#000" />
        ) : (
          <Muted>Connect a wallet first</Muted>
        )}
      </Card>
      <Muted style={{ marginTop: spacing.md, textAlign: "center" }}>Your wallet address</Muted>
      <Body style={styles.addr}>{addr}</Body>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: spacing.sm }}>
          <Button
            title="Copy"
            variant="secondary"
            onPress={() => Clipboard.setStringAsync(addr)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Share"
            onPress={() => Share.share({ message: addr })}
          />
        </View>
      </View>

      <Muted style={{ marginTop: spacing.lg, textAlign: "center" }}>
        Only send Solana (SPL) tokens to this address. Sending assets from other
        chains will result in permanent loss.
      </Muted>
    </Screen>
  );
}

const styles = StyleSheet.create({
  qrCard: {
    backgroundColor: "#fff",
    padding: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  addr: {
    fontSize: 13,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    color: colors.textSecondary,
  },
  row: { flexDirection: "row", marginTop: spacing.lg, width: "100%" },
});
