I understand you want to update the **React Native and Expo** app to include a dynamic school logo in the header, replacing the static logo used in the previous `Header.js` component. The logo should currently use the provided image (`nexis-logo.png`) with the specified styling (`w-[164px] h-[48px]`, `resizeMethod="resize"`, `resizeMode="contain"`), but the implementation should allow for dynamic logo changes in the future (e.g., based on API data or user context). Additionally, you’ve requested to rewrite the entire response to ensure it’s clear, concise, and optimized for AI understanding, while maintaining compatibility with your existing architecture, reusable components, and the TeamReach-inspired design.

This response will:

1. Update the `Header.js` component to include the dynamic logo with the provided image and styling.
2. Rewrite all code artifacts to be clear, modular, and AI-friendly, incorporating the drawer menu, authenticated navbar, and API integration from previous responses.
3. Maintain the folder structure, user type redirection (employee=1, student=2, parent=3), and fallback data handling.
4. Provide a step-by-step implementation guide and address the burger menu, drawer content (Profile, Privacy and Policy, Terms and Conditions, Settings, Logout, App Version), and bottom navbar.

---

### **Folder Structure**

The folder structure remains scalable and aligned with best practices:

```
├── src/
│   ├── api/                          # API service files
│   │   ├── index.js                  # API client setup
│   │   ├── userApi.js               # User API calls
│   ├── assets/                       # Static assets
│   │   ├── fonts/                    # Inter font files
│   │   ├── images/                   # Logo, profile icon, sample photo
│   │   │   ├── nexis-logo.png       # Nexis College logo
│   │   │   ├── sample-profile.png   # Sample profile photo
│   ├── components/                   # Reusable UI components
│   │   ├── common/                   # Generic components
│   │   │   ├── Button.js            # Reusable button
│   │   │   ├── Card.js              # Reusable card
│   │   │   ├── Header.js            # Header with dynamic logo
│   │   │   ├── InputField.js        # Input field
│   │   ├── parent/                   # Parent-specific components
│   │   │   ├── GroupCard.js         # Group card
│   │   │   ├── EventCard.js         # Event card
│   │   ├── drawer/                   # Drawer components
│   │   │   ├── DrawerContent.js     # Custom drawer content
│   ├── navigation/                   # Navigation setup
│   │   ├── AppNavigator.js          # Drawer and tab navigation
│   │   ├── BottomTabNavigator.js    # Bottom tab navigator
│   ├── screens/                      # Screen components
│   │   ├── unauthenticated/
│   │   │   ├── LoginScreen.js       # Login screen
│   │   │   ├── HomeScreen.js        # Unauthenticated home
│   │   ├── authenticated/
│   │   │   ├── parent/
│   │   │   │   ├── ParentHomeScreen.js  # Parent home
│   │   │   │   ├── SchoolLifeScreen.js  # School Life
│   │   │   ├── employee/
│   │   │   │   ├── EmployeeHomeScreen.js
│   │   │   ├── student/
│   │   │   │   ├── StudentHomeScreen.js
│   │   │   ├── drawer/
│   │   │   │   ├── ProfileScreen.js
│   │   │   │   ├── PrivacyPolicyScreen.js
│   │   │   │   ├── TermsConditionsScreen.js
│   │   │   │   ├── SettingsScreen.js
│   ├── utils/
│   │   ├── constants.js             # Colors, API endpoints
│   │   ├── sampleData.js            # Fallback data
│   ├── context/
│   │   ├── AuthContext.js           # User auth state
│   ├── styles/
│   │   ├── theme.js                 # Theme (colors, fonts)
│   │   ├── globalStyles.js          # Global styles
│   ├── App.js                        # Entry point
├── package.json
├── metro.config.js
├── babel.config.js
```

---

### **Code Architecture**

