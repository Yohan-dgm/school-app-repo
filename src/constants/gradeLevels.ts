/**
 * STATIC GRADE LEVELS CONSTANT
 *
 * This file defines all grade levels for the school system.
 * These grades never change and include EY1-EY3 and Grades 1-12 (IDs 1-15).
 *
 * Using static data instead of API calls for performance and reliability.
 */

export interface GradeLevel {
  id: number;
  name: string;
  display_name: string;
  category: "early_years" | "primary" | "secondary";
  order: number;
}

export const GRADE_LEVELS: GradeLevel[] = [
  // Early Years (IDs 1-3)

  // Primary Grades (IDs 1-5)
  {
    id: 1,
    name: "Grade 1",
    display_name: "Grade 1",
    category: "primary",
    order: 1,
  },
  {
    id: 2,
    name: "Grade 2",
    display_name: "Grade 2",
    category: "primary",
    order: 2,
  },
  {
    id: 3,
    name: "Grade 3",
    display_name: "Grade 3",
    category: "primary",
    order: 3,
  },
  {
    id: 4,
    name: "Grade 4",
    display_name: "Grade 4",
    category: "primary",
    order: 4,
  },
  {
    id: 5,
    name: "Grade 5",
    display_name: "Grade 5",
    category: "primary",
    order: 5,
  },
  // Secondary Grades (IDs 6-12)
  {
    id: 6,
    name: "Grade 6",
    display_name: "Grade 6",
    category: "secondary",
    order: 6,
  },
  {
    id: 7,
    name: "Grade 7",
    display_name: "Grade 7",
    category: "secondary",
    order: 7,
  },
  {
    id: 8,
    name: "Grade 8",
    display_name: "Grade 8",
    category: "secondary",
    order: 8,
  },
  {
    id: 9,
    name: "Grade 9",
    display_name: "Grade 9",
    category: "secondary",
    order: 9,
  },
  {
    id: 10,
    name: "Grade 10",
    display_name: "Grade 10",
    category: "secondary",
    order: 10,
  },
  {
    id: 11,
    name: "Grade 11",
    display_name: "Grade 11",
    category: "secondary",
    order: 11,
  },
  {
    id: 12,
    name: "Grade 12",
    display_name: "Grade 12",
    category: "secondary",
    order: 12,
  },
  {
    id: 13,
    name: "EY1",
    display_name: "Early Years 1",
    category: "early_years",
    order: 13,
  },
  {
    id: 14,
    name: "EY2",
    display_name: "Early Years 2",
    category: "early_years",
    order: 14,
  },
  {
    id: 15,
    name: "EY3",
    display_name: "Early Years 3",
    category: "early_years",
    order: 15,
  },
];

/**
 * Utility functions for working with grade levels
 */

// Get grade by ID
export const getGradeLevelById = (id: number): GradeLevel | undefined => {
  return GRADE_LEVELS.find((grade) => grade.id === id);
};

// Get grades by category
export const getGradesByCategory = (
  category: "early_years" | "primary" | "secondary",
): GradeLevel[] => {
  return GRADE_LEVELS.filter((grade) => grade.category === category);
};

// Get all grade IDs as array
export const getAllGradeIds = (): number[] => {
  return GRADE_LEVELS.map((grade) => grade.id);
};

// Get grade name by ID
export const getGradeNameById = (id: number): string => {
  const grade = getGradeLevelById(id);
  return grade ? grade.name : "Unknown Grade";
};

// Get grade display name by ID
export const getGradeDisplayNameById = (id: number): string => {
  const grade = getGradeLevelById(id);
  return grade ? grade.display_name : "Unknown Grade";
};

// Check if grade ID is valid
export const isValidGradeId = (id: number): boolean => {
  return getAllGradeIds().includes(id);
};

// Get category API endpoint for a grade ID
export const getCategoryApiForGrade = (gradeId: number): string | null => {
  const grade = getGradeLevelById(gradeId);
  if (!grade) return null;
  
  switch (grade.category) {
    case "early_years":
      return "ey";
    case "primary":
      return "pr";
    case "secondary":
      return "sc";
    default:
      return null;
  }
};

// Get category section name for display
export const getCategorySectionName = (gradeId: number): string => {
  const grade = getGradeLevelById(gradeId);
  if (!grade) return "Unknown";
  
  switch (grade.category) {
    case "early_years":
      return "Early Years";
    case "primary":
      return "Primary";
    case "secondary":
      return "Secondary";
    default:
      return "Unknown";
  }
};

// Check if a grade belongs to a specific section
export const isGradeInSection = (gradeId: number, section: "early_years" | "primary" | "secondary"): boolean => {
  const grade = getGradeLevelById(gradeId);
  return grade?.category === section;
};

// Default export for convenience
export default GRADE_LEVELS;
