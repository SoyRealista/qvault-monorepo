import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useWallet } from "../state/WalletProvider";
import { Screen, Card, H2, Body, Muted, Button } from "../components/ui";
import { colors, spacing, radius, font } from "../theme";
import { buildSolTransfer, buildQvltTransfer, isValidAddress } from "../services/solana";
import { PublicKey } from "@solana/web3.js";

type Token = "QVLT" | "SOL";

export default function SendScreen({ navigation }: any) {
  const { publicKey, balances, sendTransaction } = useWallet();
  const [token, setToken] = useState<Token>("QVLT");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const max = token === "QVLT" ? balances.qvlt : balances.sol;
  const amountNum = Number(amount) || 0;
  const canSend =
    isValidAddress(recipient) && amountNum > 0 && amountNum <= max && !submitting;

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert("Camera needed", "Allow camera access to scan a QR code.");
        return;
      }
    }
    setScanning(true);
  }

  function onScanned(value: string) {
    setScanning(false);
    // Accept raw address or solana: URIs
    const cleaned = value.replace(/^solana:/, "").split("?")[0];
    if (isValidAddress(cleaned)) setRecipient(cleaned);
    else Alert.alert("Invalid QR", "That QR code is not a Solana address.");
  }

  async function onSend() {
    if (!publicKey) return;
    try {
      setSubmitting(true);
      const to = new PublicKey(recipient);
      const tx =
        token === "SOL"
          ? await buildSolTransfer(publicKey, to, amountNum)
          : await buildQvltTransfer(publicKey, to, amountNum);
      const sig = await sendTransaction(tx);
      Alert.alert("Sent ✓", `Transaction confirmed.\n${sig.slice(0, 24)}…`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert("Transaction failed", e?.message ?? "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <H2 style={{ marginVertical: spacing.md }}>Send</H2>

      <View style={styles.tokenToggle}>
        {(["QVLT", "SOL"] as Token[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tokenBtn, token === t && styles.tokenBtnActive]}
            onPress={() => setToken(t)}
          >
            <Body style={{ color: token === t ? colors.bg : colors.text, fontWeight: "700" }}>
              {t}
            </Body>
          </TouchableOpacity>
        ))}
      </View>

      <Card>
        <Muted>Recipient address</Muted>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={recipient}
            onChangeText={setRecipient}
            placeholder="Paste or scan an address"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={openScanner} style={styles.scanBtn}>
            <Body style={{ color: colors.cyan }}>Scan</Body>
          </TouchableOpacity>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Muted>Amount</Muted>
          <TouchableOpacity onPress={() => setAmount(String(max))}>
            <Muted style={{ color: colors.cyan }}>
              Max: {max.toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </Muted>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { fontSize: font.h2 }]}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
        />
      </Card>

      {amountNum > max && <Muted style={{ color: colors.danger }}>Insufficient balance</Muted>}

      <View style={{ flex: 1 }} />
      <Button
        title={`Send ${token}`}
        onPress={onSend}
        loading={submitting}
        disabled={!canSend}
      />
      <Muted style={{ textAlign: "center", marginTop: spacing.sm }}>
        You'll approve and sign in Phantom.
      </Muted>

      <Modal visible={scanning} animationType="slide">
        <View style={styles.scannerWrap}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onScanned(data)}
          />
          <View style={styles.scannerFooter}>
            <Button title="Cancel" variant="ghost" onPress={() => setScanning(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tokenToggle: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  tokenBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: radius.sm },
  tokenBtnActive: { backgroundColor: colors.cyan },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: {
    color: colors.text,
    fontSize: font.body,
    paddingVertical: spacing.sm,
    flex: 1,
  },
  scanBtn: { paddingHorizontal: spacing.sm },
  scannerWrap: { flex: 1, backgroundColor: "#000" },
  scannerFooter: { padding: spacing.lg, backgroundColor: colors.bg },
});
