import { createSlice } from "@reduxjs/toolkit";
import { createSelector } from "reselect";
import { RootState } from "../../store";
import {
  UnifiedCalendarItem,
  transformEventToCalendarItem,
  transformHolidayToCalendarItem,
  transformSpecialClassToCalendarItem,
  transformExamToCalendarItem,
} from "../../../api/calendar-api";

interface CalendarState {
  selectedDate: string;
  calendarViewMode: "day" | "month";
  selectedMonth: number;
  selectedYear: number;
  compactMode: boolean;
  isCalendarExpanded: boolean;
  allEvents: UnifiedCalendarItem[];
  lastFetched: string | null;
}

const initialState: CalendarState = {
  selectedDate: new Date().toISOString().split("T")[0],
  calendarViewMode: "day",
  selectedMonth: new Date().getMonth(),
  selectedYear: new Date().getFullYear(),
  compactMode: true,
  isCalendarExpanded: true,
  allEvents: [],
  lastFetched: null,
};

const calendarSlice = createSlice({
  name: "calendar",
  initialState,
  reducers: {
    setSelectedDate: (state, action) => {
      state.selectedDate = action.payload;
    },
    setCalendarViewMode: (state, action) => {
      state.calendarViewMode = action.payload;
    },
    setSelectedMonth: (state, action) => {
      state.selectedMonth = action.payload;
    },
    setSelectedYear: (state, action) => {
      state.selectedYear = action.payload;
    },
    setCompactMode: (state, action) => {
      state.compactMode = action.payload;
    },
    setCalendarExpanded: (state, action) => {
      state.isCalendarExpanded = action.payload;
    },
    updateAllEvents: (state, action) => {
      state.allEvents = action.payload;
      state.lastFetched = new Date().toISOString();
    },
    clearCalendarData: (state) => {
      state.allEvents = [];
      state.lastFetched = null;
    },
  },
});

export const {
  setSelectedDate,
  setCalendarViewMode,
  setSelectedMonth,
  setSelectedYear,
  setCompactMode,
  setCalendarExpanded,
  updateAllEvents,
  clearCalendarData,
} = calendarSlice.actions;

// Selectors with migration support
export const selectSelectedDate = (state: RootState) => {
  if (!state.calendar) return new Date().toISOString().split("T")[0];
  return state.calendar.selectedDate || new Date().toISOString().split("T")[0];
};

export const selectCalendarViewMode = (state: RootState) => {
  if (!state.calendar) return "day";
  return state.calendar.calendarViewMode || "day";
};

export const selectSelectedMonth = (state: RootState) => {
  if (!state.calendar) return new Date().getMonth();
  return state.calendar.selectedMonth || new Date().getMonth();
};

export const selectSelectedYear = (state: RootState) => {
  if (!state.calendar) return new Date().getFullYear();
  return state.calendar.selectedYear || new Date().getFullYear();
};

export const selectCompactMode = (state: RootState) => {
  if (!state.calendar) return true;
  return state.calendar.compactMode !== undefined
    ? state.calendar.compactMode
    : true;
};

export const selectIsCalendarExpanded = (state: RootState) => {
  if (!state.calendar) return true;
  return state.calendar.isCalendarExpanded !== undefined
    ? state.calendar.isCalendarExpanded
    : true;
};

export const selectAllEvents = (state: RootState) => {
  if (!state.calendar) return [];
  return state.calendar.allEvents || [];
};

export const selectLastFetched = (state: RootState) => {
  if (!state.calendar) return null;
  return state.calendar.lastFetched || null;
};

// Helper selectors for different event types
export const selectEventsByType = (
  state: RootState,
  type: "event" | "holiday" | "special_class" | "exam",
) => state.calendar?.allEvents?.filter((item) => item.type === type) || [];

export const selectEventsByDate = (state: RootState, date: string) =>
  state.calendar?.allEvents?.filter((item) => {
    // For single-day events, check exact date match
    if (!item.startDate && !item.endDate) {
      return item.date === date;
    }

    // For multi-day events (like exams), check if date falls within range
    if (item.startDate && item.endDate) {
      return date >= item.startDate && date <= item.endDate;
    }

    // Fallback to primary date
    return item.date === date;
  }) || [];