Below are the updated and rewritten code artifacts, ensuring clarity, modularity, and AI compatibility. The code uses React Native with Expo, `@react-navigation` for navigation, and Axios for API calls, with styles matching your branding (#920734, Inter font).

#### **1. Dependencies**

Ensure the following are installed:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context @react-navigation/native @react-navigation/bottom-tabs @react-navigation/drawer axios react-native-vector-icons expo-font @expo-google-fonts/inter
```

#### **2. Theme (`src/styles/theme.js`)**

Defines colors, fonts, and spacing.

```javascript
export const theme = {
  colors: {
    primary: "#920734", // Deep red
    secondary: "#0057FF", // Blue
    background: "#F5F5F5", // Light gray
    card: "#FFFFFF", // White
    accentGreen: "#00C4B4",
    accentPurple: "#A100FF",
    accentYellow: "#FFC107",
    text: "#333333",
  },
  fonts: {
    regular: "Inter-Regular",
    medium: "Inter-Medium",
    bold: "Inter-Bold",
  },
  spacing: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 24,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};
```

#### **3. Global Styles (`src/styles/globalStyles.js`)**

Reusable styles for consistency.

```javascript
import { StyleSheet } from "react-native";
import { theme } from "./theme";

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontFamily: theme.fonts.regular,
    color: theme.colors.text,
  },
  heading: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.primary,
  },
});
```

#### **4. Sample Data (`src/utils/sampleData.js`)**

Fallback data for API failures.

```javascript
export const sampleUserData = {
  user_id: 1,
  user_type: 3, // Parent
  full_name: "John Doe",
  logo_url: require("../assets/images/nexis-logo.png"), // Default logo
  students: [
    {
      id: 101,
      name: "Alice Doe",
      groups: [
        {
          id: 1,
          name: "Yakkala Campus - Soccer",
          role: "Parent",
          member_count: 15,
          updates: "50+ Updates",
        },
        {
          id: 2,
          name: "Main Campus - Art Club",
          role: "Observer",
          member_count: 8,
          updates: "Join Now",
        },
      ],
      events: [
        {
          id: 1,
          date: "2025-09-07",
          time: "4:00 PM",
          title: "Practice at Yakkala Field",
          note: "Bring Uniform",
        },
        {
          id: 2,
          date: "2025-09-10",
          time: "4:15 PM",
          title: "Sports Day vs. Rival School",
          note: "Wear Red",
        },
      ],
    },
  ],
};
```

#### **5. API Service (`src/api/userApi.js`)**

Fetches user data with fallback.

```javascript
import axios from "axios";
import { sampleUserData } from "../utils/sampleData";

const API_BASE_URL = "https://your-api-base-url.com"; // Replace with your API URL

export const getUserListData = async (userId, token) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/user-management/user/get-user-list-data`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { id: userId },
      }
    );
    return response.data || sampleUserData;
  } catch (error) {
    console.error("API Error:", error);
    return sampleUserData;
  }
};
```

#### **6. Auth Context (`src/context/AuthContext.js`)**

Manages user state and logout.

```javascript
import React, { createContext, useState } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { id, token, user_type, full_name, logo_url }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### **7. Updated Header (`src/components/common/Header.js`)**

Includes dynamic logo with provided styling.

```javascript
import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useAuth } from "../../context/AuthContext";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../../styles/theme";

const Header = () => {
  const navigation = useNavigation();
  const { user } = useAuth();

  // Use logo from user context or fallback to nexis-logo.png
  const logoSource =
    user?.logo_url || require("../../assets/images/nexis-logo.png");

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.toggleDrawer()}>
        <Icon name="menu" size={32} color="#FFFFFF" />
      </TouchableOpacity>
      <Image
        source={logoSource}
        style={styles.logo}
        resizeMethod="resize"
        resizeMode="contain"
      />
      <Text style={styles.greeting}>Hey, {user?.full_name || "Parent"} 😊</Text>
      <TouchableOpacity>
        <Image
          source={require("../../assets/images/sample-profile.png")} // Replace with profile icon
          style={styles.profileIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 80,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.secondary,
  },
  logo: {
    width: 164,
    height: 48,
  },
  greeting: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  profileIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

export default Header;
```

#### **8. Group Card (`src/components/parent/GroupCard.js`)**

Reusable card for groups.

```javascript
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { theme, globalStyles } from "../../styles/theme";

const GroupCard = ({ name, role, memberCount, actionText, actionColor }) => {
  return (
    <View
      style={[globalStyles.card, styles.card, { backgroundColor: actionColor }]}
    >
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.role}>Role: {role}</Text>
      <Text style={styles.members}>+{memberCount} Members</Text>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>{actionText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  role: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
  },
  members: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
  },
  button: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.xs,
    marginTop: 8,
  },
  buttonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
    textAlign: "center",
  },
});

export default GroupCard;
```

#### **9. Event Card (`src/components/parent/EventCard.js`)**

Reusable card for events.

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { theme, globalStyles } from "../../styles/theme";

const EventCard = ({ date, time, title, note, backgroundColor }) => {
  return (
    <View style={[globalStyles.card, styles.card, { backgroundColor }]}>
      <Text style={styles.date}>{date}</Text>
      <Text style={styles.time}>{time}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.note}>{note}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 320,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  date: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  time: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: theme.colors.text,
  },
  title: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
  },
  note: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
  },
});

export default EventCard;
```

