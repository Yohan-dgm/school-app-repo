import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useSelector, useDispatch } from "react-redux";
import { theme } from "../../../../styles/theme";
// Import calendar API hooks and selectors
import {
  useGetCalendarEventsQuery,
  useGetHolidaysQuery,
  useGetSpecialClassesQuery,
  useGetExamsQuery,
} from "../../../../api/calendar-api";
import {
  selectSelectedDate,
  selectCalendarViewMode,
  selectIsCalendarExpanded,
  selectAllEvents,
  setSelectedDate,
  setCalendarViewMode,
  setCalendarExpanded,
  updateAllEvents,
  mergeCalendarData,
  selectEventsByDateMemoized,
  selectCalendarMarkingsMemoized,
} from "../../../../state-store/slices/calendar/calendarSlice";
// Header and BottomNavigation now handled by parent layout

const CalendarMain = () => {
  // Redux hooks
  const dispatch = useDispatch();

  // Check if calendar state exists before using selectors
  const hasCalendarState = useSelector((state) => !!state.calendar);

  // Use safe selectors with fallbacks
  const selectedDate = useSelector(selectSelectedDate);
  const calendarViewMode = useSelector(selectCalendarViewMode);
  const isCalendarExpanded = useSelector(selectIsCalendarExpanded);
  const schoolEvents = useSelector(selectAllEvents);

  // Use memoized selector for selected date events
  const selectedDateEvents = useSelector((state) =>
    selectEventsByDateMemoized(state, selectedDate),
  );

  // Use memoized selector for calendar markings
  const calendarMarkings = useSelector(selectCalendarMarkingsMemoized);

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

  const loading =
    eventsLoading || holidaysLoading || specialClassesLoading || examsLoading;

  // Local state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeAttendanceTab, setActiveAttendanceTab] = useState("academic"); // "academic", "sport", "event"
  const [compactMode, setCompactMode] = useState(true); // New compact mode state

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

    console.log("📅 CalendarMain - Data merged:", {
      events: events.length,
      holidays: holidays.length,
      specialClasses: specialClasses.length,
      exams: exams.length,
      total: mergedEvents.length,
    });
  }, [eventsData, holidaysData, specialClassesData, examsData, dispatch]);

  // Handle errors silently - just log them
  useEffect(() => {
    if (eventsError || holidaysError || specialClassesError || examsError) {
      console.log("📅 Calendar API Errors:", {
        events: eventsError,
        holidays: holidaysError,
        specialClasses: specialClassesError,
        exams: examsError,
      });
      // No alert shown - errors are handled gracefully
    }
  }, [eventsError, holidaysError, specialClassesError, examsError]);

  // Log calendar data updates
  useEffect(() => {
    console.log(
      `📅 Calendar data updated: ${schoolEvents.length} events loaded`,
    );
    console.log("📅 Has calendar state:", hasCalendarState);
  }, [schoolEvents, hasCalendarState]);

  // Early return if calendar state is not available
  if (!hasCalendarState) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F8F9FA",
        }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666666" }}>
          Initializing calendar...
        </Text>
      </View>
    );
  }

  // Tab press handling now done by layout

  const handleEventPress = (event) => {
    console.log("Navigate to event detail:", event.title);
  };

  // Refresh calendar data
  const handleRefresh = async () => {
    console.log("📅 Refreshing calendar data...");
    try {
      await Promise.all([
        refetchEvents(),
        refetchHolidays(),
        refetchSpecialClasses(),
        refetchExams(),
      ]);
    } catch (error) {
      console.log("📅 Refresh error:", error);
    }
  };

  const handleAttendancePress = () => {
    console.log("Navigate to attendance detail");
  };

  const handleViewAllEvents = () => {
    console.log("Navigate to all events page");
  };

  const handleDayPress = (day) => {
    dispatch(setSelectedDate(day.dateString));
    // Switch to horizontal calendar view when a date is selected
    dispatch(setCalendarExpanded(false));
  };

  const handleMonthPress = (monthIndex) => {
    setSelectedMonth(monthIndex);
    // Set selected date to first day of selected month
    const newDate = new Date(selectedYear, monthIndex, 1);
    setSelectedDate(newDate.toISOString().split("T")[0]);
  };

  const handleDayCalendarPress = () => {
    setCalendarViewMode("day");
  };

  const handleMonthCalendarPress = () => {
    setCalendarViewMode("month");
  };

  const handleCalendarExpandToggle = () => {
    setIsCalendarExpanded(!isCalendarExpanded);
  };

  const getMonthName = (monthIndex) => {
    const months = [
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
    return months[monthIndex];
  };

  const getEventsForMonth = (monthIndex, year) => {
    if (!schoolEvents || !Array.isArray(schoolEvents)) {
      return [];
    }
    return schoolEvents.filter((event) => {
      if (!event || !event.date) return false;
      // Use date field from unified calendar item
      const eventDate = new Date(event.date);
      return (
        eventDate.getMonth() === monthIndex && eventDate.getFullYear() === year
      );
    });
  };

  // schoolEvents now comes from Redux state (selectAllEvents)
  // The data is fetched from 5 backend API endpoints and normalized
  // Original dummy data structure is preserved through normalization

  // Complete student attendance data for July 2025 - Academic, Sport, Event
  // API Structure: GET /api/student/attendance?month=2025-07&student_id=123&type=academic
  // Response: { attendance: {...}, success: true }

  // Academic Attendance Data
  const academicAttendance = {
    month: "2025-07",
    studentId: "STU123",
    studentName: "John Doe",
    grade: "Grade 10",
    type: "academic",
    totalSchoolDays: 22,
    presentDays: 19,
    absentDays: 3,
    holidayDays: 9,
    weekendDays: 0, // Weekends handled separately
    attendancePercentage: 86.4,
    // Complete month attendance record
    dailyAttendance: {
      "2025-07-01": {
        status: "holiday",
        reason: "New Year's Day",
        note: "National Holiday",
      },
      "2025-07-02": {
        status: "present",
        checkIn: "08:15 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-03": {
        status: "present",
        checkIn: "08:10 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-04": { status: "weekend", reason: "Saturday" },
      "2025-07-05": { status: "weekend", reason: "Sunday" },
      "2025-07-06": {
        status: "present",
        checkIn: "08:20 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-07": {
        status: "present",
        checkIn: "08:05 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-08": {
        status: "absent",
        reason: "Sick Leave",
        note: "Medical certificate provided",
      },
      "2025-07-09": {
        status: "present",
        checkIn: "08:15 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-10": {
        status: "present",
        checkIn: "08:12 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-11": { status: "weekend", reason: "Saturday" },
      "2025-07-12": { status: "weekend", reason: "Sunday" },
      "2025-07-13": {
        status: "present",
        checkIn: "08:18 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-14": {
        status: "present",
        checkIn: "08:08 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-15": {
        status: "present",
        checkIn: "08:25 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-16": {
        status: "present",
        checkIn: "08:15 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-17": {
        status: "present",
        checkIn: "08:10 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-18": { status: "weekend", reason: "Saturday" },
      "2025-07-19": { status: "weekend", reason: "Sunday" },
      "2025-07-20": {
        status: "present",
        checkIn: "08:20 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-21": {
        status: "present",
        checkIn: "08:15 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-22": {
        status: "present",
        checkIn: "08:12 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-23": {
        status: "present",
        checkIn: "08:18 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-24": {
        status: "present",
        checkIn: "08:10 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-25": { status: "weekend", reason: "Saturday" },
      "2025-07-26": {
        status: "holiday",
        reason: "Republic Day",
        note: "National Holiday",
      },
      "2025-07-27": {
        status: "present",
        checkIn: "08:15 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-28": {
        status: "present",
        checkIn: "08:20 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-29": {
        status: "absent",
        reason: "Family Emergency",
        note: "Prior permission taken",
      },
      "2025-07-30": {
        status: "present",
        checkIn: "08:12 AM",
        checkOut: "03:30 PM",
      },
      "2025-07-31": {
        status: "absent",
        reason: "Sick Leave",
        note: "Fever - Medical certificate provided",
      },
    },
    // Summary for quick access
    recentAttendance: [
      { date: "2025-07-31", status: "absent", reason: "Sick Leave" },
      { date: "2025-07-30", status: "present", checkIn: "08:12 AM" },
      { date: "2025-07-29", status: "absent", reason: "Family Emergency" },
      { date: "2025-07-28", status: "present", checkIn: "08:20 AM" },
      { date: "2025-07-27", status: "present", checkIn: "08:15 AM" },
    ],
  };

  // Sport Attendance Data
  const sportAttendance = {
    month: "2025-07",
    studentId: "STU123",
    studentName: "John Doe",
    grade: "Grade 10",
    type: "sport",
    totalSportDays: 12,
    presentDays: 10,
    absentDays: 2,
    holidayDays: 9,
    weekendDays: 0,
    attendancePercentage: 83.3,
    // Sport-specific attendance record
    dailyAttendance: {
      "2025-07-02": {
        status: "present",
        activity: "Basketball Practice",
        checkIn: "04:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-03": {
        status: "present",
        activity: "Football Training",
        checkIn: "04:15 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-04": { status: "weekend", reason: "Saturday" },
      "2025-07-05": { status: "weekend", reason: "Sunday" },
      "2025-07-09": {
        status: "present",
        activity: "Swimming Practice",
        checkIn: "04:00 PM",
        checkOut: "05:30 PM",
      },
      "2025-07-10": {
        status: "absent",
        activity: "Basketball Practice",
        reason: "Injury",
        note: "Ankle sprain - Medical certificate provided",
      },
      "2025-07-16": {
        status: "present",
        activity: "Football Match",
        checkIn: "03:00 PM",
        checkOut: "05:00 PM",
      },
      "2025-07-17": {
        status: "present",
        activity: "Athletics Training",
        checkIn: "04:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-20": {
        status: "present",
        activity: "Basketball Championship",
        checkIn: "04:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-23": {
        status: "present",
        activity: "Swimming Competition",
        checkIn: "03:30 PM",
        checkOut: "05:30 PM",
      },
      "2025-07-24": {
        status: "present",
        activity: "Football Practice",
        checkIn: "04:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-30": {
        status: "present",
        activity: "Athletics Meet",
        checkIn: "03:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-31": {
        status: "absent",
        activity: "Basketball Practice",
        reason: "Family Event",
        note: "Prior permission taken",
      },
    },
    recentAttendance: [
      {
        date: "2025-07-31",
        status: "absent",
        reason: "Family Event",
        activity: "Basketball Practice",
      },
      {
        date: "2025-07-30",
        status: "present",
        checkIn: "03:00 PM",
        activity: "Athletics Meet",
      },
      {
        date: "2025-07-24",
        status: "present",
        checkIn: "04:00 PM",
        activity: "Football Practice",
      },
      {
        date: "2025-07-23",
        status: "present",
        checkIn: "03:30 PM",
        activity: "Swimming Competition",
      },
      {
        date: "2025-07-20",
        status: "present",
        checkIn: "04:00 PM",
        activity: "Basketball Championship",
      },
    ],
  };

  // Event Attendance Data
  const eventAttendance = {
    month: "2025-07",
    studentId: "STU123",
    studentName: "John Doe",
    grade: "Grade 10",
    type: "event",
    totalEventDays: 8,
    presentDays: 7,
    absentDays: 1,
    holidayDays: 9,
    weekendDays: 0,
    attendancePercentage: 87.5,
    // Event-specific attendance record
    dailyAttendance: {
      "2025-07-03": {
        status: "present",
        event: "Republic Day Celebration",
        checkIn: "08:00 AM",
        checkOut: "12:00 PM",
      },
      "2025-07-04": {
        status: "present",
        event: "Drama Club Performance",
        checkIn: "07:00 PM",
        checkOut: "09:00 PM",
      },
      "2025-07-05": {
        status: "present",
        event: "Art Exhibition",
        checkIn: "03:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-12": {
        status: "present",
        event: "Music Concert",
        checkIn: "06:00 PM",
        checkOut: "08:00 PM",
      },
      "2025-07-18": {
        status: "present",
        event: "Science Fair",
        checkIn: "02:00 PM",
        checkOut: "06:00 PM",
      },
      "2025-07-22": {
        status: "present",
        event: "Parent-Teacher Conference",
        checkIn: "04:00 PM",
        checkOut: "08:00 PM",
      },
      "2025-07-25": {
        status: "absent",
        event: "Cultural Program",
        reason: "Sick Leave",
        note: "Fever - Medical certificate provided",
      },
      "2025-07-28": {
        status: "present",
        event: "Awards Ceremony",
        checkIn: "10:00 AM",
        checkOut: "12:00 PM",
      },
    },
    recentAttendance: [
      {
        date: "2025-07-28",
        status: "present",
        checkIn: "10:00 AM",
        event: "Awards Ceremony",
      },
      {
        date: "2025-07-25",
        status: "absent",
        reason: "Sick Leave",
        event: "Cultural Program",
      },
      {
        date: "2025-07-22",
        status: "present",
        checkIn: "04:00 PM",
        event: "Parent-Teacher Conference",
      },
      {
        date: "2025-07-18",
        status: "present",
        checkIn: "02:00 PM",
        event: "Science Fair",
      },
      {
        date: "2025-07-12",
        status: "present",
        checkIn: "06:00 PM",
        event: "Music Concert",
      },
    ],
  };

  // Get current attendance data based on active tab
  const getCurrentAttendanceData = () => {
    switch (activeAttendanceTab) {
      case "academic":
        return academicAttendance;
      case "sport":
        return sportAttendance;
      case "event":
        return eventAttendance;
      default:
        return academicAttendance;
    }
  };

  // Create marked dates for school events calendar with enhanced highlighting
  const getSchoolEventsMarkedDates = () => {
    const marked = {};

    if (!schoolEvents || !Array.isArray(schoolEvents)) {
      return marked;
    }

    // Mark school event dates with enhanced styling
    schoolEvents.forEach((event) => {
      if (!event || !event.date) return;
      const eventDate = event.date;
      if (!marked[eventDate]) {
        marked[eventDate] = {
          customStyles: {
            container: {
              backgroundColor: getEventTypeColor(event.type) + "20",
              borderRadius: 20,
              borderWidth: 2,
              borderColor: getEventTypeColor(event.type),
              width: 40,
              height: 40,
              justifyContent: "center",
              alignItems: "center",
            },
            text: {
              color: getEventTypeColor(event.type),
              fontWeight: "bold",
            },
          },
          marked: true,
          dotColor: getEventTypeColor(event.type),
        };
      }
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: "#FFFFFF",
        customStyles: {
          ...marked[selectedDate]?.customStyles,
          container: {
            ...marked[selectedDate]?.customStyles?.container,
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
          },
          text: {
            color: "#FFFFFF",
            fontWeight: "bold",
          },
        },
      };
    }

    return marked;
  };

  // Create marked dates for student attendance calendar
  const getAttendanceMarkedDates = () => {
    const marked = {};
    const currentAttendance = getCurrentAttendanceData();

    // Mark attendance dates with color coding
    Object.keys(currentAttendance.dailyAttendance).forEach((date) => {
      const record = currentAttendance.dailyAttendance[date];
      marked[date] = {
        customStyles: {
          container: {
            backgroundColor:
              record.status === "present"
                ? "#E8F5E8" // Light green for present
                : record.status === "absent"
                  ? "#FFE8E8" // Light red for absent
                  : record.status === "holiday"
                    ? "#FFF3E0" // Light orange for holidays
                    : record.status === "weekend"
                      ? "#F5F5F5" // Gray for weekends
                      : "#F0F0F0", // Default gray
            borderRadius: 20, // Changed from 8 to 20 to make it circular
            width: 40, // Set fixed width for perfect circle
            height: 40, // Set fixed height for perfect circle
            borderWidth: record.status === "present" ? 2 : 1,
            borderColor:
              record.status === "present"
                ? "#4CAF50"
                : record.status === "absent"
                  ? "#FF5722"
                  : record.status === "holiday"
                    ? "#FF9800"
                    : record.status === "weekend"
                      ? "#9E9E9E"
                      : "#E0E0E0",
            justifyContent: "center", // Center the text vertically
            alignItems: "center", // Center the text horizontally
          },
          text: {
            color: record.status === "weekend" ? "#9E9E9E" : "#333",
            fontWeight: record.status === "present" ? "bold" : "normal",
          },
        },
      };
    });

    // Mark selected date
    if (selectedDate) {
      marked[selectedDate] = {
        ...marked[selectedDate],
        selected: true,
        selectedColor: theme.colors.primary,
        selectedTextColor: "#FFFFFF",
      };
    }

    return marked;
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case "exam":
        return "#FF5722"; // Red for exams
      case "event":
        return "#4CAF50"; // Green for general events
      case "meeting":
        return "#2196F3"; // Blue for meetings
      case "activity":
        return "#FF9800"; // Orange for activities
      case "sports":
        return "#E91E63"; // Pink for sports
      case "cultural":
        return "#9C27B0"; // Purple for cultural events
      case "holiday":
        return "#795548"; // Brown for holidays
      case "class":
        return "#9C27B0"; // Purple for special classes
      default:
        return theme.colors.primary;
    }
  };

  const getEventTypeIcon = (type) => {
    switch (type) {
      case "exam":
        return "quiz";
      case "event":
        return "event";
      case "meeting":
        return "people";
      case "activity":
        return "directions-run";
      case "sports":
        return "sports";
      case "cultural":
        return "theater-comedy";
      case "holiday":
        return "beach-access";
      case "class":
        return "star"; // Star icon for special classes
      default:
        return "event";
    }
  };

  // Get school events for selected date
  const getSchoolEventsForDate = (date) => {
    if (!schoolEvents || !Array.isArray(schoolEvents)) {
      return [];
    }
    return schoolEvents.filter((event) => {
      if (!event) return false;
      // Check both startDate and endDate for multi-day events
      const startDate = event.startDate || event.date;
      const endDate = event.endDate || event.date;

      if (!startDate) return false;
      // Event is on selected date if date falls between start and end dates
      return date >= startDate && date <= endDate;
    });
  };

  // Get attendance for selected date
  const getAttendanceForDate = (date) => {
    const currentAttendance = getCurrentAttendanceData();
    return currentAttendance.dailyAttendance[date] || null;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  // Generate dates for horizontal calendar view (7 days with selected date in middle)
  const getHorizontalCalendarDates = () => {
    const dates = [];
    const selectedDateObj = new Date(selectedDate);
    const todayString = new Date().toISOString().split("T")[0];

    // Start from 3 days before selected date to 3 days after (total 7 days)
    for (let i = -3; i <= 3; i++) {
      const date = new Date(selectedDateObj);
      date.setDate(selectedDateObj.getDate() + i);
      const dateString = date.toISOString().split("T")[0];

      dates.push({
        date: dateString,
        dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
        dayNumber: date.getDate(),
        monthName: date.toLocaleDateString("en-US", { month: "short" }),
        isToday: dateString === todayString,
        isSelected: dateString === selectedDate,
        events:
          selectedDateEvents.length > 0 && dateString === selectedDate
            ? selectedDateEvents
            : getSchoolEventsForDate(dateString),
      });
    }

    return dates;
  };

  // Handle date selection in horizontal view (without changing view)
  const handleHorizontalDatePress = (dateString) => {
    setSelectedDate(dateString);
  };

  // Convert school events to agenda format
  const getAgendaItems = () => {
    const agendaItems = {};

    schoolEvents.forEach((event) => {
      const dateKey = event.date;
      if (!agendaItems[dateKey]) {
        agendaItems[dateKey] = [];
      }

      agendaItems[dateKey].push({
        name: event.title,
        height: event.description ? 120 : 100, // Dynamic height based on content
        day: dateKey,
        ...event,
      });
    });

    // Sort events by time for each date
    Object.keys(agendaItems).forEach((date) => {
      agendaItems[date].sort((a, b) => {
        const timeA = a.time.split(" ")[0];
        const timeB = b.time.split(" ")[0];
        return timeA.localeCompare(timeB);
      });
    });

    // Add some empty dates to ensure agenda shows properly
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Add empty dates for the current month to ensure agenda displays
    for (let i = 1; i <= 31; i++) {
      const date = new Date(currentYear, currentMonth, i);
      if (date.getMonth() === currentMonth) {
        const dateKey = date.toISOString().split("T")[0];
        if (!agendaItems[dateKey]) {
          agendaItems[dateKey] = [];
        }
      }
    }

    console.log("Agenda Items:", agendaItems); // Debug log
    return agendaItems;
  };

  // Render agenda item
  const renderAgendaItem = (item) => {
    return (
      <TouchableOpacity
        style={[
          styles.agendaItem,
          { borderLeftColor: getEventTypeColor(item.type) },
        ]}
        onPress={() => handleEventPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.agendaItemHeader}>
          <View style={styles.agendaItemTitleRow}>
            <Text style={styles.agendaItemTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View
              style={[
                styles.agendaItemTypeBadge,
                { backgroundColor: getEventTypeColor(item.type) + "20" },
              ]}
            >
              <Text
                style={[
                  styles.agendaItemTypeText,
                  { color: getEventTypeColor(item.type) },
                ]}
              >
                {item.type.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.agendaItemTime}>{item.time}</Text>
          {item.description && (
            <Text style={styles.agendaItemDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>

        <View style={styles.agendaItemDetails}>
          <View style={styles.agendaItemDetailRow}>
            <MaterialIcons name="person" size={14} color="#666" />
            <Text style={styles.agendaItemDetailText} numberOfLines={1}>
              {item.teacher}
            </Text>
          </View>
          <View style={styles.agendaItemDetailRow}>
            <MaterialIcons name="location-on" size={14} color="#666" />
            <Text style={styles.agendaItemDetailText} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
          <View style={styles.agendaItemDetailRow}>
            <MaterialIcons name="school" size={14} color="#666" />
            <Text style={styles.agendaItemDetailText} numberOfLines={1}>
              {item.grade}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render empty agenda date
  const renderEmptyDate = () => {
    return (
      <View style={styles.emptyDate}>
        <MaterialIcons name="event-available" size={24} color="#CCCCCC" />
        <Text style={styles.emptyDateText}>No events scheduled</Text>
        <Text style={styles.emptyDateSubtext}>This day is free</Text>
      </View>
    );
  };

  // Show loading indicator while fetching data
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading calendar data...</Text>
        {lastFetched && (
          <Text style={styles.lastFetchedText}>
            Last updated: {new Date(lastFetched).toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header Section */}
      {/* <View>
        <Text style={styles.headerTitle}>📅 School Events Calendar</Text>
      </View> */}

      {/* Fixed Calendar Section */}
      <View style={styles.fixedCalendarSection}>
        {/* Calendar Type Selector */}
        <View style={styles.calendarTypeSelector}>
          {/* <Text style={styles.calendarTitle}>School Calendar</Text> */}
          <View style={styles.calendarHeaderRow}>
            <View style={styles.calendarToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.calendarToggleButton,
                  calendarViewMode === "day" &&
                    styles.activeCalendarToggleButton,
                ]}
                onPress={handleDayCalendarPress}
              >
                <Text
                  style={[
                    styles.calendarToggleText,
                    calendarViewMode === "day" &&
                      styles.activeCalendarToggleText,
                  ]}
                >
                  Day Calendar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.calendarToggleButton,
                  calendarViewMode === "month" &&
                    styles.activeCalendarToggleButton,
                ]}
                onPress={handleMonthCalendarPress}
              >
                <Text
                  style={[
                    styles.calendarToggleText,
                    calendarViewMode === "month" &&
                      styles.activeCalendarToggleText,
                  ]}
                >
                  Month Calendar
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calendar Expand/Collapse Button */}
            <TouchableOpacity
              style={styles.expandToggleButton}
              onPress={handleCalendarExpandToggle}
            >
              <MaterialIcons
                name={isCalendarExpanded ? "more-horiz" : "grid-view"}
                size={20}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Year Selector for Month View - Below Header Row */}
          {calendarViewMode === "month" && (
            <View style={styles.yearSelectorContainer}>
              <TouchableOpacity
                style={styles.yearNavigationButton}
                onPress={() => setSelectedYear(selectedYear - 1)}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
              <Text style={styles.yearSelectorText}>{selectedYear}</Text>
              <TouchableOpacity
                style={styles.yearNavigationButton}
                onPress={() => setSelectedYear(selectedYear + 1)}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Calendar View - Show horizontal or grid based on expand state */}
        {calendarViewMode === "day" && (
          <>
            {!isCalendarExpanded ? (
              // Horizontal Scroll Calendar
              <View style={styles.horizontalCalendarWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalCalendarContent}
                  snapToInterval={70} // Snap to each date card
                  decelerationRate="fast"
                >
                  {getHorizontalCalendarDates().map((dateItem, index) => (
                    <TouchableOpacity
                      key={dateItem.date}
                      style={[
                        styles.horizontalDateCard,
                        dateItem.isSelected &&
                          styles.selectedHorizontalDateCard,
                        dateItem.isToday &&
                          !dateItem.isSelected &&
                          styles.todayHorizontalDateCard,
                      ]}
                      onPress={() => handleHorizontalDatePress(dateItem.date)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.horizontalDateDayName,
                          dateItem.isSelected &&
                            styles.selectedHorizontalDateText,
                          dateItem.isToday &&
                            !dateItem.isSelected &&
                            styles.todayHorizontalDateText,
                        ]}
                      >
                        {dateItem.dayName}
                      </Text>
                      <Text
                        style={[
                          styles.horizontalDateNumber,
                          dateItem.isSelected &&
                            styles.selectedHorizontalDateText,
                          dateItem.isToday &&
                            !dateItem.isSelected &&
                            styles.todayHorizontalDateText,
                        ]}
                      >
                        {dateItem.dayNumber}
                      </Text>
                      <Text
                        style={[
                          styles.horizontalDateMonth,
                          dateItem.isSelected &&
                            styles.selectedHorizontalDateText,
                          dateItem.isToday &&
                            !dateItem.isSelected &&
                            styles.todayHorizontalDateText,
                        ]}
                      >
                        {dateItem.monthName}
                      </Text>
                      {/* Event indicators */}
                      {dateItem.events.length > 0 && (
                        <View style={styles.horizontalEventIndicators}>
                          {dateItem.events
                            .slice(0, 3)
                            .map((event, eventIndex) => (
                              <View
                                key={eventIndex}
                                style={[
                                  styles.horizontalEventDot,
                                  {
                                    backgroundColor: getEventTypeColor(
                                      event.type,
                                    ),
                                  },
                                ]}
                              />
                            ))}
                          {dateItem.events.length > 3 && (
                            <Text style={styles.horizontalMoreEventsText}>
                              +{dateItem.events.length - 3}
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : (
              // Grid Calendar (existing)
              <View style={styles.calendarWrapper}>
                <Calendar
                  current={selectedDate}
                  onDayPress={handleDayPress}
                  markedDates={{
                    ...calendarMarkings,
                    [selectedDate]: {
                      ...calendarMarkings[selectedDate],
                      selected: true,
                      selectedColor: theme.colors.primary,
                    },
                  }}
                  markingType="multi-dot"
                  theme={{
                    backgroundColor: "#ffffff",
                    calendarBackground: "#ffffff",
                    textSectionTitleColor: theme.colors.text,
                    selectedDayBackgroundColor: theme.colors.primary,
                    selectedDayTextColor: "#ffffff",
                    todayTextColor: theme.colors.primary,
                    dayTextColor: theme.colors.text,
                    textDisabledColor: "#d9e1e8",
                    dotColor: theme.colors.primary,
                    selectedDotColor: "#ffffff",
                    arrowColor: theme.colors.primary,
                    disabledArrowColor: "#d9e1e8",
                    monthTextColor: theme.colors.text,
                    indicatorColor: theme.colors.primary,
                    textDayFontFamily: theme.fonts.regular,
                    textMonthFontFamily: theme.fonts.bold,
                    textDayHeaderFontFamily: theme.fonts.medium,
                    textDayFontSize: 14, // Reduced font size
                    textMonthFontSize: 16, // Reduced font size
                    textDayHeaderFontSize: 12, // Reduced font size
                  }}
                  style={styles.calendar}
                />
              </View>
            )}
          </>
        )}

        {/* Month Calendar View - Show all months */}
        {calendarViewMode === "month" && (
          <View style={styles.yearViewContainer}>
            <ScrollView
              contentContainerStyle={styles.monthsGrid}
              showsVerticalScrollIndicator={false}
            >
              {Array.from({ length: 12 }, (_, index) => {
                const monthEvents = getEventsForMonth(index, selectedYear);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.monthCard,
                      selectedMonth === index && styles.selectedMonthCard,
                    ]}
                    onPress={() => handleMonthPress(index)}
                  >
                    <Text
                      style={[
                        styles.monthCardTitle,
                        selectedMonth === index &&
                          styles.selectedMonthCardTitle,
                      ]}
                    >
                      {getMonthName(index)}
                    </Text>
                    <Text style={styles.monthCardEvents}>
                      {monthEvents.length} events
                    </Text>
                    {monthEvents.length > 0 && (
                      <View style={styles.monthEventIndicators}>
                        {monthEvents.slice(0, 3).map((event, eventIndex) => (
                          <View
                            key={eventIndex}
                            style={[
                              styles.monthEventDot,
                              {
                                backgroundColor: getEventTypeColor(event.type),
                              },
                            ]}
                          />
                        ))}
                        {monthEvents.length > 3 && (
                          <Text style={styles.moreEventsText}>
                            +{monthEvents.length - 3}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Scrollable Content Section */}
      <ScrollView
        style={styles.scrollableContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Selected Date Info */}
        {selectedDate && (
          <View style={styles.selectedDateContainer}>
            <Text style={styles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </Text>

            {/* School Events for selected date - Compact Display */}
            {selectedDateEvents.length > 0 ? (
              <View style={styles.selectedDateEvents}>
                <Text style={styles.selectedDateEventsTitle}>
                  📅 Events Today
                </Text>
                <View style={styles.selectedDateAgendaList}>
                  {selectedDateEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.compactEventCard,
                        { borderLeftColor: getEventTypeColor(event.type) },
                      ]}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.compactEventHeader}>
                        <View style={styles.compactEventTitleRow}>
                          <Text
                            style={styles.compactEventTitle}
                            numberOfLines={1}
                          >
                            {event.title}
                          </Text>
                          <View
                            style={[
                              styles.compactEventTypeBadge,
                              {
                                backgroundColor: getEventTypeColor(event.type),
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={getEventTypeIcon(event.type)}
                              size={10}
                              color="#FFFFFF"
                            />
                          </View>
                        </View>

                        <View style={styles.compactEventInfo}>
                          <View style={styles.compactEventInfoItem}>
                            <MaterialIcons
                              name="access-time"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.compactEventInfoText}>
                              {event.time}
                            </Text>
                          </View>
                          <View style={styles.compactEventInfoItem}>
                            <MaterialIcons
                              name="location-on"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.compactEventInfoText}>
                              {event.location}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.selectedDateEvents}>
                <Text style={styles.selectedDateEventsTitle}>
                  📅 Events Today
                </Text>
                <View style={styles.noEventsContainer}>
                  <MaterialIcons
                    name="event-available"
                    size={32}
                    color="#E0E0E0"
                  />
                  <Text style={styles.noEventsText}>No events scheduled</Text>
                  <Text style={styles.noEventsSubtext}>Free day</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Events Section - Show month events when in month view */}
        {calendarViewMode === "month" && (
          <View style={styles.monthEventsSection}>
            <Text style={styles.sectionTitle}>
              Events in {getMonthName(selectedMonth)} {selectedYear}
            </Text>
            <View style={styles.selectedMonthEventsList}>
              {getEventsForMonth(selectedMonth, selectedYear).length > 0 ? (
                getEventsForMonth(selectedMonth, selectedYear)
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.selectedMonthEventCard,
                        { borderLeftColor: getEventTypeColor(event.type) },
                      ]}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.selectedMonthEventHeader}>
                        <Text
                          style={styles.selectedMonthEventTitle}
                          numberOfLines={1}
                        >
                          {event.title}
                        </Text>
                        <View
                          style={[
                            styles.selectedMonthEventTypeBadge,
                            {
                              backgroundColor:
                                getEventTypeColor(event.type) + "20",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={getEventTypeIcon(event.type)}
                            size={10}
                            color={getEventTypeColor(event.type)}
                          />
                        </View>
                      </View>

                      <View style={styles.selectedMonthEventInfo}>
                        <Text style={styles.selectedMonthEventDate}>
                          {formatDate(event.date)}
                        </Text>
                        {event.time && (
                          <Text style={styles.selectedMonthEventTime}>
                            {event.time}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
              ) : (
                <View style={styles.noMonthEventsContainer}>
                  <MaterialIcons
                    name="event-available"
                    size={48}
                    color="#E0E0E0"
                  />
                  <Text style={styles.noMonthEventsText}>
                    No events in {getMonthName(selectedMonth)}
                  </Text>
                  <Text style={styles.noMonthEventsSubtext}>
                    This month is free from school events
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Selected Day Events Section - Show when in day view */}
        {calendarViewMode === "day" && (
          <View style={styles.selectedDayEventsSection}>
            <Text style={styles.sectionTitle}>📅 Today's Schedule</Text>
            <View style={styles.selectedDayEventsList}>
              {selectedDateEvents.length > 0 ? (
                selectedDateEvents
                  .sort((a, b) =>
                    (a.startTime || "").localeCompare(b.startTime || ""),
                  )
                  .map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      style={[
                        styles.selectedDayEventCard,
                        {
                          borderLeftColor: getEventTypeColor(
                            event.event_category || event.type,
                          ),
                        },
                      ]}
                      onPress={() => handleEventPress(event)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.selectedDayEventHeader}>
                        <Text
                          style={styles.selectedDayEventTitle}
                          numberOfLines={2}
                        >
                          {event.title}
                        </Text>
                        <View
                          style={[
                            styles.selectedDayEventTypeBadge,
                            {
                              backgroundColor:
                                getEventTypeColor(
                                  event.event_category || event.type,
                                ) + "20",
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={getEventTypeIcon(
                              event.event_category || event.type,
                            )}
                            size={10}
                            color={getEventTypeColor(
                              event.event_category || event.type,
                            )}
                          />
                        </View>
                      </View>

                      {/* Show description if available */}
                      {event.description && (
                        <Text
                          style={styles.selectedDayEventDescription}
                          numberOfLines={2}
                        >
                          {event.description}
                        </Text>
                      )}

                      <View style={styles.selectedDayEventInfo}>
                        <View style={styles.selectedDayEventInfoItem}>
                          <MaterialIcons
                            name="access-time"
                            size={12}
                            color="#666"
                          />
                          <Text style={styles.selectedDayEventInfoText}>
                            {event.startTime && event.endTime
                              ? `${event.startTime} - ${event.endTime}`
                              : event.startTime || event.time || "All day"}
                          </Text>
                        </View>

                        {/* Show multi-day indicator */}
                        {event.isMultiDay && (
                          <View style={styles.selectedDayEventInfoItem}>
                            <MaterialIcons
                              name="date-range"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.selectedDayEventInfoText}>
                              {event.start_date} to {event.end_date}
                            </Text>
                          </View>
                        )}

                        {/* Show event category */}
                        {event.event_category && (
                          <View style={styles.selectedDayEventInfoItem}>
                            <MaterialIcons
                              name="category"
                              size={12}
                              color="#666"
                            />
                            <Text style={styles.selectedDayEventInfoText}>
                              {event.event_category}
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
              ) : (
                <View style={styles.noEventsContainer}>
                  <MaterialIcons
                    name="event-available"
                    size={32}
                    color="#E0E0E0"
                  />
                  <Text style={styles.noEventsText}>No events scheduled</Text>
                  <Text style={styles.noEventsSubtext}>
                    This day is free from school events
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions - Hidden */}
        {/* <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => console.log("Add Event")}
            >
              <MaterialIcons
                name="add-circle"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.quickActionText}>Add Event</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => console.log("View Full Calendar")}
            >
              <MaterialIcons
                name="calendar-view-month"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.quickActionText}>Full Calendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => console.log("Event Reminders")}
            >
              <MaterialIcons
                name="notifications"
                size={32}
                color={theme.colors.primary}
              />
              <Text style={styles.quickActionText}>Reminders</Text>
            </TouchableOpacity>
          </View>
        </View> */}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  loadingText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: "center",
  },
  lastFetchedText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginTop: theme.spacing.sm,
    textAlign: "center",
  },
  fixedHeader: {
    padding: theme.spacing.sm,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  fixedCalendarSection: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 380, // Increased to show full calendar
  },
  calendarTypeSelector: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 2, // Reduced padding
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  calendarTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: theme.spacing.sm,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  calendarToggleContainer: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 6,
    padding: 2,
    flex: 1,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    borderRadius: 6,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  expandToggleButton: {
    padding: 10,
    borderRadius: 30,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  calendarToggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  activeCalendarToggleButton: {
    backgroundColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  calendarToggleText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#666666",
  },
  activeCalendarToggleText: {
    color: "#FFFFFF",
    fontFamily: theme.fonts.bold,
  },
  yearSelectorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.xs,
  },
  yearNavigationButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    minWidth: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  yearSelectorText: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
    minWidth: 45,
    textAlign: "center",
    flex: 1,
  },
  yearViewContainer: {
    maxHeight: 220, // Reduced height for month view
    paddingHorizontal: theme.spacing.sm,
  },
  monthsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  monthCard: {
    width: "31%",
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: theme.spacing.xs, // Reduced padding
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minHeight: 50, // Set minimum height for consistency
  },
  selectedMonthCard: {
    backgroundColor: theme.colors.primary + "10",
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  monthCardTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 12, // Reduced font size
    color: theme.colors.text,
    marginBottom: 1,
  },
  selectedMonthCardTitle: {
    color: theme.colors.primary,
  },
  monthCardEvents: {
    fontFamily: theme.fonts.regular,
    fontSize: 9, // Reduced font size
    color: "#666666",
    marginBottom: 1,
  },
  monthEventIndicators: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  monthEventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 3,
    marginBottom: 1,
  },
  moreEventsText: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: "#666666",
    marginLeft: 4,
  },
  monthEventsSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: theme.spacing.md, // Reduced margin
    marginBottom: theme.spacing.md, // Reduced margin
    borderRadius: 12,
    padding: theme.spacing.sm, // Reduced padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthEventsList: {
    gap: theme.spacing.sm,
  },
  monthEventCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  monthEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  monthEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  monthEventTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  monthEventTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  monthEventInfo: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  monthEventInfoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  monthEventInfoText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  monthEventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    lineHeight: 16,
    marginTop: theme.spacing.xs,
  },
  noMonthEventsContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.xl,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  noMonthEventsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: "#999999",
    marginTop: theme.spacing.sm,
  },
  noMonthEventsSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#CCCCCC",
    marginTop: 4,
    textAlign: "center",
  },
  scrollableContent: {
    flex: 1,
    paddingBottom: 120,
    backgroundColor: "#F8F9FA", // Light background for better contrast
  },
  headerTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 25,
    color: theme.colors.primary,
  },
  calendarSection: {
    marginBottom: theme.spacing.lg,
  },
  calendarSectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  calendarSectionSubtitle: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  calendarSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  calendarSectionHeaderSimple: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 2,
  },
  viewToggleButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 6,
    marginHorizontal: 1,
  },
  activeViewToggleButton: {
    backgroundColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
  },
  activeViewToggleText: {
    color: "#FFFFFF",
  },
  attendanceLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    paddingVertical: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.xs,
  },
  legendText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.text,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 0,
    marginBottom: 0,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarWrapper: {
    paddingHorizontal: 0,
    paddingBottom: 0,
    paddingTop: 0, // Removed top padding
  },
  calendar: {
    borderRadius: 12,
    paddingBottom: 0, // Removed bottom padding
    paddingTop: 0, // Removed top padding
    transform: [{ scale: 0.95 }], // Slightly larger scale to show full calendar
  },
  agenda: {
    borderRadius: 12,
    height: 450, // Increased height for better visibility
  },
  agendaKnob: {
    width: 40,
    height: 6,
    backgroundColor: "#E0E0E0",
    borderRadius: 3,
    alignSelf: "center",
    marginVertical: 8,
  },
  agendaKnobLine: {
    width: "100%",
    height: "100%",
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  agendaItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: theme.spacing.md,
    marginRight: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  agendaItemHeader: {
    marginBottom: theme.spacing.sm,
  },
  agendaItemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  agendaItemTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  agendaItemTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  agendaItemTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
  },
  agendaItemTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
  },
  agendaItemDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
    lineHeight: 16,
  },
  agendaItemDetails: {
    gap: 4,
  },
  agendaItemDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  agendaItemDetailText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 6,
  },
  emptyDate: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    marginRight: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: 8,
    paddingHorizontal: theme.spacing.md,
  },
  emptyDateText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#999999",
    fontStyle: "italic",
    marginTop: 4,
  },
  emptyDateSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#CCCCCC",
    marginTop: 2,
  },
  selectedDateContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: theme.spacing.md, // Reduced margin
    marginBottom: theme.spacing.md, // Reduced margin
    borderRadius: 12,
    padding: theme.spacing.sm, // Reduced padding
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDateTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16, // Reduced font size
    color: theme.colors.text,
    marginBottom: theme.spacing.sm, // Reduced margin
  },
  selectedDateEvents: {
    marginBottom: theme.spacing.sm, // Reduced margin
  },
  selectedDateEventsTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 14, // Reduced font size
    color: theme.colors.text,
    marginBottom: theme.spacing.xs, // Reduced margin
  },
  selectedDateAgendaList: {
    gap: theme.spacing.sm,
  },
  selectedDateAgendaItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedDateEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  selectedDateEventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  selectedDateEventTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
  },
  selectedDateEventTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
    marginTop: 4,
  },
  selectedDateEventDetails: {
    marginTop: theme.spacing.sm,
    gap: 4,
  },
  selectedDateEventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedDateEventDetailText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 6,
  },
  noEventsContainer: {
    alignItems: "center",
    paddingVertical: theme.spacing.md, // Reduced padding
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    marginTop: theme.spacing.sm,
  },
  noEventsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14, // Reduced font size
    color: "#999999",
    marginTop: theme.spacing.xs, // Reduced margin
  },
  noEventsSubtext: {
    fontFamily: theme.fonts.regular,
    fontSize: 12, // Reduced font size
    color: "#CCCCCC",
    marginTop: 2,
    textAlign: "center",
  },
  selectedDayEventsSection: {
    marginTop: theme.spacing.sm, // Reduced margin
    paddingHorizontal: theme.spacing.md,
    backgroundColor: "#FFFFFF",
    marginHorizontal: theme.spacing.md,
    borderRadius: 12,
    padding: theme.spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDayEventsList: {
    marginTop: theme.spacing.sm,
  },
  selectedDayEventCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  selectedDayEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  selectedDayEventTitle: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  selectedDayEventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666",
    marginBottom: theme.spacing.xs,
    lineHeight: 16,
  },
  selectedDayEventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDayEventInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedDayEventInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: theme.spacing.md,
  },
  selectedDayEventInfoText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  selectedMonthEventsList: {
    marginTop: theme.spacing.sm,
  },
  selectedMonthEventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedMonthEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  selectedMonthEventTitle: {
    flex: 1,
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.text,
    marginRight: theme.spacing.sm,
  },
  selectedMonthEventTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  selectedMonthEventInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedMonthEventDate: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
  },
  selectedMonthEventTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  selectedDateEvent: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  selectedDateEventDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  selectedDateEventInfo: {
    flex: 1,
  },
  selectedDateEventText: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  selectedDateEventType: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  selectedDateAttendance: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: theme.spacing.md,
  },
  selectedDateAttendanceTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  selectedDateAttendanceStatus: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  attendanceStatusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: theme.spacing.sm,
    marginTop: 2,
  },
  attendanceStatusInfo: {
    flex: 1,
  },
  selectedDateAttendanceText: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  attendanceTimeText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
    marginBottom: 2,
  },
  attendanceReasonText: {
    fontFamily: theme.fonts.regular,
    fontSize: 14,
    color: "#666666",
    fontStyle: "italic",
  },
  viewToggleContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16, // Reduced font size
    color: theme.colors.text,
    marginBottom: theme.spacing.sm, // Reduced margin
  },
  viewToggleButtons: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 4,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    borderRadius: 6,
  },
  activeViewToggleButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  viewToggleText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#666666",
  },
  activeViewToggleText: {
    color: theme.colors.primary,
  },
  attendanceContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  attendanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing.md,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
  },
  attendanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  attendanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: theme.spacing.lg,
  },
  attendanceStat: {
    alignItems: "center",
  },
  attendanceNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 24,
    color: theme.colors.text,
  },
  attendanceLabel: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
  attendanceIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginTop: 4,
  },
  recentAttendanceContainer: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: theme.spacing.md,
  },
  recentAttendanceTitle: {
    fontFamily: theme.fonts.medium,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  recentAttendanceList: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  attendanceRecord: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  attendanceDate: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  attendanceStatus: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  // Upcoming Events Styles
  upcomingEventsContainer: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: 16,
    padding: theme.spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  upcomingEventsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  upcomingEventsTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 20,
    color: theme.colors.text,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 20,
    backgroundColor: theme.colors.primary + "10",
  },
  viewAllText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: theme.colors.primary,
    marginRight: 4,
  },
  upcomingEventsList: {
    gap: 0,
  },
  upcomingEventCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  upcomingEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  upcomingEventIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  upcomingEventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.sm,
  },
  upcomingEventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  upcomingEventTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
  },
  upcomingEventDateContainer: {
    alignItems: "flex-end",
  },
  upcomingEventDate: {
    fontFamily: theme.fonts.bold,
    fontSize: 12,
    color: theme.colors.text,
  },
  upcomingEventTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#666",
    marginTop: 2,
  },
  upcomingEventContent: {
    marginBottom: theme.spacing.sm,
  },
  upcomingEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  upcomingEventSubject: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.primary,
  },
  upcomingEventDetails: {
    gap: 4,
    marginBottom: theme.spacing.sm,
  },
  upcomingEventDetailItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingEventDetailText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
    flex: 1,
  },
  upcomingEventFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  upcomingEventGrade: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#888",
  },
  eventsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing.sm,
  },
  eventTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing.md,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 16,
    color: theme.colors.text,
  },
  eventSubject: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: theme.colors.primary,
    marginTop: 2,
  },
  eventDateTime: {
    alignItems: "flex-end",
  },
  eventDate: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
  },
  eventTime: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  eventDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing.sm,
  },
  eventDetail: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  eventDetailText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  eventFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eventTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
  },
  quickActionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: theme.spacing.md,
    alignItems: "center",
    marginBottom: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionText: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
    textAlign: "center",
    marginTop: theme.spacing.xs,
  },
  // Attendance Tab Styles
  attendanceTabsContainer: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  attendanceTabs: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 4,
  },
  attendanceTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    alignItems: "center",
    borderRadius: 6,
    marginHorizontal: 2,
  },
  activeAttendanceTab: {
    backgroundColor: theme.colors.primary,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  attendanceTabText: {
    fontFamily: theme.fonts.medium,
    fontSize: 14,
    color: "#666666",
  },
  activeAttendanceTabText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  // Enhanced Attendance Record Styles
  attendanceRecordInfo: {
    flex: 1,
  },
  attendanceActivity: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
    fontStyle: "italic",
  },
  // Enhanced Event Card Styles
  enhancedEventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: theme.spacing.sm, // Reduced padding
    marginBottom: theme.spacing.xs, // Reduced margin
    borderLeftWidth: 3, // Reduced border width
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  eventCardHeader: {
    marginBottom: theme.spacing.sm,
  },
  eventTitleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xs,
  },
  enhancedEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 15, // Reduced font size
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  enhancedEventTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  enhancedEventTypeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    marginLeft: 4,
  },
  eventTimeSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  enhancedEventTime: {
    fontFamily: theme.fonts.medium,
    fontSize: 14, // Reduced font size
    color: theme.colors.primary,
    marginLeft: 6,
  },
  enhancedEventDescription: {
    fontFamily: theme.fonts.regular,
    fontSize: 12, // Reduced font size
    color: "#666666",
    lineHeight: 16, // Reduced line height
    marginBottom: theme.spacing.xs, // Reduced margin
  },
  eventDetailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
  },
  eventDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: 8,
    minWidth: "45%",
  },
  eventDetailText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 6,
    flex: 1,
  },
  // Upcoming Events Styles
  upcomingEventsSection: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderRadius: 12,
    padding: theme.spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  upcomingEventsList: {
    gap: theme.spacing.sm,
  },
  upcomingEventCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: theme.spacing.sm,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  upcomingEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  upcomingEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  upcomingEventTypeBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  upcomingEventInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  upcomingEventInfoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  upcomingEventInfoText: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "#666666",
    marginLeft: 4,
  },
  // Compact Event Card Styles
  compactEventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactEventHeader: {
    gap: theme.spacing.xs,
  },
  compactEventTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactEventTitle: {
    fontFamily: theme.fonts.bold,
    fontSize: 14,
    color: theme.colors.text,
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  compactEventTypeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  compactEventInfo: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  compactEventInfoItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactEventInfoText: {
    fontFamily: theme.fonts.regular,
    fontSize: 11,
    color: "#666666",
    marginLeft: 4,
  },

  // Horizontal Calendar Styles
  horizontalCalendarWrapper: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: 0,
    backgroundColor: "#FFFFFF",
  },
  horizontalCalendarContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  horizontalDateCard: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 65,
    minHeight: 85,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedHorizontalDateCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    borderWidth: 2,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.3,
    elevation: 3,
  },
  todayHorizontalDateCard: {
    backgroundColor: theme.colors.primary + "10",
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  horizontalDateDayName: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#666666",
    marginBottom: 2,
  },
  horizontalDateNumber: {
    fontFamily: theme.fonts.bold,
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 2,
  },
  horizontalDateMonth: {
    fontFamily: theme.fonts.regular,
    fontSize: 10,
    color: "#888888",
    marginBottom: 4,
  },
  selectedHorizontalDateText: {
    color: "#FFFFFF",
  },
  todayHorizontalDateText: {
    color: theme.colors.primary,
    fontWeight: "bold",
  },
  horizontalEventIndicators: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 2,
    minHeight: 12,
  },
  horizontalEventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
    marginVertical: 1,
  },
  horizontalMoreEventsText: {
    fontFamily: theme.fonts.regular,
    fontSize: 8,
    color: "#666666",
    marginLeft: 2,
  },
});

export default CalendarMain;
