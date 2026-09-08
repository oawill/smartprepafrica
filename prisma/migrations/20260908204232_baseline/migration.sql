-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'PARENT', 'SCHOOL_ADMIN', 'TEACHER', 'SPONSOR', 'PARTNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('SUPER_ADMIN', 'PLATFORM_ADMIN', 'CONTENT_ADMIN', 'CONTENT_REVIEWER', 'SCHOOL_SUPPORT_ADMIN', 'USER_SUPPORT_ADMIN', 'FINANCE_ADMIN', 'PARTNER_ADMIN', 'SECURITY_ADMIN', 'ANALYST');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED', 'PENDING_VERIFICATION', 'CLOSED');

-- CreateEnum
CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "SchoolInviteRole" AS ENUM ('TEACHER', 'STUDENT');

-- CreateEnum
CREATE TYPE "SchoolInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('PENDING', 'VERIFICATION_REQUIRED', 'ACTIVE', 'SUSPENDED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CountryStatus" AS ENUM ('DRAFT', 'CONTENT_SETUP', 'TESTING', 'ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "VideoProjectStatus" AS ENUM ('DRAFT', 'SCRIPT_GENERATING', 'SCRIPT_READY', 'NEEDS_REVIEW', 'SCRIPT_APPROVED', 'ASSETS_GENERATING', 'VOICE_GENERATING', 'READY_TO_RENDER', 'RENDERING', 'RENDER_COMPLETE', 'RENDER_FAILED', 'FINAL_REVIEW', 'APPROVED', 'READY_TO_PUBLISH', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "VideoType" AS ENUM ('FULL_LESSON', 'QUICK_REVISION', 'PAST_QUESTION_WALKTHROUGH', 'CONCEPT_EXPLAINER', 'WORKED_EXAMPLE', 'PRACTICAL_DEMONSTRATION', 'EXAM_TIPS', 'TOPIC_SUMMARY', 'YOUTUBE_SHORT', 'REVISION_SHORT');

-- CreateEnum
CREATE TYPE "VideoAspectRatio" AS ENUM ('LANDSCAPE_16_9', 'VERTICAL_9_16', 'SQUARE_1_1');

-- CreateEnum
CREATE TYPE "VideoSceneType" AS ENUM ('HOOK', 'BRAND_INTRO', 'LEARNING_OBJECTIVE', 'CONCEPT', 'DEFINITION', 'EXAMPLE', 'WORKED_EXAMPLE', 'EQUATION', 'DIAGRAM', 'ANIMATION', 'COMPARISON', 'EXAM_TIP', 'WAEC_QUESTION', 'MULTIPLE_CHOICE', 'QUESTION_TIMER', 'ANSWER_REVEAL', 'SUMMARY', 'CALL_TO_ACTION', 'OUTRO');

-- CreateEnum
CREATE TYPE "VideoSceneReviewStatus" AS ENUM ('PENDING', 'FLAGGED', 'APPROVED');

-- CreateEnum
CREATE TYPE "VideoSceneQuestionSource" AS ENUM ('NONE', 'EXISTING_QUESTION', 'AI_DRAFT');

-- CreateEnum
CREATE TYPE "VideoSceneVoiceStatus" AS ENUM ('NOT_STARTED', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "RenderJobStatus" AS ENUM ('QUEUED', 'RENDERING', 'COMPLETE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "YouTubeUploadStatus" AS ENUM ('NOT_STARTED', 'UPLOADING', 'UPLOADED', 'FAILED');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('WAEC', 'NECO', 'UTME', 'POST_UTME');

-- CreateEnum
CREATE TYPE "PassageType" AS ENUM ('COMPREHENSION', 'PROSE_EXTRACT', 'POETRY', 'DRAMA_EXTRACT', 'DIALOGUE', 'LITERARY_EXTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionSourceType" AS ENUM ('OFFICIAL_PAST_QUESTION', 'LICENSED_QUESTION', 'ORIGINAL_SMARTPREP_QUESTION', 'TEACHER_CREATED', 'AI_GENERATED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AttemptMode" AS ENUM ('STUDY_DRILL', 'MOCK_EXAM', 'CBT_PRACTICE');

-- CreateEnum
CREATE TYPE "CourseCategory" AS ENUM ('ACADEMIC', 'CAREER_DEVELOPMENT', 'TECHNOLOGY', 'AI', 'CODING', 'FINANCIAL_LITERACY', 'COMMUNICATION', 'LEADERSHIP', 'MINDSET', 'DISCIPLINE', 'LIFE_SKILLS');

-- CreateEnum
CREATE TYPE "CourseModerationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'NEEDS_CHANGES', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LessonType" AS ENUM ('VIDEO', 'TEXT', 'QUIZ');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PREMIUM', 'PRO', 'SCHOOL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('CHARGE', 'REFUND');

-- CreateEnum
CREATE TYPE "VoucherStatus" AS ENUM ('ACTIVE', 'REDEEMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'REWARDED');

-- CreateEnum
CREATE TYPE "AiCoachMode" AS ENUM ('ASK', 'EXPLAIN', 'PRACTICE', 'QUIZ_ME', 'STUDY_PLAN', 'EXAM_PREP');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiInsightType" AS ENUM ('WEAK_TOPIC', 'STRONG_TOPIC', 'COMMON_MISTAKE', 'RECOMMENDED_TOPIC', 'READINESS_SUMMARY');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('INDIVIDUAL_AFFILIATE', 'TEACHER', 'EDUCATION_CONSULTANT', 'SCHOOL_REPRESENTATIVE', 'INFLUENCER', 'COMMUNITY_AMBASSADOR', 'CORPORATE_NGO', 'MARKETING_AGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartnerReferralStatus" AS ENUM ('CLICKED', 'REGISTERED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "SchoolLeadStatus" AS ENUM ('NEW_LEAD', 'CONTACTED', 'DEMO_SCHEDULED', 'NEGOTIATING', 'SCHOOL_REGISTERED', 'ACTIVATED', 'PAYING_SCHOOL', 'LOST');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'RESOLVED_INCUMBENT', 'RESOLVED_CHALLENGER', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommissionEventType" AS ENUM ('STUDENT_FIRST_SUBSCRIPTION', 'STUDENT_RECURRING_SUBSCRIPTION', 'SCHOOL_ACTIVATION', 'SCHOOL_STUDENT_ACTIVATION', 'CAMPAIGN_BONUS', 'MILESTONE_BONUS');

-- CreateEnum
CREATE TYPE "CommissionCalcType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'QUALIFIED', 'APPROVED', 'AVAILABLE', 'PAID', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MarketingAssetType" AS ENUM ('LOGO', 'BANNER', 'SOCIAL_GRAPHIC', 'WHATSAPP_GRAPHIC', 'BROCHURE', 'FLYER', 'QR_CODE', 'SAMPLE_MESSAGE', 'VIDEO', 'OTHER');

-- CreateEnum
CREATE TYPE "PartnerNotificationType" AS ENUM ('APPLICATION_APPROVED', 'NEW_STUDENT', 'SCHOOL_LEAD_STATUS_CHANGED', 'SCHOOL_ACTIVATED', 'COMMISSION_EARNED', 'COMMISSION_AVAILABLE', 'PAYOUT_APPROVED', 'PAYOUT_COMPLETED', 'TIER_UPGRADED');

-- CreateEnum
CREATE TYPE "FraudFlagStatus" AS ENUM ('OPEN', 'REVIEWING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS', 'PRIVACY', 'PARTNER_PROGRAM');

-- CreateEnum
CREATE TYPE "ContactAccountType" AS ENUM ('STUDENT', 'PARENT', 'TEACHER', 'SCHOOL', 'SPONSOR', 'PARTNER', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactTopic" AS ENUM ('GENERAL_INQUIRY', 'ACCOUNT_SUPPORT', 'BILLING', 'COURSE_SUPPORT', 'SCHOOL_REGISTRATION', 'PARTNER_PROGRAM', 'AI_STUDY_COACH', 'TECHNICAL_PROBLEM', 'REPORT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESPONDED', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ToeflSkill" AS ENUM ('READING', 'LISTENING', 'SPEAKING', 'WRITING');

-- CreateEnum
CREATE TYPE "ToeflAttemptKind" AS ENUM ('DIAGNOSTIC', 'SKILL_PRACTICE', 'MOCK_EXAM');

-- CreateEnum
CREATE TYPE "ToeflEvalStatus" AS ENUM ('NOT_APPLICABLE', 'NOT_EVALUATED', 'EVALUATING', 'EVALUATED', 'FAILED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SatSection" AS ENUM ('READING_WRITING', 'MATH');

-- CreateEnum
CREATE TYPE "SatAttemptKind" AS ENUM ('SKILL_PRACTICE', 'DIAGNOSTIC', 'MOCK_EXAM', 'DRILL');

-- CreateEnum
CREATE TYPE "InternationalExamProduct" AS ENUM ('TOEFL', 'SAT');

-- CreateEnum
CREATE TYPE "ContentImportFormat" AS ENUM ('CSV', 'XLSX', 'JSON');

-- CreateEnum
CREATE TYPE "ContentImportStatus" AS ENUM ('UPLOADED', 'VALIDATING', 'VALIDATED', 'IMPORTING', 'COMPLETED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ContentImportRowStatus" AS ENUM ('PENDING', 'VALID', 'WARNING', 'ERROR', 'DUPLICATE', 'IMPORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adminRole" "AdminRole",
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "statusReason" TEXT,
    "statusChangedById" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "studentNumber" TEXT,
    "referredByPartnerId" TEXT,
    "referredByCampaignId" TEXT,
    "referralCapturedAt" TIMESTAMP(3),
    "countryId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "classId" TEXT,
    "gradeLevel" TEXT,
    "targetExams" "ExamType"[],
    "linkCode" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentStudentLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING',
    "relationship" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentStudentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolInvitation" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "inviteeEmail" TEXT NOT NULL,
    "role" "SchoolInviteRole" NOT NULL,
    "classId" TEXT,
    "status" "SchoolInviteStatus" NOT NULL DEFAULT 'PENDING',
    "invitationToken" TEXT NOT NULL,
    "invitationExpiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "countryId" TEXT,
    "logoUrl" TEXT,
    "coverImageUrl" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "schoolNumber" TEXT,
    "status" "SchoolStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "statusChangedById" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "schoolId" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "qualifications" TEXT,
    "yearsExperience" INTEGER,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherFollow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeacherFollow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassCourseAssignment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassCourseAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT,

    CONSTRAINT "SponsorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "currencySymbol" TEXT NOT NULL,
    "flag" TEXT NOT NULL,
    "status" "CountryStatus" NOT NULL DEFAULT 'DRAFT',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamBody" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamBody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "examBodyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryExam" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "status" "CountryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountryExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryExamSubject" (
    "id" TEXT NOT NULL,
    "countryExamId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "CountryExamSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTopic" (
    "id" TEXT NOT NULL,
    "countryExamSubjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountryPlanPrice" (
    "id" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CountryPlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "countryExamId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "examTopicId" TEXT,
    "gradeLevel" TEXT,
    "videoType" "VideoType" NOT NULL,
    "aspectRatio" "VideoAspectRatio" NOT NULL DEFAULT 'LANDSCAPE_16_9',
    "targetDurationSec" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'English',
    "learningObjectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "VideoProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "ctaLabel" TEXT,
    "ctaDestination" TEXT,
    "campaignId" TEXT,
    "youtubeVideoId" TEXT,
    "youtubeUploadStatus" "YouTubeUploadStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "youtubeUploadError" TEXT,
    "youtubePrivacyStatus" TEXT,
    "youtubePublishedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoScene" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sceneType" "VideoSceneType" NOT NULL,
    "title" TEXT NOT NULL,
    "estimatedDurationSec" INTEGER NOT NULL DEFAULT 15,
    "narration" TEXT,
    "onScreenText" TEXT,
    "visualDirection" TEXT,
    "animationInstructions" TEXT,
    "learningObjective" TEXT,
    "equation" TEXT,
    "diagramDescription" TEXT,
    "questionSource" "VideoSceneQuestionSource" NOT NULL DEFAULT 'NONE',
    "questionId" TEXT,
    "draftQuestionPrompt" TEXT,
    "draftQuestionOptions" JSONB,
    "draftQuestionAnswer" TEXT,
    "draftQuestionExplanation" TEXT,
    "reviewStatus" "VideoSceneReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "voiceStatus" "VideoSceneVoiceStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "voiceAudioUrl" TEXT,
    "voiceDurationSec" DOUBLE PRECISION,
    "voiceProvider" TEXT,
    "voiceId" TEXT,
    "voiceError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoicePronunciationOverride" (
    "id" TEXT NOT NULL,
    "displayText" TEXT NOT NULL,
    "pronunciationText" TEXT NOT NULL,
    "phoneme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoicePronunciationOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoGenerationLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "characterCount" INTEGER,
    "estimatedCostKobo" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRenderJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "RenderJobStatus" NOT NULL DEFAULT 'QUEUED',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "outputUrl" TEXT,
    "outputDurationSec" DOUBLE PRECISION,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "remotionRenderId" TEXT,
    "remotionBucketName" TEXT,
    "requestedById" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoRenderJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "YouTubeConnection" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "channelThumbnailUrl" TEXT,
    "refreshTokenEncrypted" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "connectedById" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "YouTubeConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT,
    "subtopic" TEXT,
    "grade" TEXT,
    "year" INTEGER,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "questionNumber" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PUBLISHED',
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "createdById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "duplicateOfId" TEXT,
    "passageGroupId" TEXT,
    "passageOrder" INTEGER,
    "passageLineRef" TEXT,
    "passageLineStart" INTEGER,
    "passageLineEnd" INTEGER,
    "countryExamId" TEXT,
    "examTopicId" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PassageGroup" (
    "id" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "code" TEXT,
    "type" "PassageType" NOT NULL DEFAULT 'COMPREHENSION',
    "title" TEXT,
    "instructions" TEXT,
    "bodyText" TEXT NOT NULL,
    "showLineNumbers" BOOLEAN NOT NULL DEFAULT false,
    "startingLineNumber" INTEGER NOT NULL DEFAULT 1,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countryExamId" TEXT,

    CONSTRAINT "PassageGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "mode" "AttemptMode" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "totalItems" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionResponse" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    "timeSpentSecs" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curriculum" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Curriculum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" TEXT NOT NULL,
    "curriculumId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "CourseCategory" NOT NULL,
    "partnerSchool" TEXT,
    "coverImageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderationStatus" "CourseModerationStatus" NOT NULL DEFAULT 'DRAFT',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "instructorName" TEXT,
    "difficulty" "Difficulty",
    "estimatedMinutes" INTEGER,
    "learningObjectives" TEXT[],
    "priceKobo" INTEGER,
    "subjectId" TEXT,
    "examType" "ExamType",
    "classLevelId" TEXT,
    "schoolId" TEXT,
    "teacherId" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveClass" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Module" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTopic" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LessonType" NOT NULL,
    "content" TEXT,
    "videoUrl" TEXT,
    "order" INTEGER NOT NULL,
    "topic" TEXT,
    "courseTopicId" TEXT,
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "captionsUrl" TEXT,
    "videoAttribution" TEXT,
    "transcriptFull" TEXT,
    "notesMarkdown" TEXT,
    "learningObjectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moderationStatus" "CourseModerationStatus" NOT NULL DEFAULT 'PUBLISHED',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonChapter" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "startSeconds" INTEGER NOT NULL,
    "endSeconds" INTEGER,
    "transcriptSegment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" TEXT NOT NULL,
    "atSeconds" INTEGER,
    "explanation" TEXT,
    "chapterId" TEXT,

    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCheckpointResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizQuestionId" TEXT NOT NULL,
    "selectedOption" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonCheckpointResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CourseEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "lastPositionSeconds" INTEGER,
    "percentWatched" DOUBLE PRECISION,
    "lastWatchedAt" TIMESTAMP(3),

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "AssignmentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certUrl" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purchasedByUserId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL,
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "provider" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transactionNumber" TEXT,
    "kind" "PaymentKind" NOT NULL DEFAULT 'CHARGE',
    "reversalOfId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorshipProgram" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "schoolId" TEXT,
    "subjectId" TEXT,
    "totalSeats" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorshipProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sponsorId" TEXT,
    "programId" TEXT,
    "issuedById" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "VoucherStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voucher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherRedemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "code" TEXT NOT NULL,
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT,
    "lessonId" TEXT,
    "subjectId" TEXT,
    "mode" "AiCoachMode" NOT NULL DEFAULT 'ASK',
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTopicMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTopicMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExamTopicMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExamTopicMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentExamProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "institutionId" TEXT,
    "courseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExamProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadinessTrendSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "readinessPct" DOUBLE PRECISION NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessTrendSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamDrillConfig" (
    "id" TEXT NOT NULL,
    "exam" "ExamType" NOT NULL,
    "quickCheckSize" INTEGER NOT NULL DEFAULT 5,
    "topicDrillSize" INTEGER NOT NULL DEFAULT 10,
    "practiceSessionSize" INTEGER NOT NULL DEFAULT 20,
    "challengeSize" INTEGER NOT NULL DEFAULT 40,
    "fullMockSubjectCount" INTEGER NOT NULL DEFAULT 4,
    "fullMockQuestionsPerSubject" INTEGER NOT NULL DEFAULT 40,
    "fullMockTimeLimitMinutes" INTEGER NOT NULL DEFAULT 60,
    "minTopicsForReadiness" INTEGER NOT NULL DEFAULT 3,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamDrillConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiLearningInsight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subjectId" TEXT,
    "topic" TEXT,
    "insightType" "AiInsightType" NOT NULL,
    "insight" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiLearningInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiUsageLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostKobo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiPlanLimit" (
    "plan" "SubscriptionPlan" NOT NULL,
    "dailyMessageLimit" INTEGER NOT NULL,
    "monthlyMessageLimit" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiPlanLimit_pkey" PRIMARY KEY ("plan")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "partnerNumber" TEXT,
    "referralCode" TEXT,
    "userId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "countryId" TEXT,
    "state" TEXT,
    "city" TEXT,
    "organization" TEXT,
    "partnerType" "PartnerType" NOT NULL,
    "status" "PartnerStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "rejectedReason" TEXT,
    "suspendedReason" TEXT,
    "adminNotes" TEXT,
    "preferredPaymentMethod" TEXT,
    "bankName" TEXT,
    "bankAccountName" TEXT,
    "bankAccountNumber" TEXT,
    "promotionPlan" TEXT,
    "referralSource" TEXT,
    "termsAcceptedAt" TIMESTAMP(3),
    "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCampaign" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerReferral" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "clickToken" TEXT NOT NULL,
    "landingPage" TEXT,
    "intent" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),
    "userId" TEXT,
    "schoolLeadId" TEXT,
    "status" "PartnerReferralStatus" NOT NULL DEFAULT 'CLICKED',
    "flaggedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchoolLead" (
    "id" TEXT NOT NULL,
    "leadNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "state" TEXT,
    "city" TEXT,
    "estimatedStudents" INTEGER,
    "estimatedTeachers" INTEGER,
    "notes" TEXT,
    "status" "SchoolLeadStatus" NOT NULL DEFAULT 'NEW_LEAD',
    "schoolId" TEXT,
    "invitationToken" TEXT,
    "invitationExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSchoolLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchoolLeadStatusChange" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "fromStatus" "SchoolLeadStatus",
    "toStatus" "SchoolLeadStatus" NOT NULL,
    "changedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerSchoolLeadStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchoolAttribution" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "winningLeadId" TEXT,
    "decidedById" TEXT,
    "decisionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSchoolAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSchoolDispute" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "challengerLeadId" TEXT NOT NULL,
    "incumbentPartnerId" TEXT NOT NULL,
    "challengerPartnerId" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSchoolDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCommissionRule" (
    "id" TEXT NOT NULL,
    "ruleKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "CommissionEventType" NOT NULL,
    "calcType" "CommissionCalcType" NOT NULL,
    "fixedAmountKobo" INTEGER,
    "percentage" DOUBLE PRECISION,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringMonths" INTEGER,
    "tierBrackets" JSONB,
    "maxAmountKobo" INTEGER,
    "qualificationHoldDays" INTEGER NOT NULL DEFAULT 14,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCommission" (
    "id" TEXT NOT NULL,
    "commissionNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "eventType" "CommissionEventType" NOT NULL,
    "sourceUserId" TEXT,
    "sourceSchoolId" TEXT,
    "sourcePaymentId" TEXT,
    "sourceSubscriptionId" TEXT,
    "sourceSchoolLeadId" TEXT,
    "amountKobo" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "qualifiesAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "availableAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "payoutId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerPayout" (
    "id" TEXT NOT NULL,
    "payoutNumber" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "destinationSnapshot" JSONB,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "paidAt" TIMESTAMP(3),
    "rejectedReason" TEXT,
    "adminNotes" TEXT,

    CONSTRAINT "PartnerPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerTier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minPaidStudents" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "perks" TEXT,
    "bonusPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMarketingAsset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assetType" "MarketingAssetType" NOT NULL,
    "url" TEXT,
    "content" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerMarketingAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "result" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failureReason" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "verifiedAt" TIMESTAMP(3),
    "usedAt" TIMESTAMP(3),
    "invalidatedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerAuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerNotification" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "PartnerNotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerFraudFlag" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "relatedReferralId" TEXT,
    "relatedCommissionId" TEXT,
    "status" "FraudFlagStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerFraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "attributionWindowDays" INTEGER NOT NULL DEFAULT 30,
    "minimumPayoutKobo" INTEGER NOT NULL DEFAULT 1000000,
    "requireAdminApproval" BOOLEAN NOT NULL DEFAULT true,
    "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "companyLegalName" TEXT,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "companyAddress" TEXT,
    "supportHours" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalDocument" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalAcceptance" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegalAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "accountType" "ContactAccountType" NOT NULL,
    "topic" "ContactTopic" NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "status" "ContactStatus" NOT NULL DEFAULT 'NEW',
    "assignedToId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submissionNumber" TEXT,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToeflContentSet" (
    "id" TEXT NOT NULL,
    "skill" "ToeflSkill" NOT NULL,
    "externalId" TEXT,
    "passageTitle" TEXT,
    "passage" TEXT,
    "audioUrl" TEXT,
    "audioDurationSec" DOUBLE PRECISION,
    "transcript" TEXT,
    "imageUrl" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "author" TEXT,
    "license" TEXT,
    "sourceReference" TEXT,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToeflContentSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToeflContent" (
    "id" TEXT NOT NULL,
    "skill" "ToeflSkill" NOT NULL,
    "taskType" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "contentSetId" TEXT,
    "order" INTEGER,
    "passage" TEXT,
    "audioUrl" TEXT,
    "audioDurationSec" DOUBLE PRECISION,
    "transcript" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctOption" TEXT,
    "explanation" TEXT,
    "estimatedTimeSec" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "author" TEXT,
    "license" TEXT,
    "sourceReference" TEXT,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToeflContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToeflAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ToeflAttemptKind" NOT NULL,
    "skill" "ToeflSkill",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "overallScore" DOUBLE PRECISION,
    "readingScore" DOUBLE PRECISION,
    "listeningScore" DOUBLE PRECISION,
    "speakingScore" DOUBLE PRECISION,
    "writingScore" DOUBLE PRECISION,

    CONSTRAINT "ToeflAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToeflAttemptItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    "timeSpentSecs" INTEGER,
    "speakingAudioUrl" TEXT,
    "speakingDurationSec" DOUBLE PRECISION,
    "writingText" TEXT,
    "writingWordCount" INTEGER,
    "evalStatus" "ToeflEvalStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "evalScore" DOUBLE PRECISION,
    "evalFluency" DOUBLE PRECISION,
    "evalPronunciation" DOUBLE PRECISION,
    "evalGrammar" DOUBLE PRECISION,
    "evalVocabulary" DOUBLE PRECISION,
    "evalTaskCompletion" DOUBLE PRECISION,
    "evalOrganization" DOUBLE PRECISION,
    "evalClarity" DOUBLE PRECISION,
    "evalFeedback" TEXT,

    CONSTRAINT "ToeflAttemptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatContentSet" (
    "id" TEXT NOT NULL,
    "section" "SatSection" NOT NULL,
    "externalId" TEXT,
    "passageTitle" TEXT,
    "passage" TEXT,
    "imageUrl" TEXT,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "author" TEXT,
    "license" TEXT,
    "sourceReference" TEXT,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SatContentSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatContent" (
    "id" TEXT NOT NULL,
    "section" "SatSection" NOT NULL,
    "domain" TEXT NOT NULL,
    "skill" TEXT,
    "questionType" TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "externalId" TEXT,
    "contentSetId" TEXT,
    "order" INTEGER,
    "passage" TEXT,
    "imageUrl" TEXT,
    "prompt" TEXT NOT NULL,
    "options" JSONB,
    "correctOption" TEXT,
    "correctValue" TEXT,
    "explanation" TEXT,
    "calculatorAllowed" BOOLEAN,
    "estimatedTimeSec" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceType" "QuestionSourceType" NOT NULL DEFAULT 'ORIGINAL_SMARTPREP_QUESTION',
    "author" TEXT,
    "license" TEXT,
    "sourceReference" TEXT,
    "createdByAi" BOOLEAN NOT NULL DEFAULT false,
    "reviewedById" TEXT,
    "importBatchId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SatContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "SatAttemptKind" NOT NULL,
    "section" "SatSection",
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "overallScore" INTEGER,
    "readingWritingScore" INTEGER,
    "mathScore" INTEGER,
    "readingWritingModule2Tier" TEXT,
    "mathModule2Tier" TEXT,
    "currentModuleStartedAt" TIMESTAMP(3),

    CONSTRAINT "SatAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatAttemptItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "module" INTEGER,
    "selectedOption" TEXT,
    "numericAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "timeSpentSecs" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SatAttemptItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatScoreGoal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetScore" INTEGER NOT NULL,
    "testDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SatScoreGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SatSkillMastery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "section" "SatSection" NOT NULL,
    "domain" TEXT NOT NULL,
    "skill" TEXT NOT NULL DEFAULT '',
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SatSkillMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InternationalExamPurchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "product" "InternationalExamProduct" NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "provider" TEXT NOT NULL DEFAULT 'paystack',
    "reference" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "InternationalExamPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentImportBatch" (
    "id" TEXT NOT NULL,
    "exam" "InternationalExamProduct" NOT NULL,
    "format" "ContentImportFormat" NOT NULL,
    "filename" TEXT NOT NULL,
    "status" "ContentImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "validRecords" INTEGER NOT NULL DEFAULT 0,
    "warningRecords" INTEGER NOT NULL DEFAULT 0,
    "errorRecords" INTEGER NOT NULL DEFAULT 0,
    "duplicateRecords" INTEGER NOT NULL DEFAULT 0,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "ContentImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "status" "ContentImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "messages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rawData" JSONB,
    "contentId" TEXT,

    CONSTRAINT "ContentImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_StudentTargetSubjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentTargetSubjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_SchoolAdmins" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SchoolAdmins_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TeacherClasses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeacherClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExamAttemptToSubject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExamAttemptToSubject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RelatedLessons" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RelatedLessons_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_StudentExamProfileSubjects" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_StudentExamProfileSubjects_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentNumber_key" ON "User"("studentNumber");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_linkCode_key" ON "StudentProfile"("linkCode");

-- CreateIndex
CREATE INDEX "ParentStudentLink_studentId_status_idx" ON "ParentStudentLink"("studentId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ParentStudentLink_parentId_studentId_key" ON "ParentStudentLink"("parentId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolInvitation_invitationToken_key" ON "SchoolInvitation"("invitationToken");

-- CreateIndex
CREATE INDEX "SchoolInvitation_schoolId_inviteeEmail_status_idx" ON "SchoolInvitation"("schoolId", "inviteeEmail", "status");

-- CreateIndex
CREATE INDEX "SchoolInvitation_inviteeEmail_status_idx" ON "SchoolInvitation"("inviteeEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "School_schoolNumber_key" ON "School"("schoolNumber");

-- CreateIndex
CREATE INDEX "School_status_idx" ON "School"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherFollow_userId_teacherId_key" ON "TeacherFollow"("userId", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassCourseAssignment_classId_courseId_key" ON "ClassCourseAssignment"("classId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorProfile_userId_key" ON "SponsorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_code_key" ON "Country"("code");

-- CreateIndex
CREATE INDEX "Country_status_idx" ON "Country"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBody_name_key" ON "ExamBody"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ExamBody_code_key" ON "ExamBody"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Exam_code_key" ON "Exam"("code");

-- CreateIndex
CREATE INDEX "Exam_examBodyId_idx" ON "Exam"("examBodyId");

-- CreateIndex
CREATE INDEX "CountryExam_status_idx" ON "CountryExam"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CountryExam_countryId_examId_key" ON "CountryExam"("countryId", "examId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryExamSubject_countryExamId_subjectId_key" ON "CountryExamSubject"("countryExamId", "subjectId");

-- CreateIndex
CREATE INDEX "ExamTopic_countryExamSubjectId_idx" ON "ExamTopic"("countryExamSubjectId");

-- CreateIndex
CREATE UNIQUE INDEX "CountryPlanPrice_countryId_plan_key" ON "CountryPlanPrice"("countryId", "plan");

-- CreateIndex
CREATE INDEX "VideoProject_status_idx" ON "VideoProject"("status");

-- CreateIndex
CREATE INDEX "VideoProject_subjectId_idx" ON "VideoProject"("subjectId");

-- CreateIndex
CREATE INDEX "VideoProject_countryExamId_idx" ON "VideoProject"("countryExamId");

-- CreateIndex
CREATE INDEX "VideoScene_projectId_idx" ON "VideoScene"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoScene_projectId_order_key" ON "VideoScene"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "VoicePronunciationOverride_displayText_key" ON "VoicePronunciationOverride"("displayText");

-- CreateIndex
CREATE INDEX "VideoGenerationLog_projectId_startedAt_idx" ON "VideoGenerationLog"("projectId", "startedAt");

-- CreateIndex
CREATE INDEX "VideoGenerationLog_status_idx" ON "VideoGenerationLog"("status");

-- CreateIndex
CREATE INDEX "VideoRenderJob_projectId_queuedAt_idx" ON "VideoRenderJob"("projectId", "queuedAt");

-- CreateIndex
CREATE INDEX "VideoRenderJob_status_idx" ON "VideoRenderJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeConnection_channelId_key" ON "YouTubeConnection"("channelId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_name_key" ON "Subject"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionNumber_key" ON "Question"("questionNumber");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");

-- CreateIndex
CREATE INDEX "Question_exam_idx" ON "Question"("exam");

-- CreateIndex
CREATE INDEX "Question_passageGroupId_idx" ON "Question"("passageGroupId");

-- CreateIndex
CREATE INDEX "Question_countryExamId_idx" ON "Question"("countryExamId");

-- CreateIndex
CREATE UNIQUE INDEX "PassageGroup_code_key" ON "PassageGroup"("code");

-- CreateIndex
CREATE INDEX "PassageGroup_status_idx" ON "PassageGroup"("status");

-- CreateIndex
CREATE INDEX "PassageGroup_subjectId_idx" ON "PassageGroup"("subjectId");

-- CreateIndex
CREATE INDEX "PassageGroup_exam_idx" ON "PassageGroup"("exam");

-- CreateIndex
CREATE INDEX "PassageGroup_countryExamId_idx" ON "PassageGroup"("countryExamId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionResponse_attemptId_questionId_key" ON "QuestionResponse"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_name_key" ON "Curriculum"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Curriculum_code_key" ON "Curriculum"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_curriculumId_name_key" ON "ClassLevel"("curriculumId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "CourseReview_courseId_userId_key" ON "CourseReview"("courseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTopic_courseId_order_key" ON "CourseTopic"("courseId", "order");

-- CreateIndex
CREATE INDEX "LessonChapter_lessonId_idx" ON "LessonChapter"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonChapter_lessonId_order_key" ON "LessonChapter"("lessonId", "order");

-- CreateIndex
CREATE INDEX "LessonCheckpointResponse_userId_quizQuestionId_idx" ON "LessonCheckpointResponse"("userId", "quizQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseEnrollment_userId_courseId_key" ON "CourseEnrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_enrollmentId_lessonId_key" ON "LessonProgress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentSubmission_assignmentId_userId_key" ON "AssignmentSubmission"("assignmentId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeId_key" ON "UserBadge"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionNumber_key" ON "Payment"("transactionNumber");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "VoucherRedemption_voucherId_key" ON "VoucherRedemption"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_referredUserId_key" ON "Referral"("referredUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_code_key" ON "Referral"("code");

-- CreateIndex
CREATE INDEX "AiConversation_userId_updatedAt_idx" ON "AiConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentTopicMastery_userId_masteryScore_idx" ON "StudentTopicMastery"("userId", "masteryScore");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTopicMastery_userId_subjectId_topic_key" ON "StudentTopicMastery"("userId", "subjectId", "topic");

-- CreateIndex
CREATE INDEX "StudentExamTopicMastery_userId_exam_masteryScore_idx" ON "StudentExamTopicMastery"("userId", "exam", "masteryScore");

-- CreateIndex
CREATE UNIQUE INDEX "StudentExamTopicMastery_userId_exam_subjectId_topic_key" ON "StudentExamTopicMastery"("userId", "exam", "subjectId", "topic");

-- CreateIndex
CREATE UNIQUE INDEX "StudentExamProfile_userId_exam_key" ON "StudentExamProfile"("userId", "exam");

-- CreateIndex
CREATE INDEX "ReadinessTrendSnapshot_userId_exam_day_idx" ON "ReadinessTrendSnapshot"("userId", "exam", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ReadinessTrendSnapshot_userId_exam_day_key" ON "ReadinessTrendSnapshot"("userId", "exam", "day");

-- CreateIndex
CREATE UNIQUE INDEX "ExamDrillConfig_exam_key" ON "ExamDrillConfig"("exam");

-- CreateIndex
CREATE INDEX "AiLearningInsight_userId_insightType_idx" ON "AiLearningInsight"("userId", "insightType");

-- CreateIndex
CREATE INDEX "AiUsageLog_userId_createdAt_idx" ON "AiUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiUsageLog_createdAt_idx" ON "AiUsageLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_partnerNumber_key" ON "Partner"("partnerNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_referralCode_key" ON "Partner"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_key" ON "Partner"("userId");

-- CreateIndex
CREATE INDEX "Partner_status_idx" ON "Partner"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCampaign_partnerId_slug_key" ON "PartnerCampaign"("partnerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReferral_clickToken_key" ON "PartnerReferral"("clickToken");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerReferral_userId_key" ON "PartnerReferral"("userId");

-- CreateIndex
CREATE INDEX "PartnerReferral_partnerId_createdAt_idx" ON "PartnerReferral"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "PartnerReferral_clickToken_idx" ON "PartnerReferral"("clickToken");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSchoolLead_leadNumber_key" ON "PartnerSchoolLead"("leadNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSchoolLead_invitationToken_key" ON "PartnerSchoolLead"("invitationToken");

-- CreateIndex
CREATE INDEX "PartnerSchoolLead_partnerId_status_idx" ON "PartnerSchoolLead"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerSchoolLead_schoolId_idx" ON "PartnerSchoolLead"("schoolId");

-- CreateIndex
CREATE INDEX "PartnerSchoolLeadStatusChange_leadId_idx" ON "PartnerSchoolLeadStatusChange"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSchoolAttribution_schoolId_key" ON "PartnerSchoolAttribution"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerSchoolDispute_challengerLeadId_key" ON "PartnerSchoolDispute"("challengerLeadId");

-- CreateIndex
CREATE INDEX "PartnerSchoolDispute_schoolId_status_idx" ON "PartnerSchoolDispute"("schoolId", "status");

-- CreateIndex
CREATE INDEX "PartnerCommissionRule_ruleKey_isActive_idx" ON "PartnerCommissionRule"("ruleKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCommissionRule_ruleKey_version_key" ON "PartnerCommissionRule"("ruleKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCommission_commissionNumber_key" ON "PartnerCommission"("commissionNumber");

-- CreateIndex
CREATE INDEX "PartnerCommission_partnerId_status_idx" ON "PartnerCommission"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerCommission_sourcePaymentId_idx" ON "PartnerCommission"("sourcePaymentId");

-- CreateIndex
CREATE INDEX "PartnerCommission_qualifiesAt_idx" ON "PartnerCommission"("qualifiesAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerPayout_payoutNumber_key" ON "PartnerPayout"("payoutNumber");

-- CreateIndex
CREATE INDEX "PartnerPayout_partnerId_status_idx" ON "PartnerPayout"("partnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerTier_name_key" ON "PartnerTier"("name");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "LoginActivity_userId_idx" ON "LoginActivity"("userId");

-- CreateIndex
CREATE INDEX "LoginActivity_email_idx" ON "LoginActivity"("email");

-- CreateIndex
CREATE INDEX "LoginActivity_createdAt_idx" ON "LoginActivity"("createdAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "PartnerAuditLog_entityType_entityId_idx" ON "PartnerAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "PartnerNotification_partnerId_readAt_idx" ON "PartnerNotification"("partnerId", "readAt");

-- CreateIndex
CREATE INDEX "PartnerFraudFlag_partnerId_status_idx" ON "PartnerFraudFlag"("partnerId", "status");

-- CreateIndex
CREATE INDEX "LegalDocument_type_isActive_idx" ON "LegalDocument"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LegalDocument_type_version_key" ON "LegalDocument"("type", "version");

-- CreateIndex
CREATE INDEX "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");

-- CreateIndex
CREATE INDEX "LegalAcceptance_documentId_idx" ON "LegalAcceptance"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSubmission_submissionNumber_key" ON "ContactSubmission"("submissionNumber");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_createdAt_idx" ON "ContactSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_ipHash_createdAt_idx" ON "ContactSubmission"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "ToeflContentSet_status_idx" ON "ToeflContentSet"("status");

-- CreateIndex
CREATE INDEX "ToeflContentSet_importBatchId_idx" ON "ToeflContentSet"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ToeflContentSet_skill_externalId_key" ON "ToeflContentSet"("skill", "externalId");

-- CreateIndex
CREATE INDEX "ToeflContent_skill_status_idx" ON "ToeflContent"("skill", "status");

-- CreateIndex
CREATE INDEX "ToeflContent_taskType_idx" ON "ToeflContent"("taskType");

-- CreateIndex
CREATE INDEX "ToeflContent_difficulty_idx" ON "ToeflContent"("difficulty");

-- CreateIndex
CREATE INDEX "ToeflContent_contentSetId_idx" ON "ToeflContent"("contentSetId");

-- CreateIndex
CREATE INDEX "ToeflContent_importBatchId_idx" ON "ToeflContent"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "ToeflContent_skill_externalId_key" ON "ToeflContent"("skill", "externalId");

-- CreateIndex
CREATE INDEX "ToeflAttempt_userId_kind_idx" ON "ToeflAttempt"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ToeflAttemptItem_attemptId_contentId_key" ON "ToeflAttemptItem"("attemptId", "contentId");

-- CreateIndex
CREATE INDEX "SatContentSet_status_idx" ON "SatContentSet"("status");

-- CreateIndex
CREATE INDEX "SatContentSet_importBatchId_idx" ON "SatContentSet"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "SatContentSet_section_externalId_key" ON "SatContentSet"("section", "externalId");

-- CreateIndex
CREATE INDEX "SatContent_section_status_idx" ON "SatContent"("section", "status");

-- CreateIndex
CREATE INDEX "SatContent_domain_idx" ON "SatContent"("domain");

-- CreateIndex
CREATE INDEX "SatContent_skill_idx" ON "SatContent"("skill");

-- CreateIndex
CREATE INDEX "SatContent_difficulty_idx" ON "SatContent"("difficulty");

-- CreateIndex
CREATE INDEX "SatContent_questionType_idx" ON "SatContent"("questionType");

-- CreateIndex
CREATE INDEX "SatContent_contentSetId_idx" ON "SatContent"("contentSetId");

-- CreateIndex
CREATE INDEX "SatContent_importBatchId_idx" ON "SatContent"("importBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "SatContent_section_externalId_key" ON "SatContent"("section", "externalId");

-- CreateIndex
CREATE INDEX "SatAttempt_userId_kind_idx" ON "SatAttempt"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "SatAttemptItem_attemptId_contentId_key" ON "SatAttemptItem"("attemptId", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "SatScoreGoal_userId_key" ON "SatScoreGoal"("userId");

-- CreateIndex
CREATE INDEX "SatSkillMastery_userId_section_idx" ON "SatSkillMastery"("userId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "SatSkillMastery_userId_section_domain_skill_key" ON "SatSkillMastery"("userId", "section", "domain", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "InternationalExamPurchase_reference_key" ON "InternationalExamPurchase"("reference");

-- CreateIndex
CREATE INDEX "InternationalExamPurchase_userId_product_idx" ON "InternationalExamPurchase"("userId", "product");

-- CreateIndex
CREATE INDEX "ContentImportBatch_exam_status_idx" ON "ContentImportBatch"("exam", "status");

-- CreateIndex
CREATE INDEX "ContentImportBatch_createdAt_idx" ON "ContentImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ContentImportRow_batchId_status_idx" ON "ContentImportRow"("batchId", "status");

-- CreateIndex
CREATE INDEX "ContentImportRow_batchId_rowNumber_idx" ON "ContentImportRow"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "_StudentTargetSubjects_B_index" ON "_StudentTargetSubjects"("B");

-- CreateIndex
CREATE INDEX "_SchoolAdmins_B_index" ON "_SchoolAdmins"("B");

-- CreateIndex
CREATE INDEX "_TeacherClasses_B_index" ON "_TeacherClasses"("B");

-- CreateIndex
CREATE INDEX "_ExamAttemptToSubject_B_index" ON "_ExamAttemptToSubject"("B");

-- CreateIndex
CREATE INDEX "_RelatedLessons_B_index" ON "_RelatedLessons"("B");

-- CreateIndex
CREATE INDEX "_StudentExamProfileSubjects_B_index" ON "_StudentExamProfileSubjects"("B");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByPartnerId_fkey" FOREIGN KEY ("referredByPartnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByCampaignId_fkey" FOREIGN KEY ("referredByCampaignId") REFERENCES "PartnerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentStudentLink" ADD CONSTRAINT "ParentStudentLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolInvitation" ADD CONSTRAINT "SchoolInvitation_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolInvitation" ADD CONSTRAINT "SchoolInvitation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "School" ADD CONSTRAINT "School_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFollow" ADD CONSTRAINT "TeacherFollow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFollow" ADD CONSTRAINT "TeacherFollow_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCourseAssignment" ADD CONSTRAINT "ClassCourseAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCourseAssignment" ADD CONSTRAINT "ClassCourseAssignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorProfile" ADD CONSTRAINT "SponsorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_examBodyId_fkey" FOREIGN KEY ("examBodyId") REFERENCES "ExamBody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryExam" ADD CONSTRAINT "CountryExam_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryExam" ADD CONSTRAINT "CountryExam_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryExamSubject" ADD CONSTRAINT "CountryExamSubject_countryExamId_fkey" FOREIGN KEY ("countryExamId") REFERENCES "CountryExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryExamSubject" ADD CONSTRAINT "CountryExamSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTopic" ADD CONSTRAINT "ExamTopic_countryExamSubjectId_fkey" FOREIGN KEY ("countryExamSubjectId") REFERENCES "CountryExamSubject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountryPlanPrice" ADD CONSTRAINT "CountryPlanPrice_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_countryExamId_fkey" FOREIGN KEY ("countryExamId") REFERENCES "CountryExam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_examTopicId_fkey" FOREIGN KEY ("examTopicId") REFERENCES "ExamTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProject" ADD CONSTRAINT "VideoProject_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoScene" ADD CONSTRAINT "VideoScene_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoGenerationLog" ADD CONSTRAINT "VideoGenerationLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRenderJob" ADD CONSTRAINT "VideoRenderJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "VideoProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoRenderJob" ADD CONSTRAINT "VideoRenderJob_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeConnection" ADD CONSTRAINT "YouTubeConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_passageGroupId_fkey" FOREIGN KEY ("passageGroupId") REFERENCES "PassageGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_countryExamId_fkey" FOREIGN KEY ("countryExamId") REFERENCES "CountryExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examTopicId_fkey" FOREIGN KEY ("examTopicId") REFERENCES "ExamTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageGroup" ADD CONSTRAINT "PassageGroup_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PassageGroup" ADD CONSTRAINT "PassageGroup_countryExamId_fkey" FOREIGN KEY ("countryExamId") REFERENCES "CountryExam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionResponse" ADD CONSTRAINT "QuestionResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevel" ADD CONSTRAINT "ClassLevel_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "Curriculum"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveClass" ADD CONSTRAINT "LiveClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseTopicId_fkey" FOREIGN KEY ("courseTopicId") REFERENCES "CourseTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonChapter" ADD CONSTRAINT "LessonChapter_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "LessonChapter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCheckpointResponse" ADD CONSTRAINT "LessonCheckpointResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCheckpointResponse" ADD CONSTRAINT "LessonCheckpointResponse_quizQuestionId_fkey" FOREIGN KEY ("quizQuestionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseEnrollment" ADD CONSTRAINT "CourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "CourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentSubmission" ADD CONSTRAINT "AssignmentSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_purchasedByUserId_fkey" FOREIGN KEY ("purchasedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipProgram" ADD CONSTRAINT "SponsorshipProgram_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "SponsorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipProgram" ADD CONSTRAINT "SponsorshipProgram_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorshipProgram" ADD CONSTRAINT "SponsorshipProgram_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "SponsorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_programId_fkey" FOREIGN KEY ("programId") REFERENCES "SponsorshipProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherRedemption" ADD CONSTRAINT "VoucherRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicMastery" ADD CONSTRAINT "StudentTopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTopicMastery" ADD CONSTRAINT "StudentTopicMastery_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamTopicMastery" ADD CONSTRAINT "StudentExamTopicMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamTopicMastery" ADD CONSTRAINT "StudentExamTopicMastery_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentExamProfile" ADD CONSTRAINT "StudentExamProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadinessTrendSnapshot" ADD CONSTRAINT "ReadinessTrendSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningInsight" ADD CONSTRAINT "AiLearningInsight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiLearningInsight" ADD CONSTRAINT "AiLearningInsight_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsageLog" ADD CONSTRAINT "AiUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCampaign" ADD CONSTRAINT "PartnerCampaign_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "PartnerCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerReferral" ADD CONSTRAINT "PartnerReferral_schoolLeadId_fkey" FOREIGN KEY ("schoolLeadId") REFERENCES "PartnerSchoolLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolLead" ADD CONSTRAINT "PartnerSchoolLead_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolLead" ADD CONSTRAINT "PartnerSchoolLead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolLeadStatusChange" ADD CONSTRAINT "PartnerSchoolLeadStatusChange_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "PartnerSchoolLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolAttribution" ADD CONSTRAINT "PartnerSchoolAttribution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolAttribution" ADD CONSTRAINT "PartnerSchoolAttribution_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolAttribution" ADD CONSTRAINT "PartnerSchoolAttribution_winningLeadId_fkey" FOREIGN KEY ("winningLeadId") REFERENCES "PartnerSchoolLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolDispute" ADD CONSTRAINT "PartnerSchoolDispute_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolDispute" ADD CONSTRAINT "PartnerSchoolDispute_challengerLeadId_fkey" FOREIGN KEY ("challengerLeadId") REFERENCES "PartnerSchoolLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolDispute" ADD CONSTRAINT "PartnerSchoolDispute_incumbentPartnerId_fkey" FOREIGN KEY ("incumbentPartnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerSchoolDispute" ADD CONSTRAINT "PartnerSchoolDispute_challengerPartnerId_fkey" FOREIGN KEY ("challengerPartnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "PartnerCommissionRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCommission" ADD CONSTRAINT "PartnerCommission_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "PartnerPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerPayout" ADD CONSTRAINT "PartnerPayout_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginActivity" ADD CONSTRAINT "LoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerAuditLog" ADD CONSTRAINT "PartnerAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerNotification" ADD CONSTRAINT "PartnerNotification_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerFraudFlag" ADD CONSTRAINT "PartnerFraudFlag_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalAcceptance" ADD CONSTRAINT "LegalAcceptance_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LegalDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToeflContent" ADD CONSTRAINT "ToeflContent_contentSetId_fkey" FOREIGN KEY ("contentSetId") REFERENCES "ToeflContentSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToeflAttempt" ADD CONSTRAINT "ToeflAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToeflAttemptItem" ADD CONSTRAINT "ToeflAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ToeflAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToeflAttemptItem" ADD CONSTRAINT "ToeflAttemptItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ToeflContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatContent" ADD CONSTRAINT "SatContent_contentSetId_fkey" FOREIGN KEY ("contentSetId") REFERENCES "SatContentSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatAttempt" ADD CONSTRAINT "SatAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatAttemptItem" ADD CONSTRAINT "SatAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "SatAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatAttemptItem" ADD CONSTRAINT "SatAttemptItem_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "SatContent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatScoreGoal" ADD CONSTRAINT "SatScoreGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SatSkillMastery" ADD CONSTRAINT "SatSkillMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InternationalExamPurchase" ADD CONSTRAINT "InternationalExamPurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentImportRow" ADD CONSTRAINT "ContentImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ContentImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentTargetSubjects" ADD CONSTRAINT "_StudentTargetSubjects_A_fkey" FOREIGN KEY ("A") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentTargetSubjects" ADD CONSTRAINT "_StudentTargetSubjects_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SchoolAdmins" ADD CONSTRAINT "_SchoolAdmins_A_fkey" FOREIGN KEY ("A") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SchoolAdmins" ADD CONSTRAINT "_SchoolAdmins_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamAttemptToSubject" ADD CONSTRAINT "_ExamAttemptToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExamAttemptToSubject" ADD CONSTRAINT "_ExamAttemptToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedLessons" ADD CONSTRAINT "_RelatedLessons_A_fkey" FOREIGN KEY ("A") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RelatedLessons" ADD CONSTRAINT "_RelatedLessons_B_fkey" FOREIGN KEY ("B") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentExamProfileSubjects" ADD CONSTRAINT "_StudentExamProfileSubjects_A_fkey" FOREIGN KEY ("A") REFERENCES "StudentExamProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_StudentExamProfileSubjects" ADD CONSTRAINT "_StudentExamProfileSubjects_B_fkey" FOREIGN KEY ("B") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

