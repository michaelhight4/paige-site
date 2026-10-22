from . import C, E
J = {"job": 1}
EVENTS = [
 E("overtime","work",(18,99),2,"Overtime","Your boss asks you to work late again this week.",[
  C("Work late","I worked late and my boss noticed, mostly.",{"perf":8,"stress":8,"happy":-4}),
  C("Decline","I declined overtime and went home like a coward.",{"perf":-4,"happy":4}),
  C("Pretend to work","I pretended to work late while watching videos on mute.",{"karma":-4,"perf":-4})],cond=J),
 E("team_building","work",(18,99),1.5,"Team Building","Your company is holding a team-building retreat.",[
  C("Participate","I participated in trust falls. Nobody caught me.",{"rel_coworker":8,"happy":4,"health":-4}),
  C("Skip it","I skipped the retreat and was seen as a loner.",{"rel_coworker":-8}),
  C("Organize the games","I organized the games and became the retreat's dictator.",{"perf":8,"fame":4})],cond=J),
 E("seductress","work",(21,99),1,"Office Flirt","A coworker slips you a note that says 'dinner?'",[
  C("Accept","I accepted a dinner with a coworker. It went well, then badly.",{"happy":8,"karma":-4,"rel_coworker":8}),
  C("Decline politely","I declined the note and we pretended nothing happened.",{"karma":4}),
  C("Report it","I reported the note to HR and everybody heard.",{"rel_coworker":-16,"karma":4}),
  C("Flirt for a raise","I flirted for a raise. HR did not approve.",{"karma":-16,"perf":-8},p=0.4,fail=("I tried to flirt my way to a raise and was reported.",{"perf":-16,"happy":-8}))],cond={"job":1,"single":1}),
 E("retirement","work",(55,99),1.5,"Retirement","Your colleagues throw you a retirement party.",[
  C("Retire","I retired with a cake that read 'Good Riddance'.",{"happy":16,"stress":-16},retire=True),
  C("Keep working","I kept working. I don't know who I'd be otherwise.",{"stress":4}),
  C("Cut the cake","I cut the cake in half and took the larger half.",{"happy":8,"karma":-4})],cond={"job":1},once=True),
 E("termination","work",(18,99),1,"Layoff Rumors","Rumors say your company is cutting jobs.",[
  C("Work harder","I worked harder and my boss didn't notice.",{"perf":8,"stress":8}),
  C("Polish your resume","I polished my resume and started applying to other places.",{"smarts":4}),
  C("Ignore the rumors","I ignored the rumors and took a long lunch.",{"stress":-4,"perf":-4}),
  C("Quit before it happens","I quit before they could fire me and felt strong for six minutes.",{"happy":-8},quit=True)],cond=J),
 E("raise_ask","work",(20,99),1.5,"Ask for a Raise","You think you deserve a raise.",[
  C("Ask boldly","I asked for a raise and my boss said she would think about it.",{"perf":4,"stress":4},p=0.4,fail=("I asked for a raise and was told I was lucky to be here.",{"happy":-8,"perf":-4}),raise_=True),
  C("Wait for review","I waited for my review and got a gift card.",{"happy":-4}),
  C("Threaten to quit","I threatened to quit and my boss called my bluff.",{"stress":8,"perf":-8},p=0.4,fail=("I threatened to quit and was escorted out.",{"happy":-16}),raise_=True)],cond=J),
 E("office_gossip","work",(18,99),1.8,"Office Gossip","A coworker leans in and whispers something about your boss.",[
  C("Listen","I listened to the gossip and now know too much.",{"happy":4,"karma":-4}),
  C("Spread it","I spread the gossip and was wildly popular for a day.",{"karma":-8,"rel_coworker":8},chain=("gossip_backfire",1,2)),
  C("Shut it down","I told the coworker to stop gossiping. We aren't close anymore.",{"karma":8,"rel_coworker":-8}),
  C("Tell the boss","I told the boss about the gossip. The gossiper was fired.",{"karma":-8,"perf":4})],cond=J),
 E("gossip_backfire","work",(18,99),1,"Gossip Backfire","Your boss heard what you said.",[
  C("Apologize","I apologized to my boss and she accepted, barely.",{"karma":8,"perf":-4}),
  C("Deny it","I denied everything and my boss rolled her eyes.",{"karma":-8,"perf":-8}),
  C("Blame a coworker","I blamed a coworker, who is now my enemy.",{"karma":-16,"rel_coworker":-30})],cond=J,chain_only=True),
 E("accountant_shady","work",(21,99),1,"Shady Client","A client offers you $10,000 to fudge some numbers.",[
  C("Take the deal","I fudged the numbers and bought a very nice chair.",{"money":10000,"karma":-30,"stress":8},chain=("audit",2,5)),
  C("Refuse","I refused the deal and reported the client.",{"karma":16,"perf":4}),
  C("Negotiate higher","I negotiated for $15,000 and they hung up.",{"karma":-8})],cond=J),
 E("audit","work",(21,99),1,"Audit","Auditors arrive at your office with clipboards and no sense of humor.",[
  C("Cooperate fully","I cooperated fully and went to jail for a month.",{"karma":8,"happy":-16,"money":-5000}),
  C("Shred documents","I shredded documents and the shredder jammed.",{"karma":-16,"stress":16}),
  C("Lawyer up ($8,000)","I hired a lawyer and escaped with a fine.",{"money":-8000,"stress":8})],cond=J,chain_only=True),
 E("boss_praise","work",(18,99),1.5,"Boss's Praise","Your boss praises your work in front of everyone.",[
  C("Accept humbly","I accepted my boss's praise with a modest nod.",{"perf":8,"happy":8}),
  C("Take all the credit","I took all the credit and my team hates me.",{"perf":4,"rel_coworker":-16,"karma":-8}),
  C("Share the credit","I shared the credit with my team. They bought me a donut.",{"karma":8,"rel_coworker":8,"happy":4})],cond=J),
 E("work_mistake","work",(18,99),1.5,"Big Mistake","You sent an important email to the wrong person.",[
  C("Own up","I owned up to the mistake. Nobody died.",{"karma":8,"perf":-4}),
  C("Pretend nothing happened","I pretended nothing happened. It was my best acting.",{"stress":8,"karma":-4}),
  C("Blame the intern","I blamed the intern. The intern cried.",{"karma":-16,"rel_coworker":-8})],cond=J),
 E("job_offer","work",(21,60),1.2,"Job Offer","A recruiter offers you a position at a competitor.",[
  C("Accept","I accepted the offer and left my old job with a muffin basket.",{"happy":8,"money":2000},switchjob=True),
  C("Use it to negotiate","I used the offer to negotiate a raise and my boss was impressed.",{"perf":8},p=0.5,fail=("I used the offer to negotiate and my boss laughed.",{"happy":-8})),
  C("Decline","I declined the offer and stayed loyal.",{"karma":4})],cond=J),
 E("sick_day","work",(18,99),1.5,"Sick Day","You wake up feeling lousy before work.",[
  C("Go to work anyway","I went to work sick and infected everyone.",{"perf":4,"health":-8,"karma":-8}),
  C("Call in sick","I called in sick and watched TV all day.",{"health":4,"perf":-4}),
  C("Fake being sicker","I faked being sicker than I was and enjoyed a long weekend.",{"karma":-8,"happy":8})],cond=J),
 E("office_party","work",(21,99),1.2,"Office Party","Your office is having a holiday party with free drinks.",[
  C("Drink moderately","I had two drinks and told a coworker nice things.",{"rel_coworker":8,"happy":4}),
  C("Get drunk","I got drunk and sang karaoke to a CEO.",{"happy":8,"fame":4,"perf":-8}),
  C("Skip it","I skipped the party and watched TV.",{"rel_coworker":-4})],cond=J),
 E("first_job","work",(14,18),1.8,"First Job","A local business is hiring teens for the summer.",[
  C("Take it","I got a summer job and learned how to say 'welcome' in a flat voice.",{"smarts":8,"happy":-4,"money":600}),
  C("Decline","I turned down the job and slept in.",{"happy":4}),
  C("Negotiate for more","I asked for a raise on day one. They laughed.",{"smarts":4,"money":400})],once=True),
 E("side_hustle","money",(18,70),1.5,"Side Hustle","A friend suggests starting an online shop.",[
  C("Go for it ($500)","I started an online shop that sold nine items.",{"money":-300,"smarts":8,"happy":4},p=0.6,fail=("I started an online shop that sold nothing.",{"money":-500,"happy":-4})),
  C("Wait","I decided to wait and wait is still going.",{}),
  C("Invest in crypto instead ($500)","I put $500 in crypto and watched it dip for a year.",{"money":-500,"stress":8})],cond={"minCash":500}),
 E("lottery","money",(18,99),1,"Lottery Ticket","You find a scratch-off ticket in your coat pocket.",[
  C("Scratch it","I scratched the ticket and won $50.",{"money":50,"happy":8}),
  C("Gift it","I gave the ticket to a stranger who won $2,000.",{"karma":16}),
  C("Throw it out","I threw the ticket out and never knew.",{})]),
 E("scam_call","money",(25,99),1.5,"Scam Call","A call says you owe taxes and need to pay in gift cards.",[
  C("Hang up","I hung up the phone with confidence.",{"smarts":4}),
  C("Pay the 'taxes' ($800)","I bought $800 of gift cards and read the codes to a stranger.",{"money":-800,"smarts":-8,"happy":-8},req=800),
  C("Waste their time","I wasted the scammer's time for an hour. It was the best date I've had.",{"happy":8,"smarts":4})]),
 E("stock_tip","money",(21,80),1.2,"Stock Tip","A coworker's cousin swears he has a stock tip that will make you rich.",[
  C("Invest $2,000","I invested $2,000 in a tip and got 40 shares of a doomed company.",{"money":-2000,"stress":8},p=0.35,fail=("The stock tanked and so did I.",{"happy":-8}),winmoney=7000),
  C("Ignore it","I ignored the tip and bought a sandwich.",{}),
  C("Research it","I did research and found the company doesn't exist.",{"smarts":8})],cond={"minCash":2000}),
 E("flat_tire","money",(18,99),2,"Car Trouble","Your car breaks down on the highway.",[
  C("Call a tow ($200)","I paid for a tow and watched the driver judge my car.",{"money":-200,"stress":4}),
  C("Fix it yourself","I tried to fix it myself and made it worse.",{"smarts":4,"money":-400,"health":-4}),
  C("Walk","I walked eight miles and lost a shoe.",{"health":-4,"happy":-4})],cond={"anyCar":1}),
 E("tax_audit","money",(25,99),0.8,"Tax Audit","A letter says the tax authority wants to look at your records.",[
  C("Hire an accountant ($1,500)","I hired an accountant and it all worked out, mostly.",{"money":-1500}),
  C("Do it yourself","I did it myself and found $400 I owed.",{"smarts":8,"money":-400}),
  C("Ignore it","I ignored the letter and was fined $3,000.",{"money":-3000,"stress":16})],cond={"minCash":3000}),
 E("windfall","money",(18,99),0.8,"Windfall","A forgotten bank account turns up with a pile of money in it.",[
  C("Claim it","I claimed the account and bought a better couch.",{"money":3000,"happy":8}),
  C("Donate it","I donated the cash to charity and felt noble.",{"karma":16,"happy":4})]),
 E("bad_investment","money",(25,80),0.8,"Pyramid Scheme","A smooth-talking friend invites you to a 'business opportunity'.",[
  C("Join ($3,000)","I joined a pyramid scheme and lost $3,000 and a friend.",{"money":-3000,"smarts":-8,"rel_friend":-16},req=3000),
  C("Decline","I declined and left the meeting early.",{"smarts":8}),
  C("Recruit others","I recruited my cousin, who is also now poor.",{"karma":-16,"money":-500})],cond={"minCash":3000}),
 E("sore_back","health",(25,99),1.8,"Sore Back","Your back is aching after a long day.",[
  C("Stretch","I did some stretching and my back thanked me.",{"health":4}),
  C("See a doctor ($250)","I saw a doctor and was told to stretch.",{"money":-250,"health":8},req=250),
  C("Ignore it","I ignored it and became shaped like a question mark.",{"health":-8}),
  C("Take painkillers","I took painkillers and felt invincible for a day.",{"health":-4,"happy":4})]),
 E("new_diet","health",(14,99),1.8,"New Diet","A friend suggests a new diet.",[
  C("Try it","I tried the diet and lost a few pounds and a lot of joy.",{"health":8,"happy":-8,"looks":4}),
  C("Eat a salad","I ate a salad and was proud for twelve hours.",{"health":4}),
  C("Eat a burger","I ate a burger the size of my head.",{"health":-4,"happy":8}),
  C("Eat nothing","I ate nothing for two days and regretted it.",{"health":-16,"looks":-4})]),
 E("gym_buddy","health",(14,70),1.5,"Gym Invitation","A friend invites you to join a gym.",[
  C("Join and go regularly","I went to the gym regularly and could lift a tiny couch.",{"health":16,"looks":8,"happy":4}),
  C("Join and never go","I joined a gym and paid for it every month.",{"money":-300}),
  C("Run outside","I ran outside until a dog chased me.",{"health":8}),
  C("Decline","I declined and stayed on the couch.",{"health":-4})]),
 E("mental_health","health",(14,99),1.5,"Rough Patch","You've been feeling down lately, and nothing seems to help.",[
  C("Talk to someone","I talked to someone and it helped more than I admitted.",{"happy":16,"stress":-8}),
  C("Take up meditation","I tried meditation and fell asleep sitting up.",{"happy":8,"stress":-8}),
  C("Bottle it up","I bottled up my feelings and ate a lot of cheese.",{"happy":-16,"stress":16}),
  C("Drink alone","I drank alone and it did not fix anything.",{"happy":-8,"health":-8,"karma":-4},flag="drinker")]),
 E("sleepless","health",(18,99),1.5,"Sleepless Nights","You haven't slept well in days.",[
  C("Establish a routine","I set a sleep routine and woke up feeling human.",{"health":8,"stress":-8}),
  C("Take sleeping pills","I took sleeping pills and slept for fifteen hours.",{"health":-4,"happy":4}),
  C("Scroll through your phone","I scrolled until sunrise and learned nothing.",{"health":-8,"smarts":-4}),
  C("Drink coffee","I drank six coffees and vibrated through the day.",{"stress":8})]),
 E("fall_ill","health",(5,99),2.5,"Feeling Sick","You're feeling very ill.",[
  C("Rest at home","I rested at home and watched game shows.",{"health":-4}),
  C("See a doctor ($300)","I saw a doctor and was handed a pamphlet.",{"money":-300,"health":4,"doctor":True},req=300),
  C("Take herbal tea","I drank herbal tea and my cough was unimpressed.",{"health":-4}),
  C("Ignore it","I ignored it and shuffled along.",{"health":-8,"stress":4})]),
 E("health_checkup","health",(30,99),1.5,"Health Checkup","Your doctor recommends a checkup.",[
  C("Go ($200)","I went to the checkup and got a lecture about salt.",{"money":-200,"health":8,"doctor":True},req=200),
  C("Skip it","I skipped the checkup. What could go wrong?",{"health":-4}),
  C("Go and argue","I argued with the doctor and won a very small point.",{"money":-200,"health":4,"doctor":True,"karma":-4},req=200)]),
 E("rescue","health",(14,99),0.6,"Someone Needs Help","You see a person collapse on the sidewalk.",[
  C("Call for help","I called an ambulance and stayed with the stranger until it came.",{"karma":16,"happy":8}),
  C("Perform CPR","I performed CPR and the stranger lived. I got an award shaped like a pillow.",{"karma":30,"fame":8,"health":-4},p=0.5,fail=("I performed CPR badly and the stranger was not helped.",{"karma":8,"happy":-16})),
  C("Walk past","I walked past. It was a Tuesday.",{"karma":-16})]),
 E("lightning","random",(1,99),0.05,"Storm","A thunderstorm rolls in while you're outside.",[
  C("Shelter in a car","I sheltered in a car and watched the sky.",{"smarts":4}),
  C("Stand under a tree","I stood under a tall tree.",{"health":-16},p=0.99,fail=("I was struck by lightning.",{"kill":"lightning"}))]),
]
