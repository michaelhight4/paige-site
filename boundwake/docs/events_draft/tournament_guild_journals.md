# Boundwake — tournament team & adventure guild hall prose

DRAFT · Nov 5, 2026 · Text handoff only.
Source of mechanics: `../TOURNAMENT_TEAMS_AND_GUILDS.md`, including interim balance.
First-person journals; compact UI labels. Each journal bullet is an alternative, not a sequence to print together. Tournament text is skill-neutral: it also fits craft teams.

## Placeholder contract

- `{name}`: team name in tournament sections; adventurer name in hiring and job sections; hall name in guild sections.
- `{skill}`: display name of the team's one selected affinity skill.
- `{gold}`: the amount named by the adjacent UI label. Use unsigned magnitudes in gain/loss sentences. Never substitute gross payout into a net-gold line.
- `{renown}`: magnitude of the renown change, not the new total.
- `{place}`: formatted placing, such as `2nd` or `3rd`.
- Use one gold summary per settlement. A job result describes the work; the settlement summary describes its accounting. Do not deduct a yearly fee again for every job.
- Player renown and guild renown are different ledgers. Guild lines below always refer to the hall's renown.

## Found tournament team

UI title: **Found a tournament team**
UI fields: **Team name** · **Skill affinity**
UI help: A shared name, one chosen skill, and room for four members.
Cost hint: **80 gold · 1 act**
Eligibility hint: **Age 16+ · 20+ in the chosen skill**
Confirm: **Found team**
Success title: **A banner of our own**

- I founded {name}, a tournament team devoted to {skill}. The first practice began with introductions.
- Our banner reads {name}. We chose {skill}, then cleared a space to practice.
- I paid the founding gold and wrote {name} in the register. Now we needed people who would turn up for practice.

## Small realm meets

UI title: **Small realm meet**
Entry hint: **10 gold · 1 act**
Enter: **Enter team**
Result details: **Purse: {gold} gold** · **Renown gained: {renown}**
Use result details only when the actual result grants them. Interim podium purses are 40 / 25 / 15 gold; renown gains are 5 / 3 / 2. These are gross prizes, not net profit after entry.

### Win
UI result: **First place**

- {name} took first at the realm meet. We carried the banner home carefully, though none of us walked quietly.
- We won the small meet with {name}. At supper, everyone remembered a different moment as the one that mattered.

### Place
UI result: **Placed {place}**

- {name} finished {place} at the realm meet. We brought home a purse and a list of things to practice.
- We placed {place}. Someone straightened our banner before we went up to hear the results.

### Lose / no podium
UI result: **Outside the placings**

- {name} missed the placings at the realm meet. We stayed to watch the final round and took notes.
- There was no prize for {name} this time. We shared the bread we had packed and planned the next practice.

## Every-three-years tournament — Teams bracket

UI tab: **Teams**
UI title: **Teams bracket**
UI help: Held every three calendar years. Enter a team built around one shared skill.
Entry hint: **20 gold · 1 act**
Enter: **Enter Teams bracket**
Result details: **Purse: {gold} gold** · **Renown gained: {renown}**
Interim podium purses are 120 / 70 / 40 gold; renown gains are 12 / 7 / 4. Do not describe the larger purse as net profit.

### Win
UI result: **Teams champions**

- {name} won the Teams bracket. After all that practice in {skill}, the silence before our name was called felt very long.
- They called {name} first. We stood beneath the banner together and let the cheering reach us.

### Place
UI result: **Placed {place} in Teams**

- {name} placed {place} in the Teams bracket. We had earned our place among names we used to read from the stands.
- We finished {place}. The prize came in a purse; the lessons would take longer to unpack.

### Lose / no podium
UI result: **Teams bracket complete**

- {name} left the Teams bracket without a prize. We had seen how much more there was to learn about {skill}.
- We did not place this time. Before leaving, we watched the last teams finish what we had come to attempt.

## Hire adventurer — fee tiers

UI title: **Hire an adventurer**
UI fields: **Adventurer** · **Yearly fee**
UI help: Higher yearly fees attract stronger adventurers and support more jobs. Hall renown opens further hiring pools.
Confirm: **Hire adventurer**
Separate cost row, once implemented: **Upfront hire cost: {gold} gold**
The upfront hire cost is not the annual fee. Its exact tier amounts are not locked; do not print an invented amount or imply that hiring itself completes a job.

