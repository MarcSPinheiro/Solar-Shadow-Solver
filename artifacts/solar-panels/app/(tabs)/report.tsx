import React, { useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Feather, Ionicons } from "@expo/vector-icons";
import { InputField } from "@/components/InputField";
import Colors from "@/constants/colors";
import { useClient } from "@/context/ClientContext";
import { LogoMini } from "@/components/LogoMini";
import { useRoi } from "@/context/RoiContext";
import { useSolar } from "@/context/SolarContext";
import { generateAndSharePdf } from "@/utils/pdfGenerator";

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name={icon as any} size={20} color={Colors.light.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function StatusBadge({ hasData, label, tab }: { hasData: boolean; label: string; tab: string }) {
  return (
    <View style={[styles.badge, hasData ? styles.badgeOk : styles.badgeMissing]}>
      <Ionicons
        name={hasData ? "checkmark-circle" : "alert-circle-outline"}
        size={16}
        color={hasData ? "#22C55E" : "#F59E0B"}
      />
      <Text style={[styles.badgeText, hasData ? styles.badgeTextOk : styles.badgeTextMissing]}>
        {hasData ? `${label} incluído` : `${label} — calcule no separador "${tab}" primeiro`}
      </Text>
    </View>
  );
}

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const { client, updateClient } = useClient();
  const { params: roiParams, results: roiResults, hasBattery, orientation } = useRoi();
  const { params: solarParams, results: solarResults } = useSolar();

  const [generating, setGenerating] = useState(false);

  const hasSpacing = solarResults !== null;
  const hasRoi = roiResults !== null;

  const handleGenerate = async () => {
    if (!client.name.trim()) {
      Alert.alert("Campo obrigatório", "Por favor insira o nome do cliente antes de gerar o relatório.");
      return;
    }
    setGenerating(true);
    try {
      await generateAndSharePdf({
        client,
        solarParams: hasSpacing ? solarParams : null,
        solarResults,
        roiParams: hasRoi ? roiParams : null,
        roiResults,
        roiHasBattery: hasBattery,
        roiOrientation: orientation,
      });
    } catch (e: any) {
      Alert.alert("Erro", "Não foi possível gerar o relatório. Tente novamente.\n\n" + (e?.message ?? ""));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: bottomInset, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <LogoMini size={48} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Relatório para Cliente</Text>
          <Text style={styles.headerSub}>
            PDF profissional com cabeçalho da empresa e todos os estudos realizados
          </Text>
        </View>
      </View>

      {/* Data status */}
      <Section icon="database-check-outline" title="Dados incluídos no relatório">
        <StatusBadge hasData={hasSpacing} label="Estudo de dimensionamento" tab="Calcular" />
        <StatusBadge hasData={hasRoi} label="Análise de retorno (ROI)" tab="Retorno" />
        <View style={styles.infoBox}>
          <Feather name="info" size={14} color="#4A6072" />
          <Text style={styles.infoText}>
            O relatório inclui todos os dados já calculados. Pode gerar o PDF sem ter ambos os estudos.
          </Text>
        </View>
      </Section>

      {/* Client data */}
      <Section icon="account-tie-outline" title="Dados do Cliente">
        <InputField
          label="Nome / Empresa *"
          value={client.name}
          onChangeText={(v) => updateClient("name", v)}
          placeholder="Nome completo ou empresa"
          keyboardType="default"
        />
        <InputField
          label="Morada"
          value={client.address}
          onChangeText={(v) => updateClient("address", v)}
          placeholder="Rua, nº, código postal, localidade"
          keyboardType="default"
        />
        <InputField
          label="NIF"
          value={client.nif}
          onChangeText={(v) => updateClient("nif", v)}
          placeholder="Ex: 123456789"
          keyboardType="numeric"
        />
        <InputField
          label="Telefone"
          value={client.phone}
          onChangeText={(v) => updateClient("phone", v)}
          placeholder="Ex: 912 345 678"
          keyboardType="phone-pad"
        />
        <InputField
          label="E-mail"
          value={client.email}
          onChangeText={(v) => updateClient("email", v)}
          placeholder="cliente@email.com"
          keyboardType="email-address"
        />
        <InputField
          label="Notas / Observações"
          value={client.notes}
          onChangeText={(v) => updateClient("notes", v)}
          placeholder="Referências do projeto, condicionantes, etc."
          keyboardType="default"
        />
      </Section>

      {/* Company preview */}
      <Section icon="office-building-outline" title="Cabeçalho da empresa (pré-definido)">
        <View style={styles.companyCard}>
          <Text style={styles.companyName}>Pinheiro Instalações Eléctricas e Canalizações Unipessoal Lda</Text>
          <Text style={styles.companyDetail}>Quinta do Chão Grande nº78 Massarocas · 3660-409 São Pedro do Sul</Text>
          <Text style={styles.companyDetail}>NIF: 506505170 · Tel: 964 119 508</Text>
        </View>
      </Section>

      {/* Generate button */}
      <TouchableOpacity
        style={[styles.generateBtn, (!client.name.trim() || generating) && styles.generateBtnDisabled]}
        onPress={handleGenerate}
        disabled={generating || !client.name.trim()}
        activeOpacity={0.85}
      >
        {generating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <MaterialCommunityIcons name="file-pdf-box" size={24} color="#fff" />
        )}
        <Text style={styles.generateBtnText}>
          {generating ? "A gerar PDF…" : "Gerar e Partilhar Relatório PDF"}
        </Text>
      </TouchableOpacity>

      {!client.name.trim() && (
        <Text style={styles.requiredNote}>* Insira o nome do cliente para activar o botão</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 20,
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.light.text, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, color: Colors.light.textSecondary, marginTop: 4, fontFamily: "Inter_400Regular" },

  section: {
    backgroundColor: Colors.light.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 10,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "600", color: Colors.light.text, fontFamily: "Inter_600SemiBold" },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  badgeOk: { backgroundColor: "#F0FFF4", borderColor: "#86EFAC" },
  badgeMissing: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  badgeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  badgeTextOk: { color: "#166534" },
  badgeTextMissing: { color: "#92400E" },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 8,
    padding: 10,
  },
  infoText: { flex: 1, fontSize: 12, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular" },

  companyCard: {
    backgroundColor: Colors.light.primary + "12",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.light.primary + "30",
    gap: 3,
  },
  companyName: { fontSize: 13, fontWeight: "700", color: Colors.light.primary, fontFamily: "Inter_700Bold" },
  companyDetail: { fontSize: 12, color: Colors.light.textSecondary, fontFamily: "Inter_400Regular" },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 8,
    shadowColor: Colors.light.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  generateBtnDisabled: { opacity: 0.5 },
  generateBtnText: { fontSize: 16, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },

  requiredNote: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginBottom: 8,
    fontFamily: "Inter_400Regular",
  },
});
