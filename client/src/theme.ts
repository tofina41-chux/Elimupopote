import { createTheme, type MantineColorsTuple } from "@mantine/core";

// ============================================================================
// ElimuPopote visual identity
// ----------------------------------------------------------------------------
// "kilele" (Swahili: peak/summit) — a deep, confident teal-green standing in
// for growth and progress. Paired with "jua" (sun) — a warm amber used
// sparingly for calls-to-action and highlights. Deliberately not the
// cream+terracotta or black+neon palettes that generic AI-built dashboards
// default to — this is a B2B training tool, so it leans toward a clean,
// confident, slightly editorial "product" look rather than a lifestyle one.
// ============================================================================

const kilele: MantineColorsTuple = [
  "#EAF7F2",
  "#CBEBDF",
  "#A8DECB",
  "#82D1B6",
  "#5FC5A3",
  "#43B992",
  "#2E9E7B",
  "#237E63",
  "#1B614C",
  "#144737",
];

const jua: MantineColorsTuple = [
  "#FDF3E3",
  "#FAE2B8",
  "#F6CD87",
  "#F2B754",
  "#EEA42C",
  "#E8961A",
  "#D9840F",
  "#B66B0C",
  "#93550A",
  "#714108",
];

export const theme = createTheme({
  primaryColor: "kilele",
  colors: { kilele, jua },
  primaryShade: 6,
  defaultRadius: "md",
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMonospace: "'JetBrains Mono', ui-monospace, monospace",
  headings: {
    fontFamily: "'Space Grotesk', 'Inter', sans-serif",
    fontWeight: "600",
  },
  defaultGradient: { from: "kilele.6", to: "kilele.8", deg: 135 },
  shadows: {
    sm: "0 1px 3px rgba(20, 33, 61, 0.08)",
    md: "0 4px 16px rgba(20, 33, 61, 0.10)",
  },
  components: {
    Card: {
      defaultProps: { radius: "lg" },
    },
    Button: {
      defaultProps: { radius: "md" },
    },
    Badge: {
      defaultProps: { radius: "sm" },
    },
  },
});