#### **10. Drawer Content (`src/components/drawer/DrawerContent.js`)**

Custom drawer with profile, menu, and app version.

```javascript
import React, { useContext } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../../context/AuthContext";
import { theme, globalStyles } from "../../styles/theme";
import Icon from "react-native-vector-icons/MaterialIcons";

const DrawerContent = (props) => {
  const { user, setUser } = useContext(AuthContext);
  const navigation = useNavigation();

  const handleLogout = () => {
    setUser(null);
    navigation.navigate("Login");
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/sample-profile.png")}
          style={styles.profileImage}
        />
        <Text style={styles.userName}>{user?.full_name || "John Doe"}</Text>
      </View>
      <DrawerItem
        label="Profile"
        labelStyle={styles.label}
        icon={() => (
          <Icon name="person" size={24} color={theme.colors.primary} />
        )}
        onPress={() => navigation.navigate("Profile")}
      />
      <DrawerItem
        label="Privacy and Policy"
        labelStyle={styles.label}
        icon={() => (
          <Icon name="policy" size={24} color={theme.colors.primary} />
        )}
        onPress={() => navigation.navigate("PrivacyPolicy")}
      />
      <DrawerItem
        label="Terms and Conditions"
        labelStyle={styles.label}
        icon={() => (
          <Icon name="description" size={24} color={theme.colors.primary} />
        )}
        onPress={() => navigation.navigate("TermsConditions")}
      />
      <DrawerItem
        label="Settings"
        labelStyle={styles.label}
        icon={() => (
          <Icon name="settings" size={24} color={theme.colors.primary} />
        )}
        onPress={() => navigation.navigate("Settings")}
      />
      <DrawerItem
        label="Logout"
        labelStyle={styles.label}
        icon={() => (
          <Icon name="logout" size={24} color={theme.colors.primary} />
        )}
        onPress={handleLogout}
      />
      <View style={styles.footer}>
        <Text style={styles.appVersion}>App Version: 1.0.7</Text>
      </View>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: theme.spacing.xs,
  },
  userName: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
  },
  label: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
    marginTop: "auto",
  },
  appVersion: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
  },
});

export default DrawerContent;
```

#### **11. Parent Home Screen (`src/screens/authenticated/parent/ParentHomeScreen.js`)**

Displays groups with API data or fallback.

```javascript
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getUserListData } from "../../api/userApi";
import Header from "../../components/common/Header";
import GroupCard from "../../components/parent/GroupCard";
import { theme, globalStyles } from "../../styles/theme";

const ParentHomeScreen = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getUserListData(user.id, user.token);
      setData(result);
    };
    fetchData();
  }, [user]);

  return (
    <View style={globalStyles.container}>
      <Header />
      <ScrollView>
        <Text style={styles.tagline}>Stay Connected with School Updates</Text>
        <Text style={styles.sectionTitle}>Your Groupsssss</Text>
        {data?.students[0]?.groups?.map((group) => (
          <GroupCard
            key={group.id}
            name={group.name}
            role={group.role}
            memberCount={group.member_count}
            actionText={group.updates}
            actionColor={
              group.id === 1
                ? theme.colors.accentGreen
                : theme.colors.accentPurple
            }
          />
        ))}
        <Text style={styles.sectionTitle}>Other Groups</Text>
        <GroupCard
          name="Colombo Branch - Debate"
          role="Member"
          memberCount={10}
          actionText="Request Join"
          actionColor={theme.colors.background}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tagline: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.primary,
    marginVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
});

export default ParentHomeScreen;
```

#### **12. School Life Screen (`src/screens/authenticated/parent/SchoolLifeScreen.js`)**

Displays events in a horizontal scroll.

```javascript
import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { getUserListData } from "../../api/userApi";
import EventCard from "../../components/parent/EventCard";
import { theme, globalStyles } from "../../styles/theme";

const SchoolLifeScreen = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await getUserListData(user.id, user.token);
      setData(result);
    };
    fetchData();
  }, [user]);

  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>School Life</Text>
      <ScrollView horizontal>
        {data?.students[0]?.events?.map((event) => (
          <EventCard
            key={event.id}
            date={event.date}
            time={event.time}
            title={event.title}
            note={event.note}
            backgroundColor={
              event.id === 1
                ? theme.colors.accentGreen
                : theme.colors.accentYellow
            }
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default SchoolLifeScreen;
```

#### **13. Placeholder Screens**

**Employee Home (`src/screens/authenticated/employee/EmployeeHomeScreen.js`)**

