import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { theme } from "../../../styles/theme";

interface AllBadgesDrawerProps {
  onClose: () => void;
}

const AllBadgesDrawer: React.FC<AllBadgesDrawerProps> = ({ onClose }) => {
  // All 14 badges from assets folder
  const allBadges = [
    {
      id: 1,
      title: "Best Attendance Award",
      image: require("../../../assets/Badges/Best Attendance Award.png"),
    },
    {
      id: 2,
      title: "Best Communicator",
      image: require("../../../assets/Badges/Best Communicator.png"),
    },
    {
      id: 3,
      title: "Best Leadership Award",
      image: require("../../../assets/Badges/Best Leadership Award.png"),
    },
    {
      id: 4,
      title: "Best Role Model",
      image: require("../../../assets/Badges/Best Role Model.png"),
    },
    {
      id: 5,
      title: "Best Team Player",
      image: require("../../../assets/Badges/Best Team Player.png"),
    },
    {
      id: 6,
      title: "Creativity Award",
      image: require("../../../assets/Badges/Creativity Award.png"),
    },
    {
      id: 7,
      title: "Hardworking Award",
      image: require("../../../assets/Badges/Hardworking Award.png"),
    },
    {
      id: 8,
      title: "Helping Hand",
      image: require("../../../assets/Badges/Helping Hand.png"),
    },
    {
      id: 9,
      title: "Kindness Award",
      image: require("../../../assets/Badges/Kindness Award.png"),
    },
    {
      id: 10,
      title: "Leadership",
      image: require("../../../assets/Badges/Leadership.png"),
    },
    {
      id: 11,
      title: "Most Responsible Student",
      image: require("../../../assets/Badges/Most Responsible Student.png"),
    },
    {
      id: 12,
      title: "Perseverance Award",
      image: require("../../../assets/Badges/Perseverance Award.png"),
    },
    {
      id: 13,
      title: "Positive Attitude Award",
      image: require("../../../assets/Badges/Positive Attitude Award.png"),
    },
    {
      id: 14,
      title: "Athletic Star",
      image: require("../../../assets/Badges/athletic star.png"),
    },
    {
      id: 15,
      title: "High Flyer in Sport",
      image: require("../../../assets/Badges/High flyer in sport.png"),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <MaterialIcons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Available Badges</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.badgesContainer}>
          <Text style={styles.sectionTitle}>Badge Collection</Text>
          <Text style={styles.sectionSubtitle}>
            All {allBadges.length} badges available in the system
          </Text>

          <View style={styles.badgesGrid}>
            {allBadges.map((badge) => (
              <View key={badge.id} style={styles.badgeCard}>
                <View style={styles.badgeImageContainer}>
                  <Image
                    source={badge.image}
                    style={styles.badgeImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.badgeTitle} numberOfLines={2}>
                  {badge.title}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Achievement System</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#920734",
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  badgesContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 8,
    textAlign: "center",
  },
  sectionSubtitle: {
    fontSize: 16,
    color: "#666666",
    marginBottom: 24,
    textAlign: "center",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  badgeCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeImageContainer: {
    width: 60,
    height: 60,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeImage: {
    width: 60,
    height: 60,
  },
  badgeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
    textAlign: "center",
    lineHeight: 18,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 14,
    color: "#999999",
  },
});

export default AllBadgesDrawer;
