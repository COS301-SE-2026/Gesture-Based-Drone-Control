"""
Convert internal cv pipeline objects into pydantic models that
are JSON serializable over webscoket

PipelineEvent -> GestureFramePayload -> sent to browser as ws.send_json
"""

import base64
from typing import Optional

import cv2
from pydantic import BaseModel, Field

from services.cv_pipeline.processing.pipeline import PipelineEvent

JPEG_QUALITY = 60


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
	gesture_confidence: float = Field(
		default=0.0,
		ge=0.0,
		le=1.0,
		description=(
			'Recognizer confidence in the gesture label, Model class probability '
			'under ml, mediapipe score under rule. Distinct from `confidence`, '
			'which is always mediapipe handedness'
		),
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
	frame_jpeg: Optional[str] = Field(
		default=None,
		description=(
			'The processed frame as a base64 JPEG, already '
			'mirrored and resized to match the landmark coordinate space. Render '
			'this instead of opening the webcam again in the browser. Null when '
			'the server is configured to send landmarks only.'
		),
	)
	frame_width: Optional[int] = Field(default=None, description='Width of frame_jpeg in pixels')
	frame_height: Optional[int] = Field(default=None, description='Height of frame_jpeg in pixels')
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
					'frame_jpeg': '/9j/4AAQSkZJRgABAQAA...',
					'frame_width': 640,
					'frame_height': 480,
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


def _build_hand_out(detected_hand, gesture_result, hand_metric) -> HandOut:
	"""
	Assemble one HandOut, to keep sonarqube happy
	"""
	return HandOut(
		handedness=detected_hand.handedness.name,
		gesture=gesture_result.gesture.name if gesture_result else 'UNKNOWN',
		fingers=gesture_result.finger_state.count if gesture_result else 0,
		confidence=round(detected_hand.confidence, 3),
		speed=round(hand_metric.speed, 4) if hand_metric else 0.0,
		gesture_confidence=round(gesture_result.confidence, 3) if gesture_result else 0.0,
		landmarks=[
			LandmarkOut(x=round(lm.x, 4), y=round(lm.y, 4), z=round(lm.z, 4))
			for lm in detected_hand.landmarks
		],
	)


def encode_jpeg(bgr_frame, quality: int = JPEG_QUALITY) -> Optional[str]:
	"""
	Base64 JPEG for one BGR frame, or None if encoding failed
	Encoding 640x480 at q60 costs roughly 1-2ms, done once per frame for all clients
	"""
	ok, buffer = cv2.imencode('.jpg', bgr_frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
	if not ok:
		return None
	return base64.b64encode(buffer.tobytes()).decode('ascii')


def serialize_event(event: PipelineEvent, include_frame: bool = False) -> GestureFramePayload:
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
			hands.append(_build_hand_out(detected_hand, gesture_result, hand_metric))

	jpeg = None
	width = None
	height = None
	if include_frame and event.frame.bgr_frame is not None:
		jpeg = encode_jpeg(event.frame.bgr_frame)
		height, width = event.frame.bgr_frame.shape[:2]

	return GestureFramePayload(
		frame_index=event.frame_index,
		timestamp=event.frame.timestamp,
		fps=round(event.fps, 1),
		frame_jpeg=jpeg,
		frame_width=width,
		frame_height=height,
		hands=hands,
	)
