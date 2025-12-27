import { AuditCategoryEnum } from "@/generated/prisma";

export type AuditCategory = AuditCategoryEnum;

export enum AuditAction {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  REGISTER = "REGISTER",
  OAUTH_LOGIN = "OAUTH_LOGIN",
  EMAIL_VERIFIED = "EMAIL_VERIFIED",
  MAGIC_LINK_LOGIN = "MAGIC_LINK_LOGIN",

  // Profile Actions
  NAME_CHANGE = "NAME_CHANGE",
  AVATAR_UPDATE = "AVATAR_UPDATE",
  PREFERENCES_UPDATE = "PREFERENCES_UPDATE",
  PROFILE_UPDATE = "PROFILE_UPDATE",

  // Security Actions
  PASSWORD_CHANGE = "PASSWORD_CHANGE",
  PASSWORD_RESET_REQUEST = "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET_COMPLETE = "PASSWORD_RESET_COMPLETE",
  OTP_REQUEST = "OTP_REQUEST",
  OTP_VERIFY = "OTP_VERIFY",
  TWO_FACTOR_ENABLE = "TWO_FACTOR_ENABLE",
  TWO_FACTOR_DISABLE = "TWO_FACTOR_DISABLE",

  // Account Actions
  ACCOUNT_DEACTIVATE = "ACCOUNT_DEACTIVATE",
  ACCOUNT_DELETE = "ACCOUNT_DELETE",
  ACCOUNT_RECOVER = "ACCOUNT_RECOVER",
  ROLE_CHANGE = "ROLE_CHANGE",
  USER_INVITED = "USER_INVITED", // Added for writer invitations
  INVITATION_ACCEPTED = "INVITATION_ACCEPTED", // Added for writer invitations
  INVITATION_REVOKED = "INVITATION_REVOKED", // Added for writer invitations

  // Content Actions
  POST_CREATE = "POST_CREATE",
  POST_UPDATE = "POST_UPDATE",
  POST_DELETE = "POST_DELETE",
  POST_PUBLISH = "POST_PUBLISH",
  POST_REVIEW = "POST_REVIEW", // Added for blog post review
  COMMENT_CREATE = "COMMENT_CREATE",
  COMMENT_UPDATE = "COMMENT_UPDATE",
  COMMENT_DELETE = "COMMENT_DELETE",
  COMMENT_APPROVE = "COMMENT_APPROVE", // Added for comment moderation
  COMMENT_REJECT = "COMMENT_REJECT", // Added for comment moderation

  // Newsletter Actions
  NEWSLETTER_SUBSCRIBE = "NEWSLETTER_SUBSCRIBE",
  NEWSLETTER_UNSUBSCRIBE = "NEWSLETTER_UNSUBSCRIBE",
  NEWSLETTER_VERIFY = "NEWSLETTER_VERIFY",

  // Moderation Actions
  CONTENT_APPROVE = "CONTENT_APPROVE",
  CONTENT_REJECT = "CONTENT_REJECT",
  USER_BAN = "USER_BAN",
  USER_UNBAN = "USER_UNBAN",

  // System Actions
  SETTINGS_UPDATE = "SETTINGS_UPDATE",
  MAINTENANCE_MODE = "MAINTENANCE_MODE",
  BACKUP_CREATE = "BACKUP_CREATE",
  EXTERNAL_POST_FETCH = "EXTERNAL_POST_FETCH", // Added for news source fetching
}

export enum AuditEntity {
  USER = "USER",
  POST = "POST",
  COMMENT = "COMMENT",
  CATEGORY = "CATEGORY",
  TAG = "TAG",
  INVITATION = "INVITATION",
  SUBSCRIPTION = "SUBSCRIPTION",
  SYSTEM = "SYSTEM",
  NEWSLETTER = "NEWSLETTER",
  AVATAR = "AVATAR",
  SOURCE = "SOURCE",
  EXTERNAL_POST = "EXTERNAL_POST",
}

export enum AuditSeverity {
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
  CRITICAL = "CRITICAL",
}

