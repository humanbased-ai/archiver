export type TCard = {
  version: string;
  status: string;
  title: string;
  des: string;
  steps: string[];
};

export const CARDS: TCard[] = [
  {
    version: "1.0",
    status: "Completed",
    title: "Crypto Data Annotation",
    des: "Pioneering blockchain data annotation with comprehensive account, user, and transaction tagging infrastructure.",
    steps: [
      "Crypto account labeling",
      "Transaction pattern identification",
      "User behavior tagging",
      "Initial data marketplace prototype",
    ],
  },
  {
    version: "2.0",
    status: "In Progress",
    title: "Vertical Al Marketplace & DeSci Factory",
    des: "Expanding into a comprehensive marketplace for Vertical AI solutions and decentralized scientific innovation.",
    steps: [
      "Vertical AI agent marketplace",
      "DeSci collaboration tools",
      "Cross-domain expert networking",
      "Advanced royalty mechanisms",
    ],
  },
  {
    version: "3.0",
    status: "Upcoming",
    title: "Decentralized Data Exchange",
    des: "Creating a global, permissionless data exchange platform that revolutionizes how data is shared, validated, and monetized.",
    steps: [
      "Comprehensive data marketplace",
      "Cross-chain data interoperability",
      "Advanced validation mechanisms",
      "Tokenized data assets",
    ],
  },
];
