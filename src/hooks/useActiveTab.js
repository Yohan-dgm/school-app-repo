import { usePathname } from "expo-router";
import { useSelector } from "react-redux";
import { USER_CATEGORIES } from "../constants/userCategories";

export const useActiveTab = () => {
  const pathname = usePathname();
  const { sessionData } = useSelector((state) => state.app);

  // Get user category from session data
  const userCategory =
    sessionData?.user_category || sessionData?.data?.user_category;

  // Map routes to tab IDs for different user categories
  const routeToTab = {
    // Parent routes
    "/authenticated/parent": "activityFeed",
    "/authenticated/parent/school-calendar": "schoolCalendar",
    "/authenticated/parent/student-growth": "studentGrowth",
    "/authenticated/parent/student-profile": "studentProfile",
    "/authenticated/parent/notifications": "notifications",

    // Educator routes
    "/authenticated/educator": "home",
    "/authenticated/educator/school-calendar": "schoolCalendar",
    "/authenticated/educator/user-actions": "userActions",
    "/authenticated/educator/notifications": "notifications",

    // Canteen routes
    "/authenticated/canteen": "canteen",
    "/authenticated/canteen/notifications": "notifications",

    // Sport Coach routes
    "/authenticated/sport_coach": "training",
    "/authenticated/sport_coach/training": "training",
    "/authenticated/sport_coach/matches": "matches",
    "/authenticated/sport_coach/players": "players",

    // Counselor routes
    "/authenticated/counselor": "sessions",
    "/authenticated/counselor/students": "students",
    "/authenticated/counselor/appointments": "appointments",
    "/authenticated/counselor/resources": "resources",

    // Principal routes
    "/authenticated/principal": "home",
    "/authenticated/principal/school-calendar": "schoolCalendar",
    "/authenticated/principal/dashboard": "dashboard",
    "/authenticated/principal/school-analysis": "schoolAnalysis",
    "/authenticated/principal/notifications": "notifications",

    // Admin routes
    "/authenticated/admin": "dashboard",
    "/authenticated/admin/users": "users",
    "/authenticated/admin/settings": "settings",
    "/authenticated/admin/reports": "reports",

    // Management routes
    "/authenticated/management": "analytics",
    "/authenticated/management/departments": "departments",
    "/authenticated/management/staff": "staff",
    "/authenticated/management/finance": "finance",

    // Legacy routes for backward compatibility
    "/authenticated/parent/school-life": "activityFeed",
    "/authenticated/parent/educator-feedback": "notifications",
    "/authenticated/parent/calendar": "schoolCalendar",
    "/authenticated/parent/academic": "studentGrowth",
    "/authenticated/parent/performance": "studentGrowth",
  };

  // Get the tab ID for the current route
  const tabId = routeToTab[pathname];

  if (tabId) {
    return tabId;
  }

  // Fallback based on user category
  switch (userCategory) {
    case USER_CATEGORIES.PARENT:
      return "activityFeed";
    case USER_CATEGORIES.EDUCATOR:
      return "home";
    case USER_CATEGORIES.SPORT_COACH:
      return "training";
    case USER_CATEGORIES.COUNSELOR:
      return "sessions";
    case USER_CATEGORIES.PRINCIPAL:
      return "home";
    case USER_CATEGORIES.ADMIN:
      return "dashboard";
    case USER_CATEGORIES.MANAGEMENT:
      return "analytics";
    case USER_CATEGORIES.CANTEEN:
      return "canteen";
    default:
      return "activityFeed";
  }
};

export default useActiveTab;