### Low fee
UI label: **Low · 20 gold per year**
UI hint: **Up to 1 job per adventurer each year.**

- I hired {name} on the low yearly fee. We agreed to start with work we could manage carefully.
- {name} joined the roster. The low fee kept our plans modest and our agreement clear.

### Mid fee
UI label: **Mid · 50 gold per year**
UI hint: **Up to 2 jobs per adventurer each year.**

- I hired {name} on the middle yearly fee. We laid out the available jobs before choosing the first.
- {name} took a place on the roster at the middle fee. Their first question was about the work, not the sign above the door.

### High fee
UI label: **High · 100 gold per year**
UI hint: **Up to 3 jobs per adventurer each year.**

- I hired {name} on the high yearly fee. We set aside time to review the hall's harder notices.
- {name} joined at the high fee. I made sure our ledger could honor the promise before signing it.

Capacity note: These hints are per-adventurer limits, not guaranteed job assignments or guaranteed success. Hall-wide annual scheduling still follows the engine's final interpretation of the design lock.

## Job returns

UI title: **Job report**
UI rows: **Adventurer** · **Outcome** · **Gross job payout**
Success badge: **Completed**
Failure badge: **Unfinished**

### Success

- {name}'s report carried the client's completion mark. I entered the finished job in the hall ledger.
- The job was done. {name}'s notes included one useful warning for whoever took similar work next.
- A completion notice arrived for {name}. I took the old job slip off the board.

### Failure

- {name}'s job remained unfinished. I recorded what had stopped it before considering the next notice.
- The report did not carry a completion mark. I left room beneath {name}'s account for what we needed to change.
- We could not mark {name}'s job complete. The ledger would keep the failure as honestly as the successes.

### Gross payout line

UI: **Gross payout: {gold} gold**
Journal: The completed job brought {gold} gold into the hall's accounts before fees.
Print only for an actual payout; a failed job does not receive an invented consolation purse.

### Settlement — net gold

Use at the engine's accounting boundary: per job only if fees are allocated per job; otherwise at annual settlement. Include all fees charged at that boundary exactly once. Use the profit, loss, or break-even variant as appropriate.

UI rows: **Gross payouts** · **Fees charged** · **Net gold**
Profit label: **Net gain: {gold} gold**
Loss label: **Net loss: {gold} gold**
Break-even label: **Net gold: 0**

- Profit: After fees, the hall finished the settlement {gold} gold ahead. I set the ledger straight before making new plans.
- Loss: After fees, the hall finished the settlement {gold} gold down. Completed work had not covered every cost.
- Break-even: The payouts covered the fees exactly. The hall ended the settlement with no gold gained or lost.

## Guild renown up

UI title: **Word of the hall spreads**
UI detail: **Guild renown +{renown}**

- {name}'s renown rose by {renown}. The completed work gave people another reason to trust our board.
- Word of {name}'s work traveled beyond the doorway. Guild renown rose by {renown}.

Hiring-pool unlock toast, only when an actual threshold is crossed: **New adventurers available**
Unlock journal: {name}'s reputation opened a new hiring pool. I checked the roster before inviting anyone else.
Interim hiring thresholds: 25 / 50 / 75 guild renown. Never promise a specific adventurer, vacancy, or job from the toast alone.

## Guild renown down

UI title: **A promise left unfinished**
UI detail: **Guild renown −{renown}**

- {name}'s renown fell by {renown}. I kept the unfinished job on the ledger, where we could learn from it.
- The failure cost {name} some trust. Guild renown fell by {renown}, and our next promise needed more care.

## Disband tournament team

UI title: **Disband team?**
UI help: There is no disbanding fee. Past wins remain in the Codex.
Confirm: **Disband team**
Cancel: **Keep team**

- I disbanded {name}. We folded the banner; the Codex kept our wins.
- {name} would enter no more meets. I left our victories where they belonged, in the record.

## Close guild hall

UI title: **Close guild hall?**
UI help: Review the roster, unfinished work, and fees before closing.
Confirm: **Close hall**
Cancel: **Keep hall**

- I closed {name}. Taking down the job board left a pale square on the wall.
- {name} was closed. I put away the ledger and took the last notices down.

Do not use closing copy as proof that fees were refunded, jobs completed, members dismissed, or balances forgiven. Those consequences need a Coder/Game Dev decision before the close action ships.
