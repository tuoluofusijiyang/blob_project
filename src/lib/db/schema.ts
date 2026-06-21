import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email'),
  displayName: text('display_name'),
  role: text('role').notNull().default('user'),
  isActive: integer('is_active').notNull().default(1),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  lastLoginAt: integer('last_login_at'),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  data: text('data'),
});

export const aiProviders = sqliteTable('ai_providers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  name: text('name').notNull(),
  apiKeyRef: text('api_key_ref').notNull(),
  baseUrl: text('base_url'),
  enabled: integer('enabled').notNull().default(1),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const aiModels = sqliteTable('ai_models', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: integer('provider_id').notNull().references(() => aiProviders.id, { onDelete: 'cascade' }),
  modelId: text('model_id').notNull(),
  type: text('type').notNull(),
  displayName: text('display_name'),
  enabled: integer('enabled').notNull().default(1),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  description: text('description'),
  isBuiltin: integer('is_builtin').notNull().default(0),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: integer('enabled').notNull().default(1),
});

export const promptTemplates = sqliteTable('prompt_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  templateType: text('template_type').notNull(),
  name: text('name').notNull(),
  template: text('template').notNull(),
  variables: text('variables'),
  isBuiltin: integer('is_builtin').notNull().default(0),
});

export const drafts = sqliteTable('drafts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  categoryId: integer('category_id').notNull().references(() => categories.id),
  title: text('title'),
  contentMd: text('content_md'),
  contentHtml: text('content_html'),
  platform: text('platform'),
  status: text('status').notNull().default('draft'),
  coverImageId: integer('cover_image_id'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at').notNull().default(sql`(unixepoch())`),
});

export const draftImages = sqliteTable('draft_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  imageId: integer('image_id').notNull().references(() => generatedImages.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  caption: text('caption'),
});

export const generatedImages = sqliteTable('generated_images', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filePath: text('file_path').notNull(),
  prompt: text('prompt'),
  modelId: integer('model_id').references(() => aiModels.id),
  width: integer('width'),
  height: integer('height'),
  fileSize: integer('file_size'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const platformFormats = sqliteTable('platform_formats', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  outputFormat: text('output_format').notNull(),
  styleGuide: text('style_guide'),
  wordMin: integer('word_min'),
  wordMax: integer('word_max'),
  imageRules: text('image_rules'),
  isBuiltin: integer('is_builtin').notNull().default(1),
});

export const userSettings = sqliteTable('user_settings', {
  userId: integer('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  defaultTextProviderId: integer('default_text_provider_id').references(() => aiProviders.id),
  defaultTextModelId: integer('default_text_model_id').references(() => aiModels.id),
  defaultImageProviderId: integer('default_image_provider_id').references(() => aiProviders.id),
  defaultImageModelId: integer('default_image_model_id').references(() => aiModels.id),
  defaultPlatform: text('default_platform'),
  theme: text('theme').notNull().default('system'),
  language: text('language').notNull().default('zh-CN'),
});

export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resourceType: text('resource_type'),
  resourceId: integer('resource_id'),
  details: text('details'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
}, (table) => ({
  userIdx: index('idx_activity_logs_user').on(table.userId, table.createdAt),
  actionIdx: index('idx_activity_logs_action').on(table.action, table.createdAt),
}));

export const draftVersions = sqliteTable('draft_versions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  draftId: integer('draft_id').notNull().references(() => drafts.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  contentMd: text('content_md').notNull(),
  contentHtml: text('content_html'),
  metadata: text('metadata'),
  createdAt: integer('created_at').notNull().default(sql`(unixepoch())`),
});

export const licenses = sqliteTable('licenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  licenseKey: text('license_key').notNull().unique(),
  userId: integer('user_id').references(() => users.id),
  plan: text('plan'),
  expiresAt: integer('expires_at'),
  activatedAt: integer('activated_at'),
  lastVerifiedAt: integer('last_verified_at'),
  metadata: text('metadata'),
});