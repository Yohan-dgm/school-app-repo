// Announcement Categories based on Communication Management API specification
export interface AnnouncementCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  {
    id: 1,
    name: "General",
    slug: "general",
    description: "General announcements and school-wide information",
    icon: "campaign",
    color: "#3b82f6",
    sort_order: 1,
    is_active: true,
  },
  {
    id: 2,
    name: "Academic",
    slug: "academic",
    description: "Academic-related announcements, curriculum updates",
    icon: "school",
    color: "#10b981",
    sort_order: 2,
    is_active: true,
  },
  {
    id: 3,
    name: "Events",
    slug: "events",
    description: "School events, activities, and calendar updates",
    icon: "event",
    color: "#f59e0b",
    sort_order: 3,
    is_active: true,
  },
  {
    id: 4,
    name: "Emergency",
    slug: "emergency",
    description: "Emergency alerts and urgent communications",
    icon: "warning",
    color: "#ef4444",
    sort_order: 4,
    is_active: true,
  },
  {
    id: 5,
    name: "Administrative",
    slug: "administrative",
    description: "Administrative updates and policy changes",
    icon: "admin-panel-settings",
    color: "#8b5cf6",
    sort_order: 5,
    is_active: true,
  },
  {
    id: 6,
    name: "Sports",
    slug: "sports",
    description: "Sports activities, tournaments, and athletic updates",
    icon: "sports",
    color: "#06b6d4",
    sort_order: 6,
    is_active: true,
  },
  {
    id: 7,
    name: "Health & Safety",
    slug: "health-safety",
    description:
      "Health guidelines, safety protocols, and wellness information",
    icon: "health-and-safety",
    color: "#84cc16",
    sort_order: 7,
    is_active: true,
  },
];

export const PRIORITY_LEVELS = [
  {
    value: 1,
    label: "Low",
    color: "#6b7280",
    description: "Standard announcements",
  },
  {
    value: 2,
    label: "Medium",
    color: "#f59e0b",
    description: "Important updates",
  },
  {
    value: 3,
    label: "High",
    color: "#ef4444",
    description: "Urgent announcements",
  },
] as const;

export const ANNOUNCEMENT_STATUS_OPTIONS = [
  // { value: "draft", label: "Draft", description: "Save without publishing" },
  {
    value: "published",
    label: "Publish Now",
    description: "Make visible immediately",
  },
  // {
  //   value: "scheduled",
  //   label: "Schedule",
  //   description: "Publish at specified time",
  // },
] as const;

export const TARGET_TYPES = [
  { value: "All", label: "All", description: "Everyone" },
  { value: "Educator", label: "Educator", description: "All educators" },
  { value: "Management", label: "Management", description: "School management" },
  { value: "Grade_Level", label: "Grade Level", description: "Specific grades" },
  { value: "Grade_Level_class", label: "Class", description: "Specific classes" },
  { value: "Primary", label: "Primary", description: "Primary section" },
  { value: "Secondary", label: "Secondary", description: "Secondary section" },
  { value: "Early_Years", label: "Early Years", description: "Early years section" },
  { value: "Student", label: "Student", description: "Individual students" },
] as const;

// Helper functions
export const getCategoryById = (
  id: number,
): AnnouncementCategory | undefined => {
  return ANNOUNCEMENT_CATEGORIES.find((cat) => cat.id === id);
};

export const getCategoryBySlug = (
  slug: string,
): AnnouncementCategory | undefined => {
  return ANNOUNCEMENT_CATEGORIES.find((cat) => cat.slug === slug);
};

export const getPriorityLevel = (level: number) => {
  return PRIORITY_LEVELS.find((p) => p.value === level);
};

export const getActiveCategoriesForUser = (
  userCategory: number,
): AnnouncementCategory[] => {
  // Return all categories for now, but this can be filtered based on user permissions
  return ANNOUNCEMENT_CATEGORIES.filter((cat) => cat.is_active);
};
