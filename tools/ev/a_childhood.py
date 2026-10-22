from . import C, E
EVENTS = [
 E("mouth_noises","childhood",(1,3),3,"Mouth Noises","Your mother is calling to you in a soft voice. You feel inclined to respond.",[
  C("Say \"ma ma\"","I said \"ma ma\" and my caretaker became ecstatic.",{"happy":16,"smarts":8}),
  C("Say \"da da\"","I disappointed my caretaker by saying \"da da\".",{"smarts":4}),
  C("Cry","I cried, confused by the intricacies of the English language.",{"happy":-16,"smarts":-4}),
  C("Spit","I spat liquid onto my caretaker's face.")],once=True),
 E("mashed_avocado","childhood",(1,3),3,"Mashed Avocado","Your mother swirls a spoonful of your least favorite green muck through the air.",[
  C("Eat it","I ate the avocado and my mother kissed me for it.",{"smarts":8}),
  C("Cry","I wailed at the sight of mashed avocado.",{"happy":-4}),
  C("Slap the spoon","I slapped the spoon to the floor, and the avocado with it.",{"karma":-4})],once=True),
 E("toying_around","childhood",(1,3),3,"Toying Around","A pile of toys sits within crawling distance.",[
  C("Stack the blocks","I stacked blocks with the focus of a tiny architect.",{"smarts":8}),
  C("Chew the blocks","I chewed on a block until it lost all will to live.",{"health":-4}),
  C("Throw them","I threw every toy across the room, then cried that they were gone.",{"happy":4,"karma":-4})],once=True),
 E("tolerance","childhood",(2,4),2,"Tolerance","A toddler at daycare is sitting alone in the corner.",[
  C("Share a toy","I shared my toy with a lonely kid and felt like a diplomat.",{"karma":8,"happy":4}),
  C("Ignore them","I ignored the kid in the corner and focused on my snack.",{}),
  C("Take their toy","I took the lonely kid's toy. It was a bad toy.",{"karma":-8})],once=True),
 E("vaccination","childhood",(1,5),2,"Vaccination","A nurse approaches with a needle and a lollipop.",[
  C("Be brave","I took the shot without a sound and got a lollipop for it.",{"health":8}),
  C("Scream","I screamed so loud that a nurse in another county flinched.",{"health":4,"happy":-4}),
  C("Run away","I escaped the clinic wearing one shoe. They caught me in the parking lot.",{"health":-4})],once=True),
 E("jump_around","childhood",(3,8),2,"Jump Around","The couch looks like a trampoline today.",[
  C("Jump on it","I jumped on the couch until gravity filed a complaint.",{"happy":8},p=0.7,fail=("I jumped off the couch and landed on my wrist.",{"health":-8,"happy":-4})),
  C("Build a fort","I built a blanket fort and declared it a sovereign nation.",{"smarts":4,"happy":4}),
  C("Watch cartoons","I watched cartoons for four hours straight.",{"smarts":-4})]),
 E("integrity","childhood",(4,12),1.5,"Integrity","You find a wallet on the sidewalk. There is cash inside.",[
  C("Return it","I returned a wallet and the owner gave me a handshake and five dollars.",{"karma":16,"happy":4,"money":5}),
  C("Keep the cash","I kept the cash and left the wallet in a bush.",{"karma":-16,"money":40}),
  C("Leave it","I left the wallet where it was, because it wasn't my problem.",{})],once=True),
 E("dental_care","childhood",(4,12),2,"Dental Care","It is time to brush your teeth.",[
  C("Brush and floss","I brushed and flossed like a person with a future.",{"looks":16,"health":4}),
  C("Just brush","I brushed my teeth. Mostly the front ones.",{"looks":4}),
  C("Eat candy instead","I ate a candy bar and called it dental hygiene.",{"looks":-8,"happy":4}),
  C("Skip it","I skipped brushing and my breath noticed.",{"looks":-4})]),
 E("big_flex","childhood",(3,8),1.5,"Big Flex","A group of kids dares you to show off how strong you are.",[
  C("Lift a heavy rock","I lifted a rock the size of a toaster and felt invincible.",{"health":4,"happy":8},p=0.6,fail=("I dropped a rock on my foot in front of everyone.",{"health":-8,"happy":-8})),
  C("Flex your arms","I flexed my arms. The kids stared at my elbows politely.",{"looks":-4}),
  C("Walk away","I walked away from the dare and ate a sandwich.",{"smarts":4}),
  C("Shove the dare-giver","I shoved the kid who dared me. He cried.",{"karma":-8})]),
 E("bee_careful","childhood",(3,10),2,"Bee Careful","A bee is hovering around your lemonade.",[
  C("Stay still","I stayed still and the bee left in disappointment.",{"smarts":4}),
  C("Swat it","I swatted the bee and learned about stingers.",{"health":-8,"happy":-4}),
  C("Run screaming","I ran in circles screaming until the bee lost interest.",{"happy":-4})]),
 E("mud","childhood",(3,8),2,"Mud","It rained all night and the backyard is a swamp.",[
  C("Jump in the puddles","I jumped in every puddle and came home brown from the neck down.",{"happy":16,"looks":-4}),
  C("Make mud pies","I made mud pies and served them to the dog.",{"happy":8,"smarts":4}),
  C("Eat the mud","I ate some mud. It tasted like regret and minerals.",{"health":-8}),
  C("Stay inside","I stayed inside and watched the rain with great maturity.",{})]),
 E("rejection","childhood",(3,10),1.5,"Rejection","A classmate says you can't play with them.",[
  C("Cry","I cried on a bench until a teacher found me.",{"happy":-8}),
  C("Play alone","I played alone and honestly it went fine.",{"smarts":4}),
  C("Say something mean","I called the kid a name so bad I had to look it up later.",{"karma":-8,"happy":4})]),
 E("free_samples","childhood",(2,8),1.5,"Free Samples","A grocery store worker offers free samples.",[
  C("Take one politely","I took one sample, said thank you, and left a legend.",{"karma":4}),
  C("Take all of them","I took all the samples. The worker called for backup.",{"karma":-4,"happy":8}),
  C("Hide in the display","I hid in a cereal display until my mother found me.",{"happy":4}),
  C("Cry","I cried over a cracker.",{"happy":-4})]),
 E("nap_time","childhood",(2,6),1.5,"Nap Time","The teacher says it is time for a nap, and you are not tired.",[
  C("Sleep","I took a nap and woke up with a pillow dent on my face.",{"health":4}),
  C("Draw on the mat","I drew on my nap mat with a marker I wasn't supposed to have.",{"smarts":4,"karma":-4}),
  C("Whisper to a friend","I whispered through naptime and was moved to the corner.",{"happy":4,"smarts":-4}),
  C("Throw a tantrum","I threw a tantrum so large it needed its own corner.",{"happy":-30})]),
 E("show_and_tell","childhood",(5,10),1.5,"Show and Tell","It is your turn for show and tell.",[
  C("Bring a family photo","I brought a family photo and everyone said it was nice.",{"happy":4}),
  C("Bring a frog","I brought a frog. The frog performed better than I did.",{"happy":8,"karma":-4}),
  C("Make something up","I invented an uncle who was an astronaut. Nobody checked.",{"smarts":4,"karma":-4}),
  C("Say you forgot","I told the class I forgot. It was true.",{"happy":-4})]),
 E("lemonade_stand","childhood",(6,12),1.5,"Lemonade Stand","Your friends suggest running a lemonade stand this weekend.",[
  C("Work hard at it","I sold lemonade all weekend and cleared nineteen dollars.",{"smarts":8,"money":19}),
  C("Drink the profits","I drank most of the lemonade myself. The stand did not recover.",{"happy":4,"health":-4}),
  C("Overcharge","I charged ten dollars a cup and got exactly one customer.",{"smarts":4,"money":10})]),
 E("lost_tooth","childhood",(5,10),2,"Loose Tooth","Your tooth has been wiggling for days.",[
  C("Pull it out","I pulled the tooth myself and put it under a pillow. A coin appeared.",{"happy":8,"money":5}),
  C("Let it fall out","I let the tooth fall out into a taco.",{"happy":4}),
  C("Ask for help","I let my dad pull it with a string tied to a door. It was dramatic.",{"happy":4,"health":-4})]),
 E("pet_fish","childhood",(5,12),1.2,"Goldfish","You win a goldfish at the fair.",[
  C("Name it and care for it","I named the fish Gerald and fed him every day for a whole week.",{"karma":8,"happy":8}),
  C("Forget about it","I forgot about the goldfish and Gerald met his maker.",{"karma":-8}),
  C("Release it in a pond","I released Gerald into a pond. He was eaten by a duck.",{"happy":-4})]),
 E("bedtime_story","childhood",(2,7),1.5,"Bedtime Story","Your mother offers to read you a story.",[
  C("Listen","I listened to a story about a bear who learned sharing.",{"smarts":8,"happy":4}),
  C("Demand a different story","I demanded eleven different stories and lived through none of them.",{"smarts":4}),
  C("Pretend to sleep","I pretended to sleep and actually slept.",{"health":4})]),
 E("playground_bully","childhood",(5,12),2,"Playground Bully","An older kid is picking on you at recess.",[
  C("Stand up to him","I stood up to the bully and he left me alone, probably out of confusion.",{"happy":8,"karma":4},p=0.5,fail=("I stood up to the bully and got a bloody nose.",{"health":-8,"happy":-8})),
  C("Tell a teacher","I told a teacher and the bully got detention.",{"smarts":4}),
  C("Give him your lunch","I gave the bully my lunch and went hungry with dignity.",{"happy":-8,"health":-4}),
  C("Hide","I hid in a bathroom stall until recess was over.",{"happy":-4,"stress":8})]),
 E("daredevil","childhood",(8,17),1.5,"Daredevil","Your friends dare you to jump off the roof of the garage onto a trampoline.",[
  C("Jump","I jumped off the garage and hit the trampoline spectacularly.",{"happy":16,"fame":4},p=0.6,fail=("I jumped off the garage and missed the trampoline.",{"health":-16,"happy":-8})),
  C("Decline","I declined the dare and kept my bones.",{"smarts":4}),
  C("Push a friend","I pushed my friend off the garage. I got grounded for a year.",{"karma":-16}),
  C("Call the dare dumb","I told everyone the dare was dumb and was proven right.",{"smarts":8,"happy":-4})]),
 E("mailbox_mischief","childhood",(8,17),1.2,"Mailbox Mischief","Some friends want to smash mailboxes with a baseball bat.",[
  C("Join in","I smashed a mailbox with a bat and a neighbor chased me for half a mile.",{"karma":-16,"happy":8,"crazy":8},chain=("neighbor_complaint",1,2)),
  C("Keep watch","I kept watch while my friends smashed mailboxes and was equally guilty.",{"karma":-8}),
  C("Leave","I left and watched a movie instead.",{"karma":4})]),
 E("neighbor_complaint","childhood",(8,19),1,"Neighbor Complaint","A neighbor knocks on your door and points at you. Your parents are not happy.",[
  C("Confess","I confessed and apologized. I was grounded for a month.",{"karma":8,"happy":-8}),
  C("Deny everything","I denied everything with a poker face. The neighbor left unconvinced.",{"karma":-8,"stress":4}),
  C("Blame a friend","I blamed my friend, which ended that friendship.",{"karma":-16,"rel_friend":-30})],chain_only=True),
]
