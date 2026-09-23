import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLazyGetStudentHeaderDataQuery } from "@/api/student-header-api";
import { setSelectedStudent } from "@/state-store/slices/app-slice";
import { RootState } from "@/state-store/store";
import { transformStudentWithProfilePicture } from "@/utils/studentProfileUtils";

/**
 * On app load, re-fetches the currently selected student's data from the
 * backend so the header reflects the latest grade/class/photo instead of
 * whatever was cached at login time. Fires once when a student id first
 * becomes selected for this authenticated session (covers both a
 * persisted-from-last-session id and a freshly auto-selected one).
 *
 * Read-only against `selectedStudent` — never changes how/where the
 * selected-student id itself is stored. If the fetch fails (offline, 403 if
 * the link was revoked, etc.) the last-known-good `selectedStudent` is left
 * untouched so the header never blanks out over a transient error.
 */
export const useHeaderStudentSync = () => {
  const dispatch = useDispatch();
  const { token, isAuthenticated, selectedStudent, sessionData } = useSelector(
    (state: RootState) => state.app,
  );
  const [fetchStudentHeaderData, { isLoading, error }] =
    useLazyGetStudentHeaderDataQuery();

  const syncSelectedStudent = useCallback(async () => {
    if (!token || !isAuthenticated || !selectedStudent?.id) {
      return;
    }

    try {
      const response = await fetchStudentHeaderData({
        student_id: selectedStudent.id,
      }).unwrap();

      const freshStudent = transformStudentWithProfilePicture(
        response.data,
        sessionData,
      );
      dispatch(setSelectedStudent(freshStudent));
    } catch (err) {
      console.log(
        "🎓 useHeaderStudentSync - fresh fetch failed, keeping cached student:",
        err,
      );
    }
  }, [
    token,
    isAuthenticated,
    selectedStudent?.id,
    sessionData,
    fetchStudentHeaderData,
    dispatch,
  ]);

  // Also depends on selectedStudent?.id (not just token/isAuthenticated):
  // on a fresh login selectedStudent is still null when this layout first
  // mounts — Header.js's own auto-select effect sets it moments later. This
  // re-fires exactly once when that id first appears, then again only if it
  // actually changes; a successful fetch returns the same id, so the effect
  // doesn't loop.
  useEffect(() => {
    syncSelectedStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAuthenticated, selectedStudent?.id]);

  return { isLoading, error };
};
