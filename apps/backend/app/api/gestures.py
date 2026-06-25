"""
Turns event(s) into a small JSON-able dict:
"""
from cv_pipeline.processing.pipeline import PipelineEvent


def serialize_event(event: PipelineEvent) -> dict:
	hands = []
	detection = event.detection
	if detection is not None:
		# cv pipeline built in order
		# cam feed -> engine ->hand metrics etc
		for i, dh in enumerate(detection.hands):
			gr = (
				event.engine_result.hand_gestures[i]
				if i < len(event.engine_result.hand_gestures)
				else None
			)
			m = event.hand_metrics[i] if i < len(event.hand_metrics) else None
			hands.append(
				{
					'handedness': dh.handedness.name,
					'gesture': gr.gesture.name if gr else 'UNKNOWN',
					'fingers': gr.finger_state.count if gr else 0,
					'confidence': round(dh.confidence, 3),
					'speed': round(m.speed, 4) if m else 0.0,
					'landmarks': [
						{'x': round(lm.x, 4), 'y': round(lm.y, 4), 'z': round(lm.z, 4)}
						for lm in dh.landmarks
					],
				}
			)
	return {
		'type': 'gesture_frame',
		'frame_index': event.frame_index,
		'timestamp': event.frame.timestamp,
		'fps': round(event.fps, 1),
		'hands': hands,
	}
