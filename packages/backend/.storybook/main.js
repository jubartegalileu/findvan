/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ["../src/**/*.stories.@(js|mjs|ts)", "../src/**/*.mdx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
    "@chromatic-com/storybook"
  ],
  framework: {
    name: "@storybook/html-vite",
    options: {}
  }
};

export default config;
