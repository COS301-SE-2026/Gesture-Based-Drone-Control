#stdin-control.py

'''
This is another proof of concept keyboard -> drone control setup
uses airsim's api, but relies on stdin rather than raw keyboard input

this is due to docker's limitations on i/o. 
the script runs perfectly fine in the airsim docker container, but kind of sucks.
'''


import airsim

client = airsim.MultirotorClient()
client.confirmConnection()

client.enableApiControl(True)
client.armDisarm(True)

print("Taking off...")
client.takeoffAsync().join()

print("""
Controls:
w = forward
s = back
a = left
d = right
u = up
j = down
l = land
q = quit
""")

speed = 3
duration = 0.2
print("Taking off...")
client.takeoffAsync().join()

while True:
    cmd = input("> ").strip().lower()

    if cmd == "w":
        client.moveByVelocityBodyFrameAsync(speed, 0, 0, duration)

    elif cmd == "s":
        client.moveByVelocityBodyFrameAsync(-speed, 0, 0, duration)

    elif cmd == "a":
        client.moveByVelocityBodyFrameAsync(0, -speed, 0, duration)

    elif cmd == "d":
        client.moveByVelocityBodyFrameAsync(0, speed, 0, duration)

    elif cmd == "u":
        client.moveByVelocityBodyFrameAsync(0, 0, -speed, duration)

    elif cmd == "j":
        client.moveByVelocityBodyFrameAsync(0, 0, speed, duration)

    elif cmd == "l":
        client.landAsync().join()
        break

    elif cmd == "q":
        break

client.armDisarm(False)
client.enableApiControl(False)
print("Done")