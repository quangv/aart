import type { Meta, StoryObj } from "@storybook/nextjs";
import PhonemeButton from "./phoneme-button";

const meta = {
  title: "Dashboard/PhonemeButton",
  component: PhonemeButton,
  args: {
    ipa: "/m/",
    label: "M sound",
  },
} satisfies Meta<typeof PhonemeButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mastered: Story = {
  args: {
    mastered: true,
  },
};

export const LongLabel: Story = {
  args: {
    ipa: "/aɪ/",
    label: "Long I diphthong",
  },
};