export const selectEventsForMonth = (
  state: RootState,
  year: number,
  month: number,
) => {
  const monthStr = (month + 1).toString().padStart(2, "0");
  const yearStr = year.toString();
  const monthPrefix = `${yearStr}-${monthStr}`;

  return (
    state.calendar?.allEvents?.filter((item) => {
      // Check if any date (primary, start, or end) falls in the specified month
      const dates = [item.date, item.startDate, item.endDate].filter(Boolean);
      return dates.some((date) => date?.startsWith(monthPrefix));
    }) || []
  );
};

// Calendar markings for react-native-calendars
export const selectCalendarMarkings = (state: RootState) => {
  const markings: { [date: string]: any } = {};

  if (!state.calendar?.allEvents) {
    return markings;
  }

  state.calendar.allEvents.forEach((item) => {
    const dates: string[] = [];

    // For multi-day events, mark all dates in the range
    if (item.startDate && item.endDate && item.startDate !== item.endDate) {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split("T")[0]);
      }
    } else {
      // Single day event
      dates.push(item.date);
    }

    dates.forEach((date) => {
      if (!markings[date]) {
        markings[date] = { dots: [] };
      }

      // Add a colored dot for each event type
      const color = getEventTypeColor(item.type);
      if (!markings[date].dots.find((dot: any) => dot.color === color)) {
        markings[date].dots.push({ color });
      }
    });
  });

  return markings;
};

// Helper function to get color for event type
const getEventTypeColor = (
  type: "event" | "holiday" | "special_class" | "exam",
) => {
  switch (type) {
    case "event":
      return "#007AFF"; // Blue
    case "holiday":
      return "#FF3B30"; // Red
    case "special_class":
      return "#34C759"; // Green
    case "exam":
      return "#FF9500"; // Orange
    default:
      return "#8E8E93"; // Gray
  }
};

// Utility functions for components to transform and merge API data
export const mergeCalendarData = (
  events: any[] = [],
  holidays: any[] = [],
  specialClasses: any[] = [],
  exams: any[] = [],
): UnifiedCalendarItem[] => {
  const transformedEvents = events.map(transformEventToCalendarItem);
  const transformedHolidays = holidays.map(transformHolidayToCalendarItem);
  const transformedSpecialClasses = specialClasses.map(
    transformSpecialClassToCalendarItem,
  );
  const transformedExams = exams.map(transformExamToCalendarItem);

  return [
    ...transformedEvents,
    ...transformedHolidays,
    ...transformedSpecialClasses,
    ...transformedExams,
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Memoized selectors to prevent unnecessary re-renders
const selectCalendarState = (state: RootState) => state.calendar;

export const selectEventsByDateMemoized = createSelector(
  [selectCalendarState, (_: RootState, date: string) => date],
  (calendarState, date) => {
    if (!calendarState?.allEvents) return [];
    return calendarState.allEvents.filter((item) => {
      if (!item.startDate && !item.endDate) {
        return item.date === date;
      }
      if (item.startDate && item.endDate) {
        return date >= item.startDate && date <= item.endDate;
      }
      return item.date === date;
    });
  },
);

export const selectCalendarMarkingsMemoized = createSelector(
  [selectCalendarState],
  (calendarState) => {
    const markings: { [date: string]: any } = {};
    if (!calendarState?.allEvents) return markings;

    calendarState.allEvents.forEach((item) => {
      const dates: string[] = [];
      if (item.startDate && item.endDate && item.startDate !== item.endDate) {
        const start = new Date(item.startDate);
        const end = new Date(item.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split("T")[0]);
        }
      } else {
        dates.push(item.date);
      }

      dates.forEach((date) => {
        if (!markings[date]) {
          markings[date] = { dots: [] };
        }
        const color = getEventTypeColor(item.type);
        if (!markings[date].dots.find((dot: any) => dot.color === color)) {
          markings[date].dots.push({ color });
        }
      });
    });

    return markings;
  },
);

export const selectEventsForMonthMemoized = createSelector(
  [
    selectCalendarState,
    (_: RootState, year: number, month: number) => ({ year, month }),
  ],
  (calendarState, { year, month }) => {
    const monthStr = (month + 1).toString().padStart(2, "0");
    const yearStr = year.toString();
    const monthPrefix = `${yearStr}-${monthStr}`;

    return (
      calendarState?.allEvents?.filter((item) => {
        const dates = [item.date, item.startDate, item.endDate].filter(Boolean);
        return dates.some((date) => date?.startsWith(monthPrefix));
      }) || []
    );
  },
);

export default calendarSlice.reducer;
