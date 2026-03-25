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
    score: 9.1,
  },
};

export const LongLabel: Story = {
  args: {
    ipa: "/aɪ/",
    label: "Long I diphthong",
  },
};

export const InProgress: Story = {
  args: {
    score: 6.3,
  },
};

export const EarlyProgress: Story = {
  args: {
    score: 2.4,
  },
};
