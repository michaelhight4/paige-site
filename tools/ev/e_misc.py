from . import C, E
B = {"biz": 1}
EVENTS = [
 # ---- crime / prison ----
 E("shoplift_dare","crime",(8,25),1.2,"Shoplifting Dare","A friend dares you to steal a candy bar from the corner store.",[
  C("Do it","I stole a candy bar and got away with it. It was not that good.",{"karma":-16,"happy":8},p=0.65,fail=("I tried to steal a candy bar and was caught by the owner.",{"karma":-16,"happy":-16}),crime="shoplift"),
  C("Refuse","I refused the dare and bought the candy bar.",{"karma":8}),
  C("Pay for it","I bought candy for everyone.",{"money":-5,"rel_friend":8})]),
 E("witnessed_crime","crime",(14,99),1,"Witness","You witness a robbery at a convenience store.",[
  C("Call the police","I called the police and was a very good witness.",{"karma":16,"stress":8}),
  C("Intervene","I intervened and was hit with a bag of chips.",{"karma":30,"fame":8,"health":-8},p=0.5,fail=("I intervened and got stabbed with a spork.",{"health":-16})),
  C("Hide","I hid behind the freezer until it was over.",{"karma":-4,"stress":8}),
  C("Take a photo","I took a photo of the robbery for social media.",{"karma":-8,"fame":4})]),
 E("jaywalk","crime",(16,99),1.2,"Cops Nearby","A police officer stops you for something minor.",[
  C("Cooperate","I cooperated and got a warning.",{"karma":4}),
  C("Run","I ran from the officer and was caught within ninety seconds.",{"karma":-16,"stress":16},crime="resist"),
  C("Argue","I argued with the officer about my rights. I was wrong.",{"karma":-8,"money":-150}),
  C("Offer a bribe ($300)","I offered a bribe. It was accepted.",{"karma":-16,"money":-300},req=300)]),
 E("drug_offer","crime",(14,99),1.3,"Drug Offer","A stranger at a party offers you something illegal.",[
  C("Take it","I tried the drug and spent four hours staring at a lamp.",{"happy":8,"health":-16,"smarts":-8,"karma":-8},flag="drugs"),
  C("Decline","I declined and went home early.",{"karma":8}),
  C("Call the police","I called the cops and the party ended abruptly.",{"karma":8,"rel_friend":-8}),
  C("Sell it","I sold what the stranger gave me and made $300.",{"money":300,"karma":-16},crime="drugs")]),
 E("graffiti","crime",(10,25),1,"Graffiti","Your friends are painting a wall at night and ask you to join.",[
  C("Paint something good","I painted a wall with flair and nobody caught me.",{"looks":4,"karma":-8,"happy":8},p=0.7,fail=("I was caught with a spray can.",{"karma":-16,"happy":-8,"money":-200})),
  C("Watch","I watched my friends paint a wall and critiqued them.",{"karma":-4}),
  C("Leave","I left them to it and went to bed.",{"karma":4})]),
 E("car_theft_tempt","crime",(14,40),0.8,"Unlocked Car","A fancy car sits unlocked with the keys inside.",[
  C("Take it for a joyride","I took the car for a joyride. A cop was waiting at the end.",{"happy":16,"karma":-30},p=0.4,fail=("I stole a car and crashed it into a hedge.",{"karma":-30,"health":-8,"happy":-16}),crime="gta"),
  C("Leave a note","I left a note telling the owner to lock his car.",{"karma":8}),
  C("Walk away","I walked away from the car.",{"karma":4})]),
 E("bar_fight","crime",(18,60),1.2,"Bar Fight","A drunk stranger shoves you at a bar.",[
  C("Fight","I fought a stranger in a bar and ended up with a black eye.",{"health":-8,"karma":-8,"happy":4},p=0.5,fail=("I fought a stranger in a bar and was knocked out.",{"health":-16,"looks":-8}),crime="assault"),
  C("Walk away","I walked away from the bar fight.",{"karma":8}),
  C("Buy him a drink ($10)","I bought him a drink and we became friends.",{"money":-10,"karma":8,"rel_friend":8}),
  C("Call security","I called security and got the stranger removed.",{"karma":4})]),
 E("dui_choice","crime",(18,99),1,"Last Call","You've had a few drinks and the car is parked outside.",[
  C("Take a taxi ($40)","I took a taxi home and felt responsible.",{"money":-40,"karma":8}),
  C("Drive anyway","I drove home drunk and made it, somehow.",{"karma":-16,"health":-4},p=0.7,fail=("I was pulled over for drunk driving.",{"karma":-16,"money":-2000,"stress":16}),crime="dui"),
  C("Sleep in the car","I slept in the car in the parking lot.",{"health":-4})],cond={"flag":"drinker"}),
 E("prison_fight","prison",(14,99),3,"Yard Fight","A fellow inmate challenges you in the yard.",[
  C("Fight","I fought an inmate in the yard and earned some respect.",{"health":-8,"karma":-8,"stress":8},p=0.5,fail=("I fought an inmate and got beaten up by his friends.",{"health":-16}),prisonbehavior=-1),
  C("Back down","I backed down and ate lunch alone.",{"happy":-8}),
  C("Alert a guard","I told a guard and became a snitch.",{"karma":4,"rel_coworker":-8,"stress":16})],cond={"prison":1}),
 E("prison_riot","prison",(14,99),1.5,"Riot","A riot breaks out in the cell block.",[
  C("Join the riot","I joined the riot and spent a month in solitary.",{"karma":-8,"health":-8,"crazy":8},prisonbehavior=-1,addyears=1),
  C("Hide in your cell","I hid in my cell and ate crackers.",{"stress":8}),
  C("Help the guards","I helped the guards and earned a gold star.",{"karma":8},prisonbehavior=1)],cond={"prison":1}),
 E("prison_job","prison",(14,99),3,"Prison Job","The warden offers you a job in the kitchen.",[
  C("Accept","I worked in the prison kitchen and learned to make a very good mush.",{"karma":8,"smarts":4},prisonbehavior=1),
  C("Decline","I declined the job and stared at a wall.",{"happy":-4})],cond={"prison":1}),
 E("prison_library","prison",(14,99),3,"Prison Library","There is a small library at the prison.",[
  C("Read books","I read every book in the prison library, twice.",{"smarts":16,"happy":4},prisonbehavior=1),
  C("Join a gang","I joined a gang because they had a cooler jacket.",{"karma":-16,"stress":16,"health":-8},prisonbehavior=-1),
  C("Exercise in the yard","I exercised in the yard and became extremely strong.",{"health":16,"looks":4})],cond={"prison":1}),
 E("prison_visit","prison",(14,99),2.5,"Visitor","A visitor arrives at the prison.",[
  C("Talk with them","I talked with my visitor through a window for an hour.",{"happy":16,"stress":-8}),
  C("Refuse the visit","I refused the visitor and looked at the floor.",{"happy":-8})],cond={"prison":1}),
 # ---- travel ----
 E("vacation_beach","travel",(8,99),2,"Beach Vacation","You get the chance to take a vacation at the beach ($1,500).",[
  C("Go","I went to the beach and got a sunburn in a perfect rectangle.",{"happy":16,"stress":-16,"money":-1500,"looks":-4},req=1500),
  C("Stay home","I stayed home and watched beach videos.",{"happy":-4}),
  C("Camp in the backyard","I camped in the backyard and made s'mores.",{"happy":8,"money":-30})],cond={"minCash":1500}),
 E("vacation_city","travel",(14,99),1.5,"City Break","A friend suggests a weekend in a big city.",[
  C("Go ($800)","I went on a city break and spent too much on pastries.",{"money":-800,"happy":16,"smarts":4},req=800),
  C("Plan a budget trip ($200)","I planned a budget trip and slept on a stranger's couch.",{"money":-200,"happy":8,"smarts":4}),
  C("Stay home","I stayed home and saved money.",{"stress":4})],cond={"minCash":300}),
 E("lost_passport","travel",(14,99),1,"Lost Passport","You lose your passport abroad.",[
  C("Go to the embassy","I spent two days at the embassy and got a new passport.",{"stress":8,"money":-150}),
  C("Panic","I panicked in a foreign language.",{"stress":16,"happy":-8}),
  C("Stay forever","I decided to live abroad as a local.",{"happy":8,"crazy":8})],cond={"minCash":150}),
 E("hiking","travel",(10,70),1.5,"Mountain Hike","A friend wants to hike a mountain.",[
  C("Hike all the way","I hiked all the way to the summit and ate a squished sandwich.",{"health":16,"happy":16}),
  C("Turn back halfway","I turned back halfway and took pictures of a squirrel.",{"health":4,"happy":4}),
  C("Take a cable car ($20)","I took a cable car and judged the hikers.",{"money":-20,"happy":8}),
  C("Get lost","I got lost on the mountain and was found by a goat farmer.",{"health":-8,"happy":-4,"stress":16})]),
 E("foreign_food","travel",(10,99),1.2,"Street Food","A street vendor offers a suspicious-looking snack.",[
  C("Eat it","I ate the snack and it was the best thing I've ever eaten.",{"happy":16}),
  C("Eat it and regret it","I ate the snack and spent the evening in the bathroom.",{"health":-8,"happy":-4}),
  C("Decline","I declined and ate crackers.",{"happy":-4})]),
 # ---- business (need an owned business) ----
 E("poach","business",(18,90),1.5,"Rival Poaching Staff","A competitor is courting your best people.",[
  C("Counter with raises ($5,000)","I gave my staff raises and they stayed, mostly.",{"money":-5000,"bizrep":4},req=5000),
  C("Let them go","I let my best people walk out with their desk plants.",{"bizrep":-8})],cond=B),
 E("review","business",(18,90),1.5,"Viral Customer Review","A popular reviewer visits your business.",[
  C("Roll out the red carpet","I rolled out the red carpet and got a glowing review.",{"bizrep":8},p=0.7,fail=("I rolled out the red carpet and the reviewer found a hair in the soup.",{"bizrep":-8})),
  C("Business as usual","I treated the reviewer like any other customer.",{"bizrep":4})],cond=B),
 E("lawsuit","business",(18,90),1.2,"Lawsuit","A nuisance lawsuit lands on your desk.",[
  C("Settle ($15,000)","I settled the lawsuit and wrote a check with a sigh.",{"money":-15000},req=15000),
  C("Fight it","I fought the lawsuit and spent two years in meetings.",{"money":-2000,"happy":-4},p=0.5,fail=("I lost the lawsuit and was ordered to pay.",{"money":-40000,"bizrep":-8}))],cond=B),
 E("biz_inspection","business",(18,90),1.2,"Inspection","An inspector shows up unannounced at your business.",[
  C("Welcome them","I welcomed the inspector with coffee and passed with flying colors.",{"bizrep":8},p=0.6,fail=("I welcomed the inspector with coffee and he found a mouse.",{"bizrep":-8,"money":-2000})),
  C("Bribe them ($3,000)","I bribed the inspector. It worked, to my surprise.",{"money":-3000,"karma":-16},req=3000),
  C("Stall","I stalled and the inspector came back with a friend.",{"stress":8,"bizrep":-4})],cond=B),
 E("biz_award","business",(18,90),0.8,"Industry Award","Your business is nominated for an award.",[
  C("Attend the ceremony","I attended the ceremony in a rented tuxedo and won.",{"bizrep":16,"fame":8,"happy":8},p=0.4,fail=("I attended the ceremony and lost to a competitor with better lighting.",{"happy":-8,"bizrep":4})),
  C("Send an employee","I sent an employee, who gave a better speech than I would.",{"bizrep":4})],cond=B),
 E("biz_theft","business",(18,90),1,"Employee Theft","You suspect an employee is stealing from the till.",[
  C("Fire them","I fired the employee and he took the stapler.",{"bizrep":-4,"karma":4}),
  C("Set a trap","I set a trap with marked bills and caught him.",{"smarts":8,"karma":4}),
  C("Ignore it","I ignored it and the till kept getting lighter.",{"money":-3000})],cond=B),
 E("biz_boom","business",(18,90),1,"Viral Moment","Your business goes viral for a silly reason.",[
  C("Embrace it","I embraced the viral moment and sold out of everything.",{"bizrep":16,"fame":8,"money":4000}),
  C("Ignore it","I ignored the internet and it ignored me back.",{"bizrep":4}),
  C("Overcharge","I raised prices and the internet got mad.",{"bizrep":-8,"money":6000})],cond=B),
 E("biz_partner","business",(21,80),0.8,"Investor Offer","An investor offers you cash for a stake in your business.",[
  C("Take the cash ($20,000)","I took the investor's money and gave up some control.",{"money":20000,"stress":4,"bizrep":4}),
  C("Decline","I declined and kept my pride.",{"happy":4}),
  C("Counter for more","I countered and the investor walked away.",{"stress":4})],cond=B),
 E("biz_burnout","business",(21,90),1,"Burnout","Running a business is wearing you out.",[
  C("Take a vacation","I took a vacation and came back refreshed.",{"stress":-16,"happy":8,"bizrep":-4}),
  C("Push through","I pushed through and drank a lot of coffee.",{"health":-8,"stress":16,"bizrep":4}),
  C("Hire a manager ($8,000)","I hired a manager and let go of a lot of tasks.",{"money":-8000,"stress":-16},req=8000)],cond=B),
 E("biz_hire_star","business",(21,90),1,"Star Applicant","A talented applicant wants to join your business.",[
  C("Hire at a premium ($6,000)","I hired the star applicant and my team stepped up.",{"money":-6000,"bizrep":8},req=6000),
  C("Offer standard pay","I offered standard pay and they went to a competitor.",{"bizrep":-4}),
  C("Decline","I declined the applicant and felt smart.",{})],cond=B),
 # ---- old age ----
 E("senior_discount","oldage",(60,120),1.5,"Senior Discount","The cashier asks if you want a senior discount.",[
  C("Accept","I accepted a senior discount and felt old.",{"happy":-4,"money":30}),
  C("Decline","I declined the discount and my pride stayed intact.",{"happy":4}),
  C("Argue that you look young","I argued that I looked young and the cashier agreed out of fear.",{"looks":4,"happy":4})]),
 E("grandkid_visit","oldage",(50,120),1.5,"Grandchildren","Your grandchildren come to visit.",[
  C("Play with them","I played with my grandchildren until my back gave out.",{"happy":16,"health":-4,"rel_child":8}),
  C("Give them candy","I gave my grandchildren candy and my children glared.",{"happy":16,"rel_child":-4}),
  C("Tell them stories","I told my grandchildren stories, some even true.",{"happy":8,"smarts":4})],cond={"kids":1}),
 E("hip_trouble","oldage",(60,120),1.5,"Joint Trouble","Your hip hurts.",[
  C("Surgery ($12,000)","I had hip surgery and walk with a skip now.",{"money":-12000,"health":8},req=12000),
  C("Pain meds","I took pain meds and gritted my teeth.",{"health":-4,"happy":-4}),
  C("Physical therapy ($1,500)","I did physical therapy and my therapist was a tyrant.",{"money":-1500,"health":4},req=1500),
  C("Ignore it","I ignored it and limped on.",{"health":-8})]),
 E("old_friend_dies","oldage",(55,120),1.5,"Funeral","An old friend has passed away.",[
  C("Attend the funeral","I attended the funeral and told a story that got a laugh.",{"happy":-8,"karma":8}),
  C("Send flowers","I sent flowers and a card.",{"happy":-4}),
  C("Skip it","I skipped the funeral and sat in the garden.",{"happy":-16,"karma":-4})],cond={"friends":1}),
 E("retirement_hobby","oldage",(60,120),1.5,"New Hobby","You have lots of free time and consider a hobby.",[
  C("Take up painting","I took up painting. My cat looks like a loaf.",{"happy":16,"smarts":4}),
  C("Take up gardening","I took up gardening and grew a very serious tomato.",{"happy":8,"health":4}),
  C("Take up skydiving","I went skydiving at 70 and screamed the whole way.",{"happy":16,"health":-8,"fame":4}),
  C("Take up napping","I took up napping professionally.",{"health":4})]),
 E("memory_lapse","oldage",(65,120),1.5,"Memory Lapse","You can't remember where you left your keys.",[
  C("Do crossword puzzles","I started doing crosswords daily and kept my brain sharp.",{"smarts":8}),
  C("Laugh it off","I laughed it off. The keys were in the fridge.",{"happy":4}),
  C("Worry","I worried about my memory all week.",{"stress":8,"happy":-4})]),
 E("age_scam","oldage",(60,120),1,"Phone Scam","A voice on the phone says your grandson is in trouble and needs bail money.",[
  C("Send the money ($2,000)","I sent $2,000 to a stranger. My grandson was at the mall.",{"money":-2000,"happy":-16,"smarts":-4}),
  C("Call your grandson","I called my grandson, who was fine.",{"smarts":4}),
  C("Hang up","I hung up and told the neighbors.",{"smarts":8})],cond={"kids":1}),
 # ---- fame ----
 E("viral_video","fame",(10,99),1.5,"Viral Video","A video of you doing something embarrassing goes viral.",[
  C("Embrace it","I embraced my viral video and gave interviews about it.",{"fame":16,"happy":8}),
  C("Hide","I hid in my house for a week.",{"happy":-8,"stress":8}),
  C("Sue the uploader","I sued the uploader and lost.",{"money":-1500,"fame":4}),
  C("Monetize it","I monetized the video and made $400.",{"money":400,"fame":8})]),
 E("talent_scout","fame",(10,30),1,"Talent Scout","A talent scout approaches you.",[
  C("Take the card","I took the scout's card and went to an audition.",{"fame":8,"happy":8,"smarts":4},p=0.5,fail=("I went to the audition and was told to go home.",{"happy":-8})),
  C("Decline","I declined and wondered about it for years.",{}),
  C("Ask for money","I asked the scout for money and they left.",{"karma":-4})],cond={"minLooks":50},once=True),
 E("local_news","fame",(10,99),1,"Local News","A local news crew wants to interview you about something you did.",[
  C("Give an interview","I gave an interview and said 'um' eleven times.",{"fame":8,"happy":4}),
  C("Decline","I declined and watched the story without me.",{}),
  C("Make things up","I made things up and became a local legend.",{"fame":16,"karma":-8})]),
 E("paparazzi","fame",(18,99),1,"Paparazzi","A photographer follows you everywhere.",[
  C("Pose","I posed for the photographer and made the front page.",{"fame":8,"happy":4}),
  C("Run","I ran from the photographer and tripped on a curb.",{"health":-4,"fame":4}),
  C("Punch him","I punched the photographer and made headlines for the wrong reasons.",{"karma":-16,"fame":16,"money":-1000})],cond={"minFame":40}),
 # ---- random / news ----
 E("news_weird","random",(5,120),2,"Weird News","You read a strange news story.",[
  C("Read it","I read a news story about a man who married a houseplant.",{"smarts":4}),
  C("Skip it","I skipped the news and watched cartoons.",{"happy":4})]),
 E("rain_day","random",(3,120),1.5,"Rainy Day","It's pouring outside and you have nothing to do.",[
  C("Read a book","I read a book on a rainy afternoon.",{"smarts":8}),
  C("Dance in the rain","I danced in the rain and got a cold.",{"happy":8,"health":-4}),
  C("Nap","I napped for six hours.",{"health":4,"happy":4}),
  C("Binge a show","I binged an entire series and forgot my name.",{"happy":8,"health":-4})]),
 E("found_money","random",(5,120),1.5,"Found Cash","You find some cash on the ground.",[
  C("Keep it","I kept $20 and bought a sandwich.",{"money":20,"karma":-4}),
  C("Turn it in","I turned the money in to the police, who looked confused.",{"karma":8}),
  C("Donate it","I gave the cash to a person in need.",{"karma":16,"happy":4})]),
 E("stray_dog","random",(5,120),1.5,"Stray Dog","A stray dog follows you home.",[
  C("Adopt it","I adopted the dog and named him Gerald.",{"happy":16,"karma":8,"money":-200}),
  C("Feed it","I fed the dog and he left a stick on my porch.",{"karma":8,"happy":4}),
  C("Shoo it away","I shooed the dog away and it looked at me with sad eyes.",{"karma":-8})]),
 E("traffic_jam","random",(16,120),1.5,"Traffic Jam","You're stuck in traffic for an hour.",[
  C("Listen to music","I listened to music and sang at a stranger.",{"happy":4}),
  C("Honk","I honked at the car in front, which did nothing.",{"stress":8,"karma":-4}),
  C("Meditate","I meditated in traffic and reached nirvana for ten seconds.",{"stress":-8})],cond={"anyCar":1}),
 E("lost_wallet","random",(10,120),1,"Lost Wallet","You realize you left your wallet somewhere.",[
  C("Retrace your steps","I retraced my steps and found it behind a bench.",{"stress":4,"smarts":4}),
  C("Cancel cards","I canceled my cards and waited two weeks for new ones.",{"stress":8,"money":-30}),
  C("Panic","I panicked in public and a stranger offered me a muffin.",{"stress":16,"happy":-4})]),
 E("new_neighbor","random",(18,100),1.2,"New Neighbors","New neighbors move in next door.",[
  C("Bring cookies","I brought cookies and made a friend.",{"happy":8,"rel_friend":8},newperson="friend"),
  C("Ignore them","I ignored the neighbors and so did they.",{}),
  C("Complain about noise","I complained about the noise before they even unpacked.",{"karma":-8})]),
 E("pet_ransom","random",(18,99),0.6,"Pet Ransom","Someone calls saying they have your pet and want money.",[
  C("Pay ($2,000)","I paid the ransom and my pet was in the next room.",{"money":-2000,"happy":-16},req=2000),
  C("Call the police","I called the police and it was a prank.",{"smarts":4}),
  C("Check on your pet","I checked and my pet was asleep on the sofa.",{"smarts":8})],cond={"flag":"pet"}),
 E("book_club","random",(18,99),1,"Book Club","A neighbor invites you to a book club.",[
  C("Join","I joined a book club and read half a book.",{"smarts":8,"happy":4}),
  C("Decline","I declined and re-read my favorite comic.",{}),
  C("Start your own","I started my own book club with two members.",{"smarts":8,"fame":4})]),
 E("sports_injury","random",(8,60),1.5,"Pickup Game","Your friends ask you to join a pickup game.",[
  C("Play hard","I played hard and scored a basket I'll talk about for years.",{"happy":16,"health":4}),
  C("Play and get hurt","I played and tore a muscle I didn't know I had.",{"health":-16,"happy":-8}),
  C("Watch from the bench","I watched from the bench with a juice box.",{"happy":-4})]),
 E("wrong_number","random",(14,99),1,"Wrong Number","A stranger texts you by mistake and starts chatting.",[
  C("Chat","I chatted with the stranger and learned about her cat.",{"happy":8}),
  C("Block","I blocked the number and went to bed.",{}),
  C("Pretend to be the person","I pretended to be the person they were looking for. It got complicated.",{"karma":-8,"crazy":8})]),
 E("charity_drive","random",(14,99),1.5,"Charity Drive","A volunteer asks for a donation.",[
  C("Donate $50","I donated $50 and got a sticker.",{"money":-50,"karma":16}),
  C("Volunteer","I volunteered at the charity and carried many boxes.",{"karma":30,"happy":8,"health":-4}),
  C("Say no","I said I was in a hurry and was not.",{"karma":-4})]),
]
