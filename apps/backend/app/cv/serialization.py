"""
Convert internal cv pipeline objects into pydantic models that
are JSON serializable over webscoket

PipelineEvent -> GestureFramePayload -> sent to browser as ws.send_json
"""

from cv_pipeline.processing.pipeline import PipelineEvent
from pydantic import BaseModel, Field


class LandmarkOut(BaseModel):
	"""
	Single hand landmark, normalised to [0.-, 1.0] relative to frame size
	"""

	x: float = Field(..., description='Horizontal position, 0 - left edge, 1 = right edge')
	y: float = Field(..., description='Vertical position, 0 - top edge, 1 = bottom edge')
	z: float = Field(..., description='Depth relative to wrist, negative is closer to camera')


class HandOut(BaseModel):
	"""
	Per-hand gesture, tracking, and confidence data for one detected hand
	"""

	handedness: str = Field(..., description="'LEFT' or 'RIGHT'", examples=['RIGHT'])
	gesture: str = Field(
		...,
		description='Classified gesture name',
		examples=[
			'OPEN_PALM',
			'FIST',
			'ONE_FINGER',
			'TWO_FINGERS',
			'THREE_FINGERS',
			'FOUR_FINGERS',
			'UNKNOWN',
		],
	)
	fingers: int = Field(..., ge=0, le=5, description='Number of fingers detected as extended')
	confidence: float = Field(
		..., ge=0.0, le=1.0, description='MediaPipe handedness confidence, 0.0-1.0'
	)
	speed: float = Field(
		..., ge=0.0, description='Wrist speed in normalised units/sec (resolution-independent)'
	)
	landmarks: list[LandmarkOut] = Field(
		...,
		description='All 21 Mediapipe hand landmarks for this hand',
		min_length=21,
		max_length=21,
	)


class GestureFramePayload(BaseModel):
	"""
	One processed camera frame, sent over websocket
	frontend should switch on 'type' for forward compatibility if more message
	types are added (error, status etc)
	"""

	type: str = Field(default='gesture_frame', description='Discriminator for message type')
	frame_index: int = Field(..., description='Monotonic frame counter since pipeline start')
	timestamp: float = Field(..., description='Frame capture time(monotonic clock, seconds)')
	fps: float = Field(..., ge=0.0, description='Smoothed fps of the pipeline')
	hands: list[HandOut] = Field(
		default_factory=list, description='0-2 hands currently detected in frame'
	)

	model_config = {
		'json_schema_extra': {
			'examples': [
				{
					'type': 'gesture_frame',
					'frame_index': 142,
					'timestamp': 1719831600.123,
					'fps': 28.7,
					'hands': [
						{
							'handedness': 'RIGHT',
							'gesture': 'OPEN_PALM',
							'fingers': 5,
							'confidence': 0.95,
							'speed': 0.12,
							'landmarks': [{'x': 0.5, 'y': 0.5, 'z': 0.0}],
						}
					],
				}
			]
		}
	}


def serialize_event(event: PipelineEvent) -> GestureFramePayload:
	"""
	Build a GestureFramePayload from a pipelineEvent
	"""
	hands: list[HandOut] = []
	detection = event.detection

	if detection is not None:
		gesture_results = event.engine_result.hand_gestures
		metrics = event.hand_metrics

		for i, detected_hand in enumerate(detection.hands):
			gesture_result = gesture_results[i] if i < len(gesture_results) else None
			hand_metric = metrics[i] if i < len(metrics) else None

			hands.append(
				HandOut(
					handedness=detected_hand.handedness.name,
					gesture=gesture_result.gesture.name if gesture_result else 'UNKNOWN',
					fingers=gesture_result.finger_state.count if gesture_result else 0,
					confidence=round(detected_hand.confidence, 3),
					speed=round(hand_metric.speed, 4) if hand_metric else 0.0,
					landmarks=[
						LandmarkOut(x=round(lm.x, 4), y=round(lm.y, 4), z=round(lm.z, 4))
						for lm in detected_hand.landmarks
					],
				)
			)
	return GestureFramePayload(
		frame_index=event.frame_index,
		timestamp=event.frame.timestamp,
		fps=round(event.fps, 1),
		hands=hands,
	)
