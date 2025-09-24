import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useDispatch, useSelector } from "react-redux";
import { theme } from "../../styles/theme";
import {
  useGetCalendarEventsQuery,
  useGetHolidaysQuery,
  useGetSpecialClassesQuery,
  useGetExamsQuery,
  useGetMonthDataQuery,
  UnifiedCalendarItem,
} from "../../api/calendar-api";
import {
  selectSelectedDate,
  selectAllEvents,
  setSelectedDate,
  updateAllEvents,
  mergeCalendarData,
  selectEventsByDate,
  selectCalendarMarkings,
} from "../../state-store/slices/calendar/calendarSlice";

// Maroon color scheme
const MAROON_THEME = {
  primary: "#800020", // Deep maroon
  light: "#A0002A", // Lighter maroon
  lighter: "#FFE8ED", // Very light maroon/pink
  background: "#FAF7F8", // Subtle maroon-tinted background
  text: "#4A0E0E", // Dark maroon text
  white: "#FFFFFF",
  gray: "#666666",
  lightGray: "#E0E0E0",
};

interface UniversalSchoolCalendarProps {
  userCategory?: number;
  title?: string;
  subtitle?: string;
}

const UniversalSchoolCalendar: React.FC<UniversalSchoolCalendarProps> = ({
  userCategory,
  title = "School Calendar",
  subtitle = "Events, holidays, classes & exams",
}) => {
  const dispatch = useDispatch();
  const selectedDate = useSelector(selectSelectedDate);
  const allEvents = useSelector(selectAllEvents);
  const selectedDateEvents = useSelector((state) =>
    selectEventsByDate(state, selectedDate),
  );
  const calendarMarkings = useSelector(selectCalendarMarkings);

  // API Queries
  const {
    data: eventsData,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useGetCalendarEventsQuery({});

  const {
    data: holidaysData,
    isLoading: holidaysLoading,
    error: holidaysError,
    refetch: refetchHolidays,
  } = useGetHolidaysQuery({});

  const {
    data: specialClassesData,
    isLoading: specialClassesLoading,
    error: specialClassesError,
    refetch: refetchSpecialClasses,
  } = useGetSpecialClassesQuery({});

  const {
    data: examsData,
    isLoading: examsLoading,
    error: examsError,
    refetch: refetchExams,
  } = useGetExamsQuery({});

  const isLoading =
    eventsLoading || holidaysLoading || specialClassesLoading || examsLoading;

  // Month Data API Query - only call when a month is selected (currently using cached data instead)
  const {
    isLoading: monthDataLoading,
    error: monthDataError,
    refetch: refetchMonthData,
  } = useGetMonthDataQuery(
    { month: selectedMonthString || "" },
    { skip: !selectedMonthString }, // Skip query if no month selected
  );

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "event" | "holiday" | "special_class" | "exam" | "timeline"
  >("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "monthView">(
    "calendar",
  );
  const [selectedMonthForView, setSelectedMonthForView] = useState<
    number | null
  >(null);
  const [showDateScrollView, setShowDateScrollView] = useState(false);
  const [scrollViewCenterDate, setScrollViewCenterDate] =
    useState(selectedDate);
  const [selectedMonthString, setSelectedMonthString] = useState<string | null>(
    null,
  );
  const [monthViewFilter, setMonthViewFilter] = useState<
    "all" | "event" | "holiday" | "special_class"
  >("all");

  // Update all events when API data changes
  useEffect(() => {
    const events = eventsData?.data?.data || [];
    const holidays = holidaysData?.data?.data || [];
    const specialClasses = specialClassesData?.data?.data || [];
    const exams = examsData?.data?.data || [];

    const mergedEvents = mergeCalendarData(
      events,
      holidays,
      specialClasses,
      exams,
    );
    dispatch(updateAllEvents(mergedEvents));

    console.log("📅 UniversalSchoolCalendar - Data merged:", {
      events: events.length,
      holidays: holidays.length,
      specialClasses: specialClasses.length,
      exams: exams.length,
      total: mergedEvents.length,
    });
  }, [eventsData, holidaysData, specialClassesData, examsData, dispatch]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchEvents(),
        refetchHolidays(),
        refetchSpecialClasses(),
        refetchExams(),
      ]);
    } catch (error) {
      console.log("📅 Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter events based on active filter (define before using in useMemo)
  const getFilteredEvents = useCallback(
    (events: UnifiedCalendarItem[]) => {
      if (activeFilter === "all") return events;
      return events.filter((event) => event.type === activeFilter);
    },
    [activeFilter],
  );

  // Helper function to get month-wise event counts
  const getMonthEventCounts = useMemo(() => {
    const months = [];
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    for (let i = 0; i < 12; i++) {
      const monthEvents = allEvents.filter((event) => {
        // Check multiple date fields: date, startDate, endDate
        const eventDates = [event.date, event.startDate, event.endDate].filter(
          Boolean,
        );

        return eventDates.some((dateStr) => {
          try {
            const eventDate = new Date(dateStr);
            const eventMonth = eventDate.getMonth();
            const eventYear = eventDate.getFullYear();

            console.log(
              `🔍 Checking event "${event.title}" - Date: ${dateStr}, Month: ${eventMonth}, Year: ${eventYear}, Looking for: ${i}/${selectedYear}`,
            );

            return eventMonth === i && eventYear === selectedYear;
          } catch (error) {
            console.log(
              `❌ Error parsing date "${dateStr}" for event "${event.title}": ${error}`,
            );
            return false;
          }
        });
      });

      console.log(
        `📅 Month ${monthNames[i]} (${i}): Found ${monthEvents.length} events`,
      );
      if (monthEvents.length > 0) {
        console.log(
          `📅 Events for ${monthNames[i]}:`,
          monthEvents.map((e) => ({
            title: e.title,
            date: e.date,
            startDate: e.startDate,
            endDate: e.endDate,
          })),
        );
      }

      months.push({
        index: i,
        name: monthNames[i],
        shortName: monthNames[i].substring(0, 3),
        events: monthEvents,
        count: monthEvents.length,
      });
    }

    return months;
  }, [allEvents, selectedYear]);

  // Get events for selected month in Month View
  const selectedMonthEvents = useMemo(() => {
    if (selectedMonthForView === null) {
      console.log("📅 No month selected for view");
      return [];
    }

    const selectedMonth = getMonthEventCounts.find(
      (month) => month.index === selectedMonthForView,
    );
    const events = selectedMonth?.events || [];

    console.log(
      `📅 Selected month for view: ${selectedMonthForView} (${selectedMonth?.name})`,
    );
    console.log(`📅 Events found for selected month: ${events.length}`);
    console.log(
      `📅 Events details:`,
      events.map((e) => ({ title: e.title, date: e.date, type: e.type })),
    );

    return events;
  }, [getMonthEventCounts, selectedMonthForView]);

  // Get filtered events for selected month (using month view filter)
  const filteredSelectedMonthEvents = useMemo(() => {
    if (monthViewFilter === "all") return selectedMonthEvents;
    return selectedMonthEvents.filter(
      (event) => event.type === monthViewFilter,
    );
  }, [selectedMonthEvents, monthViewFilter]);

  // Dynamic card height calculation based on event count
  const calculateCardHeight = (eventCount: number) => {
    if (eventCount === 0) return 85; // Compact for empty months
    if (eventCount <= 3) return 100; // Medium for few events
    if (eventCount <= 6) return 115; // Large for moderate events
    return 130; // Maximum for high activity months
  };

  // Dynamic background color based on event density
  const getCardBackgroundColor = (eventCount: number, isSelected: boolean) => {
    if (isSelected) return MAROON_THEME.primary;
    if (eventCount === 0) return MAROON_THEME.background;
    if (eventCount <= 2) return MAROON_THEME.white;
    if (eventCount <= 5) return MAROON_THEME.lighter;
    return `${MAROON_THEME.lighter}DD`; // Slightly more intense for high activity
  };

  // Generate horizontal scroll dates (5 days centered around clicked date)
  const horizontalScrollDates = useMemo(() => {
    const dates = [];
    const centerDate = new Date(scrollViewCenterDate);

    // Generate 5 dates: 2 before, center date, 2 after
    for (let i = -2; i <= 2; i++) {
      const date = new Date(centerDate);
      date.setDate(centerDate.getDate() + i);
      const dateString = date.toISOString().split("T")[0];

      // Get events for this date
      const dateEvents = allEvents.filter((event) => {
        const eventDates = [event.date, event.startDate, event.endDate].filter(
          Boolean,
        );
        return eventDates.some((eventDate) => {
          if (
            event.startDate &&
            event.endDate &&
            event.startDate !== event.endDate
          ) {
            // Multi-day event - check if date falls within range
            return dateString >= event.startDate && dateString <= event.endDate;
          }
          return eventDate === dateString;
        });
      });

      dates.push({
        date: dateString,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString("en-US", { month: "short" }),
        isToday: dateString === new Date().toISOString().split("T")[0],
        isSelected: dateString === selectedDate,
        isCenter: i === 0,
        events: dateEvents,
        filteredEvents: getFilteredEvents(dateEvents),
      });
    }

    return dates;
  }, [scrollViewCenterDate, allEvents, selectedDate, getFilteredEvents]);

  // Handle horizontal date press
  const handleHorizontalDatePress = (dateString: string) => {
    dispatch(setSelectedDate(dateString));
    console.log("📅 Horizontal date selected:", dateString);
  };

  // Debug logging
  console.log("📅 Debug - Selected month:", selectedMonthForView);
  console.log("📅 Debug - Selected month events:", selectedMonthEvents.length);
  console.log(
    "📅 Debug - Filtered events:",
    filteredSelectedMonthEvents.length,
  );
  console.log("📅 Debug - All events total:", allEvents.length);
  console.log("📅 Debug - API Data Status:", {
    eventsData: eventsData?.data?.data?.length || 0,
    holidaysData: holidaysData?.data?.data?.length || 0,
    specialClassesData: specialClassesData?.data?.data?.length || 0,
    examsData: examsData?.data?.data?.length || 0,
    loading: isLoading,
  });

  // Handle day press
  const handleDayPress = (day: any) => {
    dispatch(setSelectedDate(day.dateString));
    setScrollViewCenterDate(day.dateString);
    setShowDateScrollView(true);
    console.log(
      "📅 Date clicked, showing horizontal scroll view for:",
      day.dateString,
    );
  };

  // Handle month change
  const handleMonthChange = (month: any) => {
    console.log("📅 Month changed:", month);
  };

  // Get event type icon
  const getEventTypeIcon = (type: UnifiedCalendarItem["type"]) => {
    switch (type) {
      case "event":
        return "event";
      case "holiday":
        return "beach-access";
      case "special_class":
        return "school";
      case "exam":
        return "quiz";
      default:
        return "event";
    }
  };

  // Get event type color
  const getEventTypeColor = (type: UnifiedCalendarItem["type"]) => {
    switch (type) {
      case "event":
        return "#007AFF";
      case "holiday":
        return "#FF3B30";
      case "special_class":
        return "#34C759";
      case "exam":
        return "#FF9500";
      default:
        return "#8E8E93";
    }
  };

  // Format time
  const formatTime = (time?: string) => {
    if (!time) return "";
    return time;
  };

  const filteredSelectedDateEvents = getFilteredEvents(selectedDateEvents);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Loading indicator - Show while loading */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MAROON_THEME.primary} />
          <Text style={styles.loadingText}>Loading calendar data...</Text>
          <Text style={styles.loadingSubtext}>
            Please wait while we fetch events, holidays, and schedules...
          </Text>
        </View>
      ) : (
        /* Calendar Content - Only show when loading is complete */
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[MAROON_THEME.primary]}
            />
          }
        >
          {/* Month View Section - Only show in monthView */}
          {viewMode === "monthView" && (
            <View style={styles.monthViewContainer}>
              {/* Toggle Buttons in Month View */}
              <View style={styles.monthViewToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.viewToggleButton,
                    viewMode === "calendar" && styles.viewToggleButtonActive,
                  ]}
                  onPress={() => setViewMode("calendar")}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={
                      viewMode === "calendar"
                        ? MAROON_THEME.white
                        : MAROON_THEME.primary
                    }
                  />
                  <Text
                    style={[
                      styles.viewToggleText,
                      viewMode === "calendar" && styles.viewToggleTextActive,
                    ]}
                  >
                    Calendar View
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.viewToggleButton,
                    viewMode === "monthView" && styles.viewToggleButtonActive,
                  ]}
                  onPress={() => setViewMode("monthView")}
                >
                  <MaterialIcons
                    name="grid-view"
                    size={20}
                    color={
                      viewMode === "monthView"
                        ? MAROON_THEME.white
                        : MAROON_THEME.primary
                    }
                  />
                  <Text
                    style={[
                      styles.viewToggleText,
                      viewMode === "monthView" && styles.viewToggleTextActive,
                    ]}
                  >
                    Month View
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.monthCountsContainer}>
                {/* Show month grid only when no specific month is selected */}
                {selectedMonthForView === null ? (
                  <>
                    <View style={styles.monthCountsHeader}>
                      <Text style={styles.monthCountsTitle}>
                        Events by Month - {selectedYear}
                      </Text>
                      <View style={styles.yearNavigation}>
                        <TouchableOpacity
                          style={styles.yearNavButton}
                          onPress={() => setSelectedYear(selectedYear - 1)}
                        >
                          <MaterialIcons
                            name="chevron-left"
                            size={20}
                            color={MAROON_THEME.primary}
                          />
                        </TouchableOpacity>
                        <Text style={styles.currentYear}>{selectedYear}</Text>
                        <TouchableOpacity
                          style={styles.yearNavButton}
                          onPress={() => setSelectedYear(selectedYear + 1)}
                        >
                          <MaterialIcons
                            name="chevron-right"
                            size={20}
                            color={MAROON_THEME.primary}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Grid Layout for Month Event Counts */}
                    <View style={styles.monthGridContainer}>
                      {getMonthEventCounts.map((month) => (
                        <TouchableOpacity
                          key={month.index}
                          style={[
                            styles.monthGridCard,
                            month.count > 0 && styles.monthGridCardActive,
                            selectedMonthForView === month.index &&
                              styles.monthGridCardSelected,
                            {
                              backgroundColor: getCardBackgroundColor(
                                month.count,
                                selectedMonthForView === month.index,
                              ),
                            },
                          ]}
                          onPress={() => {
                            const monthString = `${selectedYear}-${(
                              month.index + 1
                            )
                              .toString()
                              .padStart(2, "0")}`; // Format: "2025-08"

                            console.log(
                              "📅 Month clicked:",
                              month.name,
                              "Month string:",
                              monthString,
                              "Cached events:",
                              month.events.length,
                            );

                            setSelectedMonthForView(month.index);
                            setSelectedMonthString(monthString); // This triggers the API call
                            setMonthViewFilter("all"); // Reset filter to show all initially
                          }}
                        >
                          {/* Month Name Section */}
                          <View style={styles.monthCardHeader}>
                            <Text
                              style={[
                                styles.monthGridName,
                                month.count > 0 && styles.monthGridNameActive,
                                selectedMonthForView === month.index &&
                                  styles.monthGridNameSelected,
                              ]}
                            >
                              {month.shortName}
                            </Text>
                          </View>

                          {/* Color Dots Section - Under Month Name */}
                          <View style={styles.monthDotsContainer}>
                            {month.count > 0 && (
                              <View style={styles.monthGridEventDots}>
                                {/* First row of dots */}
                                <View style={styles.dotRow}>
                                  {month.events
                                    .slice(0, 3)
                                    .map((event, index) => (
                                      <View
                                        key={index}
                                        style={[
                                          styles.monthGridEventDot,
                                          {
                                            backgroundColor: getEventTypeColor(
                                              event.type,
                                            ),
                                          },
                                        ]}
                                      />
                                    ))}
                                </View>

                                {/* Second row of dots if needed */}
                                {month.events.length > 3 && (
                                  <View style={styles.dotRow}>
                                    {month.events
                                      .slice(3, 6)
                                      .map((event, index) => (
                                        <View
                                          key={index + 3}
                                          style={[
                                            styles.monthGridEventDot,
                                            {
                                              backgroundColor:
                                                getEventTypeColor(event.type),
                                            },
                                          ]}
                                        />
                                      ))}
                                    {month.count > 6 && (
                                      <View style={styles.moreEventsBadge}>
                                        <Text
                                          style={styles.monthGridMoreEvents}
                                        >
                                          +{month.count - 6}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                )}
                              </View>
                            )}
                          </View>

                          {/* Event Count Section */}
                          <View style={styles.monthCardFooter}>
                            <View
                              style={[
                                styles.eventCountPill,
                                selectedMonthForView === month.index &&
                                  styles.eventCountPillSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.monthGridEventCount,
                                  month.count > 0 &&
                                    styles.monthGridEventCountActive,
                                  selectedMonthForView === month.index &&
                                    styles.monthGridEventCountSelected,
                                ]}
                              >
                                {month.count === 0
                                  ? "No events"
                                  : month.count === 1
                                    ? "1 event"
                                    : `${month.count} events`}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : (
                  /* Selected Month Data Display */
                  <View style={styles.selectedMonthContainer}>
                    {monthDataLoading ? (
                      // Loading State
                      <View style={styles.monthLoadingContainer}>
                        <ActivityIndicator
                          size="large"
                          color={MAROON_THEME.primary}
                        />
                        <Text style={styles.monthLoadingText}>
                          Loading{" "}
                          {getMonthEventCounts[selectedMonthForView]?.name}{" "}
                          {selectedYear} data...
                        </Text>
                      </View>
                    ) : monthDataError ? (
                      // Error State
                      <View style={styles.monthErrorContainer}>
                        <MaterialIcons
                          name="error-outline"
                          size={48}
                          color="#FF6B6B"
                        />
                        <Text style={styles.monthErrorText}>
                          Failed to load month data
                        </Text>
                        <TouchableOpacity
                          style={styles.monthRetryButton}
                          onPress={() => refetchMonthData()}
                        >
                          <MaterialIcons
                            name="refresh"
                            size={20}
                            color={MAROON_THEME.white}
                          />
                          <Text style={styles.monthRetryText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      // Success State - Enhanced Month Data Display
                      <>
                        {/* Simple Month Header with Back Button */}
                        <View style={styles.selectedMonthHeader}>
                          <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => {
                              setSelectedMonthForView(null);
                              setSelectedMonthString(null);
                              setMonthViewFilter("all"); // Reset filter when going back
                            }}
                          >
                            <MaterialIcons
                              name="arrow-back"
                              size={20}
                              color={MAROON_THEME.white}
                            />
                          </TouchableOpacity>
                          <View style={styles.monthTitleContainer}>
                            <Text style={styles.selectedMonthTitle}>
                              {getMonthEventCounts[selectedMonthForView]?.name}{" "}
                              {selectedYear}
                            </Text>
                            <Text style={styles.selectedMonthSubtitle}>
                              {monthViewFilter === "all"
                                ? `${selectedMonthEvents.length} items found`
                                : `${filteredSelectedMonthEvents.length} of ${selectedMonthEvents.length} items`}
                            </Text>
                          </View>
                        </View>

                        {/* Month View Filter Bar */}
                        <View style={styles.monthFilterContainer}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={
                              styles.monthFilterScrollContent
                            }
                          >
                            {[
                              { key: "all", label: "All", icon: "view-list" },
                              { key: "event", label: "Events", icon: "event" },
                              {
                                key: "holiday",
                                label: "Holidays",
                                icon: "beach-access",
                              },
                              {
                                key: "special_class",
                                label: "Classes",
                                icon: "school",
                              },
                            ].map((filter) => (
                              <TouchableOpacity
                                key={filter.key}
                                style={[
                                  styles.monthFilterButton,
                                  monthViewFilter === filter.key &&
                                    styles.monthFilterButtonActive,
                                ]}
                                onPress={() =>
                                  setMonthViewFilter(filter.key as any)
                                }
                              >
                                <MaterialIcons
                                  name={filter.icon as any}
                                  size={16}
                                  color={
                                    monthViewFilter === filter.key
                                      ? MAROON_THEME.white
                                      : MAROON_THEME.primary
                                  }
                                />
                                <Text
                                  style={[
                                    styles.monthFilterText,
                                    monthViewFilter === filter.key &&
                                      styles.monthFilterTextActive,
                                  ]}
                                >
                                  {filter.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>

                        {/* Simple Month Data List */}
                        <ScrollView
                          style={styles.monthDataList}
                          showsVerticalScrollIndicator={false}
                        >
                          {(() => {
                            // Use existing selectedMonthEvents data instead of API call
                            console.log(
                              "🔍 selectedMonthEvents:",
                              selectedMonthEvents,
                            );
                            console.log(
                              "🔍 selectedMonthEvents length:",
                              selectedMonthEvents.length,
                            );

                            // Use the filtered cached data
                            const monthDataArray =
                              filteredSelectedMonthEvents || [];

                            console.log(
                              "✅ Using selectedMonthEvents cached data",
                            );
                            console.log(
                              "📅 Final monthDataArray:",
                              monthDataArray,
                            );
                            console.log(
                              "📅 Array length:",
                              monthDataArray.length,
                            );

                            const events = monthDataArray.filter(
                              (item) => item.type === "event",
                            );
                            const holidays = monthDataArray.filter(
                              (item) => item.type === "holiday",
                            );
                            const specialClasses = monthDataArray.filter(
                              (item) => item.type === "special_class",
                            );

                            console.log("📅 Grouped data:", {
                              events: events.length,
                              holidays: holidays.length,
                              specialClasses: specialClasses.length,
                            });

                            // Show all items first for testing
                            console.log("📅 All events:", events);
                            console.log("📅 All holidays:", holidays);
                            console.log(
                              "📅 All specialClasses:",
                              specialClasses,
                            );

                            return (
                              <>
                                {/* Debug Section - Show Raw Data Count */}
                                {/* <View style={styles.monthSection}>
                                  <Text style={styles.itemDescription}>
                                    Events: {events.length} | Holidays:{" "}
                                    {holidays.length} | Classes:{" "}
                                    {specialClasses.length}
                                  </Text>
                                </View> */}

                                {/* Show ALL items regardless of type for testing */}
                                {monthDataArray.length > 0 && (
                                  <View style={styles.monthSection}>
                                    {/* <View style={styles.sectionHeader}>
                                      <MaterialIcons
                                        name="list"
                                        size={20}
                                        color="#800020"
                                      />
                                      <Text style={styles.sectionTitle}>
                                        All Items ({monthDataArray.length})
                                      </Text>
                                    </View> */}
                                    {/* {monthDataArray.map((item, index) => (
                                      <View
                                        key={`all-${index}`}
                                        style={styles.listItem}
                                      >
                                        <View style={styles.itemHeader}>
                                          <Text style={styles.itemTitle}>
                                            {item.title || "No Title"}
                                          </Text>
                                          <Text style={styles.itemCategory}>
                                            {item.type || "Unknown Type"}
                                          </Text>
                                        </View>
                                        <View style={styles.itemDetails}>
                                          <Text style={styles.itemDate}>
                                            📅{" "}
                                            {item.date
                                              ? new Date(
                                                  item.date
                                                ).toLocaleDateString()
                                              : "No Date"}
                                          </Text>
                                          {item.start_time && item.end_time && (
                                            <Text style={styles.itemTime}>
                                              🕒 {item.start_time} -{" "}
                                              {item.end_time}
                                            </Text>
                                          )}
                                          {item.description && (
                                            <Text
                                              style={styles.itemDescription}
                                            >
                                              {item.description}
                                            </Text>
                                          )}
                                        </View>
                                      </View>
                                    ))} */}
                                  </View>
                                )}
                                {/* Events Section */}
                                {events && events.length > 0 && (
                                  <View style={styles.monthSection}>
                                    <View style={styles.sectionHeader}>
                                      <MaterialIcons
                                        name="event"
                                        size={20}
                                        color="#007AFF"
                                      />
                                      <Text style={styles.sectionTitle}>
                                        Events ({events.length})
                                      </Text>
                                    </View>
                                    {events.map((event, index) => (
                                      <View
                                        key={`event-${index}`}
                                        style={styles.listItem}
                                      >
                                        <View style={styles.itemHeader}>
                                          <Text style={styles.itemTitle}>
                                            {event.title}
                                          </Text>
                                          <Text style={styles.itemCategory}>
                                            Event
                                          </Text>
                                        </View>
                                        <View style={styles.itemDetails}>
                                          <Text style={styles.itemDate}>
                                            📅{" "}
                                            {new Date(
                                              event.date,
                                            ).toLocaleDateString()}
                                          </Text>
                                          {event.start_time &&
                                            event.end_time && (
                                              <Text style={styles.itemTime}>
                                                🕒 {event.start_time} -{" "}
                                                {event.end_time}
                                              </Text>
                                            )}
                                          {event.description && (
                                            <Text
                                              style={styles.itemDescription}
                                            >
                                              {event.description}
                                            </Text>
                                          )}
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Holidays Section */}
                                {holidays && holidays.length > 0 && (
                                  <View style={styles.monthSection}>
                                    <View style={styles.sectionHeader}>
                                      <MaterialIcons
                                        name="beach-access"
                                        size={20}
                                        color="#FF3B30"
                                      />
                                      <Text style={styles.sectionTitle}>
                                        Holidays ({holidays.length})
                                      </Text>
                                    </View>
                                    {holidays.map((holiday, index) => (
                                      <View
                                        key={`holiday-${index}`}
                                        style={styles.listItem}
                                      >
                                        <View style={styles.itemHeader}>
                                          <Text style={styles.itemTitle}>
                                            {holiday.title}
                                          </Text>
                                          <Text style={styles.itemCategory}>
                                            Holiday
                                          </Text>
                                        </View>
                                        <View style={styles.itemDetails}>
                                          <Text style={styles.itemDate}>
                                            📅{" "}
                                            {new Date(
                                              holiday.date,
                                            ).toLocaleDateString("en-US", {
                                              weekday: "long",
                                              month: "long",
                                              day: "numeric",
                                            })}
                                          </Text>
                                          {holiday.description && (
                                            <Text
                                              style={styles.itemDescription}
                                            >
                                              {holiday.description}
                                            </Text>
                                          )}
                                        </View>
                                      </View>
                                    ))}
                                  </View>
                                )}

                                {/* Special Classes Section */}
                                {specialClasses &&
                                  specialClasses.length > 0 && (
                                    <View style={styles.monthSection}>
                                      <View style={styles.sectionHeader}>
                                        <MaterialIcons
                                          name="school"
                                          size={20}
                                          color="#34C759"
                                        />
                                        <Text style={styles.sectionTitle}>
                                          Special Classes (
                                          {specialClasses.length})
                                        </Text>
                                      </View>
                                      {specialClasses.map(
                                        (specialClass, index) => (
                                          <View
                                            key={`special-class-${index}`}
                                            style={styles.listItem}
                                          >
                                            <View style={styles.itemHeader}>
                                              <Text style={styles.itemTitle}>
                                                {specialClass.title ||
                                                  "Special Class"}
                                              </Text>
                                              <Text style={styles.itemCategory}>
                                                {specialClass.subject ||
                                                  "Extra Curriculum"}
                                              </Text>
                                            </View>
                                            <View style={styles.itemDetails}>
                                              <Text style={styles.itemDate}>
                                                📅{" "}
                                                {new Date(
                                                  specialClass.date,
                                                ).toLocaleDateString()}
                                              </Text>
                                              {specialClass.start_time && (
                                                <Text style={styles.itemTime}>
                                                  🕒 {specialClass.start_time}
                                                  {specialClass.duration
                                                    ? ` (${specialClass.duration})`
                                                    : ""}
                                                </Text>
                                              )}
                                              {specialClass.instructor && (
                                                <Text
                                                  style={styles.itemInstructor}
                                                >
                                                  👨‍🏫 {specialClass.instructor}
                                                </Text>
                                              )}
                                              {specialClass.description && (
                                                <Text
                                                  style={styles.itemDescription}
                                                >
                                                  {specialClass.description}
                                                </Text>
                                              )}
                                            </View>
                                          </View>
                                        ),
                                      )}
                                    </View>
                                  )}

                                {/* Empty State - Enhanced Debug */}
                                {monthDataArray.length === 0 && (
                                  <View style={styles.emptyMonthState}>
                                    <MaterialIcons
                                      name="error-outline"
                                      size={48}
                                      color="#FF6B6B"
                                    />
                                    <Text style={styles.emptyMonthText}>
                                      No data received from API
                                    </Text>
                                    <Text style={styles.itemDescription}>
                                      Check console logs for debugging info
                                    </Text>
                                  </View>
                                )}

                                {/* No Filtered Items State */}
                                {monthDataArray.length > 0 &&
                                  !events?.length &&
                                  !holidays?.length &&
                                  !specialClasses?.length && (
                                    <View style={styles.emptyMonthState}>
                                      <MaterialIcons
                                        name="filter-list"
                                        size={48}
                                        color="#FFA500"
                                      />
                                      <Text style={styles.emptyMonthText}>
                                        Data received but no items match
                                        expected types
                                      </Text>
                                      <Text style={styles.itemDescription}>
                                        Check data structure in console logs
                                      </Text>
                                    </View>
                                  )}
                              </>
                            );
                          })()}
                        </ScrollView>
                      </>
                    )}
                  </View>
                )}
              </View>
            </View>
          )}
          {/* Calendar View Toggle - Only show in calendar mode */}
          {viewMode === "calendar" && (
            <View style={styles.viewToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.viewToggleButton,
                  viewMode === "calendar" && styles.viewToggleButtonActive,
                ]}
                onPress={() => setViewMode("calendar")}
              >
                <MaterialIcons
                  name="calendar-today"
                  size={20}
                  color={
                    viewMode === "calendar"
                      ? MAROON_THEME.white
                      : MAROON_THEME.primary
                  }
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === "calendar" && styles.viewToggleTextActive,
                  ]}
                >
                  Calendar View
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.viewToggleButton,
                  viewMode === "monthView" && styles.viewToggleButtonActive,
                ]}
                onPress={() => setViewMode("monthView")}
              >
                <MaterialIcons
                  name="grid-view"
                  size={20}
                  color={
                    viewMode === "monthView"
                      ? MAROON_THEME.white
                      : MAROON_THEME.primary
                  }
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    viewMode === "monthView" && styles.viewToggleTextActive,
                  ]}
                >
                  Month View
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Calendar View - Only show in calendar mode and when horizontal view is hidden */}
          {viewMode === "calendar" && !showDateScrollView && (
            <View style={styles.calendarContainer}>
              <Calendar
                onDayPress={handleDayPress}
                onMonthChange={handleMonthChange}
                markedDates={{
                  ...calendarMarkings,
                  [selectedDate]: {
                    ...calendarMarkings[selectedDate],
                    selected: true,
                    selectedColor: MAROON_THEME.primary,
                  },
                }}
                markingType="multi-dot"
                theme={{
                  backgroundColor: MAROON_THEME.white,
                  calendarBackground: MAROON_THEME.white,
                  textSectionTitleColor: MAROON_THEME.gray,
                  selectedDayBackgroundColor: MAROON_THEME.primary,
                  selectedDayTextColor: MAROON_THEME.white,
                  todayTextColor: MAROON_THEME.primary,
                  dayTextColor: MAROON_THEME.text,
                  textDisabledColor: "#d9e1e8",
                  dotColor: MAROON_THEME.light,
                  selectedDotColor: MAROON_THEME.white,
                  arrowColor: MAROON_THEME.primary,
                  disabledArrowColor: "#d9e1e8",
                  monthTextColor: MAROON_THEME.text,
                  indicatorColor: MAROON_THEME.primary,
                }}
              />
            </View>
          )}

          {/* Horizontal Date Scroll View - Only show when date is clicked */}
          {viewMode === "calendar" && showDateScrollView && (
            <View style={styles.dateScrollContainer}>
              <View style={styles.dateScrollHeader}>
                <Text style={styles.dateScrollTitle}>Date Navigator</Text>
                <TouchableOpacity
                  style={styles.backToCalendarButton}
                  onPress={() => setShowDateScrollView(false)}
                >
                  <MaterialIcons
                    name="calendar-today"
                    size={18}
                    color={MAROON_THEME.primary}
                  />
                  <Text style={styles.backButtonText}>Calendar View</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dateScrollContent}
                snapToInterval={64}
                decelerationRate="fast"
              >
                {horizontalScrollDates.map((dateItem) => (
                  <TouchableOpacity
                    key={dateItem.date}
                    style={[
                      styles.dateScrollCard,
                      dateItem.isSelected && styles.dateScrollCardSelected,
                      dateItem.isToday &&
                        !dateItem.isSelected &&
                        styles.dateScrollCardToday,
                      dateItem.isCenter && styles.dateScrollCardCenter,
                    ]}
                    onPress={() => handleHorizontalDatePress(dateItem.date)}
                  >
                    <Text
                      style={[
                        styles.dateScrollDay,
                        dateItem.isSelected && styles.dateScrollDaySelected,
                      ]}
                    >
                      {dateItem.dayName}
                    </Text>
                    <Text
                      style={[
                        styles.dateScrollNumber,
                        dateItem.isSelected && styles.dateScrollNumberSelected,
                        dateItem.isToday &&
                          !dateItem.isSelected &&
                          styles.dateScrollNumberToday,
                      ]}
                    >
                      {dateItem.dayNumber}
                    </Text>
                    <Text
                      style={[
                        styles.dateScrollMonth,
                        dateItem.isSelected && styles.dateScrollMonthSelected,
                      ]}
                    >
                      {dateItem.monthName}
                    </Text>

                    {/* Event indicators */}
                    {dateItem.filteredEvents.length > 0 && (
                      <View style={styles.dateScrollEventIndicators}>
                        {dateItem.filteredEvents
                          .slice(0, 3)
                          .map((event, index) => (
                            <View
                              key={index}
                              style={[
                                styles.dateScrollEventDot,
                                {
                                  backgroundColor: getEventTypeColor(
                                    event.type,
                                  ),
                                },
                              ]}
                            />
                          ))}
                        {dateItem.filteredEvents.length > 3 && (
                          <Text style={styles.dateScrollMoreEvents}>
                            +{dateItem.filteredEvents.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Event Type Filters and Selected Date Events - Only show in calendar view */}
          {viewMode === "calendar" && (
            <>
              {/* Event Type Filters */}
              <View style={styles.filtersContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {[
                    { key: "all", label: "All", icon: "view-list" },
                    { key: "event", label: "Events", icon: "event" },
                    { key: "holiday", label: "Holidays", icon: "beach-access" },
                    { key: "special_class", label: "Classes", icon: "school" },
                    { key: "exam", label: "Exams", icon: "quiz" },
                  ].map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterButton,
                        activeFilter === filter.key &&
                          styles.filterButtonActive,
                      ]}
                      onPress={() => setActiveFilter(filter.key as any)}
                    >
                      <MaterialIcons
                        name={filter.icon as any}
                        size={16}
                        color={
                          activeFilter === filter.key
                            ? MAROON_THEME.white
                            : MAROON_THEME.gray
                        }
                      />
                      <Text
                        style={[
                          styles.filterText,
                          activeFilter === filter.key &&
                            styles.filterTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Selected Date Events */}
              <View style={styles.eventsContainer}>
                <View style={styles.eventsHeader}>
                  <Text style={styles.eventsTitle}>
                    Events for {new Date(selectedDate).toLocaleDateString()}
                  </Text>
                  <Text style={styles.eventsCount}>
                    {filteredSelectedDateEvents.length}{" "}
                    {filteredSelectedDateEvents.length === 1
                      ? "event"
                      : "events"}
                  </Text>
                </View>

                {filteredSelectedDateEvents.length === 0 ? (
                  <View style={styles.noEventsContainer}>
                    <MaterialIcons
                      name="event-busy"
                      size={48}
                      color="#CCCCCC"
                    />
                    <Text style={styles.noEventsText}>
                      No events on this date
                    </Text>
                  </View>
                ) : (
                  filteredSelectedDateEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.eventCard}
                      onPress={() => console.log("Event pressed:", event.title)}
                    >
                      <View style={styles.eventHeader}>
                        <View style={styles.eventTypeIndicator}>
                          <MaterialIcons
                            name={getEventTypeIcon(event.type)}
                            size={20}
                            color={getEventTypeColor(event.type)}
                          />
                          <View
                            style={[
                              styles.eventTypeDot,
                              {
                                backgroundColor: getEventTypeColor(event.type),
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.eventDetails}>
                          <Text style={styles.eventTitle}>{event.title}</Text>
                          {event.category && (
                            <Text style={styles.eventCategory}>
                              {event.category}
                            </Text>
                          )}
                        </View>
                      </View>

                      {(event.startTime || event.endTime) && (
                        <View style={styles.eventTimeContainer}>
                          <MaterialIcons
                            name="schedule"
                            size={16}
                            color="#666666"
                          />
                          <Text style={styles.eventTime}>
                            {formatTime(event.startTime)} -{" "}
                            {formatTime(event.endTime)}
                          </Text>
                        </View>
                      )}

                      {event.description && (
                        <Text style={styles.eventDescription} numberOfLines={2}>
                          {event.description}
                        </Text>
                      )}

                      {event.startDate &&
                        event.endDate &&
                        event.startDate !== event.endDate && (
                          <View style={styles.eventDurationContainer}>
                            <MaterialIcons
                              name="date-range"
                              size={16}
                              color="#666666"
                            />
                            <Text style={styles.eventDuration}>
                              {event.startDate} to {event.endDate}
                            </Text>
                          </View>
                        )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}

          {/* API Error Messages (for debugging, can be removed in production) */}
          {(eventsError ||
            holidaysError ||
            specialClassesError ||
            examsError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>API Status:</Text>
              {eventsError && (
                <Text style={styles.errorText}>Events: Failed</Text>
              )}
              {holidaysError && (
                <Text style={styles.errorText}>Holidays: Failed</Text>
              )}
              {specialClassesError && (
                <Text style={styles.errorText}>Special Classes: Failed</Text>
              )}
              {examsError && (
                <Text style={styles.errorText}>Exams: Failed</Text>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MAROON_THEME.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: MAROON_THEME.white,
    borderBottomWidth: 1,
    borderBottomColor: MAROON_THEME.lighter,
  },
  title: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: MAROON_THEME.text,
    marginBottom: 0,
  },
  subtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: MAROON_THEME.gray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  loadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: MAROON_THEME.text,
    marginTop: theme.spacing.sm,
  },
  loadingSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: MAROON_THEME.gray,
    marginTop: theme.spacing.xs,
    textAlign: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl * 2, // Large bottom padding for all content
  },
  viewToggleContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 6,
    backgroundColor: MAROON_THEME.white,
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
    backgroundColor: MAROON_THEME.white,
  },
  viewToggleButtonActive: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
    elevation: 1,
    shadowColor: MAROON_THEME.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewToggleText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.gray,
    marginLeft: 4,
  },
  viewToggleTextActive: {
    color: MAROON_THEME.white,
  },
  calendarContainer: {
    backgroundColor: MAROON_THEME.white,
    margin: theme.spacing.xm,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: theme.spacing.xm, // Bottom padding
  },
  filtersContainer: {
    paddingVertical: 6,
    paddingLeft: theme.spacing.lg,
    backgroundColor: MAROON_THEME.white,
    marginBottom: theme.spacing.xm, // Bottom padding
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: 16,
    backgroundColor: MAROON_THEME.background,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
  },
  filterButtonActive: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
  },
  filterText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.gray,
    marginLeft: 4,
  },
  filterTextActive: {
    color: MAROON_THEME.white,
  },
  eventsContainer: {
    flex: 1,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl, // Bottom padding
  },
  eventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  eventsTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: MAROON_THEME.text,
  },
  eventsCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: MAROON_THEME.gray,
  },
  noEventsContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xxl,
  },
  noEventsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: "#999999",
    marginTop: theme.spacing.sm,
  },
  eventCard: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 0,
    borderLeftColor: MAROON_THEME.primary,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  eventTypeIndicator: {
    position: "relative",
    marginRight: theme.spacing.sm,
    padding: 4,
  },
  eventTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
    top: -2,
    right: -2,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: MAROON_THEME.text,
    marginBottom: 2,
  },
  eventCategory: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.gray,
  },
  eventTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing.xs,
  },
  eventTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#666666",
    marginLeft: 4,
  },
  eventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#333333",
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  eventDurationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  eventDuration: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  errorContainer: {
    margin: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
    borderColor: "#FFEEBA",
    borderWidth: 1,
  },
  errorTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: "#856404",
    marginBottom: theme.spacing.xs,
  },
  errorText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#856404",
  },

  // Modern Month View Container Styles
  monthViewContainer: {
    flex: 1,
  },
  monthViewToggleContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2,
    backgroundColor: MAROON_THEME.background,
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: -4,
    borderRadius: 8,
    margin: 4,
  },

  // Modern Month Counts Section Styles
  monthCountsContainer: {
    backgroundColor: MAROON_THEME.white,
    margin: theme.spacing.sm,
    borderRadius: 16,
    padding: 4,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    marginBottom: theme.spacing.sm,
  },
  monthCountsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
  },
  monthCountsTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 16,
    color: MAROON_THEME.text,
  },
  yearNavigation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MAROON_THEME.background,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.xs,
  },
  yearNavButton: {
    padding: theme.spacing.xs,
    borderRadius: 16,
  },
  currentYear: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: MAROON_THEME.primary,
    marginHorizontal: theme.spacing.sm,
    minWidth: 40,
    textAlign: "center",
  },
  monthScrollContent: {
    paddingVertical: theme.spacing.xs,
  },
  monthCard: {
    backgroundColor: MAROON_THEME.background,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    minWidth: 80,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
  },
  monthCardActive: {
    backgroundColor: MAROON_THEME.lighter,
    borderColor: MAROON_THEME.primary,
  },
  monthName: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: MAROON_THEME.gray,
    marginBottom: 4,
  },
  monthNameActive: {
    color: MAROON_THEME.primary,
  },
  monthEventCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: MAROON_THEME.gray,
    marginBottom: 4,
  },
  monthEventCountActive: {
    color: MAROON_THEME.text,
  },
  monthEventDots: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  monthEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  moreEventsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 9,
    color: MAROON_THEME.gray,
    marginLeft: 4,
  },

  // Creative Modern Month Grid Styles - Dynamic Height System
  monthGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
    padding: theme.spacing.xs,
    justifyContent: "space-between",
  },
  monthGridCard: {
    // backgroundColor set dynamically via inline style
    borderRadius: 16,
    padding: theme.spacing.sm,
    width: "31%", // 3 columns layout
    height: 110, // Fixed uniform height for all cards
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
    overflow: "hidden",
  },
  monthGridCardActive: {
    backgroundColor: MAROON_THEME.white,
    borderColor: MAROON_THEME.primary,
    elevation: 2,
    shadowColor: MAROON_THEME.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  monthGridCardSelected: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
    elevation: 4,
    shadowColor: MAROON_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    transform: [{ scale: 1.03 }],
  },

  // Month Card Sections
  monthCardHeader: {
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  monthDotsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 24,
  },
  monthCardFooter: {
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },

  // Typography Styles
  monthGridName: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: MAROON_THEME.gray,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  monthGridNameActive: {
    color: MAROON_THEME.primary,
  },
  monthGridNameSelected: {
    color: MAROON_THEME.white,
  },

  // Event Count Pill
  eventCountPill: {
    backgroundColor: MAROON_THEME.lighter,
    borderRadius: 12,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
  },
  eventCountPillSelected: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  monthGridEventCount: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    color: MAROON_THEME.gray,
    textAlign: "center",
  },
  monthGridEventCountActive: {
    color: MAROON_THEME.text,
  },
  monthGridEventCountSelected: {
    color: MAROON_THEME.white,
  },

  // Enhanced Dot System
  monthGridEventDots: {
    alignItems: "center",
    justifyContent: "center",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  monthGridEventDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginHorizontal: 2,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  moreEventsBadge: {
    backgroundColor: MAROON_THEME.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    elevation: 1,
    shadowColor: MAROON_THEME.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  monthGridMoreEvents: {
    fontFamily: theme.fonts.bold,
    fontSize: 8,
    color: MAROON_THEME.white,
    textAlign: "center",
  },

  // Selected Month Events Styles
  selectedMonthEventsContainer: {
    marginTop: theme.spacing.md,
    backgroundColor: MAROON_THEME.background,
    borderRadius: 12,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: MAROON_THEME.primary,
    marginBottom: theme.spacing.lg, // Bottom padding
  },
  clearSelectionButton: {
    padding: theme.spacing.xs,
    borderRadius: 6,
    backgroundColor: MAROON_THEME.lighter,
  },
  monthFiltersContainer: {
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  monthFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.xs,
    borderRadius: 12,
    backgroundColor: MAROON_THEME.white,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
  },
  monthFilterButtonActive: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
  },
  monthFilterText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: MAROON_THEME.gray,
    marginLeft: 3,
  },
  monthFilterTextActive: {
    color: MAROON_THEME.white,
  },
  monthEventsListContainer: {
    maxHeight: 400,
  },
  monthEventsScrollView: {
    flex: 1,
  },
  noMonthEventsContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
  },
  noMonthEventsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#999999",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  monthEventCard: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: MAROON_THEME.light,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  monthEventHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  monthEventTypeIndicator: {
    position: "relative",
    marginRight: theme.spacing.sm,
    padding: 2,
  },
  monthEventTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: "absolute",
    top: -1,
    right: -1,
  },
  monthEventDetails: {
    flex: 1,
  },
  monthEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: MAROON_THEME.text,
    marginBottom: 2,
  },
  monthEventDate: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.primary,
  },
  monthEventTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: theme.spacing.xs,
  },
  monthEventTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  monthEventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#333333",
    marginTop: theme.spacing.xs,
    lineHeight: 16,
  },

  // Debug Styles
  debugContainer: {
    backgroundColor: "#FFF3CD",
    padding: theme.spacing.sm,
    borderRadius: 8,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: "#FFEEBA",
  },
  debugText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#856404",
    marginBottom: 2,
  },

  // Modern Date Navigator Styles - Compact & Clean
  dateScrollContainer: {
    backgroundColor: "white",
    margin: theme.spacing.sm,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
    marginBottom: theme.spacing.md,
  },
  dateScrollHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MAROON_THEME.lightGray,
  },
  dateScrollTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: "white",
  },
  backToCalendarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 6,
    backgroundColor: MAROON_THEME.background,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
  },
  backButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.primary,
    marginLeft: 3,
  },
  dateScrollContent: {
    paddingVertical: theme.spacing.xs,
  },
  dateScrollCard: {
    backgroundColor: MAROON_THEME.background,
    borderRadius: 8,
    padding: theme.spacing.xs,
    marginHorizontal: 6,
    minWidth: 56,
    alignItems: "center",
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
    elevation: 0,
    shadowColor: "transparent",
  },
  dateScrollCardSelected: {
    backgroundColor: "maroon",
    borderColor: MAROON_THEME.primary,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dateScrollCardToday: {
    borderColor: MAROON_THEME.primary,
    borderWidth: 1.5,
    backgroundColor: MAROON_THEME.lighter,
  },
  dateScrollCardCenter: {
    borderColor: MAROON_THEME.primary,
    borderWidth: 1.5,
    backgroundColor: "maroon",
  },
  dateScrollDay: {
    fontFamily: theme.fonts.medium,
    fontSize: 10,
    color: "white",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  dateScrollDaySelected: {
    color: MAROON_THEME.white,
  },
  dateScrollNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: MAROON_THEME.text,
    marginBottom: 1,
  },
  dateScrollNumberSelected: {
    color: MAROON_THEME.white,
  },
  dateScrollNumberToday: {
    color: MAROON_THEME.primary,
  },
  dateScrollMonth: {
    fontFamily: theme.fonts.medium,
    fontSize: 9,
    color: "white",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  dateScrollMonthSelected: {
    color: MAROON_THEME.white,
  },
  dateScrollEventIndicators: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  dateScrollEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 0.5,
  },
  dateScrollMoreEvents: {
    fontFamily: theme.fonts.semibold,
    fontSize: 7,
    color: MAROON_THEME.gray,
    marginLeft: 1,
  },

  // Enhanced Month Data Display Styles
  enhancedMonthContainer: {
    backgroundColor: MAROON_THEME.white,
    margin: theme.spacing.md,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginBottom: theme.spacing.xl,
  },

  // Modern Loading States
  monthLoadingContainer: {
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    backgroundColor: MAROON_THEME.background,
    borderRadius: 12,
    margin: theme.spacing.sm,
  },
  monthLoadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: MAROON_THEME.gray,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },

  // Modern Error States
  monthErrorContainer: {
    padding: theme.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 160,
    backgroundColor: MAROON_THEME.background,
    borderRadius: 12,
    margin: theme.spacing.sm,
  },
  monthErrorText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#FF6B6B",
    marginVertical: theme.spacing.sm,
    textAlign: "center",
  },
  monthRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MAROON_THEME.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: 20,
    marginTop: theme.spacing.xs,
    elevation: 1,
    shadowColor: MAROON_THEME.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  monthRetryText: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: MAROON_THEME.white,
    marginLeft: 4,
  },

  // Enhanced Header
  enhancedMonthHeader: {
    background: `linear-gradient(135deg, ${MAROON_THEME.primary} 0%, ${MAROON_THEME.light} 100%)`,
    backgroundColor: MAROON_THEME.primary,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  monthHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.lg,
  },
  enhancedMonthTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: MAROON_THEME.white,
    marginBottom: 4,
  },
  monthSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: MAROON_THEME.lighter,
    opacity: 0.9,
  },
  enhancedCloseButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // Stats Cards
  statsCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: theme.spacing.md,
  },
  statsCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statsNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: MAROON_THEME.white,
    marginVertical: 4,
  },
  statsLabel: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.lighter,
    opacity: 0.9,
  },

  // Tabbed Content
  tabbedContentContainer: {
    flex: 1,
  },
  tabsHeader: {
    flexDirection: "row",
    backgroundColor: MAROON_THEME.background,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 8,
    marginHorizontal: 2,
    backgroundColor: MAROON_THEME.white,
    borderWidth: 1,
    borderColor: MAROON_THEME.lightGray,
  },
  tabButtonActive: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
  },
  tabButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: MAROON_THEME.primary,
    marginLeft: 4,
    textAlign: "center",
  },
  tabButtonTextActive: {
    color: MAROON_THEME.white,
  },

  // Tab Content
  tabContentScroll: {
    flex: 1,
    maxHeight: 400,
  },
  tabContent: {
    padding: theme.spacing.md,
  },

  // Enhanced Event Cards
  enhancedEventCard: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  enhancedHolidayCard: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  enhancedClassCard: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "hidden",
  },
  enhancedEventHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  eventCategoryIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: theme.spacing.sm,
  },
  enhancedEventInfo: {
    flex: 1,
  },
  enhancedEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: MAROON_THEME.text,
    marginBottom: 2,
  },
  enhancedEventCategory: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: MAROON_THEME.gray,
  },
  enhancedEventDetails: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  eventDetailText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: MAROON_THEME.text,
    marginLeft: 6,
  },
  enhancedEventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: MAROON_THEME.gray,
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: MAROON_THEME.background,
  },

  // Empty State
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
  },
  emptyStateText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: "#999999",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },

  // Modern Selected Month Container Styles
  selectedMonthContainer: {
    flex: 1,
    backgroundColor: MAROON_THEME.white,
    borderRadius: 16,
    margin: theme.spacing.sm,
    overflow: "hidden",
  },
  selectedMonthHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: theme.spacing.md,
    backgroundColor: MAROON_THEME.primary,
    elevation: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: theme.spacing.xm,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginRight: theme.spacing.md,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitleContainer: {
    flex: 1,
  },
  selectedMonthTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: MAROON_THEME.white,
  },
  selectedMonthSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  monthDataList: {
    flex: 1,
    padding: theme.spacing.sm,
  },

  // Month Filter Bar Styles
  monthFilterContainer: {
    backgroundColor: MAROON_THEME.white,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MAROON_THEME.background,
  },
  monthFilterScrollContent: {
    paddingHorizontal: theme.spacing.sm,
  },
  monthFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    borderRadius: 20,
    backgroundColor: MAROON_THEME.background,
    borderWidth: 1,
    borderColor: MAROON_THEME.primary,
  },
  monthFilterButtonActive: {
    backgroundColor: MAROON_THEME.primary,
    borderColor: MAROON_THEME.primary,
  },
  monthFilterText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: MAROON_THEME.primary,
    marginLeft: 4,
  },
  monthFilterTextActive: {
    color: MAROON_THEME.white,
  },
  monthSection: {
    marginBottom: theme.spacing.xm,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: MAROON_THEME.background,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  sectionTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 14,
    color: MAROON_THEME.text,
    marginLeft: theme.spacing.xs,
  },
  listItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 0,
    borderLeftColor: MAROON_THEME.primary,
    elevation: 1,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  itemHeader: {
    marginBottom: theme.spacing.xs,
  },
  itemTitle: {
    fontFamily: theme.fonts.semibold,
    fontSize: 15,
    color: MAROON_THEME.text,
    marginBottom: 1,
  },
  itemCategory: {
    fontFamily: theme.fonts.medium,
    fontSize: 11,
    color: MAROON_THEME.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    backgroundColor: MAROON_THEME.lighter,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  itemDetails: {
    gap: 2,
  },
  itemDate: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: MAROON_THEME.text,
  },
  itemTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: MAROON_THEME.text,
  },
  itemInstructor: {
    fontFamily: theme.fonts.medium,
    fontSize: 13,
    color: MAROON_THEME.text,
  },
  itemDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 13,
    color: MAROON_THEME.gray,
    lineHeight: 16,
    marginTop: theme.spacing.xs,
    fontStyle: "italic",
  },
  emptyMonthState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    backgroundColor: MAROON_THEME.background,
    borderRadius: 16,
    margin: theme.spacing.sm,
  },
  emptyMonthText: {
    fontFamily: theme.fonts.medium,
    fontSize: 15,
    color: MAROON_THEME.gray,
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },

  // Timeline/Calendar Grid Styles
  timelineGridContainer: {
    backgroundColor: MAROON_THEME.white,
    borderRadius: 12,
    margin: theme.spacing.sm,
  },
  calendarGrid: {
    padding: theme.spacing.md,
  },
  weekHeader: {
    flexDirection: "row",
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: MAROON_THEME.background,
    marginBottom: theme.spacing.sm,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: "center",
    fontFamily: theme.fonts.semibold,
    fontSize: 12,
    color: MAROON_THEME.primary,
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%", // 100% / 7 days
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    position: "relative",
  },
  todayCell: {
    backgroundColor: MAROON_THEME.lighter,
    borderRadius: 8,
  },
  otherMonthCell: {
    opacity: 0.3,
  },
  dayText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: MAROON_THEME.text,
  },
  todayText: {
    color: MAROON_THEME.primary,
    fontFamily: theme.fonts.bold,
  },
  otherMonthText: {
    color: MAROON_THEME.gray,
  },
  eventIndicators: {
    position: "absolute",
    bottom: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreEventsIndicator: {
    fontFamily: theme.fonts.bold,
    fontSize: 8,
    color: MAROON_THEME.primary,
    marginLeft: 2,
  },
});

export default UniversalSchoolCalendar;
