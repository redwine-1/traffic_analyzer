import cv2
import numpy as np

from ultralytics import YOLO
from ultralytics.utils.plotting import colors

from collections import defaultdict


class ObjectTracking:
    """Object Tracking using Ultralytics YOLO26"""

    def __init__(
        self,
        model="yolo26n.pt",
        source="path/to/video.mp4",
        skip_frame=2,
        draw_track_line=True,
        allowed_classes=None,
        loi_y=500,
    ):

        self.model = YOLO(model)  # Model initialization
        self.names = self.model.names  # Store model classes names
        self.allowed_classes = allowed_classes
        self.skip_frame = skip_frame
        self.draw_track_line = draw_track_line
        self.source = source
        # print allowed classes
        print("Allowed classes:", [self.names[i] for i in allowed_classes])

        self.LOI_y = loi_y  # y-coordinate of the line of interest (LOI)
        self.count_crossing_up = defaultdict(int)
        self.count_crossing_down = defaultdict(int)
        self.track_last_side = {}

        # Video capturing module
        self.cap = cv2.VideoCapture(source)
        assert self.cap.isOpened(), "Error reading video file"

        # Video writing module
        w, h, fps = (
            int(self.cap.get(x))
            for x in (
                cv2.CAP_PROP_FRAME_WIDTH,
                cv2.CAP_PROP_FRAME_HEIGHT,
                cv2.CAP_PROP_FPS,
            )
        )
        self.writer = cv2.VideoWriter(
            "object-tracking.mp4", cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h)
        )

        self.track_history = defaultdict(lambda: [])  # Store the track history

        # Display settings
        self.rect_width = 1
        self.font = 0.50
        self.text_width = 1
        self.padding = 6
        self.margin = 5
        self.circle_thickness = 2.5
        self.polyline_thickness = 2

        # Window setup
        self.window_name = "YOLO Tracking"
        cv2.namedWindow(self.window_name, cv2.WINDOW_NORMAL)

    def draw_bbox(self, im0, box, track_id, cls):
        """Draw bounding box with label at TOP-LEFT, but TEXT CENTERED in its box."""

        x1, y1, x2, y2 = map(int, box)

        color = colors(int(cls), True)

        # Draw main bounding box
        cv2.rectangle(im0, (x1, y1), (x2, y2), color, self.rect_width)

        # Prepare label
        label = f"{self.names[int(cls)]}:{int(track_id)}"

        # Get text size
        (tw, th), _ = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, self.font, self.text_width
        )

        bg_x1 = x1  # left edge of bbox
        bg_x2 = bg_x1 + (tw + 2 * self.padding)

        bg_y2 = y1  # top of bbox
        bg_y1 = bg_y2 - (th + 2 * self.margin)

        # Draw filled background rectangle (top-left)
        cv2.rectangle(
            im0,
            (bg_x1, bg_y1),
            (bg_x2, bg_y2),
            color,
            -1,
        )

        text_x = bg_x1 + ((bg_x2 - bg_x1) - tw) // 2
        text_y = bg_y1 + ((bg_y2 - bg_y1) + th) // 2 - 2  # small vertical tweak

        cv2.putText(
            im0,
            label,
            (text_x, text_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            self.font,
            (104, 31, 17),  # white text
            self.text_width,
            cv2.LINE_AA,
        )

    def draw_tracked_line(self, im0, track_id, cls):

        track = self.track_history[track_id]

        # draw the tracking lines
        points = np.hstack(track).astype(np.int32).reshape((-1, 1, 2))

        cv2.circle(
            im0,
            (int(track[-1][0]), int(track[-1][1])),
            5,
            colors(cls, True),
            -1,
        )

        cv2.polylines(
            im0,
            [points],
            isClosed=False,
            color=colors(cls, True),
            thickness=self.polyline_thickness,
        )

    def count_crossing(self, box, track_id, cls):
        """Count if the track has crossed the line of interest (LOI)."""

        if self.allowed_classes is not None and cls not in self.allowed_classes:
            return

        x1, y1, x2, y2 = box
        centroid = (float((x1 + x2) / 2), float((y1 + y2) / 2))

        track = self.track_history[track_id]
        track.append(centroid)
        if len(track) > 50:
            track.pop(0)

        current_y = centroid[1]
        current_side = (
            -1 if current_y < self.LOI_y else 1 if current_y > self.LOI_y else 0
        )

        previous_side = self.track_last_side.get(track_id)
        class_name = self.names[int(cls)]

        if (
            previous_side is not None
            and current_side != 0
            and current_side != previous_side
        ):
            if previous_side < current_side:
                self.count_crossing_down[class_name] += 1
                direction = "down"
            else:
                self.count_crossing_up[class_name] += 1
                direction = "up"

            print(
                f"{class_name} crossed {direction} | "
                f"up: {dict(self.count_crossing_up)} | "
                f"down: {dict(self.count_crossing_down)}"
            )

        if current_side != 0:
            self.track_last_side[track_id] = current_side

    def print_crossing_summary(self):
        """Print the final per-class crossing totals."""

        all_classes = sorted(
            set(self.count_crossing_up) | set(self.count_crossing_down)
        )

        print("Final crossing summary:")
        for class_name in all_classes:
            print(
                f"{class_name}: up={self.count_crossing_up.get(class_name, 0)}, "
                f"down={self.count_crossing_down.get(class_name, 0)}"
            )

    def run(self):
        """Function to run object tracking on video file or webcam."""

        frame_count = 0

        while self.cap.isOpened():
            success, im0 = self.cap.read()

            if not success:
                print("End of video or failed to read image.")
                break

            frame_count += 1
            if (
                frame_count % self.skip_frame != 0
            ):  # Process every nth frame for efficiency
                continue

            results = self.model.track(
                im0,
                persist=True,
                classes=self.allowed_classes,
                tracker="botsort.yaml",
                verbose=False,
            )  # Object tracking

            if results and len(results) > 0:
                result = results[0]
                speed = result.speed
                pre_speed = speed["preprocess"]
                inference_speed = speed["inference"]
                post_speed = speed["postprocess"]

                if result.boxes is not None and result.boxes.id is not None:
                    boxes = result.boxes.xyxy.cpu()
                    ids = result.boxes.id.cpu()
                    clss = result.boxes.cls.tolist()

                    for box, id, cls in zip(boxes, ids.tolist(), clss):
                        # draw loi
                        cv2.line(
                            im0,
                            (0, self.LOI_y),
                            (im0.shape[1], self.LOI_y),
                            (0, 255, 255),
                            2,
                        )
                        self.draw_bbox(im0, box, id, cls)
                        self.count_crossing(box, id, cls)
                        if self.draw_track_line:
                            self.draw_tracked_line(im0, id, cls)

            self.writer.write(im0)
            cv2.imshow(self.window_name, im0)  # Display and handle input

            key = cv2.waitKey(1) & 0xFF
            if key == ord("q"):
                break
            elif key == ord("c"):
                self.selected_id = None
                print("Selection cleared")

        # Cleanup
        self.print_crossing_summary()
        self.cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    # Initialize and run tracker
    allowed_classes = [2, 3, 5, 6, 7]  # car, motorcycle, bus, train, truck

    tracker = ObjectTracking(
        model="yolo26n.pt",
        source="test.mp4",
        allowed_classes=allowed_classes,
        draw_track_line=False,
        skip_frame=1,
    )
    tracker.run()