// ========== AUDIT LOG DATA INTERFACE ==========
export interface AuditLogData {
  userId: string;
  action: AuditAction;
  categoryName: AuditCategoryEnum; // Changed from 'category' to 'categoryName' to match usage
  entity?: AuditEntity;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  description?: string;
  ipAddress?: string;
  userAgent?: string;
  severity?: AuditSeverity;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export const getCategoryFromAction = (
  action: AuditAction
): AuditCategoryEnum => {
  const categoryMap: Partial<Record<AuditAction, AuditCategoryEnum>> = {
    // Authentication
    [AuditAction.LOGIN]: AuditCategoryEnum.AUTHENTICATION,
    [AuditAction.LOGOUT]: AuditCategoryEnum.AUTHENTICATION,
    [AuditAction.REGISTER]: AuditCategoryEnum.AUTHENTICATION,
    [AuditAction.OAUTH_LOGIN]: AuditCategoryEnum.AUTHENTICATION,
    [AuditAction.EMAIL_VERIFIED]: AuditCategoryEnum.AUTHENTICATION,
    [AuditAction.MAGIC_LINK_LOGIN]: AuditCategoryEnum.AUTHENTICATION,

    // Profile
    [AuditAction.NAME_CHANGE]: AuditCategoryEnum.PROFILE,
    [AuditAction.AVATAR_UPDATE]: AuditCategoryEnum.PROFILE,
    [AuditAction.PREFERENCES_UPDATE]: AuditCategoryEnum.PROFILE,
    [AuditAction.PROFILE_UPDATE]: AuditCategoryEnum.PROFILE,

    // Security
    [AuditAction.PASSWORD_CHANGE]: AuditCategoryEnum.SECURITY,
    [AuditAction.PASSWORD_RESET_REQUEST]: AuditCategoryEnum.SECURITY,
    [AuditAction.PASSWORD_RESET_COMPLETE]: AuditCategoryEnum.SECURITY,
    [AuditAction.OTP_REQUEST]: AuditCategoryEnum.SECURITY,
    [AuditAction.OTP_VERIFY]: AuditCategoryEnum.SECURITY,
    [AuditAction.TWO_FACTOR_ENABLE]: AuditCategoryEnum.SECURITY,
    [AuditAction.TWO_FACTOR_DISABLE]: AuditCategoryEnum.SECURITY,

    // Account
    [AuditAction.ACCOUNT_DEACTIVATE]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.ACCOUNT_DELETE]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.ACCOUNT_RECOVER]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.ROLE_CHANGE]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.USER_INVITED]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.INVITATION_ACCEPTED]: AuditCategoryEnum.ACCOUNT,
    [AuditAction.INVITATION_REVOKED]: AuditCategoryEnum.ACCOUNT,

    // Content
    [AuditAction.POST_CREATE]: AuditCategoryEnum.CONTENT,
    [AuditAction.POST_UPDATE]: AuditCategoryEnum.CONTENT,
    [AuditAction.POST_DELETE]: AuditCategoryEnum.CONTENT,
    [AuditAction.POST_PUBLISH]: AuditCategoryEnum.CONTENT,
    [AuditAction.POST_REVIEW]: AuditCategoryEnum.CONTENT,
    [AuditAction.COMMENT_CREATE]: AuditCategoryEnum.CONTENT,
    [AuditAction.COMMENT_UPDATE]: AuditCategoryEnum.CONTENT,
    [AuditAction.COMMENT_DELETE]: AuditCategoryEnum.CONTENT,
    [AuditAction.COMMENT_APPROVE]: AuditCategoryEnum.CONTENT,
    [AuditAction.COMMENT_REJECT]: AuditCategoryEnum.CONTENT,

    // Newsletter
    [AuditAction.NEWSLETTER_SUBSCRIBE]: AuditCategoryEnum.SUBSCRIPTION,
    [AuditAction.NEWSLETTER_UNSUBSCRIBE]: AuditCategoryEnum.SUBSCRIPTION,
    [AuditAction.NEWSLETTER_VERIFY]: AuditCategoryEnum.SUBSCRIPTION,

    // Moderation
    [AuditAction.CONTENT_APPROVE]: AuditCategoryEnum.MODERATION,
    [AuditAction.CONTENT_REJECT]: AuditCategoryEnum.MODERATION,
    [AuditAction.USER_BAN]: AuditCategoryEnum.MODERATION,
    [AuditAction.USER_UNBAN]: AuditCategoryEnum.MODERATION,

    // System
    [AuditAction.SETTINGS_UPDATE]: AuditCategoryEnum.SYSTEM,
    [AuditAction.MAINTENANCE_MODE]: AuditCategoryEnum.SYSTEM,
    [AuditAction.BACKUP_CREATE]: AuditCategoryEnum.SYSTEM,
    [AuditAction.EXTERNAL_POST_FETCH]: AuditCategoryEnum.SYSTEM,
  };

  return categoryMap[action] || AuditCategoryEnum.SYSTEM;
};

export interface AuditLogWithRelations {
  id: string;
  action: string;
  categoryId: string | null;
  actorId: string | null;
  targetId: string | null;
  targetType: string | null;
  description: string | null;
  payload: any;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: any;
  severity: string;
  sessionId: string | null;
  createdAt: Date;
  category?: {
    id: string;
    name: AuditCategoryEnum;
    description: string | null;
    icon: string | null;
    color: string | null;
  } | null;
  actor?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  } | null;
}

export interface AuditFilterOptions {
  category?: AuditCategoryEnum;
  action?: AuditAction;
  userId?: string;
  entity?: AuditEntity;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  severity?: AuditSeverity;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AuditStats {
  totalLogs: number;
  byCategory: Array<{
    category: AuditCategoryEnum;
    count: number;
    percentage: number;
  }>;
  bySeverity: Array<{
    severity: AuditSeverity;
    count: number;
  }>;
  byAction: Array<{
    action: AuditAction;
    count: number;
  }>;
  timeframe: {
    start: Date;
    end: Date;
  };
}