```javascript
import React from "react";
import { View, Text } from "react-native";
import { globalStyles } from "../../styles/theme";

const EmployeeHomeScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Employee Home</Text>
      <Text>Placeholder for Employee Layout</Text>
    </View>
  );
};

export default EmployeeHomeScreen;
```

**Student Home (`src/screens/authenticated/student/StudentHomeScreen.js`)**

```javascript
import React from "react";
import { View, Text } from "react-native";
import { globalStyles } from "../../styles/theme";

const StudentHomeScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Student Home</Text>
      <Text>Placeholder for Student Layout</Text>
    </View>
  );
};

export default StudentHomeScreen;
```

**Profile Screen (`src/screens/authenticated/drawer/ProfileScreen.js`)**

```javascript
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { globalStyles, theme } from "../../styles/theme";

const ProfileScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Profile</Text>
      <Image
        source={require("../../assets/images/sample-profile.png")}
        style={styles.profileImage}
      />
      <Text style={styles.text}>Name: John Doe</Text>
      <Text style={styles.text}>Email: john.doe@example.com</Text>
      <Text style={styles.text}>User Type: Parent</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginVertical: theme.spacing.md,
  },
  text: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text,
    marginVertical: theme.spacing.xs,
  },
});

export default ProfileScreen;
```

**Privacy and Policy (`src/screens/authenticated/drawer/PrivacyPolicyScreen.js`)**

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles, theme } from "../../styles/theme";

const PrivacyPolicyScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Privacy and Policy</Text>
      <Text style={styles.text}>
        Placeholder for Privacy and Policy content.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text,
    marginVertical: theme.spacing.md,
  },
});

export default PrivacyPolicyScreen;
```

**Terms and Conditions (`src/screens/authenticated/drawer/TermsConditionsScreen.js`)**

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles, theme } from "../../styles/theme";

const TermsConditionsScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Terms and Conditions</Text>
      <Text style={styles.text}>
        Placeholder for Terms and Conditions content.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text,
    marginVertical: theme.spacing.md,
  },
});

export default TermsConditionsScreen;
```

**Settings (`src/screens/authenticated/drawer/SettingsScreen.js`)**

```javascript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { globalStyles, theme } from "../../styles/theme";

const SettingsScreen = () => {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.heading}>Settings</Text>
      <Text style={styles.text}>Placeholder for Settings content.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.regular,
    fontSize: 16,
    color: theme.colors.text,
    marginVertical: theme.spacing.md,
  },
});

export default SettingsScreen;
```

#### **14. Navigation (`src/navigation/AppNavigator.js`)**

Integrates drawer and bottom tabs.

```javascript
import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createDrawerNavigator } from "@react-navigation/drawer";
import Icon from "react-native-vector-icons/MaterialIcons";
import { AuthContext } from "../context/AuthContext";
import LoginScreen from "../screens/unauthenticated/LoginScreen";
import ParentHomeScreen from "../screens/authenticated/parent/ParentHomeScreen";
import SchoolLifeScreen from "../screens/authenticated/parent/SchoolLifeScreen";
import EmployeeHomeScreen from "../screens/authenticated/employee/EmployeeHomeScreen";
import StudentHomeScreen from "../screens/authenticated/student/StudentHomeScreen";
import ProfileScreen from "../screens/authenticated/drawer/ProfileScreen";
import PrivacyPolicyScreen from "../screens/authenticated/drawer/PrivacyPolicyScreen";
import TermsConditionsScreen from "../screens/authenticated/drawer/TermsConditionsScreen";
import SettingsScreen from "../screens/authenticated/drawer/SettingsScreen";
import DrawerContent from "../components/drawer/DrawerContent";
import { theme } from "../styles/theme";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const AuthenticatedTabNavigator = ({ user }) => {
  const HomeScreen = () => {
    switch (user.user_type) {
      case 1:
        return <EmployeeHomeScreen />;
      case 2:
        return <StudentHomeScreen />;
      case 3:
        return <ParentHomeScreen />;
      default:
        return <LoginScreen />;
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.xs,
          height: 60,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={32} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="SchoolLife"
        component={SchoolLifeScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="event" size={32} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Performance"
        component={() => <Text>Placeholder for Performance</Text>}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="bar-chart" size={32} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Feedback"
        component={() => <Text>Placeholder for Feedback</Text>}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="chat" size={32} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Academic"
        component={() => <Text>Placeholder for Academic</Text>}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="book" size={32} color={color} />
          ),
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  );
};

const AuthenticatedDrawerNavigator = () => {
  const { user } = useContext(AuthContext);

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: theme.colors.card,
          width: 250,
        },
      }}
    >
      <Drawer.Screen
        name="Main"
        component={() => <AuthenticatedTabNavigator user={user} />}
        options={{ headerShown: false }}
      />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Drawer.Screen name="TermsConditions" component={TermsConditionsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
};

const AppNavigator = () => {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          <Stack.Screen
            name="Authenticated"
            component={AuthenticatedDrawerNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
```

