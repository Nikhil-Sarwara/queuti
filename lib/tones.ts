/**
 * Status tone classes (#35 a11y pass).
 *
 * These use FIXED colors (not theme tokens) so text contrast holds in every
 * theme. Each gradient was verified against WCAG AA (>= 4.5:1) for its text
 * color in paper / dark / midnight:
 *   applied   6.51+  (dark text on brass)
 *   screening 6.18+  (light text on leather)
 *   interview 5.13+  (light text on moss)
 *   offer     5.06+  (light text on deep moss)
 *   rejected  6.56+  (light text on blood)
 *   ghosted   4.92+  (light text on charcoal)
 *   neutral   10.3+  (ink on paper — theme tokens, flips together)
 */

export const STATUS_TONE_CLS: Record<string, string> = {
  applied: "from-[#E2C254] to-[#C9A227] text-[#2B2117] border-[#A8871F]",
  screening: "from-[#7A4F30] to-[#4E2F1B] text-[#F6F0E2] border-[#3A2313]",
  interview: "from-[#5A6B3C] to-[#465434] text-[#F6F0E2] border-[#37442A]",
  offer: "from-[#3E7054] to-[#2F5C44] text-[#F6F0E2] border-[#244636]",
  rejected: "from-[#8E3B2E] to-[#6E2C22] text-[#F6F0E2] border-[#542116]",
  ghosted: "from-[#6E655A] to-[#4B443C] text-[#F6F0E2] border-[#37322C]",
  neutral: "from-paper-light to-paper-dark text-ink border-paper-dark",
};