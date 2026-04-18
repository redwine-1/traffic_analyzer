# Traffic Analyzer
## Overview 
This project is a proof-of-concept traffic analysis system.

The system:
* Detects vehicles from video frames
* Tracks them across time
* Counts unique vehicles (without double-counting)
* Generates structured output for analysis

Assumptions:
* The counting algorithm is based on a single predefined Line of Interest (LOI) within the video frame. Only vehicles that cross this line are considered for counting.
* Vehicles that are detected and tracked but do not cross the LOI are excluded from the count.
* The final analysis and generated report are strictly derived from this LOI-based counting methodology.

## Demonstration
Demo Video: [video](https://youtu.be/GdyplzDojU8)

## Local Setup & Dependencies
* Python 3.10+


### Installation Instructions

1. **Clone the repository:**
```bash
git clone https://github.com/redwine-1/traffic_analyzer.git
cd traffic_analyzer
```
2. **Create a virtual environment (optional but recommended):**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```
3. **Install dependencies:**
```bash
pip install -r requirements.txt
``` 

## Running the Application
1. **Start the FastAPI backend:**
```bash
python main.py
```
2. **Start the React frontend:**
```bash
cd traffic-analyzer-client
npm install
npm run dev
```
3. **Access the application:**
   1. Open your browser and navigate to `http://localhost:5173` to access the traffic analyzer interface.
   2. Upload a video file and click `next`
   3. Set LOI, select classes of interest, and click `Set Configuration`. Must do this before starting detection.
   4. Click `Start Detection` to begin processing the video. The processed video with detections and counts will be displayed in real-time.
   5. After processing is complete, click `Download Report` to get a CSV file containing the counts and timestamps of vehicles that crossed the LOI and click `Download Video` to get the processed video with detections.

## Architecture Breakdown

###  Web Application
**Frontend:** React

**Backend:** FastAPI

#### Communication:
**WebSocket:** The application uses a strict synchronous frame-by-frame pipeline over WebSocket. First, the frontend extracts a video frame, encodes it, and sends it to the backend. Crucially, the frontend then enters a waiting state, pausing until a response is received. The backend decodes the image, runs the YOLO model for object detection, updates tracking states, and overlays bounding boxes. The backend then responds with the processed base64 frame alongside a metadata JSON payload containing current counts and timestamps. Only upon receiving this completed payload does the frontend render the result and dispatch the next frame.

**REST API:** The backend also provides a REST API endpoint (POST request) to setup the detection parameters such as the Line of Interest (LOI) and the classes of interest.

###  Computer Vision Pipeline
Model: yolo26  
#### Why yolo26?
* lightweight and fast,
* SOTA performance for real-time detection
* End-to-End NMS-Free Design
* DFL Removal for Edge Efficiency
* 43% faster CPU inference compared to its predecessor

#### Classes of Interest (to reduce false positives and computational load)
* car
* motorcycle
* bus
* train
* trucks 

using `frame_skip = 2` results in mis counting with yolo26n, so I set it to 1 for now. I will experiment with skipping frames later.

### Tracking and Logic


Using BoT-SORT for tracking as BoT-SORT supports visual re-identification and is designed for real-time applications. It extracts visual feature embeddings from the detected vehicles. When a car passes behind a lamppost and its bounding box disappears, BoT-SORT remembers what the car looked like. When it emerges, the algorithm matches the visual features and assigns the same ID.


## Counting Logic – Up and Down by Class

### Data Structures
- `count_crossing_up`: Dictionary mapping class names → count of objects crossing upward
- `count_crossing_down`: Dictionary mapping class names → count of objects crossing downward  
- `track_last_side`: Dictionary mapping track_id → last known side relative to LOI (-1=above, 1=below, 0=on line)

### Algorithm

1. **Extract Centroid** from bounding box: `centroid = ((x1 + x2) / 2, (y1 + y2) / 2)`

2. **Update Trajectory**: Append centroid to object's track history (keep last 50 positions)

3. **Determine Side of LOI**:
   - If `centroid_y < LOI_y` → object is **above** the line (side = -1)
   - If `centroid_y > LOI_y` → object is **below** the line (side = 1)
   - If `centroid_y == LOI_y` → object is **on** the line (side = 0, ignored)

4. **Detect Crossing** by comparing current_side with previous_side:
   - **Crossing DOWN**: `previous_side < current_side` (moves from above → below)
     - Increment `count_crossing_down[class_name]`
   - **Crossing UP**: `previous_side > current_side` (moves from below → above)
     - Increment `count_crossing_up[class_name]`

5. **Prevent Double-Counting**: Only count if:
   - Object had a previous state (`previous_side is not None`)
   - Object is not currently on the line (`current_side != 0`)
   - Object actually moved sides (`current_side != previous_side`)

6. **Update State**: Store `current_side` for next frame comparison



