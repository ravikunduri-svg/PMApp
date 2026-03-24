export type Chapter = {
  part: string
  num: string
  title: string
  start: number  // 1-indexed page number (inclusive)
  end: number    // 1-indexed page number (inclusive)
}

export const CHAPTERS: Chapter[] = [
  // Front matter
  { part: 'Frontmatter', num: 'FM', title: 'Foreword & About the Author', start: 3, end: 24 },

  // Part 0
  { part: 'Part 0: The First Step', num: '0.1', title: 'Your Computer Is Not Fragile', start: 26, end: 33 },
  { part: 'Part 0: The First Step', num: '0.2', title: 'Setting Up Your Workshop', start: 34, end: 43 },
  { part: 'Part 0: The First Step', num: '0.3', title: 'Your First Conversation with an AI Builder', start: 44, end: 54 },

  // Part I
  { part: 'Part I: How Software Works', num: '1', title: 'The Internet: How Your Phone Talks to Zomato', start: 55, end: 84 },
  { part: 'Part I: How Software Works', num: '2', title: 'Frontend: What Users See and Touch', start: 85, end: 117 },
  { part: 'Part I: How Software Works', num: '3', title: 'Backend: The Kitchen You Never See', start: 118, end: 151 },
  { part: 'Part I: How Software Works', num: '4', title: 'Databases: Where Everything Is Remembered', start: 152, end: 181 },
  { part: 'Part I: How Software Works', num: '5', title: 'Version Control & Collaboration', start: 182, end: 204 },
  { part: 'Part I: How Software Works', num: '6', title: 'Deployment: From Your Laptop to the World', start: 205, end: 230 },
  { part: 'Part I: How Software Works', num: '7', title: 'Testing & Quality: How to Sleep at Night', start: 231, end: 253 },
  { part: 'Part I: How Software Works', num: '8', title: 'Software Architecture: How Big Systems Are Organized', start: 254, end: 271 },
  { part: 'Part I: Milestone', num: 'M1', title: 'Milestone Project 1: Personal Website + Blog', start: 272, end: 280 },

  // Part II
  { part: 'Part II: How AI Works', num: '9', title: 'What AI Actually Is: A History of Machines That Learn', start: 281, end: 294 },
  { part: 'Part II: How AI Works', num: '10', title: 'Large Language Models: The Engine of Modern AI', start: 295, end: 312 },
  { part: 'Part II: How AI Works', num: '11', title: 'Prompt Engineering to Context Engineering', start: 313, end: 344 },
  { part: 'Part II: How AI Works', num: '12', title: 'Embeddings & Vector Search: How AI Finds Meaning', start: 345, end: 370 },
  { part: 'Part II: How AI Works', num: '13', title: "RAG: Teaching AI What It Doesn't Know", start: 371, end: 403 },
  { part: 'Part II: How AI Works', num: '14', title: "Fine-Tuning: When Prompting Isn't Enough", start: 404, end: 425 },
  { part: 'Part II: How AI Works', num: '15', title: 'AI Agents: AI That Acts, Not Just Answers', start: 426, end: 459 },
  { part: 'Part II: How AI Works', num: '16', title: 'MCP: The USB-C of AI Tools', start: 460, end: 489 },
  { part: 'Part II: How AI Works', num: '17', title: 'Multi-Modal AI: Beyond Text', start: 490, end: 526 },
  { part: 'Part II: How AI Works', num: '18', title: 'Evaluations: How to Know If AI Is Working', start: 527, end: 563 },
  { part: 'Part II: Milestone', num: 'M2', title: 'Milestone Project 2: AI-Powered Data Dashboard', start: 564, end: 572 },

  // Part III
  { part: 'Part III: Building With AI Tools', num: '19', title: 'Claude Code Mastery', start: 573, end: 605 },
  { part: 'Part III: Building With AI Tools', num: '20', title: 'The AI Coding Landscape', start: 606, end: 632 },
  { part: 'Part III: Building With AI Tools', num: '21', title: 'Design Systems for AI Builders', start: 633, end: 661 },
  { part: 'Part III: Building With AI Tools', num: '22', title: 'Building a Production Chatbot with RAG', start: 662, end: 697 },
  { part: 'Part III: Building With AI Tools', num: '23', title: 'Building Multi-Agent Systems', start: 698, end: 730 },
  { part: 'Part III: Milestone', num: 'M3', title: 'Milestone Project 3: RAG Knowledge Assistant', start: 731, end: 741 },

  // Part IV
  { part: 'Part IV: Production Engineering', num: '24', title: 'System Design: Thinking at Scale', start: 742, end: 767 },
  { part: 'Part IV: Production Engineering', num: '25', title: 'Analytics, A/B Testing & Data-Driven Decisions', start: 768, end: 796 },
  { part: 'Part IV: Production Engineering', num: '26', title: 'Token Economics & AI Business Models', start: 797, end: 819 },
  { part: 'Part IV: Production Engineering', num: '27', title: 'CI/CD, Testing & Production Operations', start: 820, end: 848 },
  { part: 'Part IV: Production Engineering', num: '28', title: 'Security & Responsible AI', start: 849, end: 875 },
  { part: 'Part IV: Production Engineering', num: '29', title: 'Open Source Intelligence & Learning to Learn', start: 876, end: 901 },

  // Part V
  { part: 'Part V: The 2026 Frontier', num: '30', title: 'Compound AI Systems: Why Combinations Beat Bigger Models', start: 902, end: 923 },
  { part: 'Part V: The 2026 Frontier', num: '31', title: 'Reasoning Models: AI That Thinks Before Answering', start: 924, end: 941 },
  { part: 'Part V: The 2026 Frontier', num: '32', title: 'Voice AI & Conversational Interfaces', start: 942, end: 958 },
  { part: 'Part V: The 2026 Frontier', num: '33', title: 'Autonomous Research & Self-Improving Systems', start: 959, end: 988 },
  { part: 'Part V: The 2026 Frontier', num: '34', title: "What's Next: The Builder's Horizon", start: 989, end: 1012 },
  { part: 'Part V: Milestone', num: 'M4', title: 'Milestone Project 4: Multi-Agent AI Pipeline', start: 1013, end: 1020 },

  // Appendices
  { part: 'Appendices', num: 'A', title: "The Builder's Resource Vault", start: 1021, end: 1033 },
  { part: 'Appendices', num: 'B', title: 'CLAUDE.md Templates', start: 1034, end: 1042 },
  { part: 'Appendices', num: 'C', title: 'Design System Starter Kit', start: 1043, end: 1054 },
  { part: 'Appendices', num: 'D', title: 'Glossary', start: 1055, end: 1075 },
  { part: 'Appendices', num: 'E', title: 'Case Studies Index', start: 1076, end: 1090 },
]

export function getChapterForPage(pageNum: number): Chapter | undefined {
  return CHAPTERS.find(c => pageNum >= c.start && pageNum <= c.end)
}
