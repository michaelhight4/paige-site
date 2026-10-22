from . import C, E
S = {"school": "primary"}
EVENTS = [
 E("school_dance","school",(11,18),2,"School Dance","There is a dance at school this Friday.",[
  C("Dance with everyone","I danced with everyone at the dance and broke a sweat.",{"happy":16,"looks":4}),
  C("Ask someone special","I asked someone special to dance. They said yes.",{"happy":16},p=0.5,fail=("I asked someone to dance and they laughed.",{"happy":-16})),
  C("Stand by the wall","I stood by the wall eating cupcakes.",{"happy":-4}),
  C("Skip it","I skipped the dance and played video games.",{"smarts":4})]),
 E("sneeze","school",(6,18),1.5,"Sneeze","You feel a sneeze coming on in the middle of a quiet test.",[
  C("Muffle it","I muffled the sneeze into my elbow. A hero.",{"happy":4}),
  C("Let it rip","I let a sneeze rip and the whole class said bless you.",{"happy":-4}),
  C("Blame a classmate","I pretended the classmate beside me sneezed.",{"karma":-4}),
  C("Hold it in","I held the sneeze in and my ears rang for an hour.",{"health":-4})]),
 E("potty_flavors","school",(12,18),1,"Potty Flavors","Your classmate says there is an unusual flavor of chip in the vending machine.",[
  C("Try it","I tried the chip. It was exactly as unusual as promised.",{"health":-4,"happy":4}),
  C("Pass","I passed on the chip and read a book.",{"smarts":4}),
  C("Dare a friend to try it","I dared a friend to try it and filmed the results.",{"karma":-4,"happy":8})]),
 E("pranksters","school",(11,18),1.5,"Pranksters","Some kids are planning to put a whoopee cushion on the teacher's chair.",[
  C("Join them","I helped place a whoopee cushion and the teacher sat on it. It was glorious.",{"happy":16,"karma":-8},chain=("principal_office",1,1)),
  C("Warn the teacher","I warned the teacher and became unpopular.",{"karma":8,"happy":-8}),
  C("Do nothing","I watched from my desk, innocent in body but not in spirit.",{"happy":4})]),
 E("principal_office","school",(11,19),1,"Principal's Office","You've been called to the principal's office.",[
  C("Take the blame","I took the blame and got detention without a word.",{"karma":8,"happy":-8}),
  C("Name names","I named names and lost several friends.",{"karma":-8,"rel_friend":-16}),
  C("Talk your way out","I talked my way out of it with an unnecessary level of charm.",{"smarts":8},p=0.5,fail=("I tried to talk my way out and got two weeks of detention.",{"happy":-8}))],chain_only=True),
 E("casting_call","school",(6,18),1.5,"Casting Call","Your school is holding auditions for the play.",[
  C("Audition for the lead","I auditioned for the lead and gave a performance people still discuss.",{"smarts":4,"happy":8,"fame":4},p=0.4,fail=("I auditioned for the lead and forgot my lines.",{"happy":-8})),
  C("Audition for a small part","I auditioned for a tree and got the part.",{"happy":8}),
  C("Work backstage","I worked backstage and pulled a curtain at the right time.",{"smarts":8}),
  C("Skip it","I skipped the play and napped.",{"health":4})]),
 E("answer_key","school",(11,18),1.5,"Answer Key","You find the answer key to tomorrow's big exam on the teacher's desk.",[
  C("Memorize it","I memorized the answer key and aced the test. The guilt did not fade.",{"smarts":-8,"karma":-16},p=0.7,fail=("I got caught with the answer key and was suspended.",{"smarts":-4,"karma":-8,"happy":-16})),
  C("Tell the teacher","I told the teacher about the answer key and she thanked me.",{"karma":16,"smarts":4}),
  C("Study honestly","I ignored the answer key and studied.",{"smarts":16})],once=True),
 E("pep_rally","school",(12,18),1.5,"Pep Rally","The school holds a pep rally before the big game.",[
  C("Cheer loudly","I cheered so loudly I lost my voice for a day.",{"happy":8}),
  C("Wear face paint","I wore face paint in school colors and looked like an extremely proud raccoon.",{"happy":8,"looks":-4}),
  C("Skip it","I hid in the library during the rally.",{"smarts":8,"happy":-4})]),
 E("bully_hallway","school",(12,18),2,"Hallway Bully","A bully shoves you into a locker in front of the whole hallway.",[
  C("Fight back","I fought back and got suspended for three days.",{"happy":8,"karma":-8,"health":-4},p=0.5,fail=("I fought back and lost badly.",{"health":-16,"happy":-8})),
  C("Report it","I reported the bully and the school did exactly nothing.",{"happy":-4,"smarts":4}),
  C("Laugh it off","I laughed it off and made the hallway laugh with me.",{"happy":4,"fame":4}),
  C("Cry in the bathroom","I cried in the bathroom for most of third period.",{"happy":-16,"stress":8})]),
 E("cafeteria_mystery","school",(6,18),1.5,"Cafeteria Mystery","The cafeteria is serving a gray substance called Surprise.",[
  C("Eat it","I ate the Surprise. It was a surprise.",{"health":-8}),
  C("Trade it","I traded my Surprise for a brownie and made a friend.",{"happy":8,"rel_friend":8}),
  C("Go hungry","I went hungry with my head held high.",{"happy":-4}),
  C("Throw it","I threw the Surprise and it stuck to the ceiling.",{"karma":-8,"fame":4})]),
 E("study_group","school",(11,18),1.5,"Study Group","Some classmates ask if you want to join a study group.",[
  C("Join them","I joined a study group and actually studied.",{"smarts":16,"rel_friend":8}),
  C("Join and goof off","I joined a study group and accomplished nothing but snacks.",{"happy":8,"smarts":-4}),
  C("Study alone","I studied alone with disciplined misery.",{"smarts":8,"happy":-4}),
  C("Decline","I declined and played video games.",{"happy":4,"smarts":-4})]),
 E("science_fair","school",(8,18),1.5,"Science Fair","The school science fair is coming up.",[
  C("Build a volcano","I built a volcano. It was the sixth volcano and the best one.",{"smarts":8},p=0.5,fail=("My volcano set the display on fire.",{"happy":-8,"karma":-4})),
  C("Do a real experiment","I ran a real experiment and came in third.",{"smarts":16,"happy":4}),
  C("Buy a project","I bought a project online and put my name on it.",{"karma":-16,"smarts":-4}),
  C("Skip it","I skipped the fair and watched TV.",{"smarts":-4})]),
 E("detention_dare","school",(12,18),1.2,"Detention","You are stuck in detention with a bored delinquent who has a plan.",[
  C("Go along with it","I snuck out of detention with a bad influence and learned a lot.",{"karma":-8,"happy":8,"crazy":8}),
  C("Do your homework","I did my homework in detention like a prisoner of conscience.",{"smarts":8}),
  C("Nap","I napped through detention with the dignity of a sloth.",{"health":4})]),
 E("juul_offer","school",(14,18),1.5,"Vape Offer","A kid behind the gym offers you a vape.",[
  C("Take a hit","I took a hit of a vape. I coughed for ten minutes.",{"health":-8,"smarts":-4,"karma":-4},flag="smoker"),
  C("Decline","I said no thanks and walked away.",{"smarts":4}),
  C("Report him","I reported the kid and he is now my enemy.",{"karma":8,"rel_friend":-8}),
  C("Give a lecture","I lectured the kid on lung health and he walked away bored.",{"smarts":8,"happy":-4})]),
 E("homework_dog","school",(7,17),1.2,"Homework Disaster","You realize your homework is due in ten minutes and you haven't started.",[
  C("Do it quickly","I did my homework in ten minutes and got a B-.",{"smarts":4,"stress":8}),
  C("Say the dog ate it","I told my teacher the dog ate my homework. I have no dog.",{"karma":-8,"smarts":-4}),
  C("Copy a friend","I copied a friend's homework and made the same mistake he did.",{"karma":-8,"smarts":-4}),
  C("Take the zero","I took the zero and went outside.",{"smarts":-8,"happy":4})]),
 E("class_clown","school",(8,18),1.5,"Class Clown","The teacher turns away and the class is waiting for you to do something funny.",[
  C("Do an impression","I did an impression of the teacher. She was not amused.",{"happy":16,"fame":4,"smarts":-4}),
  C("Stay quiet","I stayed quiet and took the dignified route.",{"smarts":4}),
  C("Fall off your chair","I fell off my chair on purpose and the class applauded.",{"happy":8,"health":-4}),
  C("Throw a paper airplane","I threw a paper airplane that hit the principal.",{"karma":-8,"fame":4},chain=("principal_office",1,1))]),
 E("school_trip","school",(7,17),1.5,"Field Trip","Your class is going on a field trip to a museum.",[
  C("Pay attention","I paid attention at the museum and learned about fossils.",{"smarts":16}),
  C("Get lost on purpose","I got lost on purpose in the gift shop.",{"happy":8,"karma":-4}),
  C("Touch the exhibits","I touched an exhibit I wasn't supposed to and set off an alarm.",{"karma":-8,"happy":4}),
  C("Sit on the bus","I stayed on the bus and read comics.",{"happy":4})]),
 E("graduation_speech","school",(17,18),1.5,"Graduation Speech","You've been asked to give a speech at your high school graduation.",[
  C("Give it your best","I gave an inspiring graduation speech and cried at the end.",{"happy":16,"fame":4,"smarts":4},cond_hint=1),
  C("Make it funny","I gave a joke speech that got a standing ovation and a call from the principal.",{"happy":8,"fame":4}),
  C("Decline","I declined and watched from the crowd.",{"happy":-4}),
  C("Read the dictionary","I read dictionary definitions for nine minutes. Nobody knew why.",{"crazy":8,"fame":4})],once=True,cond={"school":"high"}),
 E("exam_panic","school",(13,22),1.5,"Exam Panic","Tomorrow is the biggest exam of the year, and you are not ready.",[
  C("Pull an all-nighter","I stayed up all night studying and passed on pure adrenaline.",{"smarts":8,"health":-8,"stress":8}),
  C("Get a good night's sleep","I got eight hours of sleep and did fine.",{"smarts":4,"health":4}),
  C("Cheat","I cheated on the exam with a very small piece of paper.",{"karma":-16,"smarts":-4},p=0.6,fail=("I got caught cheating and failed the course.",{"smarts":-8,"happy":-16,"karma":-8})),
  C("Skip it","I skipped the exam and tried not to think about it.",{"smarts":-16,"stress":-4})]),
 E("clique","school",(12,18),1.5,"Cliques","A popular group invites you to sit with them at lunch.",[
  C("Join them","I joined the popular table and learned their secret handshake.",{"happy":8,"fame":4,"karma":-4}),
  C("Stay with your friends","I stayed with my friends and ate in peace.",{"karma":8,"rel_friend":8}),
  C("Mock them","I mocked the popular kids to their faces and they laughed, which was worse.",{"happy":-4,"karma":-4}),
  C("Sit alone","I ate alone and counted the tiles on the floor.",{"happy":-8})]),
]
