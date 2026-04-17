import cv2

input_path = "Road Traffic - Dataset 02.mp4"
output_path = "test.mp4"

# Open video
cap = cv2.VideoCapture(input_path)

# Get video properties
fps = cap.get(cv2.CAP_PROP_FPS)
width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

# Define time range (seconds)
start_time = 30
end_time = 120

# Convert time to frame indices
start_frame = int(start_time * fps)
end_frame = int(end_time * fps)

# Video writer
fourcc = cv2.VideoWriter_fourcc(*"mp4v")
out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

current_frame = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    if start_frame <= current_frame <= end_frame:
        out.write(frame)

    if current_frame > end_frame:
        break

    current_frame += 1

cap.release()
out.release()

print("Done! Cropped video saved.")
