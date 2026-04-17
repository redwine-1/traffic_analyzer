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
* Frame indices and timestamp data for a vehicle are recorded only when the vehicle crosses the LOI.
* The final analysis and generated report are strictly derived from this LOI-based counting methodology.

## Demonstration
Demo Video: [video](https://www.youtube.com/)

## Local Setup & Dependencies
* Python 3.10+
* ultralytics 
* (Optional) CUDA for GPU acceleration

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

## Architecture Breakdown

###  Front-End / User Interface Architecture
Haven't decided yet.
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



