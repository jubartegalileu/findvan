import { withThemeByClassName } from "@storybook/addon-themes";
import "../src/storybook.css";

/** @type { import('@storybook/html').Preview } */
const preview = {
  parameters: {
    layout: "centered",
    docs: { toc: true },
    a11y: {
      config: {
        rules: [{ id: "color-contrast", enabled: true }]
      }
    }
  },
  decorators: [
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark"
      },
      defaultTheme: "dark"
    })
  ],
  tags: ["autodocs"]
};

export default preview;
