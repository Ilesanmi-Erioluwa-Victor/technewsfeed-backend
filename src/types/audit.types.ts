import { AuditCategoryEnum } from "@/generated/prisma";
import { AuditAction, AuditSeverity } from "@/utils/audit/types";

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

export const getSeverityFromAction = (action: AuditAction): AuditSeverity => {
  const severityMap: Record<AuditAction, AuditSeverity> = {
    // ========== AUTHENTICATION ==========
    [AuditAction.LOGIN]: AuditSeverity.INFO, // Normal login
    [AuditAction.LOGOUT]: AuditSeverity.INFO, // Normal logout
    [AuditAction.REGISTER]: AuditSeverity.INFO, // New registration
    [AuditAction.OAUTH_LOGIN]: AuditSeverity.INFO, // OAuth login
    [AuditAction.EMAIL_VERIFIED]: AuditSeverity.INFO, // Email verification
    [AuditAction.MAGIC_LINK_LOGIN]: AuditSeverity.INFO, // Magic link login

    // ========== PROFILE ==========
    [AuditAction.NAME_CHANGE]: AuditSeverity.INFO, // Name change
    [AuditAction.AVATAR_UPDATE]: AuditSeverity.INFO, // Avatar update
    [AuditAction.PREFERENCES_UPDATE]: AuditSeverity.INFO, // Preferences update
    [AuditAction.PROFILE_UPDATE]: AuditSeverity.INFO, // General profile update

    // ========== SECURITY ==========
    [AuditAction.PASSWORD_CHANGE]: AuditSeverity.INFO, // User-initiated password change
    [AuditAction.PASSWORD_RESET_REQUEST]: AuditSeverity.WARN, // Password reset requested
    [AuditAction.PASSWORD_RESET_COMPLETE]: AuditSeverity.WARN, // Password reset completed
    [AuditAction.OTP_REQUEST]: AuditSeverity.INFO, // OTP requested
    [AuditAction.OTP_VERIFY]: AuditSeverity.INFO, // OTP verified
    [AuditAction.TWO_FACTOR_ENABLE]: AuditSeverity.WARN, // 2FA enabled (security increase)
    [AuditAction.TWO_FACTOR_DISABLE]: AuditSeverity.ERROR, // 2FA disabled (security decrease)

    // ========== ACCOUNT ==========
    [AuditAction.ACCOUNT_DEACTIVATE]: AuditSeverity.WARN, // Account deactivated
    [AuditAction.ACCOUNT_DELETE]: AuditSeverity.ERROR, // Account deleted
    [AuditAction.ACCOUNT_RECOVER]: AuditSeverity.INFO, // Account recovered
    [AuditAction.ROLE_CHANGE]: AuditSeverity.WARN, // Role changed (permissions changed)
    [AuditAction.USER_INVITED]: AuditSeverity.INFO, // User invited
    [AuditAction.INVITATION_ACCEPTED]: AuditSeverity.INFO, // Invitation accepted
    [AuditAction.INVITATION_REVOKED]: AuditSeverity.WARN, // Invitation revoked

    // ========== CONTENT ==========
    [AuditAction.POST_CREATE]: AuditSeverity.INFO, // Post created
    [AuditAction.POST_UPDATE]: AuditSeverity.INFO, // Post updated
    [AuditAction.POST_DELETE]: AuditSeverity.WARN, // Post deleted
    [AuditAction.POST_PUBLISH]: AuditSeverity.INFO, // Post published
    [AuditAction.POST_REVIEW]: AuditSeverity.INFO, // Post reviewed
    [AuditAction.COMMENT_CREATE]: AuditSeverity.INFO, // Comment created
    [AuditAction.COMMENT_UPDATE]: AuditSeverity.INFO, // Comment updated
    [AuditAction.COMMENT_DELETE]: AuditSeverity.WARN, // Comment deleted
    [AuditAction.COMMENT_APPROVE]: AuditSeverity.INFO, // Comment approved
    [AuditAction.COMMENT_REJECT]: AuditSeverity.WARN, // Comment rejected

    // ========== NEWSLETTER ==========
    [AuditAction.NEWSLETTER_SUBSCRIBE]: AuditSeverity.INFO, // Newsletter subscription
    [AuditAction.NEWSLETTER_UNSUBSCRIBE]: AuditSeverity.INFO, // Newsletter unsubscription
    [AuditAction.NEWSLETTER_VERIFY]: AuditSeverity.INFO, // Newsletter verification

    // ========== MODERATION ==========
    [AuditAction.CONTENT_APPROVE]: AuditSeverity.INFO, // Content approved
    [AuditAction.CONTENT_REJECT]: AuditSeverity.WARN, // Content rejected
    [AuditAction.USER_BAN]: AuditSeverity.ERROR, // User banned
    [AuditAction.USER_UNBAN]: AuditSeverity.WARN, // User unbanned

    // ========== SYSTEM ==========
    [AuditAction.SETTINGS_UPDATE]: AuditSeverity.WARN, // System settings updated
    [AuditAction.MAINTENANCE_MODE]: AuditSeverity.WARN, // Maintenance mode toggled
    [AuditAction.BACKUP_CREATE]: AuditSeverity.INFO, // Backup created
    [AuditAction.EXTERNAL_POST_FETCH]: AuditSeverity.INFO, // External posts fetched
  };

  return severityMap[action] || AuditSeverity.INFO;
};
