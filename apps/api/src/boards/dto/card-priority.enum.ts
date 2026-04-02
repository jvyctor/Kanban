export const cardPriorities = ["LOW", "MEDIUM", "HIGH"] as const;

export type CardPriorityValue = (typeof cardPriorities)[number];
