import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Calendar } from "react-native-calendars";
import { MaterialIcons } from "@expo/vector-icons";
import { feedbackCardTheme } from "../../data/studentGrowthData";
import MonthlyAttendanceChart from "./MonthlyAttendanceChart";

interface AttendanceRecord {
  id: number;
  date: string;
  attendance_type_id: number;
  in_time?: string | null;
  out_time?: string | null;
  notes: string | null;
}

interface AttendanceCalendarViewProps {
  attendanceRecords: AttendanceRecord[];
  onDateSelect?: (date: string) => void;
  selectedDate?: string;
}

interface MarkedDate {
  marked: boolean;
  dotColor: string;
  selectedColor?: string;
  selected?: boolean;
  attendanceData?: {
    type: "present" | "absent";
    inTime?: string | null;
    outTime?: string | null;
    notes?: string | null;
  };
}

const AttendanceCalendarView: React.FC<AttendanceCalendarViewProps> = ({
  attendanceRecords,
  onDateSelect,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    new Date().toISOString().substring(0, 7),
  );

  // Transform attendance records to calendar marked dates format
  const getMarkedDates = (): { [key: string]: MarkedDate } => {
    const markedDates: { [key: string]: MarkedDate } = {};

    attendanceRecords.forEach((record) => {
      // Debug: Log date format to ensure it's proper YYYY-MM-DD
      console.log("📅 Processing attendance record date:", record.date);

      const isPresent = record.attendance_type_id === 1;
      const isAbsent = record.attendance_type_id === 4; // Updated: 4 means absent, not 3

      if (isPresent || isAbsent) {
        const isSelectedDate = selectedDate === record.date;
        markedDates[record.date] = {
          selected: true, // Use selected to create colored circles
          selectedColor: isSelectedDate
            ? feedbackCardTheme.primary
            : isPresent
              ? feedbackCardTheme.success
              : feedbackCardTheme.error,
          selectedTextColor: "#FFFFFF", // White text on colored background
          marked: false, // Don't use dots, use colored backgrounds instead
          attendanceData: {
            type: isPresent ? "present" : "absent",
            inTime: record.in_time,
            outTime: record.out_time,
            notes: record.notes,
          },
        };
      }
    });

    // Highlight selected date even if no attendance data
    if (selectedDate && !markedDates[selectedDate]) {
      markedDates[selectedDate] = {
        selected: true,
        selectedColor: feedbackCardTheme.primary,
        selectedTextColor: "#FFFFFF",
        marked: false,
      };
    }

    return markedDates;
  };

  // Calendar theme matching app design
  const calendarTheme = {
    backgroundColor: feedbackCardTheme.surface,
    calendarBackground: feedbackCardTheme.surface,
    textSectionTitleColor: feedbackCardTheme.black,
    selectedDayBackgroundColor: feedbackCardTheme.primary,
    selectedDayTextColor: feedbackCardTheme.white,
    todayTextColor: feedbackCardTheme.primary,
    dayTextColor: feedbackCardTheme.black,
    textDisabledColor: feedbackCardTheme.grayLight,
    arrowColor: feedbackCardTheme.primary,
    monthTextColor: feedbackCardTheme.black,
    textDayFontWeight: "500" as const,
    textMonthFontWeight: "600" as const,
    textDayHeaderFontWeight: "600" as const,
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  };

  const handleDayPress = (day: any) => {
    console.log("📅 Calendar date selected:", day.dateString);
    if (onDateSelect) {
      onDateSelect(day.dateString);
    }
  };

  const handleMonthChange = (month: any) => {
    const monthString = `${month.year}-${String(month.month).padStart(2, "0")}`;
    setCurrentMonth(monthString);
    console.log("📅 Calendar month changed to:", monthString);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "N/A";

    try {
      if (/^\d{1,2}:\d{2}$/.test(timeString)) {
        const [hours, minutes] = timeString.split(":");
        const hour = parseInt(hours);
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${period}`;
      }
      return timeString;
    } catch {
      return timeString;
    }
  };

  // Get attendance stats for current month - only from actual database records
  const getMonthStats = () => {
    // Only consider records that actually exist in the database
    const monthRecords = attendanceRecords.filter((record) =>
      record.date.startsWith(currentMonth),
    );

    const presentDays = monthRecords.filter(
      (r) => r.attendance_type_id === 1,
    ).length;
    const absentDays = monthRecords.filter(
      (r) => r.attendance_type_id === 4, // Updated: 4 means absent, not 3
    ).length;
    const totalDays = presentDays + absentDays;
    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return { presentDays, absentDays, totalDays, attendanceRate };
  };

  const monthStats = getMonthStats();
  const selectedDateData = selectedDate ? getMarkedDates()[selectedDate] : null;

  // Check if there are any attendance records at all
  const hasAttendanceData = attendanceRecords && attendanceRecords.length > 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      {/* Calendar Header with Stats */}
      <View style={styles.header}>
        {hasAttendanceData ? (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statDot,
                  { backgroundColor: feedbackCardTheme.success },
                ]}
              />
              <Text style={styles.statText}>
                Present: {monthStats.presentDays}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View
                style={[
                  styles.statDot,
                  { backgroundColor: feedbackCardTheme.error },
                ]}
              />
              <Text style={styles.statText}>
                Absent: {monthStats.absentDays}
              </Text>
            </View>
            <View style={styles.statItem}>
              <MaterialIcons
                name="trending-up"
                size={16}
                color={feedbackCardTheme.primary}
              />
              <Text style={styles.statText}>
                {monthStats.attendanceRate.toFixed(1)}%
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.noDataHeader}>
            <Text style={styles.noDataText}>
              No attendance data available for any month
            </Text>
          </View>
        )}
      </View>

      {/* Calendar */}
      <Calendar
        current={currentMonth + "-01"}
        markedDates={getMarkedDates()}
        onDayPress={handleDayPress}
        onMonthChange={handleMonthChange}
        theme={calendarTheme}
        hideExtraDays={true}
        firstDay={1}
        showWeekNumbers={false}
        disableMonthChange={false}
        hideDayNames={false}
        showScrollIndicator={false}
        style={styles.calendar}
      />

      {/* Selected Date Info */}
      {selectedDate && selectedDateData && (
        <View style={styles.selectedDateInfo}>
          <View style={styles.selectedDateHeader}>
            <MaterialIcons
              name="event"
              size={16}
              color={feedbackCardTheme.primary}
            />
            <Text style={styles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Text>
          </View>

          {selectedDateData.attendanceData && (
            <View style={styles.attendanceInfo}>
              <View style={styles.statusContainer}>
                <MaterialIcons
                  name={
                    selectedDateData.attendanceData.type === "present"
                      ? "check-circle"
                      : "cancel"
                  }
                  size={14}
                  color={
                    selectedDateData.attendanceData.type === "present"
                      ? feedbackCardTheme.success
                      : feedbackCardTheme.error
                  }
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        selectedDateData.attendanceData.type === "present"
                          ? feedbackCardTheme.success
                          : feedbackCardTheme.error,
                    },
                  ]}
                >
                  {selectedDateData.attendanceData.type === "present"
                    ? "Present"
                    : "Absent"}
                </Text>
              </View>

              {selectedDateData.attendanceData.type === "present" && (
                <View style={styles.timesContainer}>
                  <Text style={styles.timeText}>
                    In: {formatTime(selectedDateData.attendanceData.inTime)}
                  </Text>
                  <Text style={styles.timeText}>
                    Out: {formatTime(selectedDateData.attendanceData.outTime)}
                  </Text>
                </View>
              )}

              {selectedDateData.attendanceData.notes && (
                <Text style={styles.notesText}>
                  {selectedDateData.attendanceData.notes}
                </Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Monthly Attendance Chart */}
      <MonthlyAttendanceChart attendanceRecords={attendanceRecords} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: feedbackCardTheme.surface,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 10, // Extra bottom padding for scrolling
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: feedbackCardTheme.grayLight,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
  },
  calendar: {
    paddingHorizontal: 8,
    paddingBottom: -4,
  },
  selectedDateInfo: {
    margin: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: feedbackCardTheme.grayLight + "50",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: feedbackCardTheme.primary,
  },
  selectedDateHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  selectedDateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: feedbackCardTheme.black,
  },
  attendanceInfo: {
    gap: 6,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  timesContainer: {
    flexDirection: "row",
    gap: 16,
  },
  timeText: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    fontWeight: "500",
  },
  notesText: {
    fontSize: 11,
    color: feedbackCardTheme.grayMedium,
    fontStyle: "italic",
    marginTop: 4,
  },
  noDataHeader: {
    alignItems: "center",
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 12,
    color: feedbackCardTheme.grayMedium,
    fontStyle: "italic",
  },
});

export default AttendanceCalendarView;
