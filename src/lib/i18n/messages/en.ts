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
};

export type Dictionary = typeof en;
