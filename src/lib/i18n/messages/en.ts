/** English dictionary — the baseline every other locale's keys must
 * match. Only covers the surfaces this phase actually translates (site
 * header, home page, login page) — see docs/migration-plan.md's
 * Revised Phase 2 for why the rest of the app isn't translated yet. */
export const en: {
  header: Record<
    | "home"
    | "examPrep"
    | "learning"
    | "schools"
    | "internationalExams"
    | "new"
    | "dashboard"
    | "logIn"
    | "getStarted"
    | "openMenu"
    | "closeMenu",
    string
  >;
  home: {
    heroTitlePart1: string;
    heroTitlePart2: string;
    heroSubtitle: string;
    heroTagline: string;
    startPreparingFree: string;
    exploreLearning: string;
    toeflSatPrep: string;
    internationalOpportunities: string;
    exploreInternationalExams: string;
    allExamsOnePlace: string;
    newBadge: string;
    examDescriptions: Record<"WAEC" | "NECO" | "UTME" | "Post-UTME", string>;
    goBeyondBordersLabel: string;
    goBeyondBordersTitle: string;
    goBeyondBordersBody: string;
    exploreSatPrep: string;
    exploreToeflPrep: string;
    learningLabel: string;
    learnBeyondPart1: string;
    learnBeyondPart2: string;
    learningBody: string;
    learningTagline: string;
    schoolsAndCoursesCount: (schools: number, courses: number) => string;
    exploreClasses: string;
    viewSchools: string;
    joinLiveClass: string;
    teachOnSmartPrep: string;
    sponsorAStudent: string;
    upcoming: string;
    exploreLearningAcrossNigeria: string;
    byState: string;
    bySubject: string;
    aiSupportLabel: string;
    aiSupportTitle: string;
    aiSupportBody: string;
    tryAiStudyCoach: string;
    whyTitle: string;
    whySubtitle: string;
    whyItems: { title: string; body: string }[];
    partnersLabel: string;
    partnersTitle: string;
    partnersBody: string;
    becomeAPartner: string;
    findPlanTitle: string;
    findPlanBody: string;
    viewPlansAndPricing: string;
    startLearning: string;
  };
  login: Record<
    | "welcomeBack"
    | "logInToContinue"
    | "passwordResetSuccess"
    | "email"
    | "password"
    | "forgotPassword"
    | "invalidCredentials"
    | "signingIn"
    | "signIn"
    | "logInWithPhoneInstead"
    | "logInWithEmailInstead"
    | "noAccountYet"
    | "createOne"
    | "phonePlaceholder"
    | "sendingCode"
    | "sendCode"
    | "couldNotSendCode"
    | "lostAccessToPhone"
    | "recoverViaEmail"
    | "enterCodeSentTo"
    | "changeNumber"
    | "signingInPhone"
    | "phoneInvalidOrExpired"
    | "signUpInstead",
    string
  >;
  dashboardChrome: Record<
    | "signedInAs"
    | "signOut"
    | "openMenu"
    | "closeMenu"
    | "switchWorkspace"
    | "adminTitle"
    | "security"
    | "adminNoRole",
    string
  >;
  dashboardNav: Record<
    | "overview"
    | "prep"
    | "learning"
    | "plansAndBilling"
    | "home"
    | "review"
    | "dashboard"
    | "myStudents"
    | "campaigns"
    | "marketing"
    | "earnings"
    | "payouts"
    | "leaderboard"
    | "profile"
    | "toefl"
    | "sat",
    string
  >;
  roleLabels: Record<
    "STUDENT" | "PARENT" | "SCHOOL_ADMIN" | "TEACHER" | "SPONSOR" | "PARTNER" | "ADMIN",
    string
  >;
  /** Keyed by the exact English label text from ADMIN_NAV
   * (src/lib/admin/nav.ts), not by group/item id — a lookup, not a
   * parallel nav structure. Missing keys fall back to the original
   * English label (see translateAdminNav). */
  adminNavLabels: Record<string, string>;
  studentDashboard: {
    welcomeBack: (firstName: string) => string;
    dashboardSubtitle: string;
    paymentSuccessful: string;
    prepSectionTitle: string;
    readinessScore: string;
    studyStreak: string;
    daysLabel: (n: number) => string;
    achievementsSectionTitle: string;
    xp: string;
    levelLabel: (n: number) => string;
    badgesEarned: string;
    leaderboard: string;
    viewSchoolLeaderboard: string;
    learningSectionTitle: string;
    coursesInProgress: string;
    certificatesEarned: string;
    yourAiStudyCoach: string;
    recommendedForToday: string;
    currentMastery: (pct: number) => string;
    nextReview: string;
    continueLearning: string;
    weakTopics: string;
    noWeakTopicsYet: string;
    missedCount: (n: number) => string;
    recommendedNext: string;
    takePracticeSession: string;
    browseCourses: string;
    parentGuardianRequests: string;
    relationshipSuffix: (relationship: string) => string;
    wantsToConnectAsParent: string;
    approve: string;
    reject: string;
    schoolInvitations: string;
    wantsToAddAsStudent: string;
    accept: string;
    decline: string;
    haveVoucherCode: string;
    voucherPlaceholder: string;
    redeem: string;
    yourParentLinkCode: string;
    shareParentLinkCode: string;
    readinessNamedTitle: (subjectName: string) => string;
    readyPct: (pct: number) => string;
    strong: string;
    needsImprovement: string;
    recommendedStudyTime: (hours: number, minutes: number) => string;
    estimateDisclaimer: string;
  };
  adminOverview: {
    title: string;
    subtitle: string;
    allCountries: string;
    dateRangeLabels: Record<"today" | "week" | "month" | "quarter" | "year" | "all", string>;
    usersSectionTitle: (countryName?: string) => string;
    totalStudents: string;
    teachers: string;
    parents: string;
    schoolAdmins: string;
    partners: string;
    sponsors: string;
    ecosystemActivityTitle: (rangeLabel: string) => string;
    newRegistrations: string;
    activeUsers: string;
    distinctSuccessfulLogins: string;
    linkedParentStudentAccounts: string;
    activeTeachers: string;
    activeTeachersHint: string;
    publishedCourses: string;
    schoolEnrollments: string;
    schoolEnrollmentsHint: string;
    activeSponsorships: string;
    activeSponsorshipsHint: string;
    partnerConversions: string;
    partnerConversionsHint: string;
    educationSectionTitle: string;
    totalQuestionsTitle: (code?: string) => string;
    coursesAllCountries: string;
    lessonsAllCountries: string;
    practiceSessionsTitle: (code?: string) => string;
    mockExamsTitle: (code?: string) => string;
    examAttemptsTitle: (code?: string) => string;
    schoolsSectionTitle: (countryName?: string) => string;
    registered: string;
    active: string;
    pending: string;
    courseProviders: string;
    revenueSectionTitle: string;
    paidSubscribersTitle: (code?: string) => string;
    subscriptionRevenueTitle: (code?: string) => string;
    partnerCommissionsAllCountries: string;
    pendingPayoutsAllCountries: string;
    aiSectionTitle: string;
    coachUsers30d: string;
    requestsToday: string;
    requestsThisMonth: string;
    estimatedCostAllTime: string;
    mostAskedSubjects: string;
    noAiConversationsYet: string;
    platformSectionTitle: string;
    openSupportRequests: string;
    pendingApprovals: string;
    pendingApprovalsBreakdown: (partners: number, schools: number, courses: number) => string;
    flaggedAccounts: string;
    failedLoginsRange: string;
    failedLoginsHint: string;
  };
} = {
  header: {
    home: "Home",
    examPrep: "Exam Prep",
    learning: "Learning",
    schools: "Schools",
    internationalExams: "International Exams",
    new: "New",
    dashboard: "Dashboard",
    logIn: "Log In",
    getStarted: "Get Started",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  home: {
    heroTitlePart1: "Prepare smarter. Pass better.",
    heroTitlePart2: "Achieve more.",
    heroSubtitle:
      "SmartPrepAfrica Prep helps Nigerian students master WAEC, NECO, UTME and Post-UTME with an AI study coach. SmartPrepAfrica Learning connects students with live classes and courses from schools across Nigeria.",
    heroTagline:
      "Prepare Smarter. Learn Better. Succeed Anywhere. — SmartPrepAfrica helps African students prepare for the exams that shape their future.",
    startPreparingFree: "Start preparing free",
    exploreLearning: "Explore Learning",
    toeflSatPrep: "TOEFL & SAT Prep",
    internationalOpportunities: "Prepare for international opportunities with SmartPrepAfrica.",
    exploreInternationalExams: "Explore International Exams →",
    allExamsOnePlace: "All major exams, one place.",
    newBadge: "New",
    examDescriptions: {
      WAEC: "West African Senior School Certificate Examination",
      NECO: "National Examinations Council",
      UTME: "Unified Tertiary Matriculation Examination",
      "Post-UTME": "Post-UTME screening for your target institution",
    },
    goBeyondBordersLabel: "International Exams",
    goBeyondBordersTitle: "Go Beyond Borders",
    goBeyondBordersBody:
      "Preparing for university or opportunities abroad? Build your SAT and TOEFL skills with structured practice, targeted drills, mock exams and performance insights.",
    exploreSatPrep: "Explore SAT Prep",
    exploreToeflPrep: "Explore TOEFL Prep",
    learningLabel: "SmartPrepAfrica Learning",
    learnBeyondPart1: "Learn Beyond",
    learnBeyondPart2: "Your School.",
    learningBody:
      "Great teaching shouldn't depend on where you go to school. SmartPrepAfrica Learning connects secondary-school students with live classes, courses and outstanding teachers from schools across Nigeria. Strengthen a subject, prepare for an exam, join a masterclass, or learn from educators outside your own school.",
    learningTagline: "One platform. Many schools. More opportunities.",
    schoolsAndCoursesCount: (schools: number, courses: number) =>
      `${schools} school${schools === 1 ? "" : "s"} · ${courses} live course${courses === 1 ? "" : "s"} and counting`,
    exploreClasses: "Explore Classes",
    viewSchools: "View Schools",
    joinLiveClass: "Join a Live Class",
    teachOnSmartPrep: "Teach on SmartPrepAfrica.com →",
    sponsorAStudent: "Sponsor a Student →",
    upcoming: "Upcoming",
    exploreLearningAcrossNigeria: "Explore learning across Nigeria",
    byState: "By state",
    bySubject: "By subject",
    aiSupportLabel: "AI Study Support",
    aiSupportTitle: "Never Get Stuck on a Question",
    aiSupportBody:
      "SmartPrepAfrica's AI Study Coach gives instant explanations and personalized help whenever you're practicing — so you understand your mistakes, not just move past them.",
    tryAiStudyCoach: "Try AI Study Coach",
    whyTitle: "Why SmartPrepAfrica?",
    whySubtitle: "Built for African Students",
    whyItems: [
      {
        title: "Local + International Exams",
        body: "Prepare for WAEC, NECO, UTME/JAMB, SAT and TOEFL from one platform.",
      },
      {
        title: "Practice That Builds Confidence",
        body: "Use focused drills, mock exams, explanations and performance tracking to identify areas that need improvement.",
      },
      {
        title: "AI-Powered Learning",
        body: "Get additional study support through SmartPrepAfrica's AI learning tools.",
      },
      {
        title: "Learn Anywhere",
        body: "A mobile-friendly learning experience designed for students studying at home, school or on the go.",
      },
    ],
    partnersLabel: "SmartPrepAfrica.com Partners",
    partnersTitle: "Schools & Institutions, Partner With Us",
    partnersBody:
      "Bring SmartPrepAfrica to your students. Refer students and schools to SmartPrepAfrica.com and get rewarded for the ones who stick around.",
    becomeAPartner: "Become a Partner",
    findPlanTitle: "Find the Right Plan for You",
    findPlanBody: "Choose exam preparation and learning options designed for your goals.",
    viewPlansAndPricing: "View Plans & Pricing",
    startLearning: "Start Learning",
  },
  login: {
    welcomeBack: "Welcome back",
    logInToContinue: "Log in to continue your prep.",
    passwordResetSuccess: "Password set. You can now sign in with your new password.",
    email: "Email",
    password: "Password",
    forgotPassword: "Forgot password?",
    invalidCredentials: "Invalid email or password.",
    signingIn: "Signing in…",
    signIn: "Sign in",
    logInWithPhoneInstead: "Log in with phone instead",
    logInWithEmailInstead: "Log in with email instead",
    noAccountYet: "No account yet?",
    createOne: "Create one",
    phonePlaceholder: "e.g. +2348012345678",
    sendingCode: "Sending code…",
    sendCode: "Send code",
    couldNotSendCode: "Could not send code.",
    lostAccessToPhone: "Lost access to this phone?",
    recoverViaEmail: "Recover via email",
    enterCodeSentTo: "Enter the code sent to",
    changeNumber: "Change number",
    signingInPhone: "Signing in…",
    phoneInvalidOrExpired: "No account found for this phone, or the code is invalid/expired.",
    signUpInstead: "Sign up instead",
  },
  dashboardChrome: {
    signedInAs: "Signed in as",
    signOut: "Sign out",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    switchWorkspace: "Switch workspace",
    adminTitle: "SmartPrepAfrica.com Administration",
    security: "Security",
    adminNoRole: "Admin (no role assigned)",
  },
  dashboardNav: {
    overview: "Overview",
    prep: "Prep",
    learning: "Learning",
    plansAndBilling: "Plans & billing",
    home: "Home",
    review: "Review",
    dashboard: "Dashboard",
    myStudents: "My Students",
    campaigns: "Campaigns",
    marketing: "Marketing",
    earnings: "Earnings",
    payouts: "Payouts",
    leaderboard: "Leaderboard",
    profile: "Profile",
    toefl: "TOEFL",
    sat: "SAT",
  },
  roleLabels: {
    STUDENT: "Student",
    PARENT: "Parent",
    SCHOOL_ADMIN: "School",
    TEACHER: "Teacher",
    SPONSOR: "Sponsor",
    PARTNER: "Partner",
    ADMIN: "Admin",
  },
  adminNavLabels: {
    Dashboard: "Dashboard",
    "Learning Content": "Learning Content",
    Overview: "Overview",
    Questions: "Questions",
    Passages: "Passages",
    "Bulk upload": "Bulk upload",
    "Subjects & topics": "Subjects & topics",
    "Countries & Exams": "Countries & Exams",
    Countries: "Countries",
    "Exam bodies & exams": "Exam bodies & exams",
    Courses: "Courses",
    Schools: "Schools",
    Programmes: "Programmes",
    "Tutor escalations": "Tutor escalations",
    "Teacher payouts": "Teacher payouts",
    "Learning Management": "Learning Management",
    "Curriculum & Class Levels": "Curriculum & Class Levels",
    Topics: "Topics",
    Lessons: "Lessons",
    "Content review queue": "Content review queue",
    "Learning analytics": "Learning analytics",
    "Video Learning Studio": "Video Learning Studio",
    "Video Library": "Video Library",
    "Production Queue": "Production Queue",
    Settings: "Settings",
    "International Exams": "International Exams",
    Content: "Content",
    Analytics: "Analytics",
    "SAT Overview": "SAT Overview",
    "SAT Content": "SAT Content",
    "SAT Analytics": "SAT Analytics",
    "Question Bank — Bulk Import": "Question Bank — Bulk Import",
    Users: "Users",
    Students: "Students",
    Parents: "Parents",
    Teachers: "Teachers",
    "School admins": "School admins",
    Sponsors: "Sponsors",
    Administrators: "Administrators",
    "AI Coach": "AI Coach",
    "Usage & costs": "Usage & costs",
    "Readiness & Drills": "Readiness & Drills",
    Partners: "Partners",
    "Applications & partners": "Applications & partners",
    Payouts: "Payouts",
    Finance: "Finance",
    Transactions: "Transactions",
    Support: "Support",
    "Contact messages": "Contact messages",
    Security: "Security",
    "Login activity": "Login activity",
    "Audit log": "Audit log",
    "Platform settings": "Platform settings",
    "Legal content": "Legal content",
  },
  studentDashboard: {
    welcomeBack: (firstName: string) => `Welcome back, ${firstName}.`,
    dashboardSubtitle: "Here's where your prep and learning progress will live.",
    paymentSuccessful: "Payment successful — your subscription is now active.",
    prepSectionTitle: "SmartPrepAfrica Prep",
    readinessScore: "Readiness score",
    studyStreak: "Study streak",
    daysLabel: (n: number) => `${n} day${n === 1 ? "" : "s"}`,
    achievementsSectionTitle: "Achievements",
    xp: "XP",
    levelLabel: (n: number) => `Level ${n}`,
    badgesEarned: "Badges earned",
    leaderboard: "Leaderboard",
    viewSchoolLeaderboard: "View your school's leaderboard →",
    learningSectionTitle: "SmartPrepAfrica Learning",
    coursesInProgress: "Courses in progress",
    certificatesEarned: "Certificates earned",
    yourAiStudyCoach: "Your AI Study Coach",
    recommendedForToday: "Recommended for today",
    currentMastery: (pct: number) => `Current mastery: ${pct}%`,
    nextReview: "Next, review:",
    continueLearning: "Continue Learning",
    weakTopics: "Weak topics",
    noWeakTopicsYet: "Complete a mock exam or Study Drill to see your weak topics here.",
    missedCount: (n: number) => `${n} missed`,
    recommendedNext: "Recommended next",
    takePracticeSession: "Take a practice session →",
    browseCourses: "Browse courses →",
    parentGuardianRequests: "Parent/guardian requests",
    relationshipSuffix: (relationship: string) => ` (${relationship})`,
    wantsToConnectAsParent: "wants to connect as your parent/guardian.",
    approve: "Approve",
    reject: "Reject",
    schoolInvitations: "School invitations",
    wantsToAddAsStudent: "wants to add you as a student.",
    accept: "Accept",
    decline: "Decline",
    haveVoucherCode: "Have a sponsor voucher code?",
    voucherPlaceholder: "SP-XXXXXXXX",
    redeem: "Redeem",
    yourParentLinkCode: "Your parent link code",
    shareParentLinkCode:
      "Share this code with a parent or guardian so they can request to connect and follow your progress.",
    readinessNamedTitle: (subjectName: string) => `${subjectName} Readiness`,
    readyPct: (pct: number) => `${pct}% Ready`,
    strong: "Strong",
    needsImprovement: "Needs improvement",
    recommendedStudyTime: (hours: number, minutes: number) =>
      `Recommended study time: ${hours}h ${minutes}min`,
    estimateDisclaimer: "Estimated from your practice history — not a guarantee of exam results.",
  },
  adminOverview: {
    title: "Platform health",
    subtitle: "Central control center for SmartPrepAfrica.com.",
    allCountries: "All countries",
    dateRangeLabels: {
      today: "Today",
      week: "This week",
      month: "This month",
      quarter: "This quarter",
      year: "This year",
      all: "All time",
    },
    usersSectionTitle: (countryName?: string) => `Users${countryName ? ` (${countryName})` : ""}`,
    totalStudents: "Total students",
    teachers: "Teachers",
    parents: "Parents",
    schoolAdmins: "School admins",
    partners: "Partners",
    sponsors: "Sponsors",
    ecosystemActivityTitle: (rangeLabel: string) => `Ecosystem activity (${rangeLabel})`,
    newRegistrations: "New registrations",
    activeUsers: "Active users",
    distinctSuccessfulLogins: "Distinct successful logins in range.",
    linkedParentStudentAccounts: "Linked parent/student accounts",
    activeTeachers: "Active teachers",
    activeTeachersHint: "Have a published course or an assigned class.",
    publishedCourses: "Published courses",
    schoolEnrollments: "School enrollments",
    schoolEnrollmentsHint: "Students affiliated with a school.",
    activeSponsorships: "Active sponsorships",
    activeSponsorshipsHint: "Vouchers redeemed to a real beneficiary.",
    partnerConversions: "Partner conversions",
    partnerConversionsHint: "Referral clicks that led to a registration.",
    educationSectionTitle: "Education",
    totalQuestionsTitle: (code?: string) => (code ? `Total questions (${code})` : "Total questions"),
    coursesAllCountries: "Courses (all countries)",
    lessonsAllCountries: "Lessons (all countries)",
    practiceSessionsTitle: (code?: string) => (code ? `Practice sessions (${code})` : "Practice sessions"),
    mockExamsTitle: (code?: string) => (code ? `Mock exams (${code})` : "Mock exams"),
    examAttemptsTitle: (code?: string) => (code ? `Exam attempts (${code})` : "Exam attempts"),
    schoolsSectionTitle: (countryName?: string) => `Schools${countryName ? ` (${countryName})` : ""}`,
    registered: "Registered",
    active: "Active",
    pending: "Pending",
    courseProviders: "Course providers",
    revenueSectionTitle: "Revenue",
    paidSubscribersTitle: (code?: string) => (code ? `Paid subscribers (${code})` : "Paid subscribers"),
    subscriptionRevenueTitle: (code?: string) =>
      code ? `Subscription revenue (${code})` : "Subscription revenue",
    partnerCommissionsAllCountries: "Partner commissions (all countries)",
    pendingPayoutsAllCountries: "Pending payouts (all countries)",
    aiSectionTitle: "AI",
    coachUsers30d: "Coach users (30d)",
    requestsToday: "Requests today",
    requestsThisMonth: "Requests this month",
    estimatedCostAllTime: "Estimated cost (all-time)",
    mostAskedSubjects: "Most-asked subjects",
    noAiConversationsYet: "No AI Coach conversations yet.",
    platformSectionTitle: "Platform",
    openSupportRequests: "Open support requests",
    pendingApprovals: "Pending approvals",
    pendingApprovalsBreakdown: (partners: number, schools: number, courses: number) =>
      `${partners} partners · ${schools} schools · ${courses} courses`,
    flaggedAccounts: "Flagged accounts",
    failedLoginsRange: "Failed logins (range)",
    failedLoginsHint: "Basic heuristic — flagged for manual review, not auto-blocked.",
  },
};

export type Dictionary = typeof en;
