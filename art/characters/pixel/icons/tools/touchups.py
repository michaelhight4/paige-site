# Hand touch-ups on frame 0 after the auto-shrink: (x, y, '#hex' | None[, 'c' = crystal pixel -> goes in the Warmth mask]).
# Frame 1 is derived from the touched-up frame 0, so edits carry over.
TOUCH = {
 # tail-tip gem was 1-2 px after shrinking: rebuilt as a 2x2 gem so Warmth has something to tint
 'cindrip': [(29,25,'#b076ec','c'),(30,25,'#8a4ace','c'),(29,26,'#603096','c'),(30,26,'#3a1e60','c'),
             (5,17,'#191210')],                                  # eye
 'emberlunx': [(29,22,'#8a4ace','c'),(30,22,'#b076ec','c'),(29,23,'#603096','c'),(30,23,'#8a4ace','c'),
               (31,23,'#3a1e60','c'),
               (6,11,'#e29d40')],                                # ember eye on the dark head
 'forgeharrow': [(4,15,'#e29d40')],                              # ember eye
 'halovy': [(13,15,'#2c2320'),(16,15,'#2c2320'),(17,15,'#ccaa6e')],  # two clean eyes
}
