from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import cv2
import numpy as np
import base64
import json
from track import ObjectTracking

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# We can initialize the tracker globally and use it per connection,
# or create a new tracker per websocket connection. A new one per connection is safer.
allowed_classes = [2, 3, 5, 6, 7]
loi_y = 500
current_model = "yolo26n.pt"


class TrackerConfig(BaseModel):
    model: str
    allowed_classes: list[int]
    loi_y: int


@app.post("/api/config")
async def update_config(config: TrackerConfig):
    global current_model, allowed_classes, loi_y
    current_model = config.model
    allowed_classes = config.allowed_classes
    loi_y = config.loi_y
    return {"message": "Configuration updated successfully"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()

    tracker = ObjectTracking(
        model=current_model,
        source=None,  # No local file, we process frames on the fly
        allowed_classes=allowed_classes,
        draw_track_line=True,
        skip_frame=1,
        loi_y=loi_y,
    )
    frame_count = 0
    try:
        while True:
            # Receive base64 string from frontend
            data = await websocket.receive_text()

            # Decode base64 to OpenCV image
            try:
                img_data = base64.b64decode(data)
                np_arr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception as e:
                print(f"Error decoding image: {e}")
                continue

            if frame is None:
                continue

            frame_count += 1

            # Process frame with tracker
            annotated_frame, frame_meta = tracker.process_frame(frame, frame_count)

            # Encode processed frame to base64
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            processed_data = base64.b64encode(buffer).decode("utf-8")

            # Send back data
            response = {
                "image": processed_data,
                "metadata": frame_meta,
            }

            await websocket.send_text(json.dumps(response))

    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"Connection error: {e}")
    finally:
        # Save metadata or anything else
        tracker.save_meta_data()


if __name__ == "__main__":
    import uvicorn

    # Start the server on port 8765 as the frontend is connecting to ws://localhost:8765
    uvicorn.run(app, host="localhost", port=8765)
