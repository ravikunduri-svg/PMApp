# PMPathfinder — Foundation Module 1: PM Roles and Archetypes

**Module ID:** `f1-pm-roles`
**Type:** Foundation
**Tagline:** Not all PMs are the same. Learn what makes each archetype different — and which one fits you.
**Estimated reading time:** 15 minutes
**Order:** 1 of 5 foundation modules
**Linked practice questions:** `foundation-ps-01`, `foundation-ps-02`, `foundation-ps-03`

---

## Section 1 — Why 'Product Manager' means three different jobs

When people say they want to become a Product Manager, they often have one image in mind: someone at a tech company deciding what to build. But Product Management isn't one role. It's a family of roles that share a title and almost nothing else.

A PM at Swiggy deciding how to redesign the reorder flow thinks very differently from a PM at Salesforce negotiating a feature request with enterprise clients, who thinks very differently from a PM at Zepto owning the search infrastructure. Same job title. Different problems, different instincts, different skills.

This matters for preparation because most candidates study generic 'PM interview advice' — advice that mixes Consumer PM thinking with B2B examples and Technical frameworks without distinguishing between them. You end up knowing a little about everything and being great at nothing. Hiring managers can tell immediately when a candidate hasn't understood what kind of PM they're actually applying to be.

There are three primary PM archetypes. Each one maps to a different problem space, a different user mental model, and a different way of measuring success.

---

## Section 2 — The Consumer PM: building for millions

Consumer PMs build products that real people use in their everyday lives — apps, platforms, and services where success is measured in habits, not contracts.

The Consumer PM's core obsession is the user experience: how does someone feel the first time they use this product? Do they come back tomorrow? Do they tell their friends? The metrics that matter are DAU (daily active users), retention curves, session depth, and virality. These are products where a 1% drop in day-7 retention affects millions of people.

Because users choose freely (they can delete the app at any time), the Consumer PM has to earn engagement every single session. This develops a particular kind of user empathy — the ability to think in moments, not contracts. What is the user doing right before they open this app? What is the specific pain they're feeling that makes them reach for it?

Consumer PMs tend to use qualitative user research heavily. They conduct interviews, watch session recordings, and read app reviews obsessively. They are comfortable with ambiguity: users can't always articulate what they want, so Consumer PMs have to develop intuition.

**Typical companies:** Swiggy, Zomato, Instagram, Spotify, Duolingo, Meesho, PhonePe, ShareChat, Nykaa.

---

## Section 3 — The B2B/Enterprise PM: building for revenue

B2B PMs build products that companies buy for their employees or operations. The user and the buyer are almost never the same person. An HR manager using your product didn't choose it — her company's VP of Operations did, after a 3-month procurement process.

