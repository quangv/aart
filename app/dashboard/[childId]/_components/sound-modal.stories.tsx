import type { Meta, StoryObj } from "@storybook/nextjs";
import SoundModal from "./sound-modal";

const meta = {
  title: "Dashboard/SoundModal",
  component: SoundModal,
  args: {
    isOpen: true,
    onClose: () => {},
    childId: "storybook-child",
    sound: {
      id: "sound-m",
      code: "m",
      label: "M sound",
      ipa: "/m/",
      stage_name: "Early Sounds",
    },
    progress: {
      beginning: { score: 7.5, attempts: 3, mastered: false },
      middle: { score: 5, attempts: 2, mastered: false },
      end: { score: 8.5, attempts: 4, mastered: true },
    },
    exampleWords: ["mom", "mouse", "moon", "ham"],
    progressAction: async () => {},
  },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SoundModal>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoExamples: Story = {
  args: {
    exampleWords: [],
  },
};

export const ShortViewport: Story = {
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
  },
};