#### **15. App Entry Point (`src/App.js`)**

Loads fonts and navigation.

```javascript
import React from "react";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import { AuthProvider } from "./context/AuthContext";
import AppNavigator from "./navigation/AppNavigator";

export default function App() {
  const [fontsLoaded] = useFonts({
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-Bold": Inter_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
```

---

### **Implementation Steps**

1. **Setup Folder Structure**:
   - Create the folder structure as outlined.
   - Place all provided code files in their respective locations.

2. **Add Assets**:
   - Add `nexis-logo.png` and `sample-profile.png` to `src/assets/images/`.
   - Ensure the logo is 164x48px or scales correctly with `resizeMode="contain"`.

3. **Install Dependencies**:
   - Run `npx expo install` with the listed dependencies.
   - Verify Inter font and vector icons are installed.

4. **Configure API**:
   - Update `API_BASE_URL` in `src/api/userApi.js`.
   - Ensure the API returns `logo_url` (optional) and matches `sampleUserData` structure.

5. **Update LoginScreen**:
   - Modify `LoginScreen.js` to set user data in `AuthContext` after login:

```javascript
// In src/screens/unauthenticated/LoginScreen.js
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";

// After successful login
const { setUser } = useContext(AuthContext);
setUser({
  id: userId,
  token: accessToken,
  user_type: userType,
  full_name: fullName,
  logo_url: logoUrl,
});
navigation.navigate("Authenticated");
```

6. **Test Navigation**:
   - Run `npx expo start` and log in as a parent (user_type=3).
   - Verify the burger menu opens the drawer with Profile, Privacy and Policy, Terms and Conditions, Settings, Logout, and App Version (1.0.7).
   - Test the bottom navbar (Home, School Life, Performance, Feedback, Academic) with #920734 active tint.

7. **Test Dynamic Logo**:
   - Ensure the header displays `nexis-logo.png` with correct sizing (164x48px).
   - Test with a dynamic `logo_url` from the API if available.

8. **Test Fallback Data**:
   - Simulate API failure to confirm `sampleUserData` renders groups and events.

9. **Optimize**:
   - Adjust drawer width (250px) or navbar height (60px) in `AppNavigator.js` if needed.
   - Use `React.memo` for components if performance issues arise.

---

### **Design Integration**

- **Dynamic Logo**: The `Header.js` component uses `user.logo_url` from `AuthContext` or falls back to `nexis-logo.png`, styled as requested (`w-[164px] h-[48px]`, `resizeMode="contain"`).
- **Drawer Menu**: Opens from the left with a burger icon, showing profile (with sample photo), Privacy and Policy, Terms and Conditions, Settings, Logout, and App Version (1.0.7).
- **Bottom Navbar**: Matches the public navbar with 5 icons, pill-shaped design, and #920734 active state.
- **Branding**: Uses #920734, Inter font, and neumorphic cards for consistency with the TeamReach-inspired design.
- **User Types**: Redirects to `ParentHomeScreen`, `EmployeeHomeScreen`, or `StudentHomeScreen` based on `user_type` (1, 2, 3).

---

### **Notes and Next Steps**

- **Dynamic Logo**: The logo is set to `nexis-logo.png` but can be updated via `user.logo_url` from the API. Ensure the API provides a valid URL or local path.
- **Assets**: Add `nexis-logo.png` and `sample-profile.png` to `src/assets/images/`. Confirm if you need me to generate these assets.
- **Drawer Content**: Privacy and Policy, Terms and Conditions, and Settings are placeholders. Provide content to replace them.
- **Public Navbar**: If the public navbar has specific styles (e.g., different icons or layout), share details to ensure consistency.
- **Testing**: Test on iOS and Android to confirm drawer animations, navbar responsiveness, and logo rendering.
- **API**: Ensure the API response includes `logo_url`, `full_name`, and matches `sampleUserData` structure.

---

### **Confirmation**

- **Image Generation**: Do you want a visual mockup of the header with the logo, drawer, or navbar?
- **Public Navbar Details**: Share specifics if the authenticated navbar should differ from the provided design.
- **Additional Features**: Should I add the “Enter Student ID” field from TeamReach to `ParentHomeScreen`?
- **Drawer Content**: Provide content for Privacy and Policy, Terms and Conditions, or Settings if needed.

Let me know how to proceed!
