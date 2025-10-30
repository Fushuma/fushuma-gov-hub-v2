import { z } from "zod";

/**
 * Validation schemas for input data
 * Provides comprehensive validation for security and data integrity
 */

// Ethereum address validation (0x followed by 40 hex characters)
export const ethereumAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address format")
  .describe("Ethereum wallet address");

// URL validation with reasonable length limits
export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .max(1000, "URL too long")
  .describe("Valid HTTP/HTTPS URL");

// Funding amount validation (reasonable min/max constraints)
export const fundingAmountSchema = z
  .number()
  .int("Funding amount must be an integer")
  .min(100, "Minimum funding amount is 100")
  .max(10000000, "Maximum funding amount is 10,000,000")
  .describe("Funding amount in FUMA tokens");

// Token symbol validation
export const tokenSymbolSchema = z
  .string()
  .min(1, "Token symbol required")
  .max(10, "Token symbol too long")
  .regex(/^[A-Z0-9]+$/, "Token symbol must be uppercase letters and numbers only")
  .describe("Token symbol (e.g., FUMA, ETH)");

// Title validation
export const titleSchema = z
  .string()
  .min(10, "Title must be at least 10 characters")
  .max(500, "Title must be less than 500 characters")
  .describe("Title of the item");

// Description validation
export const descriptionSchema = z
  .string()
  .min(50, "Description must be at least 50 characters")
  .max(10000, "Description must be less than 10,000 characters")
  .describe("Detailed description");

// Short description/excerpt validation
export const excerptSchema = z
  .string()
  .min(1, "Excerpt required")
  .max(500, "Excerpt must be less than 500 characters")
  .describe("Short excerpt or summary");

// Email validation
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(320, "Email too long")
  .describe("Email address");

// Name validation
export const nameSchema = z
  .string()
  .min(1, "Name required")
  .max(255, "Name too long")
  .describe("Name");

// Contact info validation
export const contactInfoSchema = z
  .string()
  .min(1, "Contact info required")
  .max(500, "Contact info too long")
  .describe("Contact information");

// Date range validation helper
export const dateRangeSchema = z
  .object({
    startDate: z.date(),
    endDate: z.date(),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

// Voting power validation
export const votingPowerSchema = z
  .number()
  .int("Voting power must be an integer")
  .positive("Voting power must be positive")
  .max(1000000000, "Voting power exceeds maximum")
  .describe("Voting power based on token holdings");

// Transaction hash validation (0x followed by 64 hex characters)
export const transactionHashSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, "Invalid transaction hash format")
  .describe("Blockchain transaction hash");

// Pagination schemas
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page"),
  offset: z.number().int().min(0).default(0).describe("Number of items to skip"),
});

export const cursorPaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20).describe("Number of items per page"),
  cursor: z.number().int().optional().describe("Cursor for pagination"),
});

// Status enums with validation
export const grantStatusSchema = z.enum([
  "submitted",
  "review",
  "approved",
  "in_progress",
  "completed",
  "rejected",
]);

export const launchpadStatusSchema = z.enum([
  "submitted",
  "review",
  "voting",
  "approved",
  "fundraising",
  "launched",
  "rejected",
]);

export const proposalStatusSchema = z.enum([
  "pending",
  "active",
  "passed",
  "rejected",
  "executed",
  "cancelled",
]);

export const milestoneStatusSchema = z.enum([
  "pending",
  "in_progress",
  "submitted",
  "approved",
  "paid",
]);

// Filter schemas
export const grantFilterSchema = z.object({
  status: grantStatusSchema.optional(),
  submittedBy: z.number().int().optional(),
  minAmount: z.number().int().optional(),
  maxAmount: z.number().int().optional(),
});

export const proposalFilterSchema = z.object({
  status: proposalStatusSchema.optional(),
  proposer: ethereumAddressSchema.optional(),
});

// Sort schemas
export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const sortBySchema = z.enum([
  "createdAt",
  "updatedAt",
  "fundingAmount",
  "votesFor",
  "votesAgainst",
]);

