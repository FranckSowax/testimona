// JWT 
export const AccessToken = "access_token" + process.env.TOKEN_SUFFIX!;
export const RefreshToken = "refresh_token" + process.env.TOKEN_SUFFIX!;
export const RegisterToken = "register_token" + process.env.TOKEN_SUFFIX!;
export const SecureCookie = process.env.SECURE_COOKIE!;
export const TokenKey = process.env.TOKEN_KEY!;
export const TokenExpired = +process.env.TOKEN_EXPIRED_SECONDS!;
export const TokenRefreshExpired = +process.env.TOKEN_EXPIRED_SECONDS_REFRESH!;
// Redis
export const PrefixTokenKey = "token";
export const PrefixListKey = "config";
export const PrefixMemorialKey = "memorial";
export const PrefixUserIdKey = "userbyuserid";
export const PrefixUserEmailKey = "userbyemail";
export const RedisDbUrl = process.env.REDISCLOUD_URL!;
// List
export const CountryKey= "country";
export const LanguageKey = "language";
export const SecurityQuestionKey = "security_question";
// Crypto
export const PrivatePwdKey = process.env.PRIVATE_PWD_KEY!;
export const SecretPwdKey = process.env.SECRET_PWD_KEY!;
export const SecretAnswerKey = process.env.SECRET_ANSWER_KEY!;
// Expiration
export const ConfigExpiration = +process.env.CONFIG_EXPIRED!;
export const MemorialExpiration = +process.env.MEMORIAL_EXPIRED!;
export const UserExpiration = +process.env.USER_EXPIRED!;
// Cloudinary
export const CloudinaryNameDeletedDirectory = process.env.CLOUDINARY_BACKUP_DIRECTORY!;
// Other Parameters
export const ContactEmail = process.env.CONTACT_EMAIL!;
export const Environment = process.env.ENVIRONMENT!;
export const WebsiteUrl = process.env.WEBSITE_URL!;