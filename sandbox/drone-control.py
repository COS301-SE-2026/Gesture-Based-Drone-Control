"""
Keyboard control for a DJI/Ryze Tello drone.

Controls:
    Arrow Up    -> ascend
    Arrow Down  -> descend
    Arrow Left  -> yaw left (rotate counter-clockwise)
    Arrow Right -> yaw right (rotate clockwise)
    W / S       -> move forward / backward
    A / D       -> move left / right (strafe)
    T           -> takeoff
    L           -> land
    ENTER       -> EMERGENCY STOP (cuts motors immediately, drone will fall)
    ESC / Q     -> quit program (lands first if still flying)

Telemetry is printed continuously to the console (throttled to ~2Hz),
pulled from djitellopy's cached state stream (get_current_state()) so
it doesn't add extra traffic on the command channel.

A live camera feed window is also displayed via OpenCV.

Requires:
    pip install djitellopy pynput opencv-python

Note: cv2.imshow() needs a GUI-capable environment (a real X11/Wayland
session, or Windows/macOS desktop) — it will fail or hang on a headless
box or a WSL setup without an X server configured.

Note: pynput hooks into your desktop session (X11/Wayland/Windows/macOS)
as a normal user, unlike the `keyboard` library, which needs root on
Linux. No sudo required here.
"""

import time
import cv2
from pynput import keyboard as kb
from djitellopy import Tello

# Speed for RC control commands, range 10-100
SPEED = 50

# Print telemetry every N control-loop ticks (loop runs at ~20Hz,
# so 10 ticks -> ~2Hz telemetry refresh)
TELEMETRY_EVERY_N_TICKS = 10


def format_telemetry(state: dict, is_flying: bool) -> str:
    """Build a single-line telemetry string from djitellopy's cached state dict.

    state keys (all available fields from the Tello state stream):
        pitch, roll, yaw          -> attitude, degrees
        vgx, vgy, vgz             -> speed, cm/s per axis
        agx, agy, agz             -> acceleration, cm/s^2 per axis
        templ, temph              -> min/max temperature, Celsius
        tof                       -> time-of-flight distance to ground, cm
        h                         -> height, cm
        bat                       -> battery, percent
        baro                      -> barometer altitude, cm
        time                      -> motor-on time, seconds
        mid, x, y, z              -> mission pad id and relative position (if visible)
    """
    return (
        f"[{'FLYING' if is_flying else 'LANDED'}] "
        f"bat={state.get('bat')}% "
        f"h={state.get('h')}cm tof={state.get('tof')}cm baro={state.get('baro')}cm "
        f"pitch={state.get('pitch')} roll={state.get('roll')} yaw={state.get('yaw')} "
        f"vg=({state.get('vgx')},{state.get('vgy')},{state.get('vgz')}) "
        f"ag=({state.get('agx')},{state.get('agy')},{state.get('agz')}) "
        f"temp={state.get('templ')}-{state.get('temph')}C "
        f"time={state.get('time')}s "
        f"mid={state.get('mid')} pad_xyz=({state.get('x')},{state.get('y')},{state.get('z')})"
    )


def main():
    tello = Tello()
    tello.connect()
    print(f"Battery: {tello.get_battery()}%")

    tello.streamon()
    frame_reader = tello.get_frame_read()

    is_flying = False
    running = True

    print("Ready. T=takeoff, L=land, arrows=up/down/yaw, WASD=move, ENTER=emergency stop, ESC/Q=quit")

    def emergency_stop():
        nonlocal is_flying, running
        print("!!! EMERGENCY STOP TRIGGERED !!!")
        tello.emergency()
        is_flying = False
        running = False

    def takeoff():
        nonlocal is_flying
        if not is_flying:
            print("Taking off...")
            tello.takeoff()
            is_flying = True

    def land():
        nonlocal is_flying
        if is_flying:
            print("Landing...")
            tello.land()
            is_flying = False

    def quit_program():
        nonlocal running
        print("Quitting...")
        if is_flying:
            land()
        running = False

    # pynput key state: tracks every key currently held down. Checked
    # continuously in the main loop for movement (equivalent to the old
    # keyboard.is_pressed calls), and used in on_press for one-shot
    # actions (takeoff/land/emergency/quit).
    pressed_keys = set()

    def on_press(key):
        # Ignore OS auto-repeat: only act the first time a key transitions
        # from released -> pressed, not on every repeated event while held.
        already_down = key in pressed_keys
        pressed_keys.add(key)
        if already_down:
            return

        if key == kb.Key.enter:
            emergency_stop()
        elif key == kb.Key.esc:
            quit_program()
        elif hasattr(key, "char") and key.char == "t":
            takeoff()
        elif hasattr(key, "char") and key.char == "l":
            land()
        elif hasattr(key, "char") and key.char == "q":
            quit_program()

    def on_release(key):
        pressed_keys.discard(key)

    def is_pressed(key) -> bool:
        return key in pressed_keys

    listener = kb.Listener(on_press=on_press, on_release=on_release)
    listener.start()

    tick = 0

    try:
        while running:
            # Continuous movement: send RC control values every loop tick
            lr = 0   # left/right
            fb = 0   # forward/backward
            ud = 0   # up/down
            yaw = 0  # rotation

            if is_flying:
                if is_pressed(kb.Key.up):
                    ud = SPEED
                elif is_pressed(kb.Key.down):
                    ud = -SPEED

                if is_pressed(kb.Key.left):
                    yaw = -SPEED
                elif is_pressed(kb.Key.right):
                    yaw = SPEED

                if is_pressed(kb.KeyCode.from_char("w")):
                    fb = SPEED
                elif is_pressed(kb.KeyCode.from_char("s")):
                    fb = -SPEED

                if is_pressed(kb.KeyCode.from_char("a")):
                    lr = -SPEED
                elif is_pressed(kb.KeyCode.from_char("d")):
                    lr = SPEED

                # Always sent, even when all values are 0 -> this is what
                # commands the drone to hover (zero stick input) rather than
                # continuing whatever it was last doing.
                tello.send_rc_control(lr, fb, ud, yaw)

            # Telemetry, throttled so it doesn't spam the console
            tick += 1
            if tick >= TELEMETRY_EVERY_N_TICKS:
                tick = 0
                state = tello.get_current_state()
                print(format_telemetry(state, is_flying), end="\r")

            # Camera feed. djitellopy hands back frames in RGB; cv2 wants BGR.
            frame = frame_reader.frame
            if frame is not None:
                cv2.imshow("Tello Camera", cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))

            # cv2 needs waitKey() called regularly to pump its window's
            # event loop and actually paint the frame -- 1ms is enough,
            # we're not using it for keybinding (that's the keyboard lib).
            cv2.waitKey(1)

            time.sleep(0.05)  # ~20Hz control loop

    except KeyboardInterrupt:
        quit_program()
    finally:
        listener.stop()
        if is_flying:
            try:
                tello.land()
            except Exception:
                pass
        try:
            tello.streamoff()
        except Exception:
            pass
        cv2.destroyAllWindows()
        try:
            tello.end()
        except Exception:
            pass


if __name__ == "__main__":
    main()