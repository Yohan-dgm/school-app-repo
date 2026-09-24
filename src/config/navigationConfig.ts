import { USER_CATEGORIES } from "../constants/userCategories";

export interface NavigationTab {
  id: string;
  icon: string;
  iconFamily: "MaterialIcons" | "MaterialCommunityIcons";
  title: string;
  route: string;
}

export interface NavigationConfig {
  tabs: NavigationTab[];
  defaultTab: string;
}

// Parent Navigation Configuration
const PARENT_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "studentGrowth",
      icon: "trending-up",
      iconFamily: "MaterialIcons",
      title: "Student Growth",
      route: "student-growth",
    },
    {
      id: "studentProfile",
      icon: "person",
      iconFamily: "MaterialIcons",
      title: "Student Profile",
      route: "student-profile",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Educator Navigation Configuration
const EDUCATOR_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "home",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Home",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications",
      route: "notifications",
    },
  ],
  defaultTab: "home",
};

// Senior Management Navigation Configuration
const SENIOR_MANAGEMENT_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "strategicPlanning",
      icon: "trending-up",
      iconFamily: "MaterialIcons",
      title: "Strategic",
      route: "strategic-planning",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Principal Navigation Configuration
const PRINCIPAL_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "home",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Home",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "dashboard",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "Dashboard",
      route: "dashboard",
    },
    {
      id: "schoolAnalysis",
      icon: "analytics",
      iconFamily: "MaterialIcons",
      title: "School Analysis",
      route: "school-analysis",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "home",
};

// Management Navigation Configuration
const MANAGEMENT_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "departments",
      icon: "business",
      iconFamily: "MaterialIcons",
      title: "Departments",
      route: "departments",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Admin Navigation Configuration
const ADMIN_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "users",
      icon: "people",
      iconFamily: "MaterialIcons",
      title: "Users",
      route: "users",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Sport Coach Navigation Configuration
const SPORT_COACH_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "training",
      icon: "fitness-center",
      iconFamily: "MaterialIcons",
      title: "Training",
      route: "training",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Counselor Navigation Configuration
const COUNSELOR_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "appointments",
      icon: "schedule",
      iconFamily: "MaterialIcons",
      title: "Appointments",
      route: "appointments",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Student Navigation Configuration
const STUDENT_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "assignments",
      icon: "assignment",
      iconFamily: "MaterialIcons",
      title: "Assignments",
      route: "assignments",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Toyar Team Navigation Configuration
const TOYAR_TEAM_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "systemMonitoring",
      icon: "computer",
      iconFamily: "MaterialIcons",
      title: "System",
      route: "system-monitoring",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Security Navigation Configuration
const SECURITY_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "activityFeed",
      icon: "home",
      iconFamily: "MaterialIcons",
      title: "Activity Feed",
      route: "index",
    },
    {
      id: "schoolCalendar",
      icon: "calendar-today",
      iconFamily: "MaterialIcons",
      title: "School Calendar",
      route: "school-calendar",
    },
    {
      id: "incidentReports",
      icon: "security",
      iconFamily: "MaterialIcons",
      title: "Incidents",
      route: "incident-reports",
    },
    {
      id: "userActions",
      icon: "dashboard",
      iconFamily: "MaterialIcons",
      title: "User Actions",
      route: "user-actions",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "activityFeed",
};

// Canteen Navigation Configuration - restricted to just the canteen
// management screen plus notifications; canteen-role users don't get the
// rest of the generic dashboard tabs other categories see.
const CANTEEN_NAVIGATION: NavigationConfig = {
  tabs: [
    {
      id: "canteen",
      icon: "restaurant",
      iconFamily: "MaterialIcons",
      title: "Canteen",
      route: "index",
    },
    {
      id: "notifications",
      icon: "notifications",
      iconFamily: "MaterialIcons",
      title: "Notifications & Messages",
      route: "notifications",
    },
  ],
  defaultTab: "canteen",
};

// Navigation Configuration Map
export const NAVIGATION_CONFIGS: Record<number, NavigationConfig> = {
  [USER_CATEGORIES.PARENT]: PARENT_NAVIGATION,
  [USER_CATEGORIES.EDUCATOR]: EDUCATOR_NAVIGATION,
  [USER_CATEGORIES.SENIOR_MANAGEMENT]: SENIOR_MANAGEMENT_NAVIGATION,
  [USER_CATEGORIES.PRINCIPAL]: PRINCIPAL_NAVIGATION,
  [USER_CATEGORIES.MANAGEMENT]: MANAGEMENT_NAVIGATION,
  [USER_CATEGORIES.ADMIN]: ADMIN_NAVIGATION,
  [USER_CATEGORIES.SPORT_COACH]: SPORT_COACH_NAVIGATION,
  [USER_CATEGORIES.COUNSELOR]: COUNSELOR_NAVIGATION,
  [USER_CATEGORIES.STUDENT]: STUDENT_NAVIGATION,
  [USER_CATEGORIES.TOYAR_TEAM]: TOYAR_TEAM_NAVIGATION,
  [USER_CATEGORIES.SECURITY]: SECURITY_NAVIGATION,
  [USER_CATEGORIES.CANTEEN]: CANTEEN_NAVIGATION,
};

// Helper function to get navigation config for user category
export const getNavigationConfig = (userCategory: number): NavigationConfig => {
  return NAVIGATION_CONFIGS[userCategory] || PARENT_NAVIGATION;
};
