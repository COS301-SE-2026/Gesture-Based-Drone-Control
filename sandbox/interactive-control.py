#interactive-control.py

'''
This is a proof of concept keyboard -> drone control setup
uses airsim's api combined with the keyboard library to take in raw 
input and map it to drone movement

currently somewhat smooth but lacks simultaneous input or any advanced controls
'''


import airsim
import keyboard
import time

#airsim works on localhos, library handles everything else
client = airsim.MultirotorClient()
client.confirmConnection()

print("Connected to AirSim")

client.enableApiControl(True)
client.armDisarm(True)

print("Taking off...")
client.takeoffAsync().join()

#tweak as needed
speed = 3
duration = 0.2

print("""
KEYBOARD CONTROLS

W/S : Forward / Backward
A/D : Left / Right

UP/DOWN : Up / Down
LEFT/RIGHT : Rotate

SPACE : Hover
L : Land
ESC : Quit
""")

try:
    while True:

        # FORWARD / BACKWARD
        if keyboard.is_pressed('w'):
            #takes in vx,vy,vz, and duration to move
            client.moveByVelocityBodyFrameAsync(
                speed, 0, 0, duration
            )

        elif keyboard.is_pressed('s'):
            client.moveByVelocityBodyFrameAsync(
                -speed, 0, 0, duration
            )

        # LEFT / RIGHT
        elif keyboard.is_pressed('a'):
            client.moveByVelocityBodyFrameAsync(
                0, -speed, 0, duration
            )

        elif keyboard.is_pressed('d'):
            client.moveByVelocityBodyFrameAsync(
                0, speed, 0, duration
            )

        # UP / DOWN
        elif keyboard.is_pressed('up'):
            client.moveByVelocityBodyFrameAsync(
                0, 0, -speed, duration
            )

        elif keyboard.is_pressed('down'):
            client.moveByVelocityBodyFrameAsync(
                0, 0, speed, duration
            )

        # ROTATE
        elif keyboard.is_pressed('left'):
            client.rotateByYawRateAsync(
                -30, duration
            )

        elif keyboard.is_pressed('right'):
            client.rotateByYawRateAsync(
                30, duration
            )

        # HOVER
        elif keyboard.is_pressed('space'):
            print("Hovering...")
            client.hoverAsync().join()

        # LAND
        elif keyboard.is_pressed('l'):
            print("Landing...")
            client.landAsync().join()

        # EXIT
        elif keyboard.is_pressed('esc'):
            print("Exiting...")
            break

        time.sleep(0.05)

finally:
    print("Disarming...")
    client.armDisarm(False)
    client.enableApiControl(False)

    print("Done.")