This creates a completely different product problem. You have to satisfy the user (who uses the product every day and will complain if it's bad) AND the buyer (who holds the renewal contract and makes the decision to expand or churn) AND the admin (who configures permissions and manages the rollout). These stakeholders have conflicting needs and you cannot ignore any of them.

The B2B PM's success metrics look completely different from consumer: Annual Recurring Revenue (ARR), Net Revenue Retention (NRR), churn rate, expansion revenue, and customer health scores. A single enterprise customer might be worth more than 100,000 consumer users — which means one at-risk customer demands the same urgency as a platform-wide incident.

B2B PMs develop instincts around revenue impact, stakeholder navigation, and long sales cycles. They think in quarterly roadmaps tied to enterprise commitments, not weekly experiment results.

**Typical companies:** Freshworks, Zoho, Chargebee, Razorpay for Business, Salesforce, HubSpot, Slack, Atlassian.

---

## Section 4 — The Technical PM: building the platform

Technical PMs own the products that other products are built on: APIs, infrastructure platforms, developer tools, data pipelines, and internal systems. Their users are often engineers, data scientists, or other internal teams — not end consumers.

The key difference: the Technical PM's users are technical professionals who have very high standards for reliability, documentation, and system design. A consumer user frustrated with an app will just close it. A developer whose API call fails in production at 2 AM will file a P0 bug and escalate it.

Technical PMs need enough engineering depth to earn credibility with their engineering partners, understand technical tradeoffs (SQL vs NoSQL, monolith vs microservices, sync vs async), read architecture diagrams, and write meaningful technical specs. They don't need to code, but they need to think in systems.

Metrics for Technical PMs include API uptime, P95/P99 latency, error rates, developer adoption curves, and time-to-integration for new partners. Reliability is often more important than new features.

**Typical companies:** AWS, Google Cloud, Stripe, Twilio, Segment, any company building internal platform teams, infrastructure-heavy startups.

---

## Section 5 — How to figure out which archetype fits you

Your archetype isn't just about what you're interested in — it's about what thinking patterns come naturally to you and what professional background you're bringing in.

**Software engineers** transitioning to PM often find Technical PM roles the most natural fit. Their credibility with engineering teams is already established, and they already think in systems. Consumer PM roles can work if they have genuine product intuition and user empathy beyond their technical background.

**Consultants, MBAs, and finance professionals** often find B2B PM roles a strong fit. They already know how to navigate complex stakeholder environments, structure business cases, and think in revenue terms.

**Designers and marketers** often find Consumer PM roles the most natural. Their user empathy and communication skills are already developed — they need to build metrics depth and prioritization frameworks.

But this is not destiny. A consultant who has spent years building consumer apps for clients can be excellent at Consumer PM. A designer who has deep SaaS experience may thrive in B2B. The archetypes are a starting point for self-assessment, not a ceiling.

The PMPathfinder diagnostic (the quiz you completed before this module) measured which archetype your instincts align with across 6 dimensions. Use your result as a hypothesis, not a verdict.

---

## Worked Example 1 — Same problem, three different PM instincts

**Scenario:** Your product has seen a 15% drop in weekly active users over the last 3 weeks. You've been asked to diagnose the problem and propose a solution.

| Archetype | First move | Core instinct |
|---|---|---|
| Consumer PM | Pulls DAU/WAU breakdown by cohort to see if the drop is in new users (acquisition/activation problem), existing users (engagement/habit problem), or returning users (reactivation problem). Reads app store reviews from the past month. Watches session recordings of users who dropped off. Runs a quick user interview with 5 users who haven't opened the app in 10 days. | Looking for a habit-level explanation — what broke in the user's daily routine that made them stop coming back? |
| B2B PM | Pulls WAU breakdown by account tier and contract size to see if the drop is concentrated in a specific customer segment. Calls the 3 largest at-risk accounts directly. Reviews support tickets and customer success notes from the past month. Runs a cross-functional review with sales and CS to see if any account renewals are at risk. | Looking for revenue-concentrated risk — a 15% WAU drop that affects 3 enterprise customers is a very different problem than one that affects 15% of free-tier users. |
| Technical PM | Pulls deployment history for the past 3 weeks and maps it against the WAU trend. Reviews error rate and latency dashboards to see if something degraded. Checks API call failure rates and timeout spikes. Talks to the on-call engineer about any recent incidents or performance regressions. | Checks for system-level explanations first — before assuming it's a product or UX problem, rule out that a quiet infrastructure degradation caused users to give up. |

---

## Worked Example 2 — How archetypes show up in an interview answer

**Scenario:** Interviewer asks: *"How would you improve Google Maps?"*

**Weak answer:**
> "I would add more features like AR navigation, better offline support, and a social layer where friends can share their locations in real time."

**Why it's weak:** This answer lists features without understanding who has what problem. It sounds like a Consumer PM answer but it's actually just a wishlist — there's no user insight, no metric, no prioritization.

**Strong Consumer PM answer:**
> "I'd start by identifying which user segment is most underserved today. Commuters who use Maps every day have very different needs than travelers who use it occasionally. For daily commuters, the biggest pain I see is that Maps doesn't account for 'last mile' uncertainty — I arrive at the transit stop but I don't know if the metro is delayed or if there's a crowd. I'd focus on integrating real-time crowding and delay data into the commute view, measure success by commuter D7 retention, and validate it with 10 commuter interviews before building anything."

**Why it's strong:** This answer shows user empathy (specific segment, specific moment of pain), problem framing before solution, and a clear metric for success. It sounds like someone who thinks like a Consumer PM.

---

## Key Takeaways

> **1.** Product Management is three different roles with one title. Consumer PM, B2B/Enterprise PM, and Technical PM require different skills, different instincts, and different success metrics. Generic PM preparation without archetype focus is a common reason candidates fail to stand out.

> **2.** Your archetype shapes how you frame every interview answer. A Consumer PM instinctively asks "what does the user feel?" A B2B PM asks "what's the revenue impact?" A Technical PM asks "what does the system tell us?" Knowing your archetype helps you give answers that sound native to the role, not generic.

> **3.** Your professional background is a strong signal — but not a ceiling. Use it as a starting hypothesis for which archetype to prepare for. Then test that hypothesis against job descriptions, practice questions, and your own comfort with archetype-specific scenarios.

---

## References & Further Reading

Use these to go deeper on any topic covered in this module. Organised by what they help you understand.

---

### Understanding the PM role landscape

| Resource | Type | What it covers |
|---|---|---|
| [Cracking the PM Interview — Gayle McDowell & Jackie Bavaro](https://www.crackingthepminterview.com/) | Book | The canonical guide to PM interviews. Part 1 covers the PM role landscape, archetypes, and what companies actually look for. |
| [Lenny's Newsletter — What does a great PM do?](https://www.lennysnewsletter.com/p/what-does-a-great-pm-do) | Article | Lenny Rachitsky synthesises interviews with 50+ PMs across companies. Breaks down how the role differs by company stage and product type. |
| [Reforge — PM Archetypes](https://www.reforge.com/blog/product-manager-archetypes) | Article | Reforge's framework for how PM roles differ across growth, platform, and core product. Maps well to the Consumer / B2B / Technical distinction. |
| [Shreyas Doshi — PM role clarity thread](https://twitter.com/shreyas/status/1283460349372452864) | Thread | Shreyas Doshi (ex-Stripe, Twitter, Google) on what distinguishes strong PMs from average ones. Often referenced in PM communities. |

---

### Consumer PM — roles, companies, skills

| Resource | Type | What it covers |
|---|---|---|
| [Inspired: How to Create Tech Products Customers Love — Marty Cagan](https://www.svpg.com/books/inspired-how-to-create-tech-products-customers-love-2nd-edition/) | Book | The most cited book on consumer product management. Chapters 5–12 cover the PM role in consumer product companies specifically. |
| [Julie Zhuo — The Making of a Manager (product thinking chapters)](https://www.juliezhuo.com/book/manager.html) | Book | Julie Zhuo (ex-VP Product Design, Facebook) on building consumer products at scale. Chapters on user intuition are directly relevant. |
| [PM Library — Consumer PM job descriptions](https://www.pmlibrary.com) | Resource | Real PM job descriptions from consumer companies. Useful for understanding what Consumer PMs are actually expected to know. |

---

### B2B / Enterprise PM — roles, companies, skills

| Resource | Type | What it covers |
|---|---|---|
| [Intercom on Product Management](https://www.intercom.com/resources/books/intercom-on-product-management) | Free eBook | Written by the Intercom product team. Focuses on B2B SaaS product thinking — when to build, how to prioritise, how to handle enterprise feedback. |
| [David Sacks — The SaaS Org Chart](https://sacks.substack.com/p/the-saas-org-chart) | Article | How B2B companies structure product and go-to-market. Helps you understand the stakeholder ecosystem a B2B PM navigates. |
| [Lenny's Newsletter — What makes a great B2B PM?](https://www.lennysnewsletter.com/p/what-makes-a-great-b2b-pm) | Article | Direct breakdown of B2B PM skills vs. consumer PM skills. One of the clearest comparisons available. |

---

### Technical PM — roles, companies, skills

| Resource | Type | What it covers |
|---|---|---|
| [Become a Technical Product Manager — Udemy](https://www.udemy.com/course/technical-product-manager/) | Course | Covers the technical depth a TPM is expected to have — APIs, system design basics, working with engineering. |
| [Gergely Orosz — The Software Engineer's Guide to Becoming a PM](https://newsletter.pragmaticengineer.com/p/how-to-become-a-product-manager) | Article | Written for engineers transitioning to PM. Covers what to learn, what to stop doing, and how Technical PM roles differ from core PM roles. |
| [API Design Patterns — Google Cloud](https://cloud.google.com/apis/design) | Reference | Canonical guide to API design. Technical PMs are expected to understand and contribute to API design decisions. |

---

### Role clarity — job descriptions to study

These real job postings illustrate how each archetype is described in the market. Read them alongside this module to match theory to practice.

| Company | Role | What to look for |
|---|---|---|
| [Swiggy — Consumer PM](https://careers.swiggy.com) | Consumer PM | Note the emphasis on retention metrics, user research, and habit-forming product design |
| [Freshworks — Product Manager](https://careers.freshworks.com) | B2B PM | Note the emphasis on customer success alignment, enterprise metrics, and stakeholder management |
| [Stripe — Technical PM](https://stripe.com/jobs) | Technical PM | Note the emphasis on API design, developer experience, and engineering collaboration |

> **How to use these:** Read the responsibilities section and ask: which of the 6 scoring dimensions (problem framing, user empathy, structured thinking, prioritization, metrics reasoning, communication clarity) does each bullet point test? This maps your preparation directly to what the role actually requires.

---

*Next: Foundation Module 2 — The PM Journey*
*Practice questions linked to this module: `foundation-ps-01`, `foundation-ps-02`, `foundation-ps-03`*
