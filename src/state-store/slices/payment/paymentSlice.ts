import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";
import {
  StudentBillData,
  BillCategory,
  BillSummary,
  PaymentStatus,
} from "../../../types/payment";
import { PendingInvoiceStudentData } from "../../../api/pending-invoice-api";

interface PaymentState {
  selectedStudentId: number | null;
  selectedCategory: BillCategory | "all";
  searchQuery: string;
  studentBillsData: { [studentId: string]: StudentBillData };
  pendingInvoicesData: PendingInvoiceStudentData[];
  loading: boolean;
  error: string | null;
}

const initialState: PaymentState = {
  selectedStudentId: null,
  selectedCategory: "all",
  searchQuery: "",
  studentBillsData: {},
  pendingInvoicesData: [],
  loading: false,
  error: null,
};

const paymentSlice = createSlice({
  name: "payment",
  initialState,
  reducers: {
    setSelectedStudent: (state, action: PayloadAction<number | null>) => {
      state.selectedStudentId = action.payload;
    },
    setSelectedCategory: (
      state,
      action: PayloadAction<BillCategory | "all">,
    ) => {
      state.selectedCategory = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setStudentBillsData: (
      state,
      action: PayloadAction<{ [studentId: string]: StudentBillData }>,
    ) => {
      state.studentBillsData = action.payload;

      // Auto-select first student if none selected
      if (!state.selectedStudentId && Object.keys(action.payload).length > 0) {
        const firstStudentKey = Object.keys(action.payload)[0];
        const firstStudent = action.payload[firstStudentKey];
        state.selectedStudentId = firstStudent.student_info.id;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setPendingInvoicesData: (
      state,
      action: PayloadAction<PendingInvoiceStudentData[]>,
    ) => {
      state.pendingInvoicesData = action.payload;
    },
    clearPaymentData: (state) => {
      state.studentBillsData = {};
      state.pendingInvoicesData = [];
      state.selectedStudentId = null;
      state.error = null;
    },
  },
});

export const {
  setSelectedStudent,
  setSelectedCategory,
  setSearchQuery,
  setStudentBillsData,
  setPendingInvoicesData,
  setLoading,
  setError,
  clearPaymentData,
} = paymentSlice.actions;

// Selectors
export const selectPaymentState = (state: any) => state.payment;
export const selectSelectedStudentId = (state: any) =>
  state.payment.selectedStudentId;
export const selectSelectedCategory = (state: any) =>
  state.payment.selectedCategory;
export const selectSearchQuery = (state: any) => state.payment.searchQuery;
export const selectStudentBillsData = (state: any) =>
  state.payment.studentBillsData;
export const selectPaymentLoading = (state: any) => state.payment.loading;
export const selectPaymentError = (state: any) => state.payment.error;
export const selectPendingInvoicesData = (state: any) =>
  state.payment.pendingInvoicesData as PendingInvoiceStudentData[];

// Complex selectors
export const selectAvailableStudents = createSelector(
  [selectStudentBillsData],
  (studentBillsData) => {
    return Object.values(studentBillsData).map((data) => ({
      id: data.student_info.id,
      name: data.student_info.full_name,
      admissionNumber: data.student_info.admission_number,
    }));
  },
);

export const selectSelectedStudentData = createSelector(
  [selectStudentBillsData, selectSelectedStudentId],
  (studentBillsData, selectedStudentId) => {
    if (!selectedStudentId) return null;

    const studentKey = `student_${selectedStudentId}`;
    return studentBillsData[studentKey] || null;
  },
);

export const selectBillsByCategory = createSelector(
  [selectSelectedStudentData, selectSelectedCategory],
  (studentData, selectedCategory) => {
    if (!studentData) return [];

    if (selectedCategory === "all") {
      return [
        ...studentData.admission_fee_invoices.map((item) => ({
          type: "admission_fee",
          data: item,
        })),
        ...studentData.term_fee_invoices.map((item) => ({
          type: "term_fee",
          data: item,
        })),
        ...studentData.exam_bills.map((item) => ({
          type: "exam_bills",
          data: item,
        })),
        ...studentData.sport_fee_invoices.map((item) => ({
          type: "sport_fee",
          data: item,
        })),
        ...studentData.refundable_deposits.map((item) => ({
          type: "refundable_deposits",
          data: item,
        })),
        ...studentData.general_bills.map((item) => ({
          type: "general_bills",
          data: item,
        })),
        ...studentData.material_bills.map((item) => ({
          type: "material_bills",
          data: item,
        })),
      ];
    }

    switch (selectedCategory) {
      case "admission_fee":
        return studentData.admission_fee_invoices.map((item) => ({
          type: "admission_fee",
          data: item,
        }));
      case "term_fee":
        return studentData.term_fee_invoices.map((item) => ({
          type: "term_fee",
          data: item,
        }));
      case "exam_bills":
        return studentData.exam_bills.map((item) => ({
          type: "exam_bills",
          data: item,
        }));
      case "sport_fee":
        return studentData.sport_fee_invoices.map((item) => ({
          type: "sport_fee",
          data: item,
        }));
      case "refundable_deposits":
        return studentData.refundable_deposits.map((item) => ({
          type: "refundable_deposits",
          data: item,
        }));
      case "general_bills":
        return studentData.general_bills.map((item) => ({
          type: "general_bills",
          data: item,
        }));
      case "material_bills":
        return studentData.material_bills.map((item) => ({
          type: "material_bills",
          data: item,
        }));
      default:
        return [];
    }
  },
);

export const selectStudentBillSummary = createSelector(
  [selectSelectedStudentData],
  (studentData): BillSummary | null => {
    if (!studentData) return null;

    const calculateTotal = (items: any[], amountField: string) => {
      return items.reduce((sum, item) => {
        return sum + parseFloat(item[amountField] || "0");
      }, 0);
    };

    // Updated calculations for new API structure
    const calculateTermFeeTotal = (termFees: any[]) => {
      return termFees.reduce((sum, termFee) => {
        return (
          sum +
          parseFloat(
            termFee.invoice_header?.amount_breakdown?.bill_total || "0",
          )
        );
      }, 0);
    };

    const calculateExamBillTotal = (examBills: any[]) => {
      return examBills.reduce((sum, examBill) => {
        return (
          sum +
          parseFloat(examBill.invoice_header?.amount_breakdown?.total || "0")
        );
      }, 0);
    };

    const calculateSportFeeTotal = (sportFees: any[]) => {
      return sportFees.reduce((sum, sportFee) => {
        return (
          sum +
          parseFloat(
            sportFee.invoice_header?.amount_breakdown?.bill_total || "0",
          )
        );
      }, 0);
    };

    const admissionTotal = calculateTotal(
      studentData.admission_fee_invoices,
      "admission_fee_invoice_net_amount",
    );
    const termTotal = calculateTermFeeTotal(studentData.term_fee_invoices);
    const examTotal = calculateExamBillTotal(studentData.exam_bills);
    const sportTotal = calculateSportFeeTotal(studentData.sport_fee_invoices);
    const depositTotal = calculateTotal(
      studentData.refundable_deposits,
      "refundable_deposit_net_amount",
    );
    const generalTotal = calculateTotal(
      studentData.general_bills,
      "general_bill_net_amount",
    );
    const materialTotal = calculateTotal(
      studentData.material_bills,
      "material_bill_net_amount",
    );

    const totalAmount =
      admissionTotal +
      termTotal +
      examTotal +
      sportTotal +
      depositTotal +
      generalTotal +
      materialTotal;

    // Since all data represents paid bills, paidAmount equals totalAmount
    const paidAmount = totalAmount;
    const pendingAmount = 0;

    const billsCount =
      studentData.admission_fee_invoices.length +
      studentData.term_fee_invoices.length +
      studentData.exam_bills.length +
      studentData.sport_fee_invoices.length +
      studentData.refundable_deposits.length +
      studentData.general_bills.length +
      studentData.material_bills.length;

    return {
      studentId: studentData.student_info.id,
      studentName: studentData.student_info.full_name,
      totalAmount,
      paidAmount,
      pendingAmount,
      billsCount,
    };
  },
);

export const selectPaymentStatus = createSelector(
  [selectStudentBillSummary],
  (summary): PaymentStatus => {
    if (!summary) {
      return { status: "pending", color: "#999999", label: "No Data" };
    }

    // Since all data represents paid bills
    return { status: "paid", color: "#4CAF50", label: "Paid" };
  },
);

export const selectCategoryCounts = createSelector(
  [selectSelectedStudentData],
  (studentData) => {
    if (!studentData) return {};

    return {
      admission_fee: studentData.admission_fee_invoices.length,
      term_fee: studentData.term_fee_invoices.length,
      exam_bills: studentData.exam_bills.length,
      sport_fee: studentData.sport_fee_invoices.length,
      refundable_deposits: studentData.refundable_deposits.length,
      general_bills: studentData.general_bills.length,
      material_bills: studentData.material_bills.length,
    };
  },
);

export const selectOverallTotalSummary = createSelector(
  [selectStudentBillsData],
  (studentBillsData): BillSummary => {
    const allStudentsData = Object.values(studentBillsData);

    if (allStudentsData.length === 0) {
      return {
        studentId: 0,
        studentName: "All Students",
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        billsCount: 0,
      };
    }

    const calculateTotalForAllStudents = () => {
      return allStudentsData.reduce((grandTotal, studentData) => {
        const calculateTotal = (items: any[], field: string) => {
          return items.reduce((sum, item) => {
            return sum + parseFloat(item[field] || "0");
          }, 0);
        };

        // Updated calculations for new API structure
        const calculateTermFeeTotal = (termFees: any[]) => {
          return termFees.reduce((sum, termFee) => {
            return (
              sum +
              parseFloat(
                termFee.invoice_header?.amount_breakdown?.bill_total || "0",
              )
            );
          }, 0);
        };

        const calculateExamBillTotal = (examBills: any[]) => {
          return examBills.reduce((sum, examBill) => {
            return (
              sum +
              parseFloat(
                examBill.invoice_header?.amount_breakdown?.total || "0",
              )
            );
          }, 0);
        };

        const calculateSportFeeTotal = (sportFees: any[]) => {
          return sportFees.reduce((sum, sportFee) => {
            return (
              sum +
              parseFloat(
                sportFee.invoice_header?.amount_breakdown?.bill_total || "0",
              )
            );
          }, 0);
        };

        const admissionTotal = calculateTotal(
          studentData.admission_fee_invoices,
          "admission_fee_invoice_net_amount",
        );
        const termTotal = calculateTermFeeTotal(studentData.term_fee_invoices);
        const examTotal = calculateExamBillTotal(studentData.exam_bills);
        const sportTotal = calculateSportFeeTotal(
          studentData.sport_fee_invoices,
        );
        const depositTotal = calculateTotal(
          studentData.refundable_deposits,
          "refundable_deposit_net_amount",
        );
        const generalTotal = calculateTotal(
          studentData.general_bills,
          "general_bill_net_amount",
        );
        const materialTotal = calculateTotal(
          studentData.material_bills,
          "material_bill_net_amount",
        );

        return (
          grandTotal +
          admissionTotal +
          termTotal +
          examTotal +
          sportTotal +
          depositTotal +
          generalTotal +
          materialTotal
        );
      }, 0);
    };

    const totalAmount = calculateTotalForAllStudents();
    // Since all data represents paid bills, paidAmount equals totalAmount
    const paidAmount = totalAmount;
    const pendingAmount = 0;

    const billsCount = allStudentsData.reduce((total, studentData) => {
      return (
        total +
        studentData.admission_fee_invoices.length +
        studentData.term_fee_invoices.length +
        studentData.exam_bills.length +
        studentData.sport_fee_invoices.length +
        studentData.refundable_deposits.length +
        studentData.general_bills.length +
        studentData.material_bills.length
      );
    }, 0);

    return {
      studentId: 0, // Special ID for overall summary
      studentName: `All Students (${allStudentsData.length})`,
      totalAmount,
      paidAmount,
      pendingAmount,
      billsCount,
    };
  },
);

export const selectAllStudentsWithPaymentData = createSelector(
  [selectStudentBillsData],
  (
    studentBillsData,
  ): {
    summary: BillSummary;
    studentInfo: { name: string; admissionNumber: string };
  }[] => {
    const allStudentsData = Object.values(studentBillsData);

    return allStudentsData.map((studentData) => {
      const calculateTotal = (items: any[], field: string) => {
        return items.reduce((sum, item) => {
          return sum + parseFloat(item[field] || "0");
        }, 0);
      };

      // Updated calculations for new API structure
      const calculateTermFeeTotal = (termFees: any[]) => {
        return termFees.reduce((sum, termFee) => {
          return (
            sum +
            parseFloat(
              termFee.invoice_header?.amount_breakdown?.bill_total || "0",
            )
          );
        }, 0);
      };

      const calculateExamBillTotal = (examBills: any[]) => {
        return examBills.reduce((sum, examBill) => {
          return (
            sum +
            parseFloat(examBill.invoice_header?.amount_breakdown?.total || "0")
          );
        }, 0);
      };

      const calculateSportFeeTotal = (sportFees: any[]) => {
        return sportFees.reduce((sum, sportFee) => {
          return (
            sum +
            parseFloat(
              sportFee.invoice_header?.amount_breakdown?.bill_total || "0",
            )
          );
        }, 0);
      };

      const admissionTotal = calculateTotal(
        studentData.admission_fee_invoices,
        "admission_fee_invoice_net_amount",
      );
      const termTotal = calculateTermFeeTotal(studentData.term_fee_invoices);
      const examTotal = calculateExamBillTotal(studentData.exam_bills);
      const sportTotal = calculateSportFeeTotal(studentData.sport_fee_invoices);
      const depositTotal = calculateTotal(
        studentData.refundable_deposits,
        "refundable_deposit_net_amount",
      );
      const generalTotal = calculateTotal(
        studentData.general_bills,
        "general_bill_net_amount",
      );
      const materialTotal = calculateTotal(
        studentData.material_bills,
        "material_bill_net_amount",
      );

      const totalAmount =
        admissionTotal +
        termTotal +
        examTotal +
        sportTotal +
        depositTotal +
        generalTotal +
        materialTotal;
      const paidAmount = totalAmount;
      const pendingAmount = 0;

      const billsCount =
        studentData.admission_fee_invoices.length +
        studentData.term_fee_invoices.length +
        studentData.exam_bills.length +
        studentData.sport_fee_invoices.length +
        studentData.refundable_deposits.length +
        studentData.general_bills.length +
        studentData.material_bills.length;

      const summary: BillSummary = {
        studentId: studentData.student_info.id,
        studentName: studentData.student_info.full_name,
        totalAmount,
        paidAmount,
        pendingAmount,
        billsCount,
      };

      const studentInfo = {
        name: studentData.student_info.full_name,
        admissionNumber: studentData.student_info.admission_number,
      };

      return { summary, studentInfo };
    });
  },
);

export const selectStudentBillDetailsByStudentId = createSelector(
  [selectStudentBillsData, (state: any, studentId: number) => studentId],
  (studentBillsData, studentId) => {
    const studentKey = `student_${studentId}`;
    const studentData = studentBillsData[studentKey];

    if (!studentData) return null;

    const calculateTotal = (items: any[], field: string) => {
      return items.reduce((sum, item) => {
        return sum + parseFloat(item[field] || "0");
      }, 0);
    };

    // Updated calculations for new API structure
    const calculateTermFeeTotal = (termFees: any[]) => {
      return termFees.reduce((sum, termFee) => {
        return (
          sum +
          parseFloat(
            termFee.invoice_header?.amount_breakdown?.bill_total || "0",
          )
        );
      }, 0);
    };

    const calculateExamBillTotal = (examBills: any[]) => {
      return examBills.reduce((sum, examBill) => {
        return (
          sum +
          parseFloat(examBill.invoice_header?.amount_breakdown?.total || "0")
        );
      }, 0);
    };

    const calculateSportFeeTotal = (sportFees: any[]) => {
      return sportFees.reduce((sum, sportFee) => {
        return (
          sum +
          parseFloat(
            sportFee.invoice_header?.amount_breakdown?.bill_total || "0",
          )
        );
      }, 0);
    };

    const categories = [
      {
        id: "admission_fee",
        name: "Admission Fee",
        icon: "school",
        amount: calculateTotal(
          studentData.admission_fee_invoices,
          "admission_fee_invoice_net_amount",
        ),
        count: studentData.admission_fee_invoices.length,
        items: studentData.admission_fee_invoices,
      },
      {
        id: "term_fee",
        name: "Term Fee",
        icon: "event",
        amount: calculateTermFeeTotal(studentData.term_fee_invoices),
        count: studentData.term_fee_invoices.length,
        items: studentData.term_fee_invoices,
      },
      {
        id: "exam_bills",
        name: "Exam Bills",
        icon: "assignment",
        amount: calculateExamBillTotal(studentData.exam_bills),
        count: studentData.exam_bills.length,
        items: studentData.exam_bills,
      },
      {
        id: "sport_fee",
        name: "Sport Fee",
        icon: "sports-soccer",
        amount: calculateSportFeeTotal(studentData.sport_fee_invoices),
        count: studentData.sport_fee_invoices.length,
        items: studentData.sport_fee_invoices,
      },
      {
        id: "refundable_deposits",
        name: "Refundable Deposits",
        icon: "account-balance",
        amount: calculateTotal(
          studentData.refundable_deposits,
          "refundable_deposit_net_amount",
        ),
        count: studentData.refundable_deposits.length,
        items: studentData.refundable_deposits,
      },
      {
        id: "general_bills",
        name: "General Bills",
        icon: "receipt",
        amount: calculateTotal(
          studentData.general_bills,
          "general_bill_net_amount",
        ),
        count: studentData.general_bills.length,
        items: studentData.general_bills,
      },
      {
        id: "material_bills",
        name: "Material Bills",
        icon: "library-books",
        amount: calculateTotal(
          studentData.material_bills,
          "material_bill_net_amount",
        ),
        count: studentData.material_bills.length,
        items: studentData.material_bills,
      },
    ].filter((category) => category.count > 0); // Only show categories with bills

    return categories;
  },
);

export default paymentSlice.reducer;
