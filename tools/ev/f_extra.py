from . import C, E
EVENTS = [
 E("school_tryout","school",(6,18),1.8,"Team Tryouts","Tryouts for the school team are today.",[
  C("Give it everything","I gave tryouts everything I had and threw up behind the gym.",{"health":4,"happy":8},p=0.5,fail=("I gave tryouts everything and still got cut.",{"happy":-16}),joinsport=True),
  C("Bring snacks for the coach","I bribed the coach with snacks and he wrote my name down.",{"karma":-4},joinsport=True),
  C("Skip them","I skipped tryouts and spent the afternoon on the swing set.",{})],cond={"school":"any","nosport":1}),
 E("big_game","school",(8,22),2,"Big Game","It's the final seconds of a close game and the ball is yours.",[
  C("Take the shot","I took the last-second shot and it went in. The gym exploded.",{"happy":16,"fame":8},p=0.45,fail=("I took the last-second shot and missed by a mile.",{"happy":-16}),sportxp=8),
  C("Pass it","I passed the ball to a teammate who scored. I was a team player.",{"karma":8,"happy":4},sportxp=4),
  C("Fake an injury","I faked an injury and was carried off. People clapped.",{"karma":-8,"fame":4})],cond={"sport":1}),
 E("coach_screams","school",(8,22),1.5,"Coach's Rant","Your coach screams at you for a mistake.",[
  C("Take it in stride","I took the coach's rant in stride and ran extra laps.",{"health":4,"stress":4},sportxp=4),
  C("Yell back","I yelled back at my coach and was benched.",{"karma":-8,"happy":4}),
  C("Quit the team","I quit the team and cried on the bus.",{"happy":-16},quitsport=True)],cond={"sport":1}),
 E("sports_scholarship","school",(16,18),3,"Scouts in the Stands","A college scout is in the stands watching your games.",[
  C("Play your best","I played my best in front of the scout and got an offer.",{"happy":16,"fame":8},sportxp=8),
  C("Showboat","I showboated for the scout and he took notes.",{"fame":8,"karma":-4},sportxp=4),
  C("Ignore him","I ignored the scout and played my usual game.",{})],cond={"sport":1,"school":"high"},once=True),
 E("adopt_pet","random",(5,99),1.5,"Pet Shelter","You visit an animal shelter.",[
  C("Adopt a cat ($100)","I adopted a cat that judges me professionally.",{"happy":16,"money":-100},flag="pet"),
  C("Adopt a dog ($100)","I adopted a dog who loves me unconditionally and my shoes conditionally.",{"happy":16,"money":-100,"health":4},flag="pet"),
  C("Just look","I looked at the animals and left feeling nostalgic.",{"happy":4})],cond={"noflag":"pet"}),
 E("pet_misbehaves","random",(6,99),1.5,"Pet Behavior","Your pet knocks over a lamp.",[
  C("Scold it","I scolded my pet and it looked at me with pure indifference.",{"happy":-4}),
  C("Laugh","I laughed so hard I cried and the lamp stayed broken.",{"happy":8}),
  C("Clean up","I cleaned up the mess and was ashamed of my dust.",{"karma":4}),
  C("Buy a new lamp ($40)","I bought a new lamp and my pet broke that too.",{"money":-40})],cond={"flag":"pet"}),
 E("addiction_craving","health",(16,99),1.2,"Craving","The urge for a cigarette hits you hard.",[
  C("Light up","I smoked a cigarette and it tasted like regret.",{"health":-8,"stress":-8},flag="smoker"),
  C("Chew gum","I chewed gum until my jaw hurt.",{"stress":4}),
  C("Quit for good","I quit smoking for good, or until Tuesday.",{"health":8,"stress":8},unflag="smoker")],cond={"flag":"smoker"}),
 E("rehab_offer","health",(18,99),1.2,"Intervention","Your friends stage an intervention about your habits.",[
  C("Go to rehab ($5,000)","I went to rehab and made friends with a very sad clown.",{"money":-5000,"health":16,"happy":8,"karma":8},req=5000,unflag="drugs"),
  C("Storm out","I stormed out and slammed a door that wasn't mine.",{"rel_friend":-16,"stress":8}),
  C("Promise to quit","I promised to quit. I even meant it.",{"karma":4})],cond={"flag":"drugs"}),
 E("war_news","random",(10,120),0.8,"Conflict Nearby","There is fighting along the border of your country.",[
  C("Stay put","I stayed put and kept a bag by the door.",{"stress":16,"happy":-8}),
  C("Volunteer for the army","I volunteered for the army and came home with a limp and a medal.",{"karma":16,"health":-16,"fame":4},p=0.8,fail=("I volunteered for the army and didn't come home.",{"kill":"war"}),minage=18),
  C("Flee abroad ($3,000)","I fled the country with two suitcases and a cat.",{"money":-3000,"stress":8,"happy":-8},req=3000)],cond={"warRisk":1}),
 E("bad_luck_streak","random",(10,100),1,"Bad Luck","Everything goes wrong all at once.",[
  C("Laugh through it","I laughed through the worst day of my life.",{"happy":4,"stress":4}),
  C("Cry","I cried over a spilled coffee and a broken heart.",{"happy":-8}),
  C("Take a walk","I took a walk and found five dollars.",{"stress":-8,"money":5})]),
 E("teacher_praise","school",(6,18),1.5,"Teacher Praise","Your teacher says you have a lot of potential.",[
  C("Work harder","I worked harder and my grades rose.",{"smarts":8}),
  C("Let it go to your head","I let it go to my head and wore sunglasses indoors.",{"smarts":-4,"happy":8}),
  C("Say thanks","I said thanks and smiled.",{"happy":4})],cond={"school":"any"}),
 E("college_party","school",(18,23),1.8,"College Party","Everyone is heading to a huge party on campus.",[
  C("Go and have fun","I went to the party and danced on a table.",{"happy":16,"health":-4,"fame":4}),
  C("Study instead","I stayed in and studied. The library was empty.",{"smarts":8,"happy":-4}),
  C("Drink too much","I drank too much and woke up in a bush.",{"health":-8,"happy":4,"karma":-4},flag="drinker"),
  C("Host a party","I hosted a party and the dorm advisor shut it down.",{"karma":-4,"happy":8})],cond={"school":"college"}),
 E("roommate","school",(18,23),1.5,"Roommate","Your college roommate leaves dirty dishes everywhere.",[
  C("Talk it out","I talked it out and we made a cleaning chart.",{"karma":8,"rel_friend":8}),
  C("Passive-aggressive notes","I left passive-aggressive notes. They left worse ones.",{"stress":8}),
  C("Move out ($800)","I moved out and paid a deposit I will never see again.",{"money":-800,"happy":4}),
  C("Clean it myself","I cleaned the dishes myself, seething.",{"stress":8,"health":-4})],cond={"school":"college"}),
 E("final_thesis","school",(20,24),1.5,"Thesis","Your final project is due this week.",[
  C("Work hard","I finished my thesis at 4 a.m. and was proud.",{"smarts":16,"stress":8}),
  C("Pay someone ($500)","I paid someone to write my thesis. I got a B.",{"money":-500,"karma":-16,"smarts":-4}),
  C("Wing it","I winged my thesis and got by on charm.",{"smarts":4,"stress":8})],cond={"school":"college"}),
]
