from . import C, E
EVENTS = [
 E("new_friend","friend",(5,99),2,"New Friend","Someone new at {place} starts chatting with you.",[
  C("Befriend them","I made a new friend named {newfriend}.",{"happy":8},newperson="friend"),
  C("Ignore them","I ignored the stranger and looked at my phone.",{})],cond={"maxFriends":6}),
 E("up_in_flames","friend",(14,99),1.2,"Up in Flames","Friends are lighting a bonfire in the woods and offer you a lighter.",[
  C("Light it","I lit the bonfire and everyone cheered for my fire skills.",{"happy":8,"karma":-4},p=0.7,fail=("I lit the bonfire and set my sleeve on fire.",{"health":-16,"happy":-8})),
  C("Decline","I declined and watched them light it themselves.",{"smarts":4}),
  C("Bring marshmallows","I brought marshmallows and became the hero of the night.",{"happy":16,"rel_friend":8})],cond={"friends":1}),
 E("free_booze","friend",(18,99),1.5,"Free Booze","A friend offers you a drink at a party.",[
  C("Have one","I had one drink and kept it classy.",{"happy":4,"health":-4}),
  C("Get hammered","I got hammered and told everyone my secrets.",{"happy":8,"health":-8,"karma":-4,"stress":-8},flag="drinker",chain=("hangover",1,1)),
  C("Decline","I declined and was the designated driver.",{"karma":8,"rel_friend":4}),
  C("Pour it on the carpet","I poured the drink on the carpet and left quickly.",{"karma":-8})],cond={"friends":1}),
 E("hangover","friend",(16,99),1,"Hangover","You wake up with a pounding head and no memory of last night.",[
  C("Drink water and rest","I drank water and slept it off.",{"health":4}),
  C("Hair of the dog","I drank more alcohol to feel better. It did not help.",{"health":-8,"karma":-4}),
  C("Call in sick","I called in sick and lay on the bathroom floor.",{"perf":-4,"happy":-4})],chain_only=True),
 E("friend_money","friend",(18,99),1.5,"Money Troubles","A friend asks to borrow $500.",[
  C("Lend it","I lent my friend $500 and never saw it again.",{"karma":8,"money":-500,"rel_friend":16}),
  C("Say no","I told my friend no and he never forgave me.",{"rel_friend":-16,"happy":-4}),
  C("Give half","I gave my friend $250 and a speech about budgeting.",{"money":-250,"rel_friend":8,"karma":4})],cond={"friends":1,"minCash":500}),
 E("friend_party","friend",(13,99),2,"House Party","A friend invites you to a house party this weekend.",[
  C("Go and have fun","I went to the house party and danced like nobody cared.",{"happy":16,"stress":-8}),
  C("Host your own","I hosted a party at my place and the neighbors called the cops.",{"happy":8,"karma":-8,"fame":4}),
  C("Stay home","I stayed home and watched documentaries about sharks.",{"smarts":4,"happy":-4})],cond={"friends":1}),
 E("friend_fight","friend",(13,99),1.5,"Friend Fight","You and a friend get into a heated argument.",[
  C("Apologize first","I apologized to my friend and we hugged it out.",{"karma":8,"rel_friend":16}),
  C("Hold your ground","I held my ground and my friend left angry.",{"rel_friend":-16,"stress":8}),
  C("Throw a punch","I punched my friend in the shoulder. He punched back.",{"health":-8,"rel_friend":-30,"karma":-8}),
  C("Ghost them","I stopped replying to my friend's texts.",{"rel_friend":-16,"karma":-8})],cond={"friends":1}),
 E("friend_wedding","friend",(21,60),1,"Friend's Wedding","A friend invites you to their wedding.",[
  C("Attend","I went to my friend's wedding and cried at the vows.",{"happy":16,"money":-200,"rel_friend":8}),
  C("Give a toast","I gave a toast and told an embarrassing story about the groom.",{"happy":8,"fame":4,"rel_friend":8,"money":-200}),
  C("Skip it","I skipped the wedding and sent a toaster.",{"rel_friend":-8})],cond={"friends":1}),
 E("enemy","friend",(8,99),1.2,"Rival","Someone has made it their mission to make your life miserable.",[
  C("Kill them with kindness","I was nice to my rival until he gave up out of confusion.",{"karma":16,"happy":4}),
  C("Prank them","I filled my rival's locker with glitter.",{"happy":8,"karma":-8}),
  C("Confront them","I confronted my rival and we both said things.",{"stress":8,"happy":-4}),
  C("Ignore them","I ignored my rival, which annoyed him the most.",{"smarts":4})]),
 E("mom_birthday","family",(8,99),1.5,"Mom's Birthday","It's your mother's birthday.",[
  C("Buy a gift ($50)","I bought my mother a scarf and she cried a little.",{"money":-50,"rel_mother":16,"karma":4}),
  C("Make a card","I made a card with a drawing of us as dinosaurs.",{"rel_mother":16,"happy":4}),
  C("Forget","I forgot my mother's birthday. She noticed.",{"rel_mother":-16,"karma":-8})],cond={"parent":"mother"}),
 E("dad_advice","family",(10,99),1.5,"Dad's Advice","Your father pulls you aside to give you some advice.",[
  C("Listen carefully","I listened to my dad's advice, and some of it was good.",{"smarts":8,"rel_father":8}),
  C("Roll your eyes","I rolled my eyes so hard I saw my own brain.",{"rel_father":-8}),
  C("Ask for money","I asked my dad for money instead. He gave me ten dollars and a look.",{"money":10,"rel_father":-4})],cond={"parent":"father"}),
 E("sibling_rivalry","family",(4,25),1.5,"Sibling Rivalry","Your sibling ate the last of your favorite snack.",[
  C("Forgive","I forgave my sibling in a display of unmatched maturity.",{"karma":8,"rel_sibling":8}),
  C("Get revenge","I hid my sibling's left shoe for a week.",{"karma":-4,"happy":4,"rel_sibling":-8}),
  C("Tell mom","I told mom. My sibling got grounded and I got a lecture on snitching.",{"rel_sibling":-16}),
  C("Wrestle","I wrestled my sibling and lost an eyebrow.",{"health":-4,"rel_sibling":-4,"happy":4})],cond={"sibling":1}),
 E("sibling_help","family",(10,99),1.2,"Sibling in Need","Your sibling asks you for help moving.",[
  C("Help out","I helped my sibling move a couch up three flights of stairs.",{"rel_sibling":16,"health":-4,"karma":8}),
  C("Say you're busy","I told my sibling I was busy. I was not busy.",{"rel_sibling":-16,"karma":-4}),
  C("Pay for movers ($300)","I paid for movers. My sibling was grateful and a little suspicious.",{"money":-300,"rel_sibling":8})],cond={"sibling":1}),
 E("family_dinner","family",(5,99),2,"Family Dinner","Your family is having a big dinner together.",[
  C("Help cook","I helped cook and only burned one thing.",{"happy":8,"rel_family":8}),
  C("Eat quietly","I ate quietly while everyone else argued about politics.",{"happy":-4}),
  C("Bring up politics","I brought up politics. We never recovered.",{"stress":8,"rel_family":-8}),
  C("Skip dinner","I skipped dinner and ate cereal in my room.",{"happy":-4})]),
 E("family_vacation","family",(3,17),1.5,"Family Vacation","Your family plans a road trip.",[
  C("Enjoy the ride","I enjoyed the road trip and saw a giant fiberglass chicken.",{"happy":16,"rel_family":8}),
  C("Ask 'are we there yet' repeatedly","I asked if we were there yet two hundred times.",{"rel_family":-8,"happy":4}),
  C("Stay home","I stayed at a friend's house for the week.",{"rel_friend":8,"rel_family":-4})],cond={"parent":"any"}),
 E("grounded","family",(8,17),1.5,"Grounded","Your parents catch you sneaking out at night.",[
  C("Apologize","I apologized and accepted a month of being grounded.",{"karma":8,"happy":-8}),
  C("Argue","I argued that I was an adult. I was fourteen.",{"rel_parent":-16,"happy":-8}),
  C("Sneak out again","I snuck out again the next night. The neighbors saw.",{"rel_parent":-30,"karma":-8,"happy":8}),
  C("Blame a friend","I blamed my friend for the whole thing.",{"karma":-8})],cond={"parent":"any"}),
 E("parent_divorce","family",(5,17),0.6,"Parents Divorce","Your parents tell you they are splitting up.",[
  C("Cry","I cried with my parents and we ordered pizza.",{"happy":-16,"stress":8}),
  C("Act like it's fine","I acted like it was fine and stared at the wall for three days.",{"happy":-8,"stress":8}),
  C("Blame yourself","I blamed myself for the divorce and my parents hugged me for an hour.",{"happy":-16,"rel_parent":8}),
  C("Pick a side","I picked a side. The other side did not forget.",{"karma":-8,"rel_parent":-16})],once=True,cond={"parent":"both"}),
 E("parent_illness","family",(20,80),1.2,"Parent Illness","One of your parents has been diagnosed with a serious illness.",[
  C("Help care for them","I took time off to help care for my parent.",{"karma":16,"stress":8,"rel_parent":16}),
  C("Pay for treatment ($5,000)","I paid for my parent's treatment and watched them recover slowly.",{"money":-5000,"karma":8,"rel_parent":16},req=5000),
  C("Visit when you can","I visited when I could. It wasn't often.",{"rel_parent":-4}),
  C("Avoid the topic","I avoided the topic and called less.",{"karma":-8,"rel_parent":-16})],cond={"parent":"any"}),
 E("inheritance_tip","family",(25,90),0.8,"Distant Relative","A lawyer tells you a distant relative has left you something in their will.",[
  C("Accept it","I accepted a distant relative's inheritance of $2,500 and a clock.",{"money":2500,"happy":8}),
  C("Decline it","I declined the inheritance because I like suffering.",{"karma":8}),
  C("Contest for more","I contested the will for a larger share and lost.",{"karma":-8,"money":-1500})]),
 E("pregnancy_scare","love",(14,45),1,"Pregnancy Scare","A test shows an unexpected result.",[
  C("Take another test","I took three more tests and two were wrong.",{"stress":8}),
  C("Talk to your partner","I talked it through with my partner and we made a plan.",{"karma":8,"stress":4}),
  C("Panic","I panicked and ran six miles.",{"health":4,"stress":16})],cond={"partner":"any"}),
 E("safe_sex","love",(14,60),1.5,"Safe Sex","Things are getting heated with your partner.",[
  C("Use protection","I used protection and was responsible about it.",{"happy":4,"karma":4}),
  C("Wing it","I winged it and held my breath for three weeks.",{"stress":8,"karma":-4},flag="risky",rel_partner=8),
  C("Back off","I decided to wait.",{"smarts":4})],cond={"partner":"any"}),
 E("first_crush","love",(10,16),2,"First Crush","You have a crush on a classmate.",[
  C("Tell them","I told my crush how I felt. They said they liked someone else.",{"happy":-8,"smarts":4},p=0.4,fail=("I told my crush how I felt and they said it was weird.",{"happy":-16}),winflag="crush_yes"),
  C("Write a note","I wrote my crush a note and they wrote back with a heart.",{"happy":16}),
  C("Admire from afar","I admired my crush from afar for three years.",{"happy":4,"crazy":4}),
  C("Forget about it","I forgot about my crush and played soccer.",{})],once=True),
 E("love_anniv","love",(18,90),1.5,"Anniversary","It's your anniversary with your partner.",[
  C("Plan a romantic dinner ($200)","I planned a romantic dinner and my partner cried happy tears.",{"money":-200,"rel_partner":16,"happy":8}),
  C("Forget it","I forgot our anniversary. We don't talk about it.",{"rel_partner":-30,"happy":-8}),
  C("Give a gift ($100)","I gave a gift. It was kind of cheap.",{"money":-100,"rel_partner":8}),
  C("Take a trip ($1,500)","I took my partner on a weekend getaway. It rained.",{"money":-1500,"rel_partner":16,"happy":8})],cond={"partner":"any","minCash":200}),
 E("cheating_temptation","love",(18,70),1.2,"Temptation","An attractive coworker flirts with you while you're in a relationship.",[
  C("Walk away","I walked away from the flirt and went home.",{"karma":16,"rel_partner":4}),
  C("Flirt back","I flirted back and felt guilty for a week.",{"karma":-16,"rel_partner":-16},chain=("caught_cheating",1,2)),
  C("Tell your partner","I told my partner about the flirt. They loved my honesty.",{"karma":8,"rel_partner":8}),
  C("Report them","I reported the coworker to HR. It got awkward.",{"karma":4,"stress":8})],cond={"partner":"any"}),
 E("caught_cheating","love",(18,80),1,"Caught","Your partner found out you've been cheating.",[
  C("Apologize","I apologized and begged for another chance.",{"karma":8,"rel_partner":-16}),
  C("Deny it","I denied everything. They had pictures.",{"karma":-16,"rel_partner":-30}),
  C("Blame them","I blamed my partner for my own cheating.",{"karma":-16,"rel_partner":-30,"stress":8})],chain_only=True),
 E("prom","love",(16,18),1.5,"Prom","Prom is coming and you need a date.",[
  C("Ask a crush","I asked my crush to prom. They said yes.",{"happy":16,"looks":4},p=0.5,fail=("I asked my crush to prom and they were going with someone else.",{"happy":-16})),
  C("Go with friends","I went to prom with friends and ate too many cupcakes.",{"happy":8}),
  C("Skip prom","I skipped prom and watched movies.",{"happy":-4}),
  C("Crash another school's prom","I crashed another school's prom and was escorted out.",{"happy":8,"karma":-8,"fame":4})],once=True),
 E("dating_app","love",(18,60),1.2,"Dating App","Your friends want you to join a dating app.",[
  C("Create a profile","I created a profile with a photo from 2014.",{"happy":4,"looks":-4}),
  C("Swipe right on everyone","I swiped right on everyone and matched with a bot.",{"happy":-4,"crazy":4}),
  C("Delete the app","I deleted the app and deleted my feelings.",{"happy":-4}),
  C("Go out on a date","I went on a date and ordered the wrong appetizer.",{"happy":8})],cond={"single":1}),
 E("wedding_planning","love",(20,70),1,"Wedding Day","The day of your wedding has arrived.",[
  C("Splurge ($10,000)","I threw a lavish wedding and cried twice.",{"money":-10000,"happy":16,"rel_partner":16},req=10000),
  C("Go to city hall ($200)","I got married at city hall in a borrowed suit.",{"money":-200,"happy":8,"rel_partner":8}),
  C("Elope","I eloped on a mountain. The officiant was a goat farmer.",{"happy":16,"karma":-4})],cond={"engaged":1},once=True),
 E("baby_name","love",(18,50),1,"Baby Shower","Friends are throwing you a baby shower.",[
  C("Enjoy it","I enjoyed a baby shower and received seven identical onesies.",{"happy":16}),
  C("Cry","I cried at a diaper cake.",{"happy":8,"stress":-8})],cond={"pregnantPartner":1}),
 E("child_tantrum","love",(20,60),1.5,"Tantrum","Your child throws a tantrum in a grocery store.",[
  C("Stay calm","I stayed calm and waited out the tantrum like a monk.",{"karma":8,"stress":4,"rel_child":8}),
  C("Give in and buy the candy","I bought the candy. We never spoke of it.",{"rel_child":4,"karma":-4}),
  C("Yell","I yelled at my child in the cereal aisle. We both cried.",{"rel_child":-16,"karma":-8,"stress":8}),
  C("Leave the cart and go","I abandoned the cart and went outside.",{"stress":8,"karma":-4})],cond={"kids":1}),
 E("child_graduates","love",(35,70),1,"Proud Parent","Your child is graduating.",[
  C("Attend and cheer","I cheered so loud at my kid's graduation that I got shushed.",{"happy":16,"rel_child":16}),
  C("Give them cash ($1,000)","I gave my kid cash. They said thanks without looking up.",{"money":-1000,"rel_child":8}),
  C("Skip it","I skipped the graduation and went to work.",{"rel_child":-30,"karma":-16})],cond={"kids":1}),
]
