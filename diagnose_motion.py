"""
Motion-mode diagnostic.

Run with the backend up and the browser on the Motion tab:
    pip install websockets
    python diagnose_motion.py

It reports, in order:
  1. which recognizer the pipeline is actually running
  2. which input adapter is actually connected
  3. what gesture names and motion vectors the CV stream is really emitting

Whichever of the three is wrong is where the problem is. Swipe a few times
while it samples.
"""

import asyncio
import json
import urllib.request

import websockets

BASE = 'http://127.0.0.1:3001'
WS = 'ws://127.0.0.1:3001/api/gestures/stream'
SAMPLE_SECONDS = 12


def get(path):
	with urllib.request.urlopen(f'{BASE}{path}', timeout=5) as r:
		return json.load(r)


async def sample_stream():
	gestures = {}
	motion_seen = 0
	frames = 0
	hands_seen = 0
	max_defl = 0.0

	async with websockets.connect(WS, max_size=None) as ws:
		try:
			async with asyncio.timeout(SAMPLE_SECONDS):
				async for raw in ws:
					msg = json.loads(raw)
					if msg.get('type') != 'gesture_frame':
						print('  stream error:', msg)
						continue
					frames += 1
					for h in msg.get('hands', []):
						hands_seen += 1
						name = h.get('gesture', '?')
						gestures[name] = gestures.get(name, 0) + 1
						m = h.get('motion')
						if m:
							motion_seen += 1
							max_defl = max(
								max_defl,
								abs(m['x']),
								abs(m['y']),
								abs(m['depth']),
							)
		except (asyncio.TimeoutError, TimeoutError):
			pass

	return frames, hands_seen, gestures, motion_seen, max_defl


async def main():
	print('1. recognizer:', get('/api/gestures/recognizer'))
	print('2. input adapter:', get('/api/input/status'))
	print('3. pipeline:', get('/api/gestures/status'))

	print(f'\nSampling the CV stream for {SAMPLE_SECONDS}s -- swipe now.\n')
	frames, hands, gestures, motion_seen, max_defl = await sample_stream()

	print(f'frames={frames}  fps~{frames / SAMPLE_SECONDS:.1f}  hand-frames={hands}')
	print('gesture names seen:', gestures or '(none)')
	print(f'frames with a motion vector: {motion_seen}')
	print(f'largest deflection seen: {max_defl:.2f}')

	print('\n--- reading ---')
	if frames == 0:
		print('No frames at all. The camera or pipeline is not running.')
	elif hands == 0:
		print('Frames but no hands. MediaPipe is not detecting your hand.')
	elif motion_seen == 0:
		print(
			'Hands but motion is null -> the pipeline is NOT on the motion\n'
			'recognizer. Check line 1 above; it should say mode=motion.'
		)
	elif not any(g.startswith(('SWIPE', 'PUSH', 'PULL', 'CIRCLE')) for g in gestures):
		print(
			'Motion recognizer is live but no swipe was ever classified.\n'
			'Swipe faster/further: it needs ~0.65 palm widths at ~1.6 palm\n'
			'widths per second, in a straight line.'
		)
	else:
		print(
			'The CV side is working and producing swipes. If the drone still\n'
			'does nothing, the break is between the adapter and the drone:\n'
			"check that /api/input/status says 'motion' and that a drone is\n"
			'connected.'
		)
	if 0 < frames / SAMPLE_SECONDS < 8:
		print(
			f'\nWARNING: ~{frames / SAMPLE_SECONDS:.1f} fps. A swipe latches for'
			' only 0.25s and\nthe adapter needs 2 consecutive frames, so gestures'
			' will be dropped.'
		)


if __name__ == '__main__':
	asyncio.run(main())
