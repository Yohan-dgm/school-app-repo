import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { modernColors, maroonTheme } from "../../data/studentGrowthData";

// Academic year utility function
const getAcademicYearDisplay = (year: number) => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 8 = September)
  const currentYear = currentDate.getFullYear();

  // For the current year, check if we're in academic year or previous academic year
  if (year === currentYear) {
    if (currentMonth >= 8) {
      // September or later (month 8+)
      return `${year}/${String(year + 1).slice(-2)}`;
    } else {
      // Before September
      return `${year - 1}/${String(year).slice(-2)}`;
    }
  } else {
    // For other years, assume it's the start of that academic year
    return `${year}/${String(year + 1).slice(-2)}`;
  }
};

interface YearSelectorProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
  disabled?: boolean;
}

const YearSelector: React.FC<YearSelectorProps> = ({
  selectedYear,
  onYearChange,
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Generate last 5 years dynamically
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, index) => currentYear - index);

  console.log("📅 YearSelector - Available years:", years);
  console.log("📅 YearSelector - Selected year:", selectedYear);

  const handleYearPress = () => {
    if (!disabled) {
      setModalVisible(true);
    }
  };

  const handleYearSelect = (year: number) => {
    onYearChange(year);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Academic Years</Text>

      {/* Selected Year Display */}
      <TouchableOpacity
        style={[styles.selectorButton, disabled && styles.disabled]}
        onPress={handleYearPress}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={styles.selectedYearText}>
          {getAcademicYearDisplay(selectedYear)}
        </Text>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={modernColors.textSecondary}
        />
      </TouchableOpacity>

      {/* Year Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Academic Year</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={modernColors.text}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {Platform.OS === "ios" ? (
                <Picker
                  selectedValue={selectedYear}
                  onValueChange={handleYearSelect}
                  style={styles.picker}
                  itemStyle={styles.pickerItem}
                >
                  {years.map((year) => (
                    <Picker.Item
                      key={year}
                      label={getAcademicYearDisplay(year)}
                      value={year}
                    />
                  ))}
                </Picker>
              ) : (
                <View style={styles.androidYearList}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        year === selectedYear && styles.selectedYearOption,
                      ]}
                      onPress={() => handleYearSelect(year)}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          year === selectedYear &&
                            styles.selectedYearOptionText,
                        ]}
                      >
                        {getAcademicYearDisplay(year)}
                      </Text>
                      {year === selectedYear && (
                        <MaterialIcons
                          name="check"
                          size={20}
                          color={maroonTheme.primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: modernColors.text,
    marginBottom: 8,
    marginLeft: 4,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: modernColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedYearText: {
    fontSize: 16,
    fontWeight: "600",
    color: modernColors.text,
  },
  disabled: {
    opacity: 0.5,
    backgroundColor: modernColors.backgroundSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: modernColors.surface,
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.text,
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    minHeight: 200,
  },
  picker: {
    height: 200,
    color: modernColors.text,
  },
  pickerItem: {
    fontSize: 18,
    color: modernColors.text,
    fontWeight: "500",
  },
  androidYearList: {
    paddingVertical: 10,
  },
  yearOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginVertical: 2,
    backgroundColor: "transparent",
  },
  selectedYearOption: {
    backgroundColor: maroonTheme.primary + "15",
    borderWidth: 1,
    borderColor: maroonTheme.primary + "30",
  },
  yearOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: modernColors.text,
  },
  selectedYearOptionText: {
    color: maroonTheme.primary,
    fontWeight: "700",
  },
});

export default YearSelector;
