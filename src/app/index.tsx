import { Redirect } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/state-store/store";
import { getUserCategoryName } from "@/constants/userCategories";

export default function IndexScreen() {
  const { isAuthenticated, sessionData } = useSelector(
    (state: RootState) => state.app,
  );

  // If authenticated, redirect to appropriate role-based screen
  if (isAuthenticated && sessionData) {
    // console.log("🏠 IndexScreen - Re-rendering with sessionData:", sessionData);
    // console.log("🏠 IndexScreen - isAuthenticated:", isAuthenticated);

    // Check for user_category first (new system), then fallback to user_role (legacy)
    // Handle both direct and nested data structures
    const userCategory =
      (sessionData as any)?.user_category ||
      (sessionData as any)?.data?.user_category;
    const userRole =
      (sessionData as any)?.user_role ||
      (sessionData as any)?.role ||
      (sessionData as any)?.data?.user_role ||
      (sessionData as any)?.data?.role;

    // console.log("🏠 IndexScreen - userCategory:", userCategory);
    // console.log("🏠 IndexScreen - userRole:", userRole);
    // console.log(
    //   "🏠 IndexScreen - Raw sessionData structure:",
    //   JSON.stringify(sessionData, null, 2)
    // );

    if (userCategory) {
      // New system: use user_category number to determine route
      const categoryName = getUserCategoryName(userCategory);
      // console.log(
      //   "IndexScreen - Redirecting to:",
      //   `/authenticated/${categoryName}`
      // );
      return <Redirect href={`/authenticated/${categoryName}`} />;
    } else if (userRole) {
      // Legacy system: use user_role string
      switch (userRole) {
        case "parent":
          return <Redirect href="/authenticated/parent" />;
        case "educator":
          return <Redirect href="/authenticated/educator" />;
        case "student":
          return <Redirect href="/authenticated/student" />;
        default:
          return <Redirect href="/authenticated/parent" />;
      }
    } else {
      // Fallback to parent if no role/category found
      return <Redirect href="/authenticated/parent" />;
    }
  }

  // If not authenticated, redirect to public area
  return <Redirect href="/public" />;
}
