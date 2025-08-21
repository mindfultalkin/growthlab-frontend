// @ts-nocheck
import { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// type UserCohort = {
//   cohortId: string;
//   cohortName: string;
//   cohortStartDate: number;
//   cohortEndDate: number;
//   program: INITIAL_USER_PROGRAM_STATE;
// };

type INITIAL_USER_PROGRAM_STATE = {
  programId: "";
  programName: "";
  programDesc: "";
  stagesCount: "";
  unitCount: "";
  stages: "";
  programCompletionStatus: "";
};

// type AssignmentStatistics = {
//   correctedAssignments: number;
//   totalAssignments: number;
//   pendingAssignments: number;
//   totalCohortUserCount: number;
//   cohortDetails: {
//     [cohortId: string]: {
//       correctedAssignments: number;
//       totalAssignments: number;
//       pendingAssignments: number;
//       cohortUserCount: number;
//     };
//   };
// };

type User = {
  userId: string;
  userAddress: string;
  userEmail: string;
  userName: string;
  userPhoneNumber: string;
  organization: typeof INITIAL_USER_ORGANISATION_STATE;
  program: INITIAL_USER_PROGRAM_STATE;
  selectedCohortWithProgram: any;
  userType: string;
};

export const INITIAL_USER_PROGRAM_STATE: INITIAL_USER_PROGRAM_STATE = {};

// Define initial states
export const INITIAL_USER_ORGANISATION_STATE = {
  organizationId: "",
  organizationName: "",
  organizationAdminName: "",
  organizationAdminEmail: "",
  organizationAdminPhone: "",
};

// export const INITIAL_USER_COHORTS_STATE: UserCohort[] = [];

export const INITIAL_USER_STATE: User = {
  userId: "",
  userAddress: "",
  userEmail: "",
  userName: "",
  userPhoneNumber: "",
  organization: INITIAL_USER_ORGANISATION_STATE,
  // cohorts: INITIAL_USER_COHORTS_STATE,
  program: INITIAL_USER_PROGRAM_STATE,
  selectedCohortWithProgram: null,
  userType: "",
  // assignmentStatistics: null,
};

interface AuthContextType {
  user: User;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: React.Dispatch<React.SetStateAction<User>>;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  checkAuthUser: () => Promise<boolean>;
  selectedCohortWithProgram: any;
  setSelectedCohortWithProgram: React.Dispatch<React.SetStateAction<any>>;
}

/// Define initial state for AuthContext
export const INITIAL_STATE: AuthContextType = {
  user: INITIAL_USER_STATE,
  isLoading: false,
  isAuthenticated: false,
  setUser: () => {},
  setIsAuthenticated: () => {},
  checkAuthUser: async () => false,
  selectedCohortWithProgram: null,
  setSelectedCohortWithProgram: () => {},
};

// Create AuthContext
const AuthContext = createContext<AuthContextType>(INITIAL_STATE);

// @ts-ignore
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(INITIAL_USER_STATE);
  const [isLoading, setIsLoading] = useState(true); // Changed to start as true
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedCohortWithProgram, setSelectedCohortWithProgram] = useState(
    () => {
      const saved = localStorage.getItem("selectedCohortWithProgram");
      return saved ? JSON.parse(saved) : null;
    }
  );

  // Function to check if the user is authenticated
  const checkAuthUser = async () => {
    setIsLoading(true);
    try {
      const currentUser = JSON.parse(localStorage.getItem("user"));
      // const userType = localStorage.getItem("userType");
      // console.log("currentUser", currentUser);
      if (currentUser) {
        const newUserState = {
          userId: currentUser.userId,
          userAddress: currentUser.userAddress,
          userEmail: currentUser.userEmail,
          userName: currentUser.userName,
          userPhoneNumber: currentUser.userPhoneNumber,
          organization: currentUser.organization,
          // cohorts: currentUser.allCohortsWithPrograms,
          program: currentUser.program,
          selectedCohortWithProgram:
            currentUser.selectedCohortWithProgram || null,
          userType: currentUser.userType, // Ensure userType is set
          // assignmentStatistics: null,
        };

        // if (userType?.toLowerCase() === "mentor") {
        //   newUserState.assignmentStatistics =
        //     currentUser.assignmentStatistics || null;
        // }

        setUser(newUserState);
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking auth:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedCohort = localStorage.getItem("selectedCohortWithProgram");
    if (savedCohort) {
      setSelectedCohortWithProgram(JSON.parse(savedCohort));
    }
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      const isAuthed = await checkAuthUser();

      if (!isAuthed) {
        navigate("/sign-in");
        return;
      }

      const currentPath = window.location.pathname;
      const excludedPaths = [
        "/cohorts/",
        "/view-progress",
        "/profile",
        "/organization-details",
        "/about-us",
      ];

      const shouldSkipCohortSelection = excludedPaths.some((path) =>
        currentPath.includes(path)
      );

      if (
        !selectedCohortWithProgram &&
        !shouldSkipCohortSelection &&
        currentPath !== "/sign-in"
      ) {
        navigate("/select-cohort");
      }
    };

    initAuth();
  }, [navigate, selectedCohortWithProgram]);

  // Value to be provided by the context
  const value = {
    user,
    setUser,
    isLoading,
    isAuthenticated,
    setIsAuthenticated,
    checkAuthUser,
    selectedCohortWithProgram,
    setSelectedCohortWithProgram,
  };
  // @ts-ignore
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useUserContext = () => useContext(AuthContext